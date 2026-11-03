import { describe, expect, it } from "bun:test";
import type { WidgetInstance } from "@frontlit/page-builder/models";
import { chromeForSchool } from "./site-chrome";

const header: WidgetInstance = {
  widgetId: "h",
  name: "header",
  deletable: false,
  moveable: false,
  shared: true,
  settings: {
    links: [
      { id: "p", label: "Products", href: "/products" },
      { id: "b", label: "Blog", href: "/blog" },
    ],
  },
};
const footer: WidgetInstance = {
  widgetId: "f",
  name: "footer",
  deletable: false,
  moveable: false,
  shared: true,
  settings: {
    columns: [
      { id: "r", title: "Resources", links: [{ id: "b", label: "Blog", href: "/blog" }] },
      {
        id: "l",
        title: "Legal",
        links: [
          { id: "t", label: "Terms", href: "/terms" },
          { id: "pp", label: "Privacy", href: "/privacy" },
        ],
      },
    ],
  },
};
const offer = (kind: "course" | "community") => ({
  id: "1",
  slug: "x",
  kind,
  title: "X",
  description: "",
  featuredImage: null,
  priceMinor: null,
  currency: "usd",
});

describe("chromeForSchool", () => {
  it("hides empty sections, unpublished legal links and names the school in the copyright", () => {
    const [h, f] = chromeForSchool([header, footer], {
      siteTitle: "Acme",
      offers: [],
      hasPosts: false,
      legal: { terms: false, privacy: false },
    });
    expect(h!.settings!.links).toEqual([]);
    expect(f!.settings!.columns).toEqual([]);
    expect(f!.settings!.copyrightText).toBe(`© ${new Date().getFullYear()} Acme`);
  });

  it("shows links once there is something behind them", () => {
    const [h, f] = chromeForSchool([header, footer], {
      siteTitle: "Acme",
      offers: [offer("course")],
      hasPosts: true,
      legal: { terms: true, privacy: false },
    });
    expect((h!.settings!.links as unknown[]).length).toBe(2);
    const legal = (f!.settings!.columns as Array<{ id: string; links: unknown[] }>).find(
      (column) => column.id === "l",
    );
    expect(legal!.links.length).toBe(1);
  });

  it("points Products at the community when that is the only offer", () => {
    const [h] = chromeForSchool([header], {
      siteTitle: null,
      offers: [offer("community")],
      hasPosts: false,
      legal: { terms: false, privacy: false },
    });
    expect(h!.settings!.links).toEqual([
      { id: "p", label: "Community", href: "/communities" },
    ]);
  });
});
