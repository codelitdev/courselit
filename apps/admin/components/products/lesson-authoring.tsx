"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
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
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import { lessonEditorHref, lessonFormHref } from "@/lib/lesson-editor";
import {
  type LessonSaveErrorBody,
  lessonSaveFailure,
  lessonSaveFailureMessage,
} from "@/lib/lesson-page";
import { PLAN_FEATURE_COPY, usePlanFeatures } from "@/lib/plan-features";
import { truncateText } from "@/lib/truncate";
import { MediaPicker } from "./media-picker";
import type {
  Lesson,
  LessonContent,
  LessonType,
  Product,
  School,
  Section,
} from "./product-types";
import { ScormLessonUpload } from "./scorm-lesson-upload";

type ProductDetail = Product & { sections: Section[]; lessons: Lesson[] };

function validateLesson(title: string): { title?: string } {
  const errors: { title?: string } = {};
  if (!title.trim()) errors.title = "Please enter a lesson title.";
  return errors;
}

async function readErrorBody(response: Response): Promise<LessonSaveErrorBody> {
  try {
    return (await response.json()) as LessonSaveErrorBody;
  } catch {
    return null;
  }
}

async function responseError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * The lesson form, for lessons that are packages rather than writing: SCORM
 * lessons in a course and the files of a digital download. Page lessons are
 * written in the full-screen editor (`PageLessonEditor`).
 */
export function LessonAuthoring({
  productId,
  sectionId,
  lessonId,
}: {
  productId: string;
  sectionId: string;
  lessonId?: string | null;
}) {
  const router = useRouter();
  const editing = Boolean(lessonId);
  const [school, setSchool] = useState<School | null>(null);
  const scormIncluded = usePlanFeatures(school?.id).has("scorm");
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<LessonType>("scorm");
  const [content, setContent] = useState<LessonContent>({});
  // The version the content is based on, sent back with a new package so a
  // concurrent change (another person or an agent) isn't overwritten.
  const [contentVersion, setContentVersion] = useState<number | null>(null);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [status, setStatus] = useState<Lesson["status"]>("draft");
  const [sectionChoice, setSectionChoice] = useState(sectionId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string }>({});
  const productRoot = `/products/${encodeURIComponent(productId)}`;

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then(async (body: { items?: School[] }) => {
        const selected = body.items?.find((item) => item.selected) ?? body.items?.[0];
        if (!selected) throw new Error("Create a school before managing products.");
        const response = await fetch(
          `/api/v1/products/${encodeURIComponent(productId)}`,
          {
            credentials: "include",
            cache: "no-store",
            headers: { "x-school-id": selected.id },
          },
        );
        if (!response.ok) throw new Error("Unable to load the product.");
        const detail = (await response.json()) as ProductDetail;
        if (!active) return;
        if (!detail.sections.some((section) => section.id === sectionId)) {
          throw new Error("This section no longer exists.");
        }
        if (lessonId) {
          const lessonResponse = await fetch(
            `/api/v1/lessons/${encodeURIComponent(lessonId)}`,
            {
              credentials: "include",
              cache: "no-store",
              headers: { "x-school-id": selected.id },
            },
          );
          if (!lessonResponse.ok) throw new Error("This lesson no longer exists.");
          const lesson = (await lessonResponse.json()) as Lesson;
          if (!active) return;
          if (lesson.type === "page") {
            // Page lessons are written in the full-screen editor.
            router.replace(lessonEditorHref(productId, lessonId));
            return;
          }
          setTitle(lesson.title);
          setType(lesson.type);
          setContent(lesson.content ?? {});
          setContentVersion(lesson.contentVersion);
          setMediaId(lesson.mediaId);
          setStatus(lesson.status);
        } else {
          setType(detail.kind === "download" ? "file" : "scorm");
          setStatus("draft");
        }
        setSchool(selected);
        setProduct(detail);
      })
      .catch((caught) => {
        if (active)
          setError(caught instanceof Error ? caught.message : "Unable to load lesson.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lessonId, productId, router, sectionId]);

  async function save(
    event: FormEvent<HTMLFormElement>,
    nextStatus: Lesson["status"] = status,
  ) {
    event.preventDefault();
    if (saving) return;
    const nextFieldErrors = validateLesson(title);
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      setError(null);
      return;
    }
    if (!school) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        editing
          ? `/api/v1/lessons/${encodeURIComponent(lessonId!)}`
          : `/api/v1/products/${encodeURIComponent(productId)}/lessons`,
        {
          method: editing ? "PATCH" : "POST",
          credentials: "include",
          headers: { "content-type": "application/json", "x-school-id": school.id },
          body: JSON.stringify({
            title: title.trim(),
            ...(editing ? {} : { type }),
            mediaId,
            sectionId: sectionChoice,
            status: nextStatus,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(
          lessonSaveFailureMessage(
            lessonSaveFailure(response.status, await readErrorBody(response)),
          ),
        );
      }
      const saved = (await response.json()) as { id?: string };
      if (!editing && saved.id) {
        // Its package or file is chosen once it exists.
        router.replace(
          lessonFormHref(productId, sectionChoice, { lessonId: saved.id }),
        );
        // The form stays mounted for the new lesson, so end the save here.
        setSaving(false);
      } else {
        router.replace(`${productRoot}/content`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save the lesson.");
      setSaving(false);
    }
  }

  async function saveMedia(nextMediaId: string | null) {
    if (!editing || !school || !lessonId || saving) return;
    const previousMediaId = mediaId;
    setMediaId(nextMediaId);
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/lessons/${encodeURIComponent(lessonId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json", "x-school-id": school.id },
        body: JSON.stringify({ mediaId: nextMediaId }),
      });
      if (!response.ok) {
        throw new Error(
          await responseError(response, "Unable to update the lesson media."),
        );
      }
    } catch (caught) {
      setMediaId(previousMediaId);
      setError(
        caught instanceof Error ? caught.message : "Unable to update the lesson media.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCurrentLesson() {
    if (!editing || !school || !lessonId || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/lessons/${encodeURIComponent(lessonId)}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "x-school-id": school.id },
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "Unable to delete the lesson."));
      }
      router.replace(`${productRoot}/content`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete the lesson.",
      );
      setSaving(false);
    }
  }

  const isDownload = product?.kind === "download";
  const itemLabel = isDownload ? "file" : "lesson";
  const heading = editing
    ? title.trim() || `Untitled ${itemLabel}`
    : isDownload
      ? "New file"
      : "New SCORM lesson";
  const lessonLive = status === "published";
  const productLive = product?.status === "published";
  const contentHref = `${productRoot}/content`;

  const breadcrumbItems = [
    { label: "Products", href: "/products" },
    { label: product?.title ?? "Product", href: productRoot },
    { label: isDownload ? "Files" : "Content", href: contentHref },
    { label: editing ? truncateText(title || "Lesson") : `New ${itemLabel}` },
  ];

  useSetBreadcrumb(breadcrumbItems);

  const footNote = !productLive
    ? `Learners will see it once the ${isDownload ? "download" : "course"} is live.`
    : lessonLive
      ? "Learners see changes as soon as you save."
      : "Making it live shows it to learners right away.";

  return (
    <AuthGate>
      <div className="page-shell">
        <header className="space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1
              className="min-w-0 truncate text-[28px] font-bold leading-tight tracking-tight"
              title={heading}
            >
              {truncateText(heading)}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                lessonLive
                  ? "bg-success-soft text-success-ink"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${lessonLive ? "bg-success" : "bg-muted-foreground"}`}
              />
              {lessonLive ? "Live" : "Draft"}
            </span>
          </div>
          {product ? (
            <p className="text-sm text-muted-foreground">
              {isDownload ? "Digital download" : "Course"} · {product.title}
            </p>
          ) : null}
        </header>
        {loading ? (
          <CourseLitLoading label="Loading lesson…" className="justify-start" />
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {!loading && product ? (
          <form
            id="lesson-form"
            onSubmit={(event) => void save(event)}
            className="space-y-4"
          >
            <section className="rounded-xl border bg-card shadow-sm">
              <div className="px-5 pt-5">
                <h2 className="text-base font-bold">
                  {isDownload ? "File" : "SCORM lesson"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lessonLive
                    ? "Learners can see this lesson."
                    : "Drafts are hidden from learners until you make them live."}
                </p>
              </div>
              <div className="space-y-5 px-5 pb-5 pt-4">
                {!editing && type === "scorm" && !scormIncluded ? (
                  <p className="text-sm text-muted-foreground">
                    {PLAN_FEATURE_COPY.scorm}
                  </p>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="field">
                    <Label htmlFor="lesson-title">Title</Label>
                    <Input
                      id="lesson-title"
                      required
                      autoFocus
                      maxLength={200}
                      value={title}
                      aria-invalid={Boolean(fieldErrors.title)}
                      className={fieldErrors.title ? "border-destructive" : undefined}
                      onChange={(event) => {
                        setTitle(event.target.value);
                        setFieldErrors({});
                      }}
                      placeholder={`Enter ${itemLabel} title`}
                    />
                    {fieldErrors.title ? (
                      <p className="text-sm text-destructive">{fieldErrors.title}</p>
                    ) : null}
                  </div>
                  <div className="field">
                    <Label htmlFor="lesson-section">Section</Label>
                    <Select value={sectionChoice} onValueChange={setSectionChoice}>
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
                </div>

                {type === "file" ? (
                  <div className="field">
                    <span>Media</span>
                    {editing && school ? (
                      <MediaPicker
                        school={school}
                        lessonType={type}
                        value={mediaId}
                        onChange={(nextMediaId) => void saveMedia(nextMediaId)}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Save the {itemLabel} first, then select a reusable media library
                        asset.
                      </p>
                    )}
                  </div>
                ) : null}

                {type === "scorm" ? (
                  <div className="field">
                    <span>SCORM package</span>
                    {editing && school && lessonId && !scormIncluded ? (
                      <p className="text-sm text-muted-foreground">
                        This lesson keeps playing. Replacing its package needs the
                        Business plan.
                      </p>
                    ) : editing && school && lessonId ? (
                      <ScormLessonUpload
                        school={school}
                        lessonId={lessonId}
                        content={content}
                        contentVersion={contentVersion}
                        onUploadComplete={(nextContent, nextMediaId, nextVersion) => {
                          setContent(nextContent);
                          setMediaId(nextMediaId);
                          setContentVersion(nextVersion);
                        }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Save the lesson first, then upload its SCORM package.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </section>

            <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2.5 rounded-xl border bg-card px-3.5 py-3 shadow-[var(--shadow-popover)]">
              {editing ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={saving}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="size-4" /> Delete
                </Button>
              ) : null}
              <span className="min-w-0 flex-[1_1_220px] text-[13.5px] text-muted-foreground">
                {footNote}
              </span>
              <Button asChild variant="ghost">
                <Link href={contentHref}>Cancel</Link>
              </Button>
              {lessonLive ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={(event) =>
                      void save(event as unknown as FormEvent<HTMLFormElement>, "draft")
                    }
                  >
                    Move to drafts
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </>
              ) : (
                <>
                  <Button type="submit" variant="outline" disabled={saving}>
                    {saving ? "Saving…" : "Save draft"}
                  </Button>
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={(event) =>
                      void save(
                        event as unknown as FormEvent<HTMLFormElement>,
                        "published",
                      )
                    }
                  >
                    Save and make live
                  </Button>
                </>
              )}
            </div>
          </form>
        ) : null}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure you want to delete this lesson?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete
                {title ? ` the lesson “${title}”` : " this lesson"} and remove it from
                your product.
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
                disabled={saving}
                onClick={() => {
                  setDeleteDialogOpen(false);
                  void deleteCurrentLesson();
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGate>
  );
}
