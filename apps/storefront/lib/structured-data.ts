import { minorToMajor } from "@courselit/api-contract/money";
import { blogPostingJsonLd, organizationAndWebsiteJsonLd } from "@frontlit/site-seo";
import type {
  PublicArticle,
  PublicProductDetail,
  PublicProductPlan,
  PublicSettings,
} from "./courselit-public";
import { siteTitle } from "./site-branding";

type Settings = Pick<
  PublicSettings,
  "title" | "subtitle" | "logo" | "siteOrigin"
> | null;

function mediaUrl(media: { url?: unknown } | null | undefined): string | null {
  return typeof media?.url === "string" && media.url.trim() ? media.url.trim() : null;
}

/** The storefront origin without a trailing slash, or null when unknown (no
 * structured data is better than data with relative URLs). */
function origin(settings: Settings): string | null {
  return settings?.siteOrigin?.replace(/\/$/, "") || null;
}

/** Organization and WebSite, for the homepage. */
export function homeJsonLd(settings: Settings) {
  const siteOrigin = origin(settings);
  if (!siteOrigin) return null;
  return organizationAndWebsiteJsonLd({
    siteName: siteTitle(settings),
    description: settings?.subtitle?.trim() || null,
    logoUrl: mediaUrl(settings?.logo),
    canonicalHost: new URL(siteOrigin).host,
  });
}

/** A course as a schema.org Course, a download as a Product, each with its
 * plans as offers. */
export function productJsonLd(
  settings: Settings,
  product: PublicProductDetail,
  plans: PublicProductPlan[],
) {
  const siteOrigin = origin(settings);
  if (!siteOrigin) return null;
  const url = `${siteOrigin}/p/${encodeURIComponent(product.slug || product.id)}`;
  const offers = plans.map((plan) => ({
    "@type": "Offer",
    name: plan.name,
    price: plan.type === "free" ? 0 : minorToMajor(plan.amountMinor, plan.currency),
    priceCurrency: plan.currency,
    category:
      plan.type === "free"
        ? "Free"
        : plan.type === "subscription"
          ? "Subscription"
          : "Paid",
    availability: "https://schema.org/InStock",
    url,
  }));
  const image = mediaUrl(product.featuredImage);
  const description = product.description?.trim() || undefined;
  if (product.kind === "course") {
    return {
      "@context": "https://schema.org",
      "@type": "Course",
      name: product.title,
      description,
      url,
      ...(image ? { image } : {}),
      provider: {
        "@type": "Organization",
        name: siteTitle(settings),
        sameAs: siteOrigin,
      },
      ...(offers.length > 0 ? { offers } : {}),
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description,
    url,
    ...(image ? { image } : {}),
    brand: { "@type": "Organization", name: siteTitle(settings) },
    ...(offers.length > 0 ? { offers } : {}),
  };
}

export function articleJsonLd(settings: Settings, article: PublicArticle) {
  const siteOrigin = origin(settings);
  if (!siteOrigin) return null;
  return blogPostingJsonLd({
    title: article.title ?? article.slug,
    excerpt: article.excerpt,
    imageUrl: mediaUrl(article.featuredImage),
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    authorName: article.author?.name ?? null,
    url: `${siteOrigin}/blog/${encodeURIComponent(article.slug)}`,
  });
}
