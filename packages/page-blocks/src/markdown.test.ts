import { describe, expect, test } from "bun:test";
import type { PageData, WidgetInstance } from "@frontlit/page-builder/models";
import { layoutToMarkdown } from "@frontlit/page-builder/schema";
import { courseLitBlocksMarkdown, richTextMarkdown } from "./markdown";

const block = (name: string, settings: Record<string, unknown> = {}): WidgetInstance => ({
  widgetId: name,
  name,
  deletable: true,
  moveable: true,
  shared: false,
  settings,
});

const pageData = (data: Record<string, unknown>) =>
  ({
    siteTitle: null,
    siteSubtitle: null,
    siteLogoUrl: "",
    siteLogoAlt: "",
    ...data,
  }) as PageData;

const doc = (value: string) =>
  JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: value }] }],
  });

describe("courseLitBlocksMarkdown", () => {
  test("a sales page reads as title, description, pricing and curriculum", () => {
    const blocks = courseLitBlocksMarkdown(
      pageData({
        siteTitle: "Acme",
        courseLitSalesData: {
          resourceType: "product",
          product: {
            id: "prd_1",
            slug: "react",
            kind: "course",
            title: "React in depth",
            description: doc("Hooks to server components."),
            leadMagnet: false,
            featuredImage: null,
            sections: [{ id: "s1", title: "Basics" }],
            lessons: [
              {
                id: "l1",
                title: "Why React",
                sectionId: "s1",
                requiresEnrollment: false,
              },
              { id: "l2", title: "Bonus", sectionId: null, requiresEnrollment: true },
            ],
            plans: [
              {
                id: "p1",
                name: "Lifetime",
                type: "onetime",
                currency: "USD",
                amountMinor: 4900,
              },
            ],
          },
        },
      }),
    );
    const markdown = layoutToMarkdown(
      [
        block("header"),
        block("courselit-product"),
        block("courselit-product-curriculum"),
        block("footer"),
      ],
      { blocks },
    );
    expect(markdown).toContain("## React in depth");
    expect(markdown).toContain("Hooks to server components.");
    expect(markdown).toMatch(/- \*\*Lifetime\*\*: \$49\.00/);
    expect(markdown).toContain("## Curriculum");
    expect(markdown).toContain("### Basics\n\n- Why React");
    expect(markdown).toContain("- Bonus");
  });

  test("the homepage lists the school's offers", () => {
    const blocks = courseLitBlocksMarkdown(
      pageData({
        siteTitle: "Acme",
        siteSubtitle: "Learn by building",
        courseLitHome: {
          offers: [
            {
              id: "prd_1",
              slug: "react",
              kind: "course",
              title: "React in depth",
              description: "Hooks",
              featuredImage: null,
              priceMinor: null,
              currency: "USD",
            },
          ],
        },
      }),
    );
    const markdown = layoutToMarkdown(
      [
        block("courselit-home-hero"),
        block("courselit-home-offers"),
        block("newsletter-signup"),
      ],
      { blocks },
    );
    expect(markdown).toContain("## Learn by building");
    expect(markdown).toContain("[Start learning](/p/react)");
    expect(markdown).toContain("- [React in depth](/p/react) (Course, Free): Hooks");
    expect(markdown).toContain("## Get updates from Acme");
  });

  test("blocks without their data are left out", () => {
    const markdown = layoutToMarkdown(
      [block("courselit-product"), block("courselit-home-offers")],
      { blocks: courseLitBlocksMarkdown(pageData({})) },
    );
    expect(markdown.trim()).toBe("");
  });

  test("rich text blocks hold TipTap JSON", () => {
    expect(richTextMarkdown(JSON.parse(doc("Terms apply.")))).toBe("Terms apply.");
    expect(richTextMarkdown("plain words")).toBe("plain words");
  });
});
