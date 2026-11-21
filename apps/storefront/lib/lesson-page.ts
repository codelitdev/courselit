import type { LearnerQuiz } from "@courselit/api-contract/quiz";
import { readLearnerQuiz } from "@/lib/quiz-attempt";

type PageNode = { type?: unknown; attrs?: unknown; content?: unknown };

/**
 * A learner's lesson page split for the temporary viewer: the document
 * without its Quiz block, and that quiz (already stripped of answers by the
 * API). Step 4 of docs/wip/lesson-pages.md replaces this with a renderer
 * that places the quiz where the author put it.
 */
export function splitLessonPage(content: unknown): {
  document: { type: "doc"; content: PageNode[] } | null;
  quiz: LearnerQuiz | null;
} {
  if (
    !content ||
    typeof content !== "object" ||
    (content as PageNode).type !== "doc" ||
    !Array.isArray((content as PageNode).content)
  ) {
    return { document: null, quiz: null };
  }
  let quiz: LearnerQuiz | null = null;
  const strip = (nodes: PageNode[]): PageNode[] =>
    nodes.flatMap((node) => {
      if (node?.type === "quiz") {
        quiz ??= readLearnerQuiz(node.attrs);
        return [];
      }
      return Array.isArray(node?.content)
        ? [{ ...node, content: strip(node.content as PageNode[]) }]
        : [node];
    });
  const document = {
    type: "doc" as const,
    content: strip((content as { content: PageNode[] }).content),
  };
  return { document, quiz };
}

/** Whether a learner lesson page holds a quiz. */
export function lessonPageHasQuiz(content: unknown): boolean {
  if (!content || typeof content !== "object") return false;
  const visit = (node: PageNode): boolean =>
    node?.type === "quiz" ||
    (Array.isArray(node?.content) && (node.content as PageNode[]).some(visit));
  return visit(content as PageNode);
}
