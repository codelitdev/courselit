import {
  createQuizId,
  type LearnerQuizQuestion,
  type Quiz,
  type QuizIdKind,
  readStoredQuiz,
} from "@courselit/api-contract/quiz";

type Json = Record<string, unknown>;

/** A lesson page as stored: Tiptap JSON. */
export type LessonDocument = { type: "doc"; content?: LessonNode[] };
export type LessonNode = {
  type: string;
  attrs?: Json;
  content?: LessonNode[];
  marks?: unknown[];
  text?: string;
};

/**
 * A lesson page as learners, the public and previews receive it: every Quiz
 * block's questions are `LearnerQuizQuestion`s, which have no `correct` (L1).
 */
export type LearnerLessonDocument = { type: "doc"; content?: LessonNode[] };

export const emptyLessonDocument = (): LessonDocument => ({ type: "doc", content: [] });

const isRecord = (value: unknown): value is Json =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const MAX_DEPTH = 128;

/** Maps every node of a document, depth first, children before the node itself. */
function mapNodes(value: unknown, map: (node: Json) => Json, depth = 0): unknown {
  if (!isRecord(value) || depth > MAX_DEPTH) return value;
  const node = Array.isArray(value.content)
    ? {
        ...value,
        content: value.content.map((child) => mapNodes(child, map, depth + 1)),
      }
    : { ...value };
  return map(node);
}

/** Visits every node with its JSON path (`content.content[2]`, as FrontLit reports paths). */
export function visitNodes(
  value: unknown,
  visit: (node: Json, path: string) => void,
  path = "content",
  depth = 0,
): void {
  if (!isRecord(value) || depth > MAX_DEPTH) return;
  visit(value, path);
  if (Array.isArray(value.content)) {
    value.content.forEach((child, index) => {
      visitNodes(child, visit, `${path}.content[${index}]`, depth + 1);
    });
  }
}

/** Paths of every Quiz block in a document. */
export function quizNodePaths(document: unknown): string[] {
  const paths: string[] = [];
  visitNodes(document, (node, path) => {
    if (node.type === "quiz") paths.push(path);
  });
  return paths;
}

/** The first Quiz block's attributes, as stored. */
function quizAttrs(document: unknown): Json | null {
  let found: Json | null = null;
  visitNodes(document, (node) => {
    if (!found && node.type === "quiz") found = isRecord(node.attrs) ? node.attrs : {};
  });
  return found;
}

/** Whether the page holds a Quiz block, complete or not. */
export function hasLessonQuiz(document: unknown): boolean {
  return quizAttrs(document) !== null;
}

/**
 * The page's quiz for grading and completion, or null when the page has
 * none or its quiz isn't complete (a published page's always is).
 */
export function readLessonQuiz(document: unknown): Quiz | null {
  const attrs = quizAttrs(document);
  return attrs ? readStoredQuiz(attrs) : null;
}

/**
 * Fills in missing quiz, question and option IDs (section 4.3), so clients
 * reuse the IDs from the saved document. Existing IDs are kept as they are;
 * malformed and duplicate ones are left for validation to refuse.
 */
export function fillQuizIds(
  document: unknown,
  newId: (kind: QuizIdKind) => string = createQuizId,
): unknown {
  const taken = new Set<string>();
  visitNodes(document, (node) => {
    if (node.type !== "quiz" || !isRecord(node.attrs)) return;
    const attrs = node.attrs;
    const note = (id: unknown) => typeof id === "string" && taken.add(id);
    note(attrs.id);
    for (const question of Array.isArray(attrs.questions) ? attrs.questions : []) {
      if (!isRecord(question)) continue;
      note(question.id);
      for (const option of Array.isArray(question.options) ? question.options : []) {
        if (isRecord(option)) note(option.id);
      }
    }
  });
  const missing = (id: unknown) => id === undefined || id === null || id === "";
  const fresh = (kind: QuizIdKind) => {
    let id: string;
    do id = newId(kind);
    while (taken.has(id));
    taken.add(id);
    return id;
  };
  return mapNodes(document, (node) => {
    if (node.type !== "quiz" || !isRecord(node.attrs)) return node;
    const attrs = node.attrs;
    return {
      ...node,
      attrs: {
        ...attrs,
        id: missing(attrs.id) ? fresh("quiz") : attrs.id,
        questions: Array.isArray(attrs.questions)
          ? attrs.questions.map((question) =>
              isRecord(question)
                ? {
                    ...question,
                    id: missing(question.id) ? fresh("question") : question.id,
                    options: Array.isArray(question.options)
                      ? question.options.map((option) =>
                          isRecord(option)
                            ? {
                                ...option,
                                id: missing(option.id) ? fresh("option") : option.id,
                              }
                            : option,
                        )
                      : question.options,
                  }
                : question,
            )
          : attrs.questions,
      },
    };
  });
}

const text = (value: unknown) => (typeof value === "string" ? value : "");
const id = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * The one function that drops correct answers (section 5.2, L1). Every
 * Quiz block is rebuilt from scratch with only the learner fields, so a
 * field it doesn't know about can't slip through either. Everything else
 * derived from lesson content for learners must start from this output.
 */
export function stripLessonAnswers(document: unknown): LearnerLessonDocument {
  const stripped = mapNodes(document, (node) => {
    if (node.type !== "quiz") return node;
    const attrs = isRecord(node.attrs) ? node.attrs : {};
    const questions: LearnerQuizQuestion[] = (
      Array.isArray(attrs.questions) ? attrs.questions : []
    )
      .filter(isRecord)
      .map((question) => {
        const options = (
          Array.isArray(question.options) ? question.options : []
        ).filter(isRecord);
        return {
          id: id(question.id),
          text: text(question.text),
          multiple: options.filter((option) => option.correct === true).length > 1,
          options: options.map((option) => ({
            id: id(option.id),
            text: text(option.text),
          })),
        };
      });
    const passingGrade =
      typeof attrs.passingGrade === "number" && Number.isFinite(attrs.passingGrade)
        ? attrs.passingGrade
        : null;
    return { type: "quiz", attrs: { id: id(attrs.id), passingGrade, questions } };
  });
  return isRecord(stripped) && stripped.type === "doc"
    ? (stripped as LearnerLessonDocument)
    : { type: "doc", content: [] };
}

/** Block name → accepted media types (section 4.1: each block takes only its MIME family). */
export const LESSON_MEDIA_ACCEPT: Record<string, readonly string[]> = {
  image: ["image/*"],
  video: ["video/*"],
  audio: ["audio/*"],
  pdf: ["application/pdf", ".pdf"],
  file: ["*/*"],
};

export type LessonMediaUse = { mediaId: string; block: string; path: string };

/** Every uploaded media ID the page uses, with the block that uses it. */
export function lessonMediaUses(document: unknown): LessonMediaUse[] {
  const uses: LessonMediaUse[] = [];
  visitNodes(document, (node, path) => {
    if (typeof node.type !== "string" || !(node.type in LESSON_MEDIA_ACCEPT)) return;
    const media = isRecord(node.attrs) ? node.attrs.media : null;
    if (typeof media === "string" && media) {
      uses.push({ mediaId: media, block: node.type, path: `${path}.attrs.media` });
    }
  });
  return uses;
}

/** Whether a file matches accepted types such as `video/*`, `application/pdf` or `.pdf`. */
export function mediaMatchesAcceptedTypes(
  media: { fileName: string; mimeType: string },
  acceptedTypes: readonly string[],
): boolean {
  const mimeType = media.mimeType.toLowerCase().trim();
  const fileName = media.fileName.toLowerCase().trim();
  const dot = fileName.lastIndexOf(".");
  const extension = dot === -1 ? "" : fileName.slice(dot);
  return acceptedTypes.some((pattern) => {
    const normalized = pattern.toLowerCase().trim();
    if (normalized === "*" || normalized === "*/*") return true;
    if (normalized.startsWith(".")) return extension === normalized;
    if (normalized.endsWith("/*")) return mimeType.startsWith(normalized.slice(0, -1));
    if (mimeType === normalized) return true;
    return normalized === "application/pdf" && extension === ".pdf";
  });
}
