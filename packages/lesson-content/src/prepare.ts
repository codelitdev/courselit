import { type QuizIdKind, readStoredQuiz } from "@courselit/api-contract/quiz";
import {
  ContentError,
  type Diagnostic,
  diagnostic,
  type FormatReference,
  formatReference,
  incompleteBlocks,
  parseMarkdown,
  serializeMarkdown,
  validateContent,
} from "@frontlit/text-editor/blocks";
import { fillQuizIds, quizNodePaths, visitNodes } from "./document.js";
import { lessonProfile } from "./profile.js";

export type { Diagnostic };

type JSONContent = ReturnType<typeof parseMarkdown>;

/** Diagnostic code for a second Quiz block (section 4.3). */
export const QUIZ_LIMIT_CODE = "quiz_limit";

export type LessonContentInput = { content: unknown } | { markdown: string };

export type PrepareOptions = {
  /** The stored document, never one the client sends (availability check). */
  previous?: unknown;
  /** Blocks that may not be added now, with the reason (`trial`, `plan_required`). */
  unavailable?: Record<string, string>;
  newId?: (kind: QuizIdKind) => string;
};

export type PreparedLessonContent =
  | {
      ok: true;
      /** Canonical JSON with every quiz ID filled in; store and return this. */
      content: JSONContent;
      /** Blocks that may be saved but not published (see `incompleteLessonBlocks`). */
      incomplete: Diagnostic[];
    }
  | { ok: false; diagnostics: Diagnostic[] };

const utf8Bytes = (value: string) => new TextEncoder().encode(value).length;

/**
 * Blocks saved half-filled, which block publishing but not saving: the
 * library's required props, plus a quiz without questions, a question
 * without text, fewer than two options, an option without text, or no
 * correct option.
 */
export function incompleteLessonBlocks(document: unknown): Diagnostic[] {
  const found = incompleteBlocks(lessonProfile, document);
  visitNodes(document, (node, path) => {
    if (node.type !== "quiz") return;
    const attrs = (node.attrs ?? {}) as Record<string, unknown>;
    const questions = Array.isArray(attrs.questions) ? attrs.questions : [];
    const before = found.length;
    const incomplete = (message: string, fieldPath: string) =>
      found.push(
        diagnostic("incomplete_block", message, {
          fieldPath,
          blocksSave: false,
          blocksPublish: true,
        }),
      );
    if (!questions.length) {
      incomplete(
        "<Quiz> needs at least one question before it can be published.",
        `${path}.attrs.questions`,
      );
      return;
    }
    questions.forEach((question: Record<string, unknown>, q: number) => {
      const questionPath = `${path}.attrs.questions[${q}]`;
      if (typeof question?.text !== "string" || !question.text.trim()) {
        incomplete(
          `Question ${q + 1} needs its text before it can be published.`,
          `${questionPath}.text`,
        );
      }
      const options = Array.isArray(question?.options) ? question.options : [];
      if (options.length < 2) {
        incomplete(
          `Question ${q + 1} needs at least two options.`,
          `${questionPath}.options`,
        );
      }
      options.forEach((option: Record<string, unknown>, o: number) => {
        if (typeof option?.text !== "string" || !option.text.trim()) {
          incomplete(
            `Option ${o + 1} of question ${q + 1} needs its text.`,
            `${questionPath}.options[${o}].text`,
          );
        }
      });
      if (
        !options.some((option: Record<string, unknown>) => option?.correct === true)
      ) {
        incomplete(
          `Question ${q + 1} needs a correct option.`,
          `${questionPath}.options`,
        );
      }
    });
    // Anything else that keeps the quiz from being graded.
    if (found.length === before && !readStoredQuiz(attrs)) {
      incomplete("<Quiz> is not complete.", `${path}.attrs`);
    }
  });
  return found;
}

/**
 * Every lesson-page write goes through here (section 4.3): Markdown or JSON
 * in, canonical JSON out. Profile nodes and attributes, URL rules, limits,
 * at most one Quiz, quiz IDs filled in and duplicates refused, and the
 * availability check against the stored version.
 *
 * Markdown arrives whole from API clients and agents, so incomplete blocks
 * are refused there; the JSON editor autosaves while the author types, so
 * they're returned in `incomplete` for the caller to refuse on publish.
 */
export function prepareLessonContent(
  input: LessonContentInput,
  options: PrepareOptions = {},
): PreparedLessonContent {
  const { limits } = lessonProfile;
  let document: unknown;
  if ("markdown" in input) {
    try {
      document = parseMarkdown(lessonProfile, input.markdown);
    } catch (error) {
      if (error instanceof ContentError)
        return { ok: false, diagnostics: error.diagnostics };
      throw error;
    }
  } else {
    let raw: string | undefined;
    try {
      raw = JSON.stringify(input.content);
    } catch {
      raw = undefined;
    }
    if (raw === undefined || utf8Bytes(raw) > limits.bytes) {
      return {
        ok: false,
        diagnostics: [
          diagnostic("too_large", "Document exceeds the size limit.", {
            fieldPath: "content",
          }),
        ],
      };
    }
    document = input.content;
  }

  const quizzes = quizNodePaths(document);
  if (quizzes.length > 1) {
    return {
      ok: false,
      diagnostics: quizzes.slice(1).map((fieldPath) =>
        diagnostic(QUIZ_LIMIT_CODE, "A lesson holds at most one quiz.", {
          fieldPath,
        }),
      ),
    };
  }

  const filled = fillQuizIds(document, options.newId);
  const result = validateContent(lessonProfile, filled, {
    previous: options.previous,
    unavailable: options.unavailable,
  });
  const blocking = result.diagnostics.filter((item) => item.blocksSave);
  if (blocking.length || !result.content) {
    return { ok: false, diagnostics: blocking.length ? blocking : result.diagnostics };
  }
  const incomplete = incompleteLessonBlocks(result.content);
  if ("markdown" in input && incomplete.length) {
    return { ok: false, diagnostics: incomplete };
  }
  return { ok: true, content: result.content, incomplete };
}

/**
 * The author's Markdown for a stored page (admin reads only: it holds the
 * correct answers). Null when the stored document has no lossless form.
 */
export function lessonMarkdown(document: unknown): string | null {
  try {
    return serializeMarkdown(lessonProfile, document);
  } catch {
    return null;
  }
}

/**
 * The lesson format for API and MCP clients (`getLessonContentFormat`),
 * listing blocks that may not be added now and why.
 */
export function lessonContentFormat(
  unavailable: Record<string, string> = {},
): FormatReference {
  return formatReference(lessonProfile, { unavailable });
}
