import type { Metadata } from "next";
import type { PublicPage, PublicSettings } from "./courselit-public";

function imageUrl(image: Record<string, unknown> | null): string | undefined {
  for (const key of ["file", "url", "src"]) {
    const value = image?.[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

export function metadataForPublicPage(
  page: PublicPage | null,
  fallbackTitle: string,
  settings?: PublicSettings | null,
  isHomepage = false,
): Metadata {
  const siteTitle = settings?.title?.trim() || fallbackTitle;
  const siteSubtitle = settings?.subtitle?.trim() || undefined;

  let title: string;
  if (isHomepage) {
    const rawTitle = page?.title?.trim();
    const isExcludedTitle =
      !rawTitle ||
      rawTitle.includes("FrontLit") ||
      rawTitle.toLowerCase() === "homepage";
    const homeTitle = isExcludedTitle ? siteTitle : rawTitle;
    title = siteSubtitle ? `${homeTitle} | ${siteSubtitle}` : homeTitle;
  } else {
    const rawTitle = page?.title?.trim();
    const isExcludedTitle =
      !rawTitle ||
      rawTitle.includes("FrontLit") ||
      rawTitle.toLowerCase() === "homepage";
    const specificTitle = isExcludedTitle ? fallbackTitle : rawTitle;
    title =
      siteTitle && specificTitle !== siteTitle
        ? `${specificTitle} | ${siteTitle}`
        : specificTitle;
  }

  const rawDescription = page?.description?.trim();
  const isExcludedDescription =
    !rawDescription ||
    rawDescription.includes("FrontLit") ||
    rawDescription.toLowerCase().includes("front office") ||
    rawDescription.includes("Build your website, publish content");
  const description = isExcludedDescription ? siteSubtitle : rawDescription;

  const siteLogoUrl =
    typeof settings?.logo?.url === "string" && settings.logo.url.trim()
      ? settings.logo.url.trim()
      : "/icon.svg";
  const socialImage = imageUrl(page?.socialImage ?? null) || siteLogoUrl;
  const robots =
    page?.robotsAllowed === null || page?.robotsAllowed === undefined
      ? undefined
      : { index: page.robotsAllowed !== false, follow: page.robotsAllowed !== false };
  const canonicalPath = isHomepage
    ? "/"
    : `/${(page?.slug ?? "")
        .split("/")
        .filter(Boolean)
        .map(encodeURIComponent)
        .join("/")}`;

  return {
    title: { absolute: title },
    description,
    ...(settings?.canonicalHost
      ? { alternates: { canonical: canonicalPath } }
      : {}),
    robots,
    icons: {
      icon: siteLogoUrl,
      shortcut: siteLogoUrl,
      apple: siteLogoUrl,
    },
    openGraph: {
      title,
      description,
      type: "website",
      ...(socialImage ? { images: [{ url: socialImage }] } : {}),
    },
    twitter: socialImage
      ? { card: "summary_large_image", images: [socialImage] }
      : undefined,
  };
}
