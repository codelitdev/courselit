import { notFoundMarkdown, renderMarkdown } from "@/lib/agent-markdown";

/** Markdown for AI agents. proxy.ts rewrites `<path>.md` and
 * `Accept: text/markdown` requests here. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ schoolId: string; path?: string[] }> },
) {
  const { schoolId, path: segments = [] } = await context.params;
  const path = `/${segments.join("/")}`;
  const headers = { "content-type": "text/markdown; charset=utf-8" };
  const markdown = await renderMarkdown(schoolId, path);
  return markdown
    ? new Response(markdown, { headers })
    : new Response(notFoundMarkdown(path), { status: 404, headers });
}
