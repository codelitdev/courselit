import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

type Runtime = Awaited<ReturnType<typeof createPgliteRuntime>>;
type World = Awaited<ReturnType<typeof seedWorld>>;
type Widget = {
  widgetId: string;
  name: string;
  deletable: boolean;
  moveable: boolean;
  shared: boolean;
  settings?: Record<string, unknown>;
};
type PageBody = {
  id: string;
  slug: string;
  status: string;
  layout: Widget[];
  draftLayout: Widget[];
  draftTitle: string | null;
  title: string | null;
  salesResourceType?: string;
  salesResourceId?: string;
};

async function setup() {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock });
  const world = await seedWorld(runtime, clock);
  const admin = (method: string, path: string, body?: unknown) =>
    dispatch(runtime, {
      method,
      path,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      ...(body === undefined ? {} : { body }),
    });
  const publicGet = (path: string) =>
    dispatch(runtime, {
      method: "GET",
      path,
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
    });
  return { clock, runtime, world, admin, publicGet };
}

async function pageBySlug(runtime: Runtime, world: World, slug: string) {
  const [row] = await runtime.db
    .select({ publicId: schema.websitePages.publicId })
    .from(schema.websitePages)
    .where(
      and(
        eq(schema.websitePages.schoolId, world.schoolA.id),
        eq(schema.websitePages.slug, slug),
      ),
    );
  return row!.publicId;
}

describe.serial("school website", () => {
  it("lists ordinary pages and keeps sales pages with their resource", async () => {
    const { runtime, world, admin } = await setup();
    try {
      const listed = await admin("GET", "/v1/school/website/pages");
      expect(listed.status).toBe(200);
      const slugs = (listed.body as { items: Array<{ slug: string }> }).items
        .map((page) => page.slug)
        .sort();
      expect(slugs).toEqual(["", "privacy", "terms"]);

      const salesPage = await admin("GET", `/v1/sales-pages/product/${world.noteA.publicId}`);
      expect(salesPage.body).toMatchObject({
        resourceType: "product",
        resourceId: world.noteA.publicId,
        slug: "seed-product",
      });
      const salesPageId = (salesPage.body as { pageId: string }).pageId;
      const page = await admin("GET", `/v1/school/website/pages/${salesPageId}`);
      expect(page.body).toMatchObject({
        slug: "seed-product",
        status: "published",
        salesResourceType: "product",
        salesResourceId: world.noteA.publicId,
        salesResourceKind: "course",
      });
      const names = (page.body as PageBody).layout.map((widget) => widget.name);
      expect(names).toEqual([
        "header",
        "courselit-product",
        "courselit-product-curriculum",
        "footer",
      ]);

      // Sales page slugs follow their product and cannot be edited directly.
      const slugEdit = await admin("PATCH", `/v1/school/website/pages/${salesPageId}`, {
        slug: "elsewhere",
      });
      expect(slugEdit.status).toBe(400);
      const renamed = await admin("PATCH", `/v1/products/${world.noteA.publicId}`, {
        slug: "renamed-product",
      });
      expect(renamed.status).toBe(200);
      const afterRename = await admin("GET", `/v1/school/website/pages/${salesPageId}`);
      expect(afterRename.body).toMatchObject({ slug: "renamed-product" });
    } finally {
      await runtime.close();
    }
  });

  it("saves to the draft, publishes, and discards with shared header and footer", async () => {
    const { runtime, world, admin, publicGet } = await setup();
    try {
      const created = await admin("POST", "/v1/school/website/pages", { name: "About us" });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ slug: "about-us", status: "draft" });
      const pageId = (created.body as { id: string }).id;
      expect((await publicGet("/v1/public/site/pages?slug=about-us")).status).toBe(404);

      const page = (await admin("GET", `/v1/school/website/pages/${pageId}`))
        .body as PageBody;
      const [header, footer] = [page.draftLayout[0]!, page.draftLayout.at(-1)!];
      const saved = await admin("PATCH", `/v1/school/website/pages/${pageId}`, {
        title: "About",
        layout: [
          { ...header, settings: { ...header.settings, logoText: "Acme" } },
          {
            widgetId: "about-copy",
            name: "rich-text",
            deletable: true,
            moveable: true,
            shared: false,
            settings: { alignment: "left" },
          },
          footer,
        ],
      });
      expect(saved.status).toBe(200);
      const savedBody = saved.body as PageBody;
      expect(savedBody.draftTitle).toBe("About");
      expect(savedBody.title).toBeNull();
      expect(savedBody.draftLayout.map((widget) => widget.name)).toEqual([
        "header",
        "rich-text",
        "footer",
      ]);

      // The draft header is shared: every page's draft sees it, but the
      // published homepage keeps the old header until something publishes.
      const homeId = await pageBySlug(runtime, world, "");
      const home = (await admin("GET", `/v1/school/website/pages/${homeId}`))
        .body as PageBody;
      expect(home.draftLayout[0]!.settings?.logoText).toBe("Acme");
      expect(home.layout[0]!.settings?.logoText).toBe("CourseLit");
      expect(home.status).toBe("published");

      const publishPermissionDenied = await dispatch(runtime, {
        method: "POST",
        path: `/v1/school/website/pages/${pageId}/publish`,
        headers: {
          cookie: world.member.sessionCookie,
          "x-school-id": world.schoolA.publicId,
        },
      });
      expect(publishPermissionDenied.status).toBe(403);

      const published = await admin("POST", `/v1/school/website/pages/${pageId}/publish`);
      expect(published.body).toMatchObject({ status: "published", title: "About" });
      const publicPage = await publicGet("/v1/public/site/pages?slug=about-us");
      expect(publicPage.status).toBe(200);
      const publicLayout = (publicPage.body as { layout: Widget[] }).layout;
      expect(publicLayout[0]!.settings?.logoText).toBe("Acme");
      const publicHome = await publicGet("/v1/public/site/pages?slug=");
      expect((publicHome.body as { layout: Widget[] }).layout[0]!.settings?.logoText).toBe(
        "Acme",
      );

      await admin("PATCH", `/v1/school/website/pages/${pageId}`, { title: "Changed" });
      const changed = await admin("GET", `/v1/school/website/pages/${pageId}`);
      expect(changed.body).toMatchObject({ status: "published_with_changes" });
      const discarded = await admin(
        "POST",
        `/v1/school/website/pages/${pageId}/discard-draft`,
      );
      expect(discarded.body).toMatchObject({
        status: "published",
        draftTitle: "About",
      });

      const missingFooter = await admin("PATCH", `/v1/school/website/pages/${pageId}`, {
        layout: [header],
      });
      expect(missingFooter.status).toBe(400);
    } finally {
      await runtime.close();
    }
  });

  it("keeps page slugs out of product, community, and system routes", async () => {
    const { runtime, admin } = await setup();
    try {
      const created = await admin("POST", "/v1/school/website/pages", { name: "Blog" });
      expect(created.body).toMatchObject({ slug: "blog-2" });
      const pageId = (created.body as { id: string }).id;

      for (const slug of ["seed-product", "community", "terms"]) {
        const taken = await admin("PATCH", `/v1/school/website/pages/${pageId}`, { slug });
        expect(taken.status).toBe(409);
      }
      const renamed = await admin("PATCH", `/v1/school/website/pages/${pageId}`, {
        slug: "Our Story",
      });
      expect(renamed.body).toMatchObject({ slug: "our-story" });

      const product = await admin("POST", "/v1/products", {
        title: "Our story",
        kind: "course",
        slug: "our-story",
      });
      expect(product.status).toBe(409);
    } finally {
      await runtime.close();
    }
  });

  it("hides sales pages of unpublished products from the storefront", async () => {
    const { runtime, world, publicGet } = await setup();
    try {
      expect((await publicGet("/v1/public/site/pages?slug=seed-product")).status).toBe(404);
      await runtime.db
        .update(schema.products)
        .set({ status: "published" })
        .where(eq(schema.products.publicId, world.noteA.publicId));
      expect((await publicGet("/v1/public/site/pages?slug=seed-product")).status).toBe(200);
      expect((await publicGet("/v1/public/site/pages?slug=community")).status).toBe(200);
    } finally {
      await runtime.close();
    }
  });

  it("serves branding, themes, and code injection to the storefront", async () => {
    const { runtime, world, admin, publicGet, clock } = await setup();
    try {
      const now = clock.now();
      await runtime.db.insert(schema.schoolHosts).values({
        id: crypto.randomUUID(),
        schoolId: world.schoolA.id,
        hostname: "learn.example.com",
        kind: "custom",
        verificationStatus: "verified",
        verificationToken: null,
        verifiedAt: now,
        isPrimary: false,
        createdAt: now,
        updatedAt: now,
      });
      const theme = await admin("POST", "/v1/school/website/branding/themes", {
        name: "Brand",
        style: { primary: "#112233" },
      });
      expect(theme.status).toBe(201);
      const themeId = (theme.body as { themeId: string }).themeId;
      const unknownTheme = await admin("PATCH", "/v1/school/website/branding", {
        themeId: "thm_missing",
      });
      expect(unknownTheme.status).toBe(400);
      const branding = await admin("PATCH", "/v1/school/website/branding", {
        title: "School A",
        subtitle: "Learn together",
        themeId,
      });
      expect(branding.body).toMatchObject({ title: "School A", themeId });

      const settings = await publicGet("/v1/public/site/settings");
      expect(settings.body).toMatchObject({
        title: "School A",
        subtitle: "Learn together",
        themeId,
        theme: { primary: "#112233" },
        codeInjectionHead: "",
        canonicalHost: "learn.example.com",
      });

      await admin("PATCH", "/v1/school/website/branding", { themeId: "classic" });
      expect((await publicGet("/v1/public/site/settings")).body).toMatchObject({
        themeId: "classic",
        theme: null,
      });
    } finally {
      await runtime.close();
    }
  });

  it("drafts, publishes, and serves blog posts with their author", async () => {
    const { runtime, admin, publicGet } = await setup();
    try {
      const created = await admin("POST", "/v1/school/website/blogs", {
        title: "Hello world",
      });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ slug: "hello-world", status: "draft" });
      const blogId = (created.body as { id: string }).id;

      await admin("PATCH", `/v1/school/website/blogs/${blogId}`, {
        excerpt: "First post",
        content: { type: "doc", content: [{ type: "paragraph" }] },
        meta: { tags: ["news"] },
      });
      expect((await publicGet("/v1/public/site/blogs")).body).toEqual({
        items: [],
        total: 0,
      });

      const published = await admin("POST", `/v1/school/website/blogs/${blogId}/publish`);
      expect(published.body).toMatchObject({ status: "published", title: "Hello world" });
      const article = await publicGet("/v1/public/site/blogs/hello-world");
      expect(article.body).toMatchObject({
        blogId,
        slug: "hello-world",
        title: "Hello world",
        excerpt: "First post",
        meta: { tags: ["news"] },
        author: { name: expect.any(String) },
      });

      await admin("PATCH", `/v1/school/website/blogs/${blogId}`, { title: "Edited" });
      expect((await admin("GET", `/v1/school/website/blogs/${blogId}`)).body).toMatchObject({
        status: "published_with_changes",
        draftTitle: "Edited",
        title: "Hello world",
      });
      const discarded = await admin(
        "POST",
        `/v1/school/website/blogs/${blogId}/discard-draft`,
      );
      expect(discarded.body).toMatchObject({ status: "published", draftTitle: "Hello world" });
      expect((await publicGet("/v1/public/site/blogs")).body).toMatchObject({ total: 1 });
    } finally {
      await runtime.close();
    }
  });

  it("protects library media used by page and blog drafts", async () => {
    const { runtime, world, admin, clock } = await setup();
    try {
      const now = clock.now();
      const mediaId = crypto.randomUUID();
      await runtime.db.insert(schema.media).values({
        id: mediaId,
        publicId: "med_page_image",
        schoolId: world.schoolA.id,
        mediaLitId: "ml_page_image",
        canonicalUrl: "https://cdn.example.com/page.png",
        fileName: "page.png",
        mimeType: "image/png",
        byteSize: 10,
        kind: "image",
        accessPolicy: "public",
        createdAt: now,
        updatedAt: now,
      });
      const homeId = await pageBySlug(runtime, world, "");
      const home = (await admin("GET", `/v1/school/website/pages/${homeId}`))
        .body as PageBody;
      await admin("PATCH", `/v1/school/website/pages/${homeId}`, {
        layout: [
          home.draftLayout[0],
          {
            widgetId: "hero-image",
            name: "hero",
            deletable: true,
            moveable: true,
            shared: false,
            settings: {
              media: { mediaId: "med_page_image", url: "https://cdn.example.com/page.png" },
              unsplash: { url: "https://images.unsplash.com/photo-1" },
            },
          },
          home.draftLayout.at(-1),
        ],
      });
      const references = () =>
        runtime.db
          .select({ resourceType: schema.mediaReferences.resourceType })
          .from(schema.mediaReferences)
          .where(eq(schema.mediaReferences.mediaId, mediaId));
      expect(await references()).toEqual([{ resourceType: "website_page" }]);

      const blog = await admin("POST", "/v1/school/website/blogs", { title: "Images" });
      const blogId = (blog.body as { id: string }).id;
      await admin("PATCH", `/v1/school/website/blogs/${blogId}`, {
        content: {
          type: "doc",
          content: [{ type: "image", attrs: { src: "https://cdn.example.com/page.png" } }],
        },
      });
      expect((await references()).map((row) => row.resourceType).sort()).toEqual([
        "blog_artwork",
        "website_page",
      ]);

      // Discarding the unpublished page draft drops the page's reference.
      await admin("POST", `/v1/school/website/pages/${homeId}/discard-draft`);
      expect(await references()).toEqual([{ resourceType: "blog_artwork" }]);
    } finally {
      await runtime.close();
    }
  });
});
