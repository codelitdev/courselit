import { describe, expect, it } from "bun:test";
import { salesPageLayout, salesPageSlug } from "./frontlit-sales-pages.js";

const sharedChrome = {
  headerSettings: {
    ctaLabel: "Join",
    ctaHref: "/join",
    links: [{ id: "blog", label: "Blog", href: "/blog" }],
  },
  footerSettings: {
    tagline: "Build, Sell & Market Your Courses And Digital Downloads",
    columns: [{ id: "resources", title: "Resources", links: [] }],
  },
};

describe("CourseLit FrontLit sales pages", () => {
  it("uses FrontLit-compatible slugs for public IDs", () => {
    expect(salesPageSlug("product", "prd_01ABC_def")).toBe(
      "courselit-sales-product-prd-01abc-def",
    );
    expect(salesPageSlug("community", "com_01ABC_def")).toBe(
      "courselit-sales-community-com-01abc-def",
    );
  });

  it("creates product banner and curriculum blocks between shared site chrome", () => {
    const layout = salesPageLayout({
      resourceType: "product",
      resourceId: "prd_1",
      name: "Course",
      description: "Learn something useful.",
      productKind: "course",
      sharedChrome,
    });

    expect(layout.map((widget) => widget.name)).toEqual([
      "header",
      "courselit-product",
      "courselit-product-curriculum",
      "footer",
    ]);
    expect(layout[0]?.settings).toEqual(sharedChrome.headerSettings);
    expect(layout.at(-1)?.settings).toEqual(sharedChrome.footerSettings);
    expect(layout[1]).toMatchObject({
      name: "courselit-product",
      deletable: false,
      settings: {
        textPosition: "left",
      },
    });
    expect(layout[2]).toMatchObject({
      name: "courselit-product-curriculum",
      deletable: false,
      settings: { title: "Curriculum" },
    });
  });

  it("does not add a curriculum block to digital downloads", () => {
    const layout = salesPageLayout({
      resourceType: "product",
      resourceId: "prd_1",
      name: "Download",
      description: "A download.",
      productKind: "download",
      sharedChrome,
    });

    expect(layout.map((widget) => widget.name)).toEqual([
      "header",
      "courselit-product",
      "footer",
    ]);
  });

  it("uses the Community block for community sales pages", () => {
    const layout = salesPageLayout({
      resourceType: "community",
      resourceId: "com_1",
      name: "Community",
      description: "Join a community.",
      sharedChrome,
    });

    expect(layout.map((widget) => widget.name)).toEqual([
      "header",
      "courselit-community",
      "footer",
    ]);
    expect(layout[1]).toMatchObject({
      name: "courselit-community",
      deletable: false,
      settings: {
        textPosition: "left",
        textAlignment: "left",
      },
    });
  });
});
