import { describe, expect, test } from "bun:test";
import { canonicalSiteHost, sitemapUrls } from "./site-seo";

describe("canonicalSiteHost", () => {
  test("prefers the verified custom domain", () => {
    expect(
      canonicalSiteHost(
        { canonicalHost: "learn.example.com" },
        new Headers({ host: "acme.courselit.app" }),
      ),
    ).toBe("learn.example.com");
  });

  test("falls back to the forwarded host, then the host", () => {
    expect(
      canonicalSiteHost(
        { canonicalHost: null },
        new Headers({
          host: "internal:3001",
          "x-forwarded-host": "acme.courselit.app, proxy",
        }),
      ),
    ).toBe("acme.courselit.app");
    expect(canonicalSiteHost(null, new Headers({ host: "acme.courselit.app" }))).toBe(
      "acme.courselit.app",
    );
  });
});

describe("sitemapUrls", () => {
  test("lists the homepage first, then pages, products, communities and posts", () => {
    const at = "2026-11-24T00:00:00.000Z";
    expect(
      sitemapUrls({
        pages: [
          { slug: "about", updatedAt: at },
          { slug: "", updatedAt: at },
        ],
        products: [{ slug: "react course", updatedAt: at }],
        communities: [{ slug: "makers", updatedAt: at }],
        blogPosts: [{ slug: "hello", updatedAt: at }],
      }),
    ).toEqual([
      { path: "/", lastmod: at },
      { path: "/about", lastmod: at },
      { path: "/products" },
      { path: "/p/react%20course", lastmod: at },
      { path: "/p/makers", lastmod: at },
      { path: "/blog" },
      { path: "/blog/hello", lastmod: at },
    ]);
  });

  test("leaves out the catalog and blog index when they are empty", () => {
    expect(
      sitemapUrls({ pages: [], products: [], communities: [], blogPosts: [] }),
    ).toEqual([]);
  });
});
