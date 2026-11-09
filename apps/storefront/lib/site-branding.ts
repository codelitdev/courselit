import type { PublicSettings } from "./courselit-public";

/**
 * The defaults main uses when a school has not set its own branding. Keep
 * every storefront surface (header, tab title, icons, social cards) on these
 * helpers so none of them renders a blank logo or title.
 */
export const DEFAULT_SITE_TITLE = "CourseLit";
export const DEFAULT_SITE_LOGO_URL = "/icon.svg";

type Branding = Pick<PublicSettings, "title" | "logo"> | null | undefined;

export function siteTitle(settings: Branding): string {
  return settings?.title?.trim() || DEFAULT_SITE_TITLE;
}

export function siteLogoUrl(settings: Branding): string {
  const url = settings?.logo?.url;
  return typeof url === "string" && url.trim() ? url.trim() : DEFAULT_SITE_LOGO_URL;
}

export function siteLogoAlt(settings: Branding): string {
  return settings?.logo?.alt?.trim() || siteTitle(settings);
}
