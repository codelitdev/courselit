import { describe, expect, it } from "bun:test";
import {
  COURSELIT_FRONTLIT_PROVISION_PAGES,
  createFrontLitBlog,
  createFrontLitPage,
  createFrontLitTheme,
  discardFrontLitBlogDraft,
  discardFrontLitPageDraft,
  frontLitConfig,
  getFrontLitBlog,
  getFrontLitPage,
  getFrontLitSettings,
  getPublicFrontLitBlog,
  getPublicFrontLitPage,
  getPublicFrontLitSettings,
  listFrontLitBlogs,
  listFrontLitPages,
  listFrontLitThemes,
  listPublicFrontLitBlogs,
  provisionFrontLitTeam,
  publishFrontLitBlog,
  publishFrontLitPage,
  updateFrontLitBlog,
  updateFrontLitPage,
  updateFrontLitSettings,
  updateFrontLitTheme,
} from "./frontlit-client.js";

describe("FrontLit client", () => {
  it("declares every CourseLit system page as non-deletable", () => {
    const pages = COURSELIT_FRONTLIT_PROVISION_PAGES.filter(
      (page) => typeof page !== "string",
    );

    expect(pages.map((page) => page.slug)).toEqual(["", "terms", "privacy"]);
    expect(pages.every((page) => page.deletable === false)).toBe(true);
  });

  it("uses the provisioning secret only on the provisioning endpoint", async () => {
    let receivedHeaders: HeadersInit | undefined;
    let receivedBody = "";
    const result = await provisionFrontLitTeam(
      {
        externalId: "tnt_1",
        ownerEmail: "owner@example.com",
        name: "School",
        pages: COURSELIT_FRONTLIT_PROVISION_PAGES,
      },
      {
        config: {
          server: "http://frontlit.test",
          provisioningSecret: "provisioning-secret",
        },
        fetcher: async (_input, init) => {
          receivedHeaders = init?.headers;
          receivedBody = String(init?.body);
          return new Response(
            JSON.stringify({ teamId: "team_1", name: "School", apiKey: "fl_live_1" }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        },
      },
    );

    expect(result).toEqual({ teamId: "team_1", name: "School", apiKey: "fl_live_1" });
    expect(receivedHeaders).toMatchObject({
      "x-frontlit-provisioning-secret": "provisioning-secret",
    });
    expect(receivedHeaders).not.toMatchObject({
      "x-frontlit-apikey": expect.anything(),
    });
    expect(JSON.parse(receivedBody).pages).toEqual(COURSELIT_FRONTLIT_PROVISION_PAGES);
  });

  it("classifies authentication failures as operator action", async () => {
    await expect(
      provisionFrontLitTeam(
        { externalId: "tnt_1", ownerEmail: "owner@example.com", name: "School" },
        {
          config: { server: "http://frontlit.test", provisioningSecret: "bad" },
          fetcher: async () => new Response("forbidden", { status: 403 }),
        },
      ),
    ).rejects.toMatchObject({
      status: 403,
      retryable: false,
    });
  });

  it("lists pages with the stored team key and no provisioning credential", async () => {
    let requestUrl = "";
    let receivedHeaders: HeadersInit | undefined;
    const pages = await listFrontLitPages("team-key", {
      config: { server: "http://frontlit.test", provisioningSecret: "unused" },
      fetcher: async (input, init) => {
        requestUrl = String(input);
        receivedHeaders = init?.headers;
        return new Response(
          JSON.stringify({
            items: [
              { pageId: "page_1", name: "Homepage", slug: "", status: "published" },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    expect(requestUrl).toBe("http://frontlit.test/pages");
    expect(pages).toEqual([
      { id: "page_1", name: "Homepage", kind: "page", slug: "", status: "published" },
    ]);
    expect(receivedHeaders).toMatchObject({ "x-frontlit-apikey": "team-key" });
    expect(receivedHeaders).not.toMatchObject({
      "x-frontlit-provisioning-secret": expect.anything(),
    });
  });

  it("reads published site data without exposing a team key", async () => {
    const requests: string[] = [];
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      requests.push(String(input));
      expect(init?.headers).not.toMatchObject({
        "x-frontlit-apikey": expect.anything(),
      });
      if (String(input).endsWith("/settings")) {
        return new Response(
          JSON.stringify({
            title: "School",
            subtitle: "Learn with us",
            logo: { file: "https://cdn.example.com/logo.png", caption: "School logo" },
            themeId: "classic",
            theme: null,
          }),
          { status: 200 },
        );
      }
      if (String(input).includes("/pages?")) {
        return new Response(
          JSON.stringify({
            pageId: "page_1",
            name: "Homepage",
            slug: "",
            layout: [],
            title: "Welcome",
            description: null,
            socialImage: null,
            robotsAllowed: true,
            publishedAt: null,
            updatedAt: null,
          }),
          { status: 200 },
        );
      }
      if (String(input).includes("/content/articles?")) {
        return new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          documentId: "doc_1",
          slug: "hello",
          title: "Hello",
          content: null,
          excerpt: null,
          featuredImage: null,
          meta: {},
          publishedAt: null,
          updatedAt: null,
        }),
        { status: 200 },
      );
    };
    const config = { server: "http://frontlit.test", provisioningSecret: null };

    await expect(
      getPublicFrontLitSettings("team-public", { config, fetcher }),
    ).resolves.toMatchObject({
      title: "School",
      themeId: "classic",
      logo: { url: "https://cdn.example.com/logo.png", alt: "School logo" },
    });
    await expect(
      getPublicFrontLitPage("team-public", "", { config, fetcher }),
    ).resolves.toMatchObject({ pageId: "page_1", slug: "" });
    await expect(
      listPublicFrontLitBlogs("team-public", { config, fetcher }),
    ).resolves.toEqual({ items: [], total: 0 });
    await expect(
      getPublicFrontLitBlog("team-public", "hello", { config, fetcher }),
    ).resolves.toMatchObject({ documentId: "doc_1", slug: "hello" });
    expect(requests).toEqual([
      "http://frontlit.test/public/team-public/settings",
      "http://frontlit.test/public/team-public/pages?slug=",
      "http://frontlit.test/public/team-public/content/articles?offset=1&itemsPerPage=100",
      "http://frontlit.test/public/team-public/content/articles/hello",
    ]);
  });

  it("creates a page with the stored team key", async () => {
    let requestUrl = "";
    let receivedHeaders: HeadersInit | undefined;
    let receivedBody = "";
    const page = await createFrontLitPage({ name: "Pricing" }, "team-key", {
      config: { server: "http://frontlit.test", provisioningSecret: "unused" },
      fetcher: async (input, init) => {
        requestUrl = String(input);
        receivedHeaders = init?.headers;
        receivedBody = String(init?.body);
        return new Response(
          JSON.stringify({
            pageId: "page_1",
            name: "Pricing",
            slug: "pricing",
            status: "draft",
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        );
      },
    });

    expect(requestUrl).toBe("http://frontlit.test/pages");
    expect(page).toEqual({
      id: "page_1",
      name: "Pricing",
      kind: "page",
      slug: "pricing",
      status: "draft",
    });
    expect(receivedHeaders).toMatchObject({ "x-frontlit-apikey": "team-key" });
    expect(receivedHeaders).not.toMatchObject({
      "x-frontlit-provisioning-secret": expect.anything(),
    });
    expect(receivedBody).toBe(JSON.stringify({ name: "Pricing" }));
  });

  it("publishes a page with the stored team key", async () => {
    let requestUrl = "";
    let receivedHeaders: HeadersInit | undefined;
    const page = await publishFrontLitPage("page/1", "team-key", {
      config: { server: "http://frontlit.test", provisioningSecret: "unused" },
      fetcher: async (input, init) => {
        requestUrl = String(input);
        receivedHeaders = init?.headers;
        return new Response(
          JSON.stringify({
            pageId: "page/1",
            name: "Refund policy",
            slug: "refund",
            deletable: true,
            status: "published",
            layout: [],
            draftLayout: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    expect(requestUrl).toBe("http://frontlit.test/pages/page%2F1/publish");
    expect(page).toMatchObject({
      id: "page/1",
      name: "Refund policy",
      kind: "page",
      slug: "refund",
      status: "published",
      layout: [],
      draftLayout: [],
    });
    expect(receivedHeaders).toMatchObject({ "x-frontlit-apikey": "team-key" });
    expect(receivedHeaders).not.toMatchObject({
      "x-frontlit-provisioning-secret": expect.anything(),
    });
  });

  it("supports loading, saving, and discarding a page draft", async () => {
    const requests: Array<{ url: string; method: string; body: string }> = [];
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({
        url: String(input),
        method: init?.method ?? "GET",
        body: String(init?.body ?? ""),
      });
      return new Response(
        JSON.stringify({
          pageId: "page_1",
          name: "Refund policy",
          slug: "refund",
          deletable: true,
          status: "draft",
          layout: [],
          draftLayout: [],
          draftTitle: "Refund policy",
          draftDescription: "Updated",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const loaded = await getFrontLitPage("page_1", "team-key", {
      config: { server: "http://frontlit.test", provisioningSecret: null },
      fetcher,
    });
    await updateFrontLitPage(
      "page_1",
      { layout: [], title: "Refund policy", socialImage: null },
      "team-key",
      {
        config: { server: "http://frontlit.test", provisioningSecret: null },
        fetcher,
      },
    );
    await discardFrontLitPageDraft("page_1", "team-key", {
      config: { server: "http://frontlit.test", provisioningSecret: null },
      fetcher,
    });

    expect(loaded).toMatchObject({
      id: "page_1",
      name: "Refund policy",
      kind: "page",
      slug: "refund",
      status: "draft",
      draftLayout: [],
    });
    expect(requests).toEqual([
      { url: "http://frontlit.test/pages/page_1", method: "GET", body: "" },
      {
        url: "http://frontlit.test/pages/page_1",
        method: "PATCH",
        body: JSON.stringify({ layout: [], title: "Refund policy", socialImage: null }),
      },
      {
        url: "http://frontlit.test/pages/page_1/discard-draft",
        method: "POST",
        body: "",
      },
    ]);
  });

  it("lists blogs through FrontLit's content API", async () => {
    let requestUrl = "";
    const blogs = await listFrontLitBlogs("team-key", {
      config: { server: "http://frontlit.test", provisioningSecret: "unused" },
      fetcher: async (input) => {
        requestUrl = String(input);
        return new Response(
          JSON.stringify({
            items: [
              {
                documentId: "doc_1",
                draftTitle: "Hello",
                title: null,
                slug: "hello",
                status: "draft",
                draftExcerpt: "A short introduction.",
                draftFeaturedImage: {
                  file: "https://media.test/hello.png",
                },
                updatedAt: "2026-09-07T08:00:00.000Z",
              },
            ],
            total: 1,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    expect(requestUrl).toBe(
      "http://frontlit.test/content/articles?offset=1&itemsPerPage=100",
    );
    expect(blogs).toEqual([
      {
        id: "doc_1",
        name: "Hello",
        kind: "blog",
        slug: "hello",
        status: "draft",
        featuredImage: { url: "https://media.test/hello.png" },
        excerpt: "A short introduction.",
        updatedAt: "2026-09-07T08:00:00.000Z",
      },
    ]);
  });

  it("publishes a blog with the stored team key", async () => {
    let requestUrl = "";
    const blog = await publishFrontLitBlog("doc/1", "team-key", {
      config: { server: "http://frontlit.test", provisioningSecret: "unused" },
      fetcher: async (input) => {
        requestUrl = String(input);
        return new Response(
          JSON.stringify({
            documentId: "doc/1",
            draftTitle: "Hello",
            title: null,
            slug: "hello",
            status: "published",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    expect(requestUrl).toBe("http://frontlit.test/content/articles/doc%2F1/publish");
    expect(blog).toEqual({
      id: "doc/1",
      name: "Hello",
      kind: "blog",
      slug: "hello",
      status: "published",
    });
  });

  it("supports loading, saving, and discarding a blog draft", async () => {
    const requests: Array<{ url: string; method: string; body: string }> = [];
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({
        url: String(input),
        method: init?.method ?? "GET",
        body: String(init?.body ?? ""),
      });
      return new Response(
        JSON.stringify({
          documentId: "doc_1",
          draftTitle: "Hello",
          title: null,
          slug: "hello",
          status: "draft",
          meta: { tags: [] },
          draftMeta: { tags: [] },
          draftContent: { type: "doc", content: [] },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const loaded = await getFrontLitBlog("doc_1", "team-key", {
      config: { server: "http://frontlit.test", provisioningSecret: null },
      fetcher,
    });
    await updateFrontLitBlog(
      "doc_1",
      {
        title: "Hello again",
        content: { type: "doc", content: [] },
        featuredImage: {
          mediaId: "med_1",
          url: "https://media.test/assets/med_1",
          alt: "A cover image",
        },
      },
      "team-key",
      {
        config: { server: "http://frontlit.test", provisioningSecret: null },
        fetcher,
      },
    );
    await discardFrontLitBlogDraft("doc_1", "team-key", {
      config: { server: "http://frontlit.test", provisioningSecret: null },
      fetcher,
    });

    expect(loaded).toMatchObject({
      id: "doc_1",
      name: "Hello",
      kind: "blog",
      slug: "hello",
      status: "draft",
    });
    expect(requests).toEqual([
      {
        url: "http://frontlit.test/content/articles/doc_1",
        method: "GET",
        body: "",
      },
      {
        url: "http://frontlit.test/content/articles/doc_1",
        method: "PATCH",
        body: JSON.stringify({
          title: "Hello again",
          content: { type: "doc", content: [] },
          featuredImage: {
            mediaId: "med_1",
            url: "https://media.test/assets/med_1",
            alt: "A cover image",
          },
        }),
      },
      {
        url: "http://frontlit.test/content/articles/doc_1/discard-draft",
        method: "POST",
        body: "",
      },
    ]);
  });

  it("creates blogs through FrontLit's content API", async () => {
    let requestUrl = "";
    let receivedBody = "";
    const blog = await createFrontLitBlog({ title: "Hello" }, "team-key", {
      config: { server: "http://frontlit.test", provisioningSecret: "unused" },
      fetcher: async (input, init) => {
        requestUrl = String(input);
        receivedBody = String(init?.body);
        return new Response(
          JSON.stringify({
            documentId: "doc_1",
            draftTitle: "Hello",
            title: null,
            slug: "hello",
            status: "draft",
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        );
      },
    });

    expect(requestUrl).toBe("http://frontlit.test/content/articles");
    expect(receivedBody).toBe(JSON.stringify({ title: "Hello", meta: { tags: [] } }));
    expect(blog).toEqual({
      id: "doc_1",
      name: "Hello",
      kind: "blog",
      slug: "hello",
      status: "draft",
    });
  });

  it("loads and persists the FrontLit site theme through the stored team key", async () => {
    const requests: Array<{ url: string; method: string; body: string }> = [];
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({
        url: String(input),
        method: init?.method ?? "GET",
        body: String(init?.body ?? ""),
      });
      const url = String(input);
      const body = url.endsWith("/themes")
        ? { items: [] }
        : url.endsWith("/settings")
          ? { themeId: "classic" }
          : { themeId: "thm_brand", name: "Brand", style: { colors: {} } };
      return new Response(JSON.stringify(body), {
        status: init?.method === "POST" ? 201 : 200,
        headers: { "content-type": "application/json" },
      });
    };

    await getFrontLitSettings("team-key", {
      config: { server: "http://frontlit.test", provisioningSecret: null },
      fetcher,
    });
    await updateFrontLitSettings({ themeId: "classic" }, "team-key", {
      config: { server: "http://frontlit.test", provisioningSecret: null },
      fetcher,
    });
    await listFrontLitThemes("team-key", {
      config: { server: "http://frontlit.test", provisioningSecret: null },
      fetcher,
    });
    await createFrontLitTheme({ name: "Brand", style: { colors: {} } }, "team-key", {
      config: { server: "http://frontlit.test", provisioningSecret: null },
      fetcher,
    });
    await updateFrontLitTheme(
      "thm_brand",
      { name: "Brand 2", style: { colors: {} } },
      "team-key",
      {
        config: { server: "http://frontlit.test", provisioningSecret: null },
        fetcher,
      },
    );

    expect(requests).toEqual([
      { url: "http://frontlit.test/settings", method: "GET", body: "" },
      {
        url: "http://frontlit.test/settings",
        method: "PATCH",
        body: JSON.stringify({ themeId: "classic" }),
      },
      { url: "http://frontlit.test/themes", method: "GET", body: "" },
      {
        url: "http://frontlit.test/themes",
        method: "POST",
        body: JSON.stringify({ name: "Brand", style: { colors: {} } }),
      },
      {
        url: "http://frontlit.test/themes/thm_brand",
        method: "PATCH",
        body: JSON.stringify({ name: "Brand 2", style: { colors: {} } }),
      },
    ]);
  });

  it("normalizes deployment settings", () => {
    expect(
      frontLitConfig({
        FRONTLIT_SERVER: "http://frontlit.test/",
        FRONTLIT_APIKEY: " key ",
      }),
    ).toEqual({
      server: "http://frontlit.test",
      provisioningSecret: "key",
    });
  });
});
