import { describe, expect, test } from "bun:test";
import type { PublicProductDetail, PublicProductPlan } from "./courselit-public";
import { articleJsonLd, homeJsonLd, productJsonLd } from "./structured-data";

const settings = {
  title: "Acme Academy",
  subtitle: "Learn by building",
  logo: { mediaId: "m1", url: "https://cdn.example/logo.png" },
  siteOrigin: "https://learn.acme.com",
};

const product: PublicProductDetail = {
  id: "prd_1",
  slug: "react",
  title: "React in depth",
  description: "Hooks to server components",
  kind: "course",
  enrolled: false,
  leadMagnet: false,
  featuredImage: { mediaId: "m2", url: "https://cdn.example/react.png" },
  sections: [],
  lessons: [],
};

const plan = (overrides: Partial<PublicProductPlan>): PublicProductPlan => ({
  id: "pln_1",
  name: "One-time",
  description: "",
  type: "onetime",
  currency: "USD",
  amountMinor: 4900,
  billingInterval: null,
  installmentCount: null,
  isDefault: true,
  ...overrides,
});

describe("structured data", () => {
  test("needs the site origin", () => {
    expect(homeJsonLd({ ...settings, siteOrigin: null })).toBeNull();
    expect(productJsonLd(null, product, [])).toBeNull();
  });

  test("describes the school on the homepage", () => {
    expect(homeJsonLd(settings)).toEqual([
      expect.objectContaining({
        "@type": "Organization",
        name: "Acme Academy",
        url: "https://learn.acme.com",
        logo: "https://cdn.example/logo.png",
      }),
      expect.objectContaining({ "@type": "WebSite", description: "Learn by building" }),
    ]);
  });

  test("a course is a Course with its plans as offers", () => {
    expect(
      productJsonLd(settings, product, [
        plan({}),
        plan({ type: "free", amountMinor: 0 }),
      ]),
    ).toMatchObject({
      "@type": "Course",
      name: "React in depth",
      url: "https://learn.acme.com/p/react",
      image: "https://cdn.example/react.png",
      provider: { name: "Acme Academy", sameAs: "https://learn.acme.com" },
      offers: [
        { price: 49, priceCurrency: "USD", category: "Paid" },
        { price: 0, category: "Free" },
      ],
    });
  });

  test("a download is a Product", () => {
    expect(productJsonLd(settings, { ...product, kind: "download" }, [])).toMatchObject(
      {
        "@type": "Product",
        brand: { name: "Acme Academy" },
      },
    );
  });

  test("a blog post is a BlogPosting", () => {
    expect(
      articleJsonLd(settings, {
        blogId: "blg_1",
        slug: "hello",
        title: "Hello",
        content: null,
        excerpt: "First post",
        featuredImage: null,
        meta: {},
        author: { name: "Ada", imageUrl: null },
        createdAt: "2026-11-01T00:00:00.000Z",
        publishedAt: "2026-11-02T00:00:00.000Z",
        updatedAt: null,
      }),
    ).toMatchObject({
      "@type": "BlogPosting",
      headline: "Hello",
      author: { name: "Ada" },
      mainEntityOfPage: "https://learn.acme.com/blog/hello",
    });
  });
});
