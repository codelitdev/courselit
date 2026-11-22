"use client";

import { emptyLessonDocument } from "@courselit/lesson-content";
import { RotateCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AuthGate } from "@/components/auth-gate";
import { WritingEditorDocumentHeader } from "@/components/content/writing-editor-document-header";
import { WritingEditorShell } from "@/components/content/writing-editor-shell";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { CourseLitLoading } from "@/components/loading";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import { Label } from "@/components/ui/codelit/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import { Switch } from "@/components/ui/codelit/switch";
import {
  type AutosaveSendResult,
  type AutosaveState,
  createLessonAutosave,
  type LessonAutosave,
} from "@/lib/lesson-autosave";
import {
  lessonDraftActionPath,
  lessonDraftControls,
  lessonFormHref,
  lessonLiveAction,
  lessonPreviewPath,
  lessonPublishRefusalTitle,
  lessonSaveStatus,
  lessonStatusLabel,
  lessonStatusNote,
  lessonTitleError,
  lessonVisibilityNote,
  productContentHref,
} from "@/lib/lesson-editor";
import {
  LESSON_CONFLICT_MESSAGE,
  type LessonDiagnostic,
  type LessonSaveErrorBody,
  type LessonSaveFailure,
  lessonSaveFailure,
  lessonSaveFailureMessage,
  unavailableBlockReasons,
} from "@/lib/lesson-page";
import { storefrontUrl } from "@/lib/storefront-url";
import { truncateText } from "@/lib/truncate";
import { LessonDiagnostics } from "./lesson-diagnostics";
import { LessonPageEditor } from "./lesson-page-editor";
import type { Lesson, LessonContent, Product, School, Section } from "./product-types";

type ProductDetail = Product & { sections: Section[] };
type LessonPatch = {
  title?: string;
  status?: Lesson["status"];
  sectionId?: string;
  requiresEnrollment?: boolean;
};

/** A refused lesson write, with what the API said. */
class LessonWriteError extends Error {
  constructor(readonly failure: LessonSaveFailure) {
    super(lessonSaveFailureMessage(failure));
  }
}

async function readErrorBody(response: Response): Promise<LessonSaveErrorBody> {
  try {
    return (await response.json()) as LessonSaveErrorBody;
  } catch {
    return null;
  }
}

async function schoolFetch(schoolId: string, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-school-id", schoolId);
  if (init.body) headers.set("content-type", "application/json");
  return fetch(path, { ...init, credentials: "include", cache: "no-store", headers });
}

/** The draft state a content write reports back; the editor keeps the content. */
type LessonDraftFields = Pick<
  Lesson,
  "contentVersion" | "hasUnpublishedChanges" | "contentPublishedAt"
>;

function draftFields(lesson: Lesson): LessonDraftFields {
  return {
    contentVersion: lesson.contentVersion,
    hasUnpublishedChanges: lesson.hasUnpublishedChanges,
    contentPublishedAt: lesson.contentPublishedAt,
  };
}

/**
 * One autosave: the whole page as JSON, with the version it is based on.
 * It is saved as the lesson's draft; learners keep the published page.
 */
async function sendPageContent(
  schoolId: string,
  lessonId: string,
  content: unknown,
  expectedContentVersion: number,
  onSaved: (saved: LessonDraftFields) => void,
): Promise<AutosaveSendResult> {
  const response = await schoolFetch(
    schoolId,
    `/api/v1/lessons/${encodeURIComponent(lessonId)}`,
    { method: "PATCH", body: JSON.stringify({ content, expectedContentVersion }) },
  );
  if (!response.ok) {
    return {
      ok: false,
      failure: lessonSaveFailure(response.status, await readErrorBody(response)),
    };
  }
  const saved = (await response.json()) as Lesson;
  onSaved(draftFields(saved));
  return { ok: true, contentVersion: saved.contentVersion };
}

/**
 * The full-screen editor of a page lesson (docs/lesson-pages.md,
 * section 3.4): the title as a heading, the block page autosaving below it,
 * and the section, free preview and deletion in the settings panel.
 */
export function PageLessonEditor({
  productId,
  lessonId,
}: {
  productId: string;
  lessonId: string;
}) {
  const router = useRouter();
  const contentHref = productContentHref(productId);
  const [school, setSchool] = useState<School | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  /** The page as loaded; the editor owns it from then on. */
  const [pageContent, setPageContent] = useState<LessonContent | null>(null);
  const [unavailableReasons, setUnavailableReasons] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const autosave = useRef<LessonAutosave | null>(null);
  const flushEditor = useRef<() => void>(() => {});
  const [autosaveState, setAutosaveState] = useState<AutosaveState>({
    status: "saved",
  });
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const savedTitle = useRef("");
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleError = lessonTitleError(title);

  /** Title, section and free-preview writes in flight. */
  const detailWrites = useRef(new Set<Promise<unknown>>());
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [publishingContent, setPublishingContent] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  /** Remounts the page editor when its content is replaced (a discarded draft). */
  const [editorKey, setEditorKey] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Why the last publish (or setting) was refused, shown above the page. */
  const [refusal, setRefusal] = useState<{
    title: string;
    diagnostics: LessonDiagnostic[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFlushChangeReady = useCallback((flush: () => void) => {
    flushEditor.current = flush;
  }, []);

  useEffect(() => {
    setSettingsOpen(window.matchMedia("(min-width: 768px)").matches);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      const schoolsResponse = await fetch("/api/v1/schools", {
        credentials: "include",
        cache: "no-store",
      });
      const schools = schoolsResponse.ok
        ? ((await schoolsResponse.json()) as { items?: School[] })
        : { items: [] };
      const selected =
        schools.items?.find((item) => item.selected) ?? schools.items?.[0];
      if (!selected) throw new Error("Create a school before managing products.");
      const [productResponse, lessonResponse] = await Promise.all([
        schoolFetch(selected.id, `/api/v1/products/${encodeURIComponent(productId)}`),
        schoolFetch(selected.id, `/api/v1/lessons/${encodeURIComponent(lessonId)}`),
      ]);
      if (!productResponse.ok) throw new Error("Unable to load the course.");
      if (!lessonResponse.ok) throw new Error("This lesson no longer exists.");
      const detail = (await productResponse.json()) as ProductDetail;
      const loaded = (await lessonResponse.json()) as Lesson;
      if (!active) return;
      if (loaded.type !== "page") {
        // SCORM lessons and download files keep the lesson form.
        router.replace(
          lessonFormHref(productId, loaded.sectionId ?? detail.sections[0]?.id ?? "", {
            lessonId,
          }),
        );
        return;
      }
      // Blocks the school may not add now (Embed on a trial); the API
      // enforces it either way, so a failed read only loses the hint.
      void schoolFetch(selected.id, "/api/v1/lesson-content-format")
        .then((response) => (response.ok ? response.json() : null))
        .then((format) => {
          if (active) setUnavailableReasons(unavailableBlockReasons(format));
        })
        .catch(() => {});
      const document = loaded.content ?? emptyLessonDocument();
      autosave.current = createLessonAutosave({
        contentVersion: loaded.contentVersion,
        savedContent: document,
        send: (content, expectedContentVersion) =>
          sendPageContent(
            selected.id,
            lessonId,
            content,
            expectedContentVersion,
            (saved) => {
              if (active) setLesson((current) => current && { ...current, ...saved });
            },
          ),
        onState: (state) => {
          if (!active) return;
          setAutosaveState(state);
          if (state.status === "saved") {
            setSavedAt(Date.now());
            // A clean save may have fixed what a publish was refused for;
            // the next publish checks again.
            setRefusal(null);
          }
        },
      });
      savedTitle.current = loaded.title;
      setTitle(loaded.title);
      setPageContent(document);
      setLesson(loaded);
      setProduct(detail);
      setSchool(selected);
    })()
      .catch((caught: unknown) => {
        if (active) {
          setLoadError(
            caught instanceof Error ? caught.message : "Unable to load the lesson.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      if (titleTimer.current) clearTimeout(titleTimer.current);
    };
  }, [lessonId, productId, router]);

  // Warn before leaving while edits are unsaved.
  const unsaved =
    savingDetails ||
    (autosaveState.status !== "saved" && autosaveState.status !== "conflict");
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  useSetBreadcrumb([
    { label: "Products", href: "/products" },
    {
      label: product?.title ?? "Course",
      href: `/products/${encodeURIComponent(productId)}`,
    },
    { label: "Content", href: contentHref },
    { label: truncateText(title || "Lesson") },
  ]);

  async function patchLesson(patch: LessonPatch): Promise<Lesson> {
    if (!school) throw new Error("The school isn't loaded yet.");
    const response = await schoolFetch(
      school.id,
      `/api/v1/lessons/${encodeURIComponent(lessonId)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
    if (!response.ok) {
      throw new LessonWriteError(
        lessonSaveFailure(response.status, await readErrorBody(response)),
      );
    }
    return (await response.json()) as Lesson;
  }

  /** Saves a title, section or free-preview change; the top bar shows its progress. */
  function saveDetails(patch: LessonPatch, refusedTitle: string): Promise<boolean> {
    const write = patchLesson(patch)
      .then((updated) => {
        setLesson((current) => (current ? { ...current, ...updated } : updated));
        if (patch.title !== undefined) savedTitle.current = patch.title;
        setSavedAt(Date.now());
        setDetailsError(null);
        return true;
      })
      .catch((caught: unknown) => {
        const message = caught instanceof Error ? caught.message : "Unable to save.";
        if (caught instanceof LessonWriteError && caught.failure.kind === "invalid") {
          setRefusal({ title: refusedTitle, diagnostics: caught.failure.diagnostics });
        } else {
          setError(message);
        }
        // A refused section or free-preview change is undone on screen, so
        // nothing is left unsaved; a refused title still waits to be saved.
        if (patch.title !== undefined) setDetailsError(message);
        return false;
      })
      .finally(() => {
        detailWrites.current.delete(write);
        setSavingDetails(detailWrites.current.size > 0);
      });
    detailWrites.current.add(write);
    setSavingDetails(true);
    return write;
  }

  function saveTitleNow(): Promise<boolean> {
    if (titleTimer.current) {
      clearTimeout(titleTimer.current);
      titleTimer.current = null;
    }
    const next = title.trim();
    if (lessonTitleError(title) || next === savedTitle.current) {
      return Promise.resolve(!lessonTitleError(title));
    }
    return saveDetails({ title: next }, "The title wasn't saved:");
  }

  function changeTitle(value: string) {
    setTitle(value);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    const next = value.trim();
    if (lessonTitleError(value) || next === savedTitle.current) return;
    titleTimer.current = setTimeout(() => {
      titleTimer.current = null;
      void saveDetails({ title: next }, "The title wasn't saved:");
    }, 600);
  }

  /** Sends every pending edit; false (with the reason shown) when one didn't save. */
  async function flushEdits(purpose: string): Promise<boolean> {
    flushEditor.current();
    const state = (await autosave.current?.flush()) ?? { status: "saved" };
    if (state.status === "conflict") {
      setError(LESSON_CONFLICT_MESSAGE);
      return false;
    }
    if (state.status === "invalid") {
      setError(`The page has problems to fix before it can be ${purpose}.`);
      return false;
    }
    if (state.status === "error") {
      setError(`Not saved: ${state.message}`);
      return false;
    }
    if (titleError) {
      setError(titleError);
      return false;
    }
    if (!(await saveTitleNow())) return false;
    await Promise.all([...detailWrites.current]);
    return true;
  }

  async function changeStatus() {
    if (!lesson || changingStatus) return;
    const action = lessonLiveAction(lesson.status);
    setChangingStatus(true);
    setError(null);
    setRefusal(null);
    try {
      if (!(await flushEdits("made live"))) return;
      const updated = await patchLesson({ status: action.nextStatus });
      setLesson((current) => (current ? { ...current, ...updated } : updated));
      toast.success(
        action.nextStatus === "published"
          ? `“${updated.title}” is live`
          : `Moved “${updated.title}” to drafts`,
      );
    } catch (caught) {
      if (caught instanceof LessonWriteError && caught.failure.kind === "invalid") {
        setRefusal({
          title:
            action.nextStatus === "published"
              ? lessonPublishRefusalTitle("make-live")
              : "Fix these before the lesson can be moved to drafts:",
          diagnostics: caught.failure.diagnostics,
        });
      } else {
        setError(
          caught instanceof Error ? caught.message : "Unable to save the lesson.",
        );
      }
    } finally {
      setChangingStatus(false);
    }
  }

  /** The response of publish-content or discard-draft, or null when it was refused. */
  async function draftAction(
    action: "publish-content" | "discard-draft",
  ): Promise<Lesson | null> {
    if (!school) throw new Error("The school isn't loaded yet.");
    const response = await schoolFetch(
      school.id,
      lessonDraftActionPath(lessonId, action),
      {
        method: "POST",
        body: JSON.stringify({
          expectedContentVersion:
            autosave.current?.contentVersion ?? lesson?.contentVersion,
        }),
      },
    );
    if (response.ok) return (await response.json()) as Lesson;
    const failure = lessonSaveFailure(response.status, await readErrorBody(response));
    if (failure.kind === "conflict") {
      // Changed elsewhere: stop saving, as a conflicting autosave does.
      autosave.current?.markConflict();
      return null;
    }
    if (failure.kind === "invalid" && action === "publish-content") {
      setRefusal({
        title: lessonPublishRefusalTitle("publish"),
        diagnostics: failure.diagnostics,
      });
      return null;
    }
    throw new LessonWriteError(failure);
  }

  /** Publishes the saved draft so learners see it. */
  async function publishContent() {
    if (!lesson || publishingContent) return;
    setPublishingContent(true);
    setError(null);
    setRefusal(null);
    try {
      if (!(await flushEdits("published"))) return;
      const published = await draftAction("publish-content");
      if (!published) return;
      setLesson((current) => current && { ...current, ...draftFields(published) });
      toast.success("Published your changes. Learners see them now.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to publish changes.");
    } finally {
      setPublishingContent(false);
    }
  }

  /** Throws the draft away and reloads the published page into the editor. */
  async function discardDraft() {
    if (!lesson || discarding) return;
    setDiscarding(true);
    setError(null);
    setRefusal(null);
    try {
      // Let a save in flight land first, so it can't recreate the draft.
      flushEditor.current();
      const state = (await autosave.current?.flush()) ?? { status: "saved" };
      if (state.status === "conflict") {
        setError(LESSON_CONFLICT_MESSAGE);
        return;
      }
      const reverted = await draftAction("discard-draft");
      if (!reverted) return;
      const document = reverted.content ?? emptyLessonDocument();
      autosave.current?.reset({
        contentVersion: reverted.contentVersion,
        savedContent: document,
      });
      setPageContent(document);
      setEditorKey((key) => key + 1);
      setLesson((current) => current && { ...current, ...draftFields(reverted) });
      toast.success(
        "Discarded your changes. The page is back to the published version.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to discard changes.");
    } finally {
      setDiscardDialogOpen(false);
      setDiscarding(false);
    }
  }

  async function openPreview() {
    if (!school || previewing) return;
    setPreviewing(true);
    setError(null);
    try {
      if (!(await flushEdits("previewed"))) return;
      const response = await schoolFetch(
        school.id,
        `/api/v1/products/${encodeURIComponent(productId)}/preview`,
        { method: "POST", body: JSON.stringify({ ttlSeconds: 900 }) },
      );
      if (!response.ok) throw new Error("Unable to create a preview.");
      const grant = (await response.json()) as { token: string };
      const url = storefrontUrl(
        lessonPreviewPath(productId, lessonId, grant.token),
        school.storefrontOrigin,
      );
      if (!url) throw new Error("This school has no public address to preview on yet.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Unable to create a preview.",
      );
    } finally {
      setPreviewing(false);
    }
  }

  async function deleteLesson() {
    if (!school || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await schoolFetch(
        school.id,
        `/api/v1/lessons/${encodeURIComponent(lessonId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const body = await readErrorBody(response);
        throw new Error(body?.message ?? "Unable to delete the lesson.");
      }
      setDeleteDialogOpen(false);
      router.replace(contentHref);
    } catch (caught) {
      setDeleteDialogOpen(false);
      setError(
        caught instanceof Error ? caught.message : "Unable to delete the lesson.",
      );
      setDeleting(false);
    }
  }

  if (!lesson || !product || !school || !pageContent) {
    return (
      <AuthGate>
        <main
          data-full-screen-editor
          className="flex h-dvh min-h-0 w-full items-center justify-center overflow-hidden bg-background"
        >
          <div className="px-6 text-center">
            {loading ? <CourseLitLoading label="Loading lesson…" /> : null}
            {loadError ? (
              <p className="text-sm text-destructive" role="alert">
                {loadError}
              </p>
            ) : null}
          </div>
        </main>
      </AuthGate>
    );
  }

  const live = lesson.status === "published";
  const liveAction = lessonLiveAction(lesson.status);
  const busy = changingStatus || deleting || publishingContent || discarding;
  const conflict = autosaveState.status === "conflict";
  const draftControls = lessonDraftControls(lesson, { busy, conflict });

  return (
    <AuthGate>
      <WritingEditorShell
        backHref={contentHref}
        backLabel="Content"
        contextLabel={product.title}
        title={title.trim() || "Untitled lesson"}
        statusLabel={lessonStatusLabel(lesson.status)}
        statusNote={lessonStatusNote(lesson)}
        saveStatus={lessonSaveStatus(autosaveState, {
          savingDetails,
          detailsError,
          savedAt,
        })}
        preview={{
          label: "Preview as a learner",
          onClick: () => void openPreview(),
          busy: previewing,
          unavailableLabel: "Preview as a learner",
        }}
        actions={
          <>
            {draftControls.show ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                  disabled={!draftControls.canDiscard}
                  onClick={() => setDiscardDialogOpen(true)}
                >
                  Discard changes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!draftControls.canPublish}
                  onClick={() => void publishContent()}
                >
                  {publishingContent ? "Publishing…" : "Publish changes"}
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant={live ? "outline" : "primary"}
              disabled={busy || conflict}
              onClick={() => void changeStatus()}
            >
              {changingStatus ? liveAction.busyLabel : liveAction.label}
            </Button>
          </>
        }
        settingsTitle="Lesson settings"
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
        settings={
          <div className="space-y-7">
            <div className="space-y-1.5">
              <Label htmlFor="lesson-section">Section</Label>
              <Select
                value={lesson.sectionId ?? undefined}
                disabled={busy || conflict}
                onValueChange={(sectionId) => {
                  if (sectionId === lesson.sectionId) return;
                  setLesson({ ...lesson, sectionId });
                  void saveDetails({ sectionId }, "The section wasn't changed:").then(
                    (saved) => {
                      if (!saved)
                        setLesson(
                          (current) =>
                            current && { ...current, sectionId: lesson.sectionId },
                        );
                    },
                  );
                }}
              >
                <SelectTrigger id="lesson-section" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {product.sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="lesson-preview" className="font-semibold">
                  Free preview
                </Label>
                <p className="text-sm text-muted-foreground">
                  Anyone can open this lesson from the sales page without joining.
                </p>
              </div>
              <Switch
                id="lesson-preview"
                checked={!lesson.requiresEnrollment}
                disabled={busy || conflict}
                onCheckedChange={(checked) => {
                  const previous = lesson.requiresEnrollment;
                  setLesson({ ...lesson, requiresEnrollment: !checked });
                  void saveDetails(
                    { requiresEnrollment: !checked },
                    "Free preview wasn't changed:",
                  ).then((saved) => {
                    if (!saved) {
                      setLesson(
                        (current) =>
                          current && { ...current, requiresEnrollment: previous },
                      );
                    }
                  });
                }}
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold">Visibility</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {lessonVisibilityNote(product.status === "published", lesson)}
              </p>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold">Delete lesson</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                This can&apos;t be undone.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 text-destructive hover:text-destructive"
                disabled={busy}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="size-4" /> Delete lesson
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex h-full min-h-0 flex-col">
          {conflict ? (
            <div
              role="alert"
              className="flex shrink-0 flex-wrap items-center gap-3 border-b border-destructive/30 bg-destructive/10 px-6 py-2 text-sm"
            >
              <p className="min-w-0 flex-[1_1_240px]">{LESSON_CONFLICT_MESSAGE}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                <RotateCw className="size-4" /> Reload
              </Button>
            </div>
          ) : null}
          {error && !conflict ? (
            <p
              role="alert"
              className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-6 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          {autosaveState.status === "error" ? (
            <div
              role="alert"
              className="flex shrink-0 flex-wrap items-center gap-3 border-b border-destructive/30 bg-destructive/10 px-6 py-2 text-sm text-destructive"
            >
              <span>Not saved: {autosaveState.message}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => autosave.current?.retry()}
              >
                Try again
              </Button>
            </div>
          ) : null}
          {autosaveState.status === "invalid" || refusal ? (
            <div className="max-h-[40%] shrink-0 space-y-2 overflow-y-auto border-b px-6 py-3">
              {autosaveState.status === "invalid" ? (
                <LessonDiagnostics
                  title="These changes weren't saved:"
                  diagnostics={autosaveState.diagnostics}
                />
              ) : null}
              {refusal ? (
                <LessonDiagnostics
                  title={refusal.title}
                  diagnostics={refusal.diagnostics}
                />
              ) : null}
            </div>
          ) : null}
          <div className="min-h-0 flex-1">
            <LessonPageEditor
              key={editorKey}
              school={school}
              initialContent={pageContent}
              unavailableReasons={unavailableReasons}
              editable={!conflict}
              onFlushChangeReady={onFlushChangeReady}
              onChange={(next) => autosave.current?.change(next)}
              beforeContent={
                <WritingEditorDocumentHeader
                  title={title}
                  titlePlaceholder="Lesson title"
                  titleError={titleError}
                  onTitleChange={changeTitle}
                />
              }
            />
          </div>
        </div>
      </WritingEditorShell>

      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard your unpublished changes?</DialogTitle>
            <DialogDescription>
              The page goes back to the version learners see now. Your unpublished edits
              can&apos;t be recovered.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDiscardDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={discarding}
              onClick={() => void discardDraft()}
            >
              {discarding ? "Discarding…" : "Discard changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete this lesson?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete
              {title.trim() ? ` the lesson “${title.trim()}”` : " this lesson"} and
              remove it from your course.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void deleteLesson()}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGate>
  );
}
