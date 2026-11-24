import { schoolLlmsTxt } from "@/lib/agent-markdown";
import { getSettings, getSitemap } from "@/lib/courselit-public";

/** `/llms.txt`: an index of the school's public content for AI agents. A
 * school hidden from search lists nothing. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await context.params;
  const [settings, sitemap] = await Promise.all([
    getSettings(schoolId),
    getSitemap(schoolId),
  ]);
  return new Response(
    schoolLlmsTxt(settings, settings?.hideFromSearch ? null : sitemap),
    {
      headers: { "content-type": "text/plain; charset=utf-8" },
    },
  );
}
