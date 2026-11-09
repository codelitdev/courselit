import { describe, expect, it } from "bun:test";
import {
  DEFAULT_SITE_LOGO_URL,
  DEFAULT_SITE_TITLE,
  siteLogoAlt,
  siteLogoUrl,
  siteTitle,
} from "./site-branding";

describe("site branding defaults", () => {
  it("falls back to the CourseLit title and mark, like main", () => {
    for (const settings of [null, undefined, { title: null, logo: null }]) {
      expect(siteTitle(settings)).toBe(DEFAULT_SITE_TITLE);
      expect(siteLogoUrl(settings)).toBe(DEFAULT_SITE_LOGO_URL);
      expect(siteLogoAlt(settings)).toBe(DEFAULT_SITE_TITLE);
    }
    expect(siteTitle({ title: "   ", logo: { url: "  " } })).toBe(DEFAULT_SITE_TITLE);
    expect(siteLogoUrl({ title: "   ", logo: { url: "  " } })).toBe(DEFAULT_SITE_LOGO_URL);
  });

  it("uses the school's own title and logo when set", () => {
    const settings = {
      title: " Anita School ",
      logo: { url: " https://example.com/logo.png ", alt: "" },
    };
    expect(siteTitle(settings)).toBe("Anita School");
    expect(siteLogoUrl(settings)).toBe("https://example.com/logo.png");
    expect(siteLogoAlt(settings)).toBe("Anita School");
    expect(siteLogoAlt({ ...settings, logo: { ...settings.logo, alt: "Logo" } })).toBe(
      "Logo",
    );
  });
});
