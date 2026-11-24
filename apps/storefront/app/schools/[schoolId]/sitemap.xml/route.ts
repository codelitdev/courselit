import { buildSitemapXml } from "@frontlit/site-seo";
import { getSettings, getSitemap } from "@/lib/courselit-public";
import { canonicalSiteHost, sitemapUrls } from "@/lib/site-seo";

export async function GET(
  request: Request,
  context: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await context.params;
  const [settings, sitemap] = await Promise.all([
    getSettings(schoolId),
    getSitemap(schoolId),
  ]);
  const urls = settings?.hideFromSearch || !sitemap ? [] : sitemapUrls(sitemap);
  return new Response(
    buildSitemapXml(canonicalSiteHost(settings, request.headers), urls),
    {
      headers: { "content-type": "application/xml; charset=utf-8" },
    },
  );
}
