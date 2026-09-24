import { describe, expect, it } from "bun:test";
import type { WidgetInstance } from "@frontlit/page-builder/models";
import { normalizeCourseLitSiteLayout } from "./site-layout";

describe("normalizeCourseLitSiteLayout", () => {
  it("routes the default header CTA to CourseLit join", () => {
    const layout: WidgetInstance[] = [
      {
        widgetId: "header",
        name: "header",
        deletable: false,
        moveable: false,
        shared: true,
        settings: { ctaLabel: "Get started", ctaHref: "/help" },
      },
    ];

    expect(normalizeCourseLitSiteLayout(layout)[0]?.settings).toMatchObject({
      ctaLabel: "Get started",
      ctaHref: "/join",
    });
  });

  it("uses the CourseLit destination when the builder default is omitted", () => {
    const layout: WidgetInstance[] = [
      {
        widgetId: "header",
        name: "header",
        deletable: false,
        moveable: false,
        shared: true,
      },
    ];

    expect(normalizeCourseLitSiteLayout(layout)[0]?.settings?.ctaHref).toBe("/join");
  });

  it("preserves custom header destinations and non-header blocks", () => {
    const header: WidgetInstance = {
      widgetId: "header",
      name: "header",
      deletable: false,
      moveable: false,
      shared: true,
      settings: { ctaLabel: "Get started", ctaHref: "/products" },
    };
    const body: WidgetInstance = {
      widgetId: "body",
      name: "rich-text",
      deletable: true,
      moveable: true,
      shared: false,
    };

    const normalized = normalizeCourseLitSiteLayout([header, body]);
    expect(normalized[0]).toBe(header);
    expect(normalized[1]).toBe(body);
  });
});
