import type { Metadata } from "next";
import type { PublicPage, PublicSettings } from "./courselit-public";

function imageUrl(image: { url?: unknown } | null): string | undefined {
  return typeof image?.url === "string" && image.url.trim() ? image.url : undefined;
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
    const isExcludedTitle = !rawTitle || rawTitle.toLowerCase() === "homepage";
    const homeTitle = isExcludedTitle ? siteTitle : rawTitle;
    title = siteSubtitle ? `${homeTitle} | ${siteSubtitle}` : homeTitle;
  } else {
    const rawTitle = page?.title?.trim();
    const isExcludedTitle = !rawTitle || rawTitle.toLowerCase() === "homepage";
    const specificTitle = isExcludedTitle ? fallbackTitle : rawTitle;
    title =
      siteTitle && specificTitle !== siteTitle
        ? `${specificTitle} | ${siteTitle}`
        : specificTitle;
  }

  const rawDescription = page?.description?.trim();
  const description = rawDescription || siteSubtitle;

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
