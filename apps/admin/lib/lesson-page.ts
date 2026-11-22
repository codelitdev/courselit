/**
 * The admin's side of lesson pages (docs/lesson-pages.md, sections
 * 3.3, 4.3, 6 and 7): which blocks may be added now, what a refused save
 * means, and where a diagnostic points. No React, so it is unit-tested.
 */

/**
 * Lesson types a course offers in the type picker (section 7). `file` is
 * only for digital-download items and is never offered here.
 */
export const COURSE_LESSON_TYPES = ["page", "scorm"] as const;

/** What the admin says for an availability reason from the API (section 6). */
export const BLOCK_UNAVAILABLE_COPY: Readonly<Record<string, string>> = {
  trial: "Not available during the trial",
  plan_required: "Needs a paid plan",
};

/** Shown on the Quiz insert entry once the page has its one quiz (section 5.1). */
export const QUIZ_LIMIT_MESSAGE = "A lesson holds one quiz";

export const LESSON_CONFLICT_MESSAGE =
  "This lesson was changed elsewhere (by someone else or an agent) since you opened it. Reload to see the latest version. Your recent edits here were not saved.";

type FormatLike = { blocks?: ReadonlyArray<{ name: string; unavailable?: string }> };

/** Block name → availability reason (`trial`, `plan_required`) from `getLessonContentFormat`. */
export function unavailableBlockReasons(
  format: FormatLike | null | undefined,
): Record<string, string> {
  const reasons: Record<string, string> = {};
  for (const block of format?.blocks ?? []) {
    if (block.unavailable) reasons[block.name] = block.unavailable;
  }
  return reasons;
}

export function blockUnavailableMessage(reason: string): string {
  return BLOCK_UNAVAILABLE_COPY[reason] ?? "Not available on your plan";
}

/**
 * The editor's `unavailable` map: plan reasons as readable messages, plus
 * the Quiz entry once the page already holds a quiz. Existing blocks stay
 * editable either way; this only greys out the insert menu.
 */
export function editorUnavailableBlocks(
  reasons: Readonly<Record<string, string>>,
  options: { hasQuiz: boolean },
): Record<string, string> {
  const unavailable: Record<string, string> = {};
  for (const [block, reason] of Object.entries(reasons)) {
    unavailable[block] = blockUnavailableMessage(reason);
  }
  if (options.hasQuiz && !unavailable.quiz) unavailable.quiz = QUIZ_LIMIT_MESSAGE;
  return unavailable;
}

export type LessonDiagnostic = {
  code: string;
  message: string;
  fieldPath?: string | null;
  line?: number | null;
  column?: number | null;
};

export type LessonSaveFailure =
  /** Someone else saved first (409 `content_version_mismatch`). Never retried. */
  | { kind: "conflict" }
  /** The API refused the content or the change; `diagnostics` say what and where. */
  | { kind: "invalid"; diagnostics: LessonDiagnostic[] }
  /** Anything else (network, server): retrying may help. */
  | { kind: "error"; message: string };

type ErrorDetails = {
  reason?: unknown;
  message?: unknown;
  code?: unknown;
  fieldPath?: unknown;
  line?: unknown;
  column?: unknown;
  blockReason?: unknown;
  diagnostics?: unknown;
};

export type LessonSaveErrorBody = {
  code?: string;
  message?: string;
  details?: ErrorDetails;
} | null;

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : undefined;
const numberOrNull = (value: unknown) => (typeof value === "number" ? value : null);

function readDiagnostics(raw: unknown): LessonDiagnostic[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): LessonDiagnostic[] => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      const message = text(record.message);
      if (!message) return [];
      return [
        {
          code: text(record.code) ?? "invalid_document",
          message,
          fieldPath: text(record.fieldPath) ?? null,
          line: numberOrNull(record.line),
          column: numberOrNull(record.column),
        },
      ];
    });
  } catch {
    return [];
  }
}

const REASON_MESSAGES: Readonly<Record<string, string>> = {
  quiz_cannot_be_previewed:
    "A lesson with a quiz can't be a free preview: grading needs an enrolled learner. Turn off free preview or remove the quiz.",
  lesson_media_not_found:
    "A media block uses a file that is no longer in your media library. Choose it again.",
  lesson_media_type_mismatch:
    "A media block holds a file of the wrong kind (for example, a PDF in a Video block). Choose a matching file.",
  too_many_media_references: "A lesson can use at most 100 media files.",
};

/** What a refused lesson save means for the editor (sections 4.3, 6 and 7). */
export function lessonSaveFailure(
  status: number,
  body: LessonSaveErrorBody,
): LessonSaveFailure {
  const details = body?.details ?? {};
  const reason = text(details.reason);
  if (status === 409 && reason === "content_version_mismatch")
    return { kind: "conflict" };
  if (reason === "lesson_content_invalid") {
    const diagnostics = readDiagnostics(details.diagnostics);
    if (diagnostics.length) return { kind: "invalid", diagnostics };
    return {
      kind: "invalid",
      diagnostics: [
        {
          code: text(details.code) ?? "invalid_document",
          message: text(details.message) ?? "The lesson content is not valid.",
          fieldPath: text(details.fieldPath) ?? null,
          line: numberOrNull(details.line),
          column: numberOrNull(details.column),
        },
      ],
    };
  }
  if (reason === "plan_required" && text(details.blockReason)) {
    return {
      kind: "invalid",
      diagnostics: [
        {
          code: "block_unavailable",
          message: `${text(details.message) ?? "This block can't be added now."} (${blockUnavailableMessage(String(details.blockReason))}.)`,
          fieldPath: text(details.fieldPath) ?? null,
        },
      ],
    };
  }
  if (reason && REASON_MESSAGES[reason]) {
    return {
      kind: "invalid",
      diagnostics: [
        {
          code: reason,
          message: REASON_MESSAGES[reason],
          fieldPath: text(details.fieldPath) ?? null,
        },
      ],
    };
  }
  return {
    kind: "error",
    message: text(body?.message) ?? "Unable to save the lesson.",
  };
}

/** One line for a failure, for places that show a single message. */
export function lessonSaveFailureMessage(failure: LessonSaveFailure): string {
  if (failure.kind === "conflict") return LESSON_CONFLICT_MESSAGE;
  if (failure.kind === "error") return failure.message;
  const [first] = failure.diagnostics;
  return first ? first.message : "The lesson content is not valid.";
}

/**
 * Where a diagnostic points, for people: "Block 3", "Block 3, question 2",
 * "Line 4". FrontLit paths look like `content.content[2].attrs.questions[1].text`.
 */
export function diagnosticLocation(diagnostic: LessonDiagnostic): string | null {
  if (typeof diagnostic.line === "number") return `Line ${diagnostic.line}`;
  const path = diagnostic.fieldPath;
  if (!path) return null;
  const block = /^content\.content\[(\d+)\]/.exec(path);
  if (!block) return null;
  const parts = [`Block ${Number(block[1]) + 1}`];
  const question = /\.questions\[(\d+)\]/.exec(path);
  if (question) parts.push(`question ${Number(question[1]) + 1}`);
  const option = /\.options\[(\d+)\]/.exec(path);
  if (option) parts.push(`option ${Number(option[1]) + 1}`);
  return parts.join(", ");
}

/*
 * Unsplash picks from the `/` menu. The editor's media picker can only hand
 * back a media ID, so an Unsplash pick comes back as a placeholder ID that
 * the Image block swaps for the photo's URL as soon as it mounts. The
 * photo never enters the media library (AGENTS.md), and the API would
 * refuse a placeholder that somehow reached it (unknown media ID).
 */
const PENDING_IMAGE_PREFIX = "pending-unsplash-";

export function pendingImageToken(sequence: number): string {
  return `${PENDING_IMAGE_PREFIX}${sequence}`;
}

export function isPendingImageToken(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PENDING_IMAGE_PREFIX);
}

/** Image attributes for a pick: an uploaded image by ID, or an Unsplash photo by URL. */
export type ImagePick =
  | { kind: "media"; id: string; url: string; alt?: string | null }
  | { kind: "unsplash"; url: string; alt?: string | null };

export function imageAttrsForPick(pick: ImagePick, currentAlt?: unknown) {
  const alt =
    pick.alt?.trim() || (typeof currentAlt === "string" ? currentAlt : null) || null;
  return pick.kind === "media"
    ? { media: pick.id, src: null, alt }
    : { media: null, src: pick.url, alt };
}
