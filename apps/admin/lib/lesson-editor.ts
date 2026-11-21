import type { AutosaveState } from "./lesson-autosave";
import type { WritingSaveStatus } from "./writing-editor";

/**
 * Where lessons are edited and what the full-screen page-lesson editor
 * shows. Page lessons are written in the full-screen editor; SCORM packages
 * and download files keep the lesson form. No React, so it is unit-tested.
 */

export const DEFAULT_LESSON_TITLE = "Untitled lesson";
export const LESSON_TITLE_MAX_LENGTH = 200;

type LessonStatus = "draft" | "published";

const segment = encodeURIComponent;

/** The full-screen editor of a page lesson. */
export function lessonEditorHref(productId: string, lessonId: string): string {
  return `/products/${segment(productId)}/lessons/${segment(lessonId)}/edit`;
}

/** The lesson form (SCORM and download files): an existing lesson, or a new one of `type`. */
export function lessonFormHref(
  productId: string,
  sectionId: string,
  options: { lessonId?: string; type?: "scorm" | "file" } = {},
): string {
  const base = `/products/${segment(productId)}/content/section/${segment(sectionId)}/lesson`;
  if (options.lessonId) return `${base}?id=${segment(options.lessonId)}`;
  if (options.type) return `${base}?type=${options.type}`;
  return base;
}

/** Where a lesson opens from the Content list. */
export function lessonHref(
  productId: string,
  sectionId: string,
  lesson: { id: string; type: string },
): string {
  return lesson.type === "page"
    ? lessonEditorHref(productId, lesson.id)
    : lessonFormHref(productId, sectionId, { lessonId: lesson.id });
}

/** The product's Content page, where the editor's back link goes. */
export function productContentHref(productId: string): string {
  return `/products/${segment(productId)}/content`;
}

/**
 * Creates a draft page lesson in a section, then opens it in the editor.
 * `create` posts to the API and returns the new lesson.
 */
export async function createPageLessonAndOpen(options: {
  productId: string;
  sectionId: string;
  create: (path: string, body: Record<string, unknown>) => Promise<{ id: string }>;
  navigate: (href: string) => void;
}): Promise<string> {
  const lesson = await options.create(
    `/api/v1/products/${segment(options.productId)}/lessons`,
    {
      title: DEFAULT_LESSON_TITLE,
      type: "page",
      sectionId: options.sectionId,
      status: "draft",
    },
  );
  const href = lessonEditorHref(options.productId, lesson.id);
  options.navigate(href);
  return href;
}

/** A title the API accepts, or why not. */
export function lessonTitleError(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return "Please enter a lesson title.";
  if (trimmed.length > LESSON_TITLE_MAX_LENGTH) {
    return `Keep the title within ${LESSON_TITLE_MAX_LENGTH} characters.`;
  }
  return null;
}

export function lessonStatusLabel(status: LessonStatus): string {
  return status === "published" ? "Live" : "Draft";
}

/** The top bar's live/draft button, in the Content list's words. */
export function lessonLiveAction(status: LessonStatus): {
  label: string;
  busyLabel: string;
  nextStatus: LessonStatus;
} {
  return status === "published"
    ? { label: "Move to drafts", busyLabel: "Moving…", nextStatus: "draft" }
    : { label: "Make live", busyLabel: "Making live…", nextStatus: "published" };
}

/**
 * The top bar's save status: the page autosave and the other edits (title,
 * section, free preview) together. Any save in flight shows as saving.
 */
export function lessonSaveStatus(
  autosave: AutosaveState,
  options: {
    savingDetails: boolean;
    detailsError: string | null;
    savedAt: number | null;
  },
): WritingSaveStatus {
  if (autosave.status === "conflict") {
    return { kind: "error", message: "Changed elsewhere" };
  }
  if (
    options.savingDetails ||
    autosave.status === "pending" ||
    autosave.status === "saving"
  ) {
    return { kind: "saving" };
  }
  if (autosave.status === "invalid" || autosave.status === "error") {
    return { kind: "error", message: "Not saved" };
  }
  if (options.detailsError) return { kind: "error", message: "Not saved" };
  return { kind: "saved", at: options.savedAt };
}

/** The storefront's lesson page opened with a preview token (drafts included). */
export function lessonPreviewPath(productId: string, lessonId: string, token: string) {
  return `/dashboard/courses/${segment(productId)}/${segment(lessonId)}#preview=${segment(token)}`;
}

/**
 * Lesson page drafts (docs/wip/lesson-pages.md, section 7): page edits save
 * to a draft, learners read the published content until it is published.
 */
type LessonDraftInfo = { status: LessonStatus; hasUnpublishedChanges: boolean };

/**
 * Edits learners don't see yet. Only a live lesson has them in the author's
 * sense: a draft lesson is hidden anyway, and making it live publishes them.
 */
export function lessonHasPendingChanges(lesson: LessonDraftInfo): boolean {
  return lesson.status === "published" && lesson.hasUnpublishedChanges;
}

/** Shown next to the Live/Draft status in the top bar. */
export function lessonStatusNote(lesson: LessonDraftInfo): string | null {
  return lessonHasPendingChanges(lesson) ? "Unpublished changes" : null;
}

/**
 * The top bar's "Discard changes" and "Publish changes": shown for live
 * lessons only (a draft lesson publishes its page when made live), enabled
 * while there are unpublished changes and nothing else is in the way.
 */
export function lessonDraftControls(
  lesson: LessonDraftInfo,
  options: { busy: boolean; conflict: boolean },
): { show: boolean; canPublish: boolean; canDiscard: boolean } {
  const show = lesson.status === "published";
  const enabled =
    show && lesson.hasUnpublishedChanges && !options.busy && !options.conflict;
  return { show, canPublish: enabled, canDiscard: enabled };
}

/** The settings panel's Visibility note. */
export function lessonVisibilityNote(
  productLive: boolean,
  lesson: LessonDraftInfo,
): string {
  if (!productLive) return "Learners will see this lesson once the course is live.";
  if (lesson.status !== "published") {
    return "Drafts are hidden from learners until you make them live.";
  }
  return lesson.hasUnpublishedChanges
    ? "Learners see the published version. Publish changes to show them your edits."
    : "Learners can see this lesson. Your edits stay a draft until you publish them.";
}

/** The heading over the problems that kept a page from being published. */
export function lessonPublishRefusalTitle(action: "publish" | "make-live"): string {
  return action === "publish"
    ? "Fix these before the changes can be published:"
    : "Fix these before the lesson can be made live:";
}

/** The publish-content and discard-draft endpoints. */
export function lessonDraftActionPath(
  lessonId: string,
  action: "publish-content" | "discard-draft",
): string {
  return `/api/v1/lessons/${segment(lessonId)}/${action}`;
}
