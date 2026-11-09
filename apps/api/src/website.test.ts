import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { MemoryMediaLitClient } from "./media.js";
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

async function setup(options: { mediaLit?: MemoryMediaLitClient } = {}) {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock, ...options });
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
  // Public routes name the school in the path: `/v1/public/:schoolId/...`.
  const publicGet = (path: string) =>
    dispatch(runtime, {
      method: "GET",
      path: path.replace(/^\/v1\/public\//, `/v1/public/${world.schoolA.publicId}/`),
      headers: {},
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
    const { runtime, world, admin, publicGet } = await setup();
    try {
      const listed = await admin("GET", "/v1/school/website/pages");
      expect(listed.status).toBe(200);
      const slugs = (listed.body as { items: Array<{ slug: string }> }).items
        .map((page) => page.slug)
        .sort();
      expect(slugs).toEqual(["", "privacy", "terms"]);

      // Real content only: the homepage is data-driven blocks with no baked-in
      // copy, and the legal pages start as unpublished drafts.
      const byslug = Object.fromEntries(
        (listed.body as { items: Array<{ slug: string; status: string }> }).items.map(
          (page) => [page.slug, page.status],
        ),
      );
      expect(byslug[""]).toBe("published");
      expect(byslug["terms"]).toBe("draft");
      expect(byslug["privacy"]).toBe("draft");
      const homeBody = (
        await admin("GET", `/v1/school/website/pages/${await pageBySlug(runtime, world, "")}`)
      ).body as PageBody;
      expect(homeBody.layout.map((widget) => widget.name)).toEqual([
        "header",
        "courselit-home-hero",
        "courselit-home-offers",
        "newsletter-signup",
        "footer",
      ]);
      const homeJson = JSON.stringify(homeBody.layout);
      for (const old of ["Ask user to take action", "Eye Catching", "7OP2bU9RWVE", "CourseLit"]) {
        expect(homeJson).not.toContain(old);
      }
      expect((await publicGet("/v1/public/site/pages?slug=terms")).status).toBe(404);

      const salesPage = await admin(
        "GET",
        `/v1/sales-pages/product/${world.noteA.publicId}`,
      );
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
      const created = await admin("POST", "/v1/school/website/pages", {
        name: "About us",
      });
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
      expect(home.layout[0]!.settings?.logoText).toBeUndefined();
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

      const published = await admin(
        "POST",
        `/v1/school/website/pages/${pageId}/publish`,
      );
      expect(published.body).toMatchObject({ status: "published", title: "About" });
      const publicPage = await publicGet("/v1/public/site/pages?slug=about-us");
      expect(publicPage.status).toBe(200);
      const publicLayout = (publicPage.body as { layout: Widget[] }).layout;
      expect(publicLayout[0]!.settings?.logoText).toBe("Acme");
      const publicHome = await publicGet("/v1/public/site/pages?slug=");
      expect(
        (publicHome.body as { layout: Widget[] }).layout[0]!.settings?.logoText,
      ).toBe("Acme");

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
        const taken = await admin("PATCH", `/v1/school/website/pages/${pageId}`, {
          slug,
        });
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

  it("titles the public site with the school's name when no site title is set", async () => {
    const { runtime, world } = await setup();
    try {
      const [school] = await runtime.db
        .select({ name: schema.schools.name })
        .from(schema.schools)
        .where(eq(schema.schools.id, world.schoolA.id));
      for (const title of [null, "", "   "]) {
        await runtime.db
          .update(schema.websiteSettings)
          .set({ title })
          .where(eq(schema.websiteSettings.schoolId, world.schoolA.id));
        const response = await dispatch(runtime, {
          method: "GET",
          path: `/v1/public/${world.schoolA.publicId}/site/settings`,
          headers: {},
        });
        expect(response.status).toBe(200);
        expect((response.body as { title: string | null }).title).toBe(school!.name);
      }
    } finally {
      await runtime.close();
    }
  });

  it("selects the school from the path and ignores the request host", async () => {
    const { runtime, world } = await setup();
    const titleOf = async (schoolPublicId: string, headers: Record<string, string>) => {
      const response = await dispatch(runtime, {
        method: "GET",
        path: `/v1/public/${schoolPublicId}/site/settings`,
        headers,
      });
      expect(response.status).toBe(200);
      return (response.body as { title: string | null }).title;
    };
    try {
      for (const [school, title] of [
        [world.schoolA, "School A"],
        [world.schoolB, "School B"],
      ] as const) {
        await runtime.db
          .update(schema.websiteSettings)
          .set({ title })
          .where(eq(schema.websiteSettings.schoolId, school.id));
      }
      // Internal service hosts, the public API origin, and even another
      // school's host never change which school a public route serves.
      const hostHeaders: Array<Record<string, string>> = [
        { host: "courselit-api:4000" },
        { host: "api.courselit.app" },
        { host: "school-a.localhost:3001" },
        {
          "x-forwarded-host": "school-a.localhost:3001",
          "x-school-id": world.schoolA.publicId,
        },
      ];
      for (const headers of hostHeaders) {
        expect(await titleOf(world.schoolB.publicId, headers)).toBe("School B");
      }
      expect(
        await titleOf(world.schoolA.publicId, { host: "courselit-api:4000" }),
      ).toBe("School A");

      // Unknown schools, subdomains, and hostnames are not school ids.
      for (const schoolKey of ["sch_unknown", "school-a", "school-a.localhost"]) {
        const response = await dispatch(runtime, {
          method: "GET",
          path: `/v1/public/${schoolKey}/site/settings`,
          headers: { host: "school-a.localhost:3001" },
        });
        expect(response.status).toBe(404);
      }
      // The old host-selected routes are gone.
      const legacy = await dispatch(runtime, {
        method: "GET",
        path: "/v1/public/site/settings",
        headers: { host: "school-a.localhost:3001" },
      });
      expect(legacy.status).toBe(404);
    } finally {
      await runtime.close();
    }
  });

  it("hides sales pages of unpublished products from the storefront", async () => {
    const { runtime, world, publicGet } = await setup();
    try {
      expect((await publicGet("/v1/public/site/pages?slug=seed-product")).status).toBe(
        404,
      );
      await runtime.db
        .update(schema.products)
        .set({ status: "published" })
        .where(eq(schema.products.publicId, world.noteA.publicId));
      expect((await publicGet("/v1/public/site/pages?slug=seed-product")).status).toBe(
        200,
      );
      expect((await publicGet("/v1/public/site/pages?slug=community")).status).toBe(
        200,
      );
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

      const published = await admin(
        "POST",
        `/v1/school/website/blogs/${blogId}/publish`,
      );
      expect(published.body).toMatchObject({
        status: "published",
        title: "Hello world",
      });
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
      expect(
        (await admin("GET", `/v1/school/website/blogs/${blogId}`)).body,
      ).toMatchObject({
        status: "published_with_changes",
        draftTitle: "Edited",
        title: "Hello world",
      });
      const discarded = await admin(
        "POST",
        `/v1/school/website/blogs/${blogId}/discard-draft`,
      );
      expect(discarded.body).toMatchObject({
        status: "published",
        draftTitle: "Hello world",
      });
      expect((await publicGet("/v1/public/site/blogs")).body).toMatchObject({
        total: 1,
      });
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
              media: {
                mediaId: "med_page_image",
                url: "https://cdn.example.com/page.png",
              },
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
          content: [
            { type: "image", attrs: { src: "https://cdn.example.com/page.png" } },
          ],
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

  it("deletes pages and blogs and the media only they used", async () => {
    const deletedAssets: string[] = [];
    let failDeletes = false;
    const mediaLit = new (class extends MemoryMediaLitClient {
      override async deleteAsset(input: { schoolId: string; mediaLitId: string }) {
        if (failDeletes) throw new Error("media service unavailable");
        deletedAssets.push(input.mediaLitId);
      }
    })();
    const { runtime, world, admin, clock } = await setup({ mediaLit });
    try {
      const addMedia = async (name: string) => {
        const id = crypto.randomUUID();
        const now = clock.now();
        await runtime.db.insert(schema.media).values({
          id,
          publicId: `med_${name}`,
          schoolId: world.schoolA.id,
          mediaLitId: `ml_${name}`,
          canonicalUrl: `https://cdn.example.com/${name}.png`,
          fileName: `${name}.png`,
          mimeType: "image/png",
          byteSize: 10,
          kind: "image",
          accessPolicy: "public",
          createdAt: now,
          updatedAt: now,
        });
        return id;
      };
      const shared = await addMedia("shared");
      const pageOnly = await addMedia("page_only");
      const blogOnly = await addMedia("blog_only");
      const unused = await addMedia("unused");
      const exists = async (id: string) =>
        (await runtime.db.select().from(schema.media).where(eq(schema.media.id, id)))
          .length === 1;

      const created = await admin("POST", "/v1/school/website/pages", {
        name: "Gallery",
      });
      const pageId = (created.body as { id: string; deletable: boolean }).id;
      expect(created.body).toMatchObject({ deletable: true });
      const page = (await admin("GET", `/v1/school/website/pages/${pageId}`))
        .body as PageBody;
      await admin("PATCH", `/v1/school/website/pages/${pageId}`, {
        layout: [
          page.draftLayout[0],
          {
            widgetId: "gallery",
            name: "grid",
            deletable: true,
            moveable: true,
            shared: false,
            settings: {
              items: [
                { media: { mediaId: "med_shared" } },
                { media: { mediaId: "med_page_only" } },
              ],
            },
          },
          page.draftLayout.at(-1),
        ],
      });
      const blog = await admin("POST", "/v1/school/website/blogs", { title: "Photos" });
      const blogId = (blog.body as { id: string }).id;
      await admin("PATCH", `/v1/school/website/blogs/${blogId}`, {
        content: {
          type: "doc",
          content: [
            { type: "image", attrs: { src: "https://cdn.example.com/shared.png" } },
            { type: "image", attrs: { src: "https://cdn.example.com/blog_only.png" } },
          ],
        },
      });

      // The home page and sales pages stay.
      const homeId = await pageBySlug(runtime, world, "");
      const home = await admin("DELETE", `/v1/school/website/pages/${homeId}`);
      expect(home.status).toBe(409);
      expect(home.body).toMatchObject({ details: { reason: "page_not_deletable" } });

      // The blog goes with the media only it used; the page keeps the shared one.
      expect((await admin("DELETE", `/v1/school/website/blogs/${blogId}`)).status).toBe(
        204,
      );
      expect((await admin("GET", `/v1/school/website/blogs/${blogId}`)).status).toBe(
        404,
      );
      expect(deletedAssets).toEqual(["ml_blog_only"]);
      expect(await exists(blogOnly)).toBe(false);
      expect(await exists(shared)).toBe(true);

      const pageReferences = await runtime.db
        .select({ mediaId: schema.mediaReferences.mediaId })
        .from(schema.mediaReferences)
        .where(eq(schema.mediaReferences.resourceType, "website_page"));
      expect(pageReferences.map((row) => row.mediaId)).toEqual(
        expect.arrayContaining([shared, pageOnly]),
      );

      // An asset the media service cannot delete stays in the library.
      failDeletes = true;
      expect((await admin("DELETE", `/v1/school/website/pages/${pageId}`)).status).toBe(
        204,
      );
      expect((await admin("GET", `/v1/school/website/pages/${pageId}`)).status).toBe(
        404,
      );
      expect(await exists(shared)).toBe(true);
      expect(await exists(pageOnly)).toBe(true);
      const [kept] = await runtime.db
        .select({ status: schema.media.status })
        .from(schema.media)
        .where(eq(schema.media.id, shared));
      expect(kept).toEqual({ status: "active" });

      // Media nothing referenced is never touched.
      expect(await exists(unused)).toBe(true);
      const audit = await runtime.db
        .select({ action: schema.auditEvents.action })
        .from(schema.auditEvents)
        .where(eq(schema.auditEvents.schoolId, world.schoolA.id));
      expect(audit.map((row) => row.action)).toEqual(
        expect.arrayContaining([
          "blog_post.deleted",
          "website_page.deleted",
          "media.deleted",
        ]),
      );
    } finally {
      await runtime.close();
    }
  });
});
