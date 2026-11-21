import { describe, expect, it } from "bun:test";
import {
  createPageLessonAndOpen,
  DEFAULT_LESSON_TITLE,
  lessonDraftActionPath,
  lessonDraftControls,
  lessonEditorHref,
  lessonFormHref,
  lessonHasPendingChanges,
  lessonHref,
  lessonLiveAction,
  lessonPreviewPath,
  lessonPublishRefusalTitle,
  lessonSaveStatus,
  lessonStatusLabel,
  lessonStatusNote,
  lessonTitleError,
  lessonVisibilityNote,
  productContentHref,
} from "./lesson-editor";

describe("lesson routes", () => {
  it("opens page lessons in the full-screen editor", () => {
    expect(lessonEditorHref("p 1", "l/2")).toBe("/products/p%201/lessons/l%2F2/edit");
    expect(lessonHref("p1", "s1", { id: "l1", type: "page" })).toBe(
      "/products/p1/lessons/l1/edit",
    );
  });

  it("keeps SCORM and download files on the lesson form", () => {
    expect(lessonHref("p1", "s1", { id: "l1", type: "scorm" })).toBe(
      "/products/p1/content/section/s1/lesson?id=l1",
    );
    expect(lessonHref("p1", "s1", { id: "l1", type: "file" })).toBe(
      "/products/p1/content/section/s1/lesson?id=l1",
    );
    expect(lessonFormHref("p1", "s1", { type: "scorm" })).toBe(
      "/products/p1/content/section/s1/lesson?type=scorm",
    );
    expect(lessonFormHref("p1", "s1")).toBe("/products/p1/content/section/s1/lesson");
    expect(productContentHref("p1")).toBe("/products/p1/content");
  });

  it("previews a lesson on the storefront with a preview token", () => {
    expect(lessonPreviewPath("p1", "l1", "a b")).toBe(
      "/dashboard/courses/p1/l1#preview=a%20b",
    );
  });
});

describe("createPageLessonAndOpen", () => {
  it("creates a draft page lesson in the section, then opens its editor", async () => {
    const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
    const visited: string[] = [];
    const href = await createPageLessonAndOpen({
      productId: "p1",
      sectionId: "s1",
      create: async (path, body) => {
        calls.push({ path, body });
        return { id: "l9" };
      },
      navigate: (next) => visited.push(next),
    });
    expect(calls).toEqual([
      {
        path: "/api/v1/products/p1/lessons",
        body: {
          title: DEFAULT_LESSON_TITLE,
          type: "page",
          sectionId: "s1",
          status: "draft",
        },
      },
    ]);
    expect(href).toBe("/products/p1/lessons/l9/edit");
    expect(visited).toEqual([href]);
  });

  it("navigates nowhere when the lesson can't be created", async () => {
    const visited: string[] = [];
    await expect(
      createPageLessonAndOpen({
        productId: "p1",
        sectionId: "s1",
        create: async () => {
          throw new Error("nope");
        },
        navigate: (next) => visited.push(next),
      }),
    ).rejects.toThrow("nope");
    expect(visited).toEqual([]);
  });
});

describe("lesson labels", () => {
  it("names the status and the live/draft action", () => {
    expect(lessonStatusLabel("draft")).toBe("Draft");
    expect(lessonStatusLabel("published")).toBe("Live");
    expect(lessonLiveAction("draft")).toEqual({
      label: "Make live",
      busyLabel: "Making live…",
      nextStatus: "published",
    });
    expect(lessonLiveAction("published").nextStatus).toBe("draft");
    expect(lessonLiveAction("published").label).toBe("Move to drafts");
  });

  it("refuses empty and over-long titles", () => {
    expect(lessonTitleError("  ")).toBe("Please enter a lesson title.");
    expect(lessonTitleError("x".repeat(201))).toContain("200");
    expect(lessonTitleError(" Intro ")).toBeNull();
  });
});

describe("lessonSaveStatus", () => {
  const idle = { savingDetails: false, detailsError: null, savedAt: 42 };

  it("shows saving while the page or another field is being saved", () => {
    expect(lessonSaveStatus({ status: "pending" }, idle)).toEqual({ kind: "saving" });
    expect(lessonSaveStatus({ status: "saving" }, idle)).toEqual({ kind: "saving" });
    expect(
      lessonSaveStatus({ status: "saved" }, { ...idle, savingDetails: true }),
    ).toEqual({ kind: "saving" });
  });

  it("reports conflicts and refused saves", () => {
    expect(
      lessonSaveStatus({ status: "conflict" }, { ...idle, savingDetails: true }),
    ).toEqual({ kind: "error", message: "Changed elsewhere" });
    expect(lessonSaveStatus({ status: "invalid", diagnostics: [] }, idle)).toEqual({
      kind: "error",
      message: "Not saved",
    });
    expect(lessonSaveStatus({ status: "error", message: "x" }, idle).kind).toBe(
      "error",
    );
    expect(
      lessonSaveStatus({ status: "saved" }, { ...idle, detailsError: "Title refused" }),
    ).toEqual({ kind: "error", message: "Not saved" });
  });

  it("otherwise says when the last save landed", () => {
    expect(lessonSaveStatus({ status: "saved" }, idle)).toEqual({
      kind: "saved",
      at: 42,
    });
  });
});

describe("lesson page drafts", () => {
  const live = { status: "published" as const, hasUnpublishedChanges: true };
  const liveClean = { status: "published" as const, hasUnpublishedChanges: false };
  const draft = { status: "draft" as const, hasUnpublishedChanges: true };
  const idle = { busy: false, conflict: false };

  it("counts unpublished changes for live lessons only", () => {
    expect(lessonHasPendingChanges(live)).toBe(true);
    expect(lessonHasPendingChanges(liveClean)).toBe(false);
    expect(lessonHasPendingChanges(draft)).toBe(false);
    expect(lessonStatusNote(live)).toBe("Unpublished changes");
    expect(lessonStatusNote(liveClean)).toBeNull();
    expect(lessonStatusNote(draft)).toBeNull();
  });

  it("offers publish and discard on live lessons with unpublished changes", () => {
    expect(lessonDraftControls(live, idle)).toEqual({
      show: true,
      canPublish: true,
      canDiscard: true,
    });
    expect(lessonDraftControls(liveClean, idle)).toEqual({
      show: true,
      canPublish: false,
      canDiscard: false,
    });
    // A draft lesson publishes its page when made live.
    expect(lessonDraftControls(draft, idle).show).toBe(false);
    expect(lessonDraftControls(draft, idle).canPublish).toBe(false);
  });

  it("disables publish and discard while busy or after a conflict", () => {
    expect(lessonDraftControls(live, { busy: true, conflict: false }).canPublish).toBe(
      false,
    );
    expect(lessonDraftControls(live, { busy: false, conflict: true }).canDiscard).toBe(
      false,
    );
  });

  it("explains what learners see", () => {
    expect(lessonVisibilityNote(false, live)).toBe(
      "Learners will see this lesson once the course is live.",
    );
    expect(lessonVisibilityNote(true, draft)).toBe(
      "Drafts are hidden from learners until you make them live.",
    );
    expect(lessonVisibilityNote(true, live)).toContain(
      "Learners see the published version",
    );
    expect(lessonVisibilityNote(true, liveClean)).toContain("stay a draft");
  });

  it("titles publish refusals and builds the draft endpoints", () => {
    expect(lessonPublishRefusalTitle("publish")).toBe(
      "Fix these before the changes can be published:",
    );
    expect(lessonPublishRefusalTitle("make-live")).toBe(
      "Fix these before the lesson can be made live:",
    );
    expect(lessonDraftActionPath("l/1", "publish-content")).toBe(
      "/api/v1/lessons/l%2F1/publish-content",
    );
    expect(lessonDraftActionPath("l1", "discard-draft")).toBe(
      "/api/v1/lessons/l1/discard-draft",
    );
  });
});
