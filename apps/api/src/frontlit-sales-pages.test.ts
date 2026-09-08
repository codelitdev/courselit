import { describe, expect, it } from "bun:test";
import { salesPageLayout, salesPageSlug } from "./frontlit-sales-pages.js";

describe("CourseLit FrontLit sales pages", () => {
  it("uses FrontLit-compatible slugs for public IDs", () => {
    expect(salesPageSlug("product", "prd_01ABC_def")).toBe(
      "courselit-sales-product-prd-01abc-def",
    );
    expect(salesPageSlug("community", "com_01ABC_def")).toBe(
      "courselit-sales-community-com-01abc-def",
    );
  });

  it("creates a locked banner between shared site chrome", () => {
    const layout = salesPageLayout({
      resourceType: "product",
      resourceId: "prd_1",
      name: "Course",
      description: "Learn something useful.",
    });

    expect(layout.map((widget) => widget.name)).toEqual([
      "header",
      "banner",
      "data-slot",
      "footer",
    ]);
    expect(layout[1]).toMatchObject({
      name: "banner",
      deletable: false,
      settings: {
        buttonCaption: "Buy now",
        buttonAction: "/product/prd_1#checkout",
      },
    });
    expect(layout[2]).toMatchObject({
      name: "data-slot",
      deletable: false,
      settings: { slot: "courselit.sales-page-content" },
    });
  });
});
