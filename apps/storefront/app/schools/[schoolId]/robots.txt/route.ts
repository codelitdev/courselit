import { buildRobotsTxt } from "@frontlit/site-seo";
import { getSettings } from "@/lib/courselit-public";
import { canonicalSiteHost, ROBOTS_DISALLOW } from "@/lib/site-seo";

/** Search engines and AI search crawlers may crawl the public site; AI
 * training crawlers are blocked unless the school turns that off, and a
 * school hidden from search keeps every crawler out. */
export async function GET(
  request: Request,
  context: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await context.params;
  const settings = await getSettings(schoolId);
  return new Response(
    buildRobotsTxt({
      canonicalHost: canonicalSiteHost(settings, request.headers),
      hidden: settings?.hideFromSearch === true,
      blockAiTraining: settings?.blockAiTraining ?? true,
      disallow: ROBOTS_DISALLOW,
    }),
    { headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}
