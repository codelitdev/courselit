import { buildRssFeed } from "@frontlit/site-seo";
import { getSettings, listPublicArticles } from "@/lib/courselit-public";
import { siteTitle } from "@/lib/site-branding";
import { canonicalSiteHost } from "@/lib/site-seo";

/** The school's blog as RSS 2.0: the 50 newest published posts. */
export async function GET(
  request: Request,
  context: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await context.params;
  const [settings, { items }] = await Promise.all([
    getSettings(schoolId),
    listPublicArticles(schoolId),
  ]);
  const origin =
    settings?.siteOrigin?.replace(/\/$/, "") ||
    `https://${canonicalSiteHost(settings, request.headers)}`;
  const xml = buildRssFeed({
    title: `${siteTitle(settings)} Blog`,
    description: settings?.subtitle?.trim() || null,
    feedUrl: `${origin}/blog/rss.xml`,
    siteUrl: `${origin}/blog`,
    items: items.slice(0, 50).map((post) => ({
      title: post.title ?? post.slug,
      url: `${origin}/blog/${encodeURIComponent(post.slug)}`,
      description: post.excerpt,
      pubDate: post.publishedAt,
    })),
  });
  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
