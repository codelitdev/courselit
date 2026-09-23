import type { Metadata } from "next";
import type { PublicPage } from "./courselit-public";

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
): Metadata {
  if (!page) return { title: fallbackTitle };

  const title = page.title || page.name || fallbackTitle;
  const description = page.description ?? undefined;
  const socialImage = imageUrl(page.socialImage);
  const robots =
    page.robotsAllowed === null
      ? undefined
      : { index: page.robotsAllowed !== false, follow: page.robotsAllowed !== false };

  return {
    title,
    description,
    robots,
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
