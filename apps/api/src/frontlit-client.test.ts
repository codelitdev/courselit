import { describe, expect, it } from "bun:test";
import {
  COURSELIT_FRONTLIT_PROVISION_PAGES,
  COURSELIT_HOME_PAGE_TEMPLATE,
  configureCourseLitSharedChrome,
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

  it("seeds the homepage with the CourseLit starter layout", () => {
    expect(COURSELIT_HOME_PAGE_TEMPLATE.map((widget) => widget.name)).toEqual([
      "rich-text",
      "hero",
      "grid",
      "faq",
      "newsletter-signup",
      "rich-text",
      "rich-text",
    ]);
    expect(COURSELIT_FRONTLIT_PROVISION_PAGES[0]).toMatchObject({
      slug: "",
      name: "Homepage",
      deletable: false,
    });
    const pages = COURSELIT_FRONTLIT_PROVISION_PAGES.filter(
      (page) => typeof page !== "string",
    );
    expect(pages[0]?.layout).toEqual([...COURSELIT_HOME_PAGE_TEMPLATE]);
    expect(pages[1]?.layout).toBeUndefined();
    expect(pages[2]?.layout).toBeUndefined();
    expect(COURSELIT_HOME_PAGE_TEMPLATE[0]?.settings?.verticalPadding).toBe("py-1");
    expect(COURSELIT_HOME_PAGE_TEMPLATE[1]?.settings).toMatchObject({
      secondaryButtonCaption: "",
      secondaryButtonAction: "",
    });
    expect(COURSELIT_HOME_PAGE_TEMPLATE[3]?.settings).toMatchObject({
      title: "Frequently Asked Questions",
      verticalPadding: "py-8",
    });
    expect(COURSELIT_HOME_PAGE_TEMPLATE[3]?.settings).not.toHaveProperty("subtitle");
    expect(
      COURSELIT_HOME_PAGE_TEMPLATE.slice(-2).map(
        (widget) => widget.settings?.verticalPadding,
      ),
    ).toEqual(["py-0", "py-1"]);
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

  it("passes the configured custom-domain DNS profile when provisioning a team", async () => {
    let receivedBody = "";
    await provisionFrontLitTeam(
      {
        externalId: "tnt_dns_profile",
        ownerEmail: "owner@example.com",
        name: "School",
      },
      {
        config: {
          server: "http://frontlit.test",
          provisioningSecret: "provisioning-secret",
          customDomainCnameTarget: "domains.courselit.example",
          customDomainTxtRecordName: "_courselit-verification",
        },
        fetcher: async (_input, init) => {
          receivedBody = String(init?.body);
          return Response.json({ teamId: "team_1", name: "School" });
        },
      },
    );

    expect(JSON.parse(receivedBody)).toMatchObject({
      customDomainCnameTarget: "domains.courselit.example",
      customDomainTxtRecordName: "_courselit-verification",
    });
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

  it("configures shared site chrome through the homepage once", async () => {
    const requests: Array<{ path: string; method: string; body: unknown }> = [];
    const layout = [
      {
        widgetId: "header-1",
        name: "header",
        deletable: false,
        moveable: false,
        shared: true,
        settings: {},
      },
      {
        widgetId: "body-1",
        name: "rich-text",
        deletable: true,
        moveable: true,
        shared: false,
        settings: { text: "Keep this content" },
      },
      {
        widgetId: "footer-1",
        name: "footer",
        deletable: false,
        moveable: false,
        shared: true,
        settings: {},
      },
    ];
    await configureCourseLitSharedChrome("team-key", "page-home", {
      config: { server: "http://frontlit.test", provisioningSecret: null },
      fetcher: async (input, init) => {
        const path = new URL(String(input)).pathname;
        const method = init?.method ?? "GET";
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        requests.push({ path, method, body });
        const response = {
          pageId: "page-home",
          name: "Homepage",
          slug: "",
          status: "published",
          layout,
          draftLayout: layout,
        };
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });

    expect(requests.map(({ path, method }) => `${method} ${path}`)).toEqual([
      "GET /pages/page-home",
      "PATCH /pages/page-home",
      "POST /pages/page-home/publish",
    ]);
    const patch = requests[1]?.body as { layout: typeof layout };
    expect(patch.layout[0]?.settings).toMatchObject({
      logoText: "CourseLit",
      logoImage: "/icon.svg",
      ctaLabel: "Join",
      ctaHref: "/join",
      links: [
        { id: "courselit-header-products", label: "Products", href: "/products" },
        { id: "courselit-header-blog", label: "Blog", href: "/blog" },
      ],
    });
    expect(patch.layout[1]).toEqual(layout[1]);
    expect(patch.layout[2]?.settings).toMatchObject({
      logoText: "CourseLit",
      tagline: "Build, Sell & Market Your Courses And Digital Downloads",
      copyrightText: "© CourseLit. All rights reserved.",
      columns: [
        { title: "Resources", links: [{ label: "Blog", href: "/blog" }] },
        {
          title: "Legal",
          links: [
            { label: "Terms of use", href: "/terms" },
            { label: "Privacy policy", href: "/privacy" },
          ],
        },
      ],
    });
  });

  it("repairs stale draft chrome when published chrome is already configured", async () => {
    const header = {
      widgetId: "header-1",
      name: "header",
      deletable: false,
      moveable: false,
      shared: true,
      settings: {
        logoText: "CourseLit",
        logoImage: "/icon.svg",
        ctaLabel: "Join",
        ctaHref: "/join",
        links: [
          { id: "courselit-header-products", label: "Products", href: "/products" },
          { id: "courselit-header-blog", label: "Blog", href: "/blog" },
        ],
      },
    };
    const body = {
      widgetId: "body-1",
      name: "rich-text",
      deletable: true,
      moveable: true,
      shared: false,
      settings: { text: "Homepage content" },
    };
    const footer = {
      widgetId: "footer-1",
      name: "footer",
      deletable: false,
      moveable: false,
      shared: true,
      settings: {
        logoText: "CourseLit",
        tagline: "Build, Sell & Market Your Courses And Digital Downloads",
        copyrightText: "© CourseLit. All rights reserved.",
        columns: [
          {
            id: "courselit-footer-resources",
            title: "Resources",
            links: [{ id: "courselit-footer-blog", label: "Blog", href: "/blog" }],
          },
          {
            id: "courselit-footer-legal",
            title: "Legal",
            links: [
              { id: "courselit-footer-terms", label: "Terms of use", href: "/terms" },
              {
                id: "courselit-footer-privacy",
                label: "Privacy policy",
                href: "/privacy",
              },
            ],
          },
        ],
      },
    };
    const publishedLayout = [header, body, footer];
    const draftLayout = [
      {
        ...header,
        settings: {
          links: [{ id: "features", label: "Features", href: "/#features" }],
        },
      },
      body,
      {
        ...footer,
        settings: {
          columns: [
            { id: "product", title: "Product", links: [] },
            { id: "resources", title: "Resources", links: [] },
            { id: "legal", title: "Legal", links: [] },
          ],
        },
      },
    ];
    const requests: Array<{ method: string; body: unknown }> = [];
    await configureCourseLitSharedChrome("team-key", "page-home", {
      config: { server: "http://frontlit.test", provisioningSecret: null },
      fetcher: async (_input, init) => {
        const method = init?.method ?? "GET";
        const requestBody = init?.body ? JSON.parse(String(init.body)) : null;
        requests.push({ method, body: requestBody });
        return new Response(
          JSON.stringify({
            pageId: "page-home",
            name: "Homepage",
            slug: "",
            status: "published_with_changes",
            layout: publishedLayout,
            draftLayout,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    expect(requests.map(({ method }) => method)).toEqual(["GET", "PATCH", "POST"]);
    const patch = requests[1]?.body as { layout: typeof draftLayout };
    expect(patch.layout[0]?.settings).toMatchObject(header.settings);
    expect(patch.layout[1]).toEqual(body);
    expect(patch.layout[2]?.settings).toMatchObject(footer.settings);
  });

  it("replaces FrontLit default SaaS blocks with COURSELIT_HOME_PAGE_TEMPLATE and clears FrontLit SaaS title", async () => {
    const defaultFrontLitLayout = [
      {
        widgetId: "h",
        name: "header",
        deletable: false,
        moveable: false,
        shared: true,
        settings: {},
      },
      {
        widgetId: "hero-1",
        name: "hero",
        deletable: true,
        moveable: true,
        shared: false,
        settings: { preTitle: "The front office of your SaaS" },
      },
      {
        widgetId: "feat-1",
        name: "featured",
        deletable: true,
        moveable: true,
        shared: false,
        settings: {},
      },
      {
        widgetId: "price-1",
        name: "pricing",
        deletable: true,
        moveable: true,
        shared: false,
        settings: {},
      },
      {
        widgetId: "f",
        name: "footer",
        deletable: false,
        moveable: false,
        shared: true,
        settings: {},
      },
    ];
    const requests: Array<{ method: string; body: unknown }> = [];
    await configureCourseLitSharedChrome("team-key", "page-home", {
      config: { server: "http://frontlit.test", provisioningSecret: null },
      fetcher: async (_input, init) => {
        const method = init?.method ?? "GET";
        const requestBody = init?.body ? JSON.parse(String(init.body)) : null;
        requests.push({ method, body: requestBody });
        return new Response(
          JSON.stringify({
            pageId: "page-home",
            name: "Homepage",
            title: "FrontLit — the front office of your SaaS",
            description:
              "Build your website, publish content, support users, and send email from one place.",
            slug: "",
            status: "published",
            layout: defaultFrontLitLayout,
            draftLayout: defaultFrontLitLayout,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    const patch = requests[1]?.body as {
      layout: Array<{ name: string }>;
      title?: string;
      description?: string;
    };
    expect(patch.title).toBe("");
    expect(patch.description).toBe("");
    expect(patch.layout.map((w) => w.name)).toEqual([
      "header",
      ...COURSELIT_HOME_PAGE_TEMPLATE.map((w) => w.name),
      "footer",
    ]);
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
        FRONTLIT_CUSTOM_DOMAIN_CNAME_TARGET: " DOMAINS.COURSELIT.EXAMPLE. ",
        FRONTLIT_CUSTOM_DOMAIN_TXT_RECORD_NAME: " _CourseLit-verification ",
      }),
    ).toEqual({
      server: "http://frontlit.test",
      provisioningSecret: "key",
      customDomainCnameTarget: "domains.courselit.example",
      customDomainTxtRecordName: "_courselit-verification",
    });
  });
});
