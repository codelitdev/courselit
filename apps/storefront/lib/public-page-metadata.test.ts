import { describe, expect, it } from "bun:test";
import { metadataForPublicPage } from "./public-page-metadata";

describe("metadataForPublicPage", () => {
  it("formats homepage title as 'title | subtitle' and sets favicon icon", () => {
    const page = {
      pageId: "page-1",
      slug: "",
      name: "Homepage",
      title: null,
      description: null,
      layout: [],
      socialImage: null,
      robotsAllowed: null,
      publishedAt: null,
      updatedAt: null,
    };
    const settings = {
      title: "Anita School",
      subtitle: "Just a school",
      logo: { url: "https://example.com/logo.png" },
      themeId: null,
      theme: null,
      codeInjectionHead: "",
      codeInjectionBody: "",
    };

    const metadata = metadataForPublicPage(page, "Anita School", settings, true);
    expect(metadata.title).toEqual({ absolute: "Anita School | Just a school" });
    expect(metadata.description).toBe("Just a school");
    expect(metadata.icons).toEqual({
      icon: "https://example.com/logo.png",
      shortcut: "https://example.com/logo.png",
      apple: "https://example.com/logo.png",
    });
    expect(metadata.openGraph?.title).toBe("Anita School | Just a school");
    expect(metadata.openGraph?.description).toBe("Just a school");
    expect(metadata.alternates?.canonical).toBeUndefined();
    expect(metadata.openGraph?.images).toEqual([
      { url: "https://example.com/logo.png" },
    ]);
  });

  it("formats homepage title as 'title' when subtitle is absent", () => {
    const page = {
      pageId: "page-1",
      slug: "",
      name: "Homepage",
      title: null,
      description: null,
      layout: [],
      socialImage: null,
      robotsAllowed: null,
      publishedAt: null,
      updatedAt: null,
    };
    const settings = {
      title: "Anita School",
      subtitle: null,
      logo: null,
      themeId: null,
      theme: null,
      codeInjectionHead: "",
      codeInjectionBody: "",
    };

    const metadata = metadataForPublicPage(page, "Anita School", settings, true);
    expect(metadata.title).toEqual({ absolute: "Anita School" });
    expect(metadata.icons).toEqual({
      icon: "/icon.svg",
      shortcut: "/icon.svg",
      apple: "/icon.svg",
    });
    expect(metadata.openGraph?.images).toEqual([{ url: "/icon.svg" }]);
  });

  it("formats other public pages as 'page title | title'", () => {
    const page = {
      pageId: "page-terms",
      slug: "terms",
      name: "Terms of Service",
      title: "Terms of Service",
      description: null,
      layout: [],
      socialImage: null,
      robotsAllowed: null,
      publishedAt: null,
      updatedAt: null,
    };
    const settings = {
      title: "Anita School",
      subtitle: "Just a school",
      logo: { url: "https://example.com/logo.png" },
      themeId: null,
      theme: null,
      codeInjectionHead: "",
      codeInjectionBody: "",
    };

    const metadata = metadataForPublicPage(page, "Terms of Service", settings, false);
    expect(metadata.title).toEqual({ absolute: "Terms of Service | Anita School" });
    expect(metadata.alternates?.canonical).toBeUndefined();
  });

  it("filters out FrontLit default title and description", () => {
    const page = {
      pageId: "page-1",
      slug: "",
      name: "Homepage",
      title: "FrontLit — the front office of your SaaS",
      description:
        "Build your website, publish content, support users, and send email from one place.",
      layout: [],
      socialImage: null,
      robotsAllowed: null,
      publishedAt: null,
      updatedAt: null,
    };
    const settings = {
      title: "Anita School",
      subtitle: "Just a school",
      logo: null,
      themeId: null,
      theme: null,
      codeInjectionHead: "",
      codeInjectionBody: "",
    };

    const metadata = metadataForPublicPage(page, "Anita School", settings, true);
    expect(metadata.title).toEqual({ absolute: "Anita School | Just a school" });
    expect(metadata.description).toBe("Just a school");
  });

  it("preserves an authored custom title on other public pages", () => {
    const page = {
      pageId: "page-2",
      slug: "about",
      name: "About Us",
      title: "Learn More About Us",
      description: "Our mission and vision.",
      layout: [],
      socialImage: { url: "https://example.com/social.png" },
      robotsAllowed: true,
      publishedAt: null,
      updatedAt: null,
    };
    const settings = {
      title: "Anita School",
      subtitle: "Just a school",
      logo: { url: "https://example.com/logo.png" },
      themeId: null,
      theme: null,
      codeInjectionHead: "",
      codeInjectionBody: "",
    };

    const metadata = metadataForPublicPage(page, "About Us", settings, false);
    expect(metadata.title).toEqual({ absolute: "Learn More About Us | Anita School" });
    expect(metadata.description).toBe("Our mission and vision.");
    expect(metadata.openGraph?.images).toEqual([
      { url: "https://example.com/social.png" },
    ]);
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("builds canonical paths only when a verified custom host is available", () => {
    const page = {
      pageId: "page-about",
      slug: "about/us",
      name: "About Us",
      title: "About Us",
      description: null,
      layout: [],
      socialImage: null,
      robotsAllowed: null,
      publishedAt: null,
      updatedAt: null,
    };
    const metadata = metadataForPublicPage(page, "About Us", {
      title: "Anita School",
      subtitle: null,
      logo: null,
      themeId: null,
      theme: null,
      codeInjectionHead: "",
      codeInjectionBody: "",
      canonicalHost: "learn.example.com",
    });

    expect(metadata.alternates?.canonical).toBe("/about/us");
  });
});
