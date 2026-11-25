import type { SitemapUrl } from "@frontlit/site-seo";
import type { PublicSettings, PublicSitemap } from "./courselit-public";

/** Learner-only and transactional paths no crawler should fetch. */
export const ROBOTS_DISALLOW = ["/dashboard", "/checkout", "/auth/", "/api/"];

/** The host robots.txt and sitemap.xml point at: the school's verified custom
 * domain, else the host the request came in on (its subdomain). */
export function canonicalSiteHost(
  settings: Pick<PublicSettings, "canonicalHost"> | null,
  headers: Headers,
): string {
  const forwarded = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return settings?.canonicalHost || forwarded || headers.get("host") || "localhost";
}

function segment(slug: string): string {
  return slug.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

/** Every public URL of a school's storefront, for sitemap.xml. */
export function sitemapUrls(sitemap: PublicSitemap): SitemapUrl[] {
  const urls: SitemapUrl[] = [];
  const pages = [...sitemap.pages].sort((a, b) =>
    a.slug === "" ? -1 : b.slug === "" ? 1 : a.slug.localeCompare(b.slug),
  );
  for (const page of pages) {
    urls.push({
      path: page.slug ? `/${segment(page.slug)}` : "/",
      lastmod: page.updatedAt,
    });
  }
  if (sitemap.products.length > 0) urls.push({ path: "/products" });
  for (const resource of [...sitemap.products, ...sitemap.communities]) {
    urls.push({ path: `/p/${segment(resource.slug)}`, lastmod: resource.updatedAt });
  }
  if (sitemap.blogPosts.length > 0) urls.push({ path: "/blog" });
  for (const post of sitemap.blogPosts) {
    urls.push({ path: `/blog/${segment(post.slug)}`, lastmod: post.updatedAt });
  }
  return urls;
}
