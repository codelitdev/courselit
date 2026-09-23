"use client";

import { type Editor, extractTextFromTextEditorContent } from "@frontlit/text-editor";
import {
  File,
  FileImage,
  FileText,
  Headphones,
  HelpCircle,
  Package,
  Save,
  Trash2,
  Tv,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ComponentProps, type FormEvent, useEffect, useId, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { CourseLitLoading } from "@/components/loading";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
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
import { Switch } from "@/components/ui/codelit/switch";
import { Textarea } from "@/components/ui/codelit/textarea";
import { Separator } from "@/components/ui/separator";
import { MediaPicker } from "./media-picker";
import type {
  Lesson,
  LessonContent,
  LessonType,
  Product,
  School,
  Section,
} from "./product-types";
import { QuizEditor } from "./quiz-editor";
import { RichTextEditor } from "./rich-text-editor";
import { ScormLessonUpload } from "./scorm-lesson-upload";

type ProductDetail = Product & { sections: Section[]; lessons: Lesson[] };

function editorContent(
  value: LessonContent | null,
): ComponentProps<typeof Editor>["initialContent"] {
  if (value?.type === "doc") return value;
  if (typeof value?.value === "string") return value.value;
  return null;
}

const lessonTypes: Array<{
  value: LessonType;
  label: string;
  icon: typeof FileText;
}> = [
  { value: "text", label: "Text", icon: FileText },
  { value: "video", label: "Video", icon: Video },
  { value: "audio", label: "Audio", icon: Headphones },
  { value: "pdf", label: "PDF", icon: FileImage },
  { value: "file", label: "File", icon: File },
  { value: "embed", label: "Embed", icon: Tv },
  { value: "quiz", label: "Quiz", icon: HelpCircle },
  { value: "scorm", label: "SCORM", icon: Package },
];

function LessonTypeCards({
  value: selectedValue,
  onChange,
  disabled = false,
}: {
  value: LessonType;
  onChange: (value: LessonType) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Lesson type"
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7"
    >
      {lessonTypes.map(({ value, label, icon: Icon }) => {
        const selected = value === selectedValue;
        return (
          <label
            key={value}
            htmlFor={`lesson-type-${value}`}
            className={`flex min-h-24 flex-col items-center justify-center rounded-md border-2 bg-card p-4 transition-colors ${
              selected ? "border-primary" : "border-muted"
            } ${
              disabled
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:bg-muted"
            }`}
          >
            <input
              id={`lesson-type-${value}`}
              type="radio"
              name="lesson-type"
              value={value}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(value)}
              className="sr-only"
            />
            <Icon className="mb-2 size-6" />
            <span className="flex items-center gap-2">
              {label}
              {value === "scorm" ? (
                <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Alpha
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
  statusLabel,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  statusLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="font-semibold">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {statusLabel ? (
          <span className="text-sm text-muted-foreground">{statusLabel}</span>
        ) : null}
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

function emptyContent(type: LessonType): LessonContent {
  if (type === "text") return { type: "doc", content: [] };
  if (type === "quiz") {
    return {
      questions: [
        { text: "Question #1", options: [{ text: "", correctAnswer: false }] },
      ],
      requiresPassingGrade: false,
      passingGrade: 70,
    };
  }
  return { value: "" };
}

function validateLesson(
  title: string,
  type: LessonType,
  content: LessonContent,
): { title?: string; content?: string } {
  const errors: { title?: string; content?: string } = {};
  if (!title.trim()) errors.title = "Please enter a lesson title.";

  if (type === "text") {
    if (
      content.type !== "doc" ||
      extractTextFromTextEditorContent(content).trim().length === 0
    ) {
      errors.content = "Please enter the lesson content.";
    }
  } else if (type === "embed") {
    if (typeof content.value !== "string" || content.value.trim().length === 0) {
      errors.content = "Please enter a YouTube video ID.";
    }
  } else if (type === "quiz") {
    const questions = Array.isArray(content.questions) ? content.questions : [];
    if (questions.length === 0) {
      errors.content = "Please add at least one question to the quiz.";
    } else {
      for (const questionValue of questions) {
        if (!questionValue || typeof questionValue !== "object") {
          errors.content = "All questions must have text.";
          break;
        }
        const question = questionValue as Record<string, unknown>;
        if (typeof question.text !== "string" || !question.text.trim()) {
          errors.content = "All questions must have text.";
          break;
        }
        const options = Array.isArray(question.options) ? question.options : [];
        if (options.length < 2) {
          errors.content = "Each question must have at least two options.";
          break;
        }
        if (
          !options.some(
            (option) =>
              option &&
              typeof option === "object" &&
              (option as Record<string, unknown>).correctAnswer === true,
          )
        ) {
          errors.content = "Each question must have at least one correct answer.";
          break;
        }
      }
    }
  }
  return errors;
}

function youtubeVideoId(value: string): string | null {
  const normalized = /^[a-z][a-z\d+\-.]*:\/\//i.test(value)
    ? value
    : `https://${value}`;
  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase();
    if (hostname === "youtu.be")
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
      ].includes(hostname)
    ) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "v", "shorts", "live"].includes(parts[0] ?? ""))
        return parts[1] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

function EmbedPreview({ value }: { value: string }) {
  const iframeId = useId();
  const [height, setHeight] = useState(100);
  const trimmed = value.trim();

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        event.data?.type !== "embed-resize" ||
        event.data.id !== iframeId ||
        typeof event.data.height !== "number" ||
        !Number.isFinite(event.data.height)
      ) {
        return;
      }
      setHeight(Math.max(100, Math.ceil(event.data.height)));
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [iframeId]);

  if (!trimmed) return null;
  const videoId = youtubeVideoId(trimmed);
  if (videoId) {
    return (
      <div className="aspect-video overflow-hidden rounded-md border">
        <iframe
          className="size-full"
          src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}`}
          title="YouTube video preview"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  const srcDoc = `<!doctype html>
<html>
  <head>
    <style>
      html, body { margin: 0; padding: 0; overflow: hidden; }
      #content-wrapper { overflow: hidden; height: auto; }
    </style>
  </head>
  <body>
    <div id="content-wrapper">${trimmed}</div>
    <script>
      const iframeId = ${JSON.stringify(iframeId)};
      const wrapper = document.getElementById("content-wrapper");
      function sendHeight() {
        const height = wrapper ? wrapper.scrollHeight : document.body.scrollHeight;
        window.parent.postMessage({ type: "embed-resize", id: iframeId, height }, "*");
      }
      const resizeObserver = new ResizeObserver(sendHeight);
      resizeObserver.observe(wrapper || document.body);
      const mutationObserver = new MutationObserver(sendHeight);
      mutationObserver.observe(wrapper || document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
      window.addEventListener("load", sendHeight);
      window.addEventListener("resize", sendHeight);
      const interval = setInterval(sendHeight, 500);
      setTimeout(() => clearInterval(interval), 10000);
      sendHeight();
    </script>
  </body>
</html>`;
  return (
    <iframe
      className="w-full border-0"
      height={height}
      title="Embedded content preview"
      sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
      srcDoc={srcDoc}
    />
  );
}

async function responseError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

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
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<LessonType>("text");
  const [content, setContent] = useState<LessonContent>({ type: "doc", content: [] });
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [downloadable, setDownloadable] = useState(false);
  const [requiresEnrollment, setRequiresEnrollment] = useState(true);
  const [status, setStatus] = useState<Lesson["status"]>("draft");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    content?: string;
  }>({});
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
          const lesson = detail.lessons.find((item) => item.id === lessonId);
          if (!lesson) throw new Error("This lesson no longer exists.");
          setTitle(lesson.title);
          setType(lesson.type);
          setContent(lesson.content ?? { type: "doc", content: [] });
          setMediaId(lesson.mediaId);
          setDownloadable(lesson.downloadable);
          setRequiresEnrollment(lesson.requiresEnrollment);
          setStatus(lesson.status);
        } else {
          const defaultType: LessonType = detail.kind === "download" ? "file" : "text";
          setType(defaultType);
          setContent(emptyContent(defaultType));
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
  }, [lessonId, productId, sectionId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const nextFieldErrors = validateLesson(title, type, content);
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
            content,
            mediaId,
            downloadable,
            requiresEnrollment,
            sectionId,
            status,
          }),
        },
      );
      if (!response.ok) {
        let message = "Unable to save the lesson.";
        try {
          const body = (await response.json()) as { message?: string };
          if (body.message) message = body.message;
        } catch {
          // Keep the generic message when the API has no JSON error body.
        }
        throw new Error(message);
      }
      const saved = (await response.json()) as { id?: string };
      const usesSeparateMediaSection = [
        "video",
        "audio",
        "pdf",
        "file",
        "scorm",
      ].includes(type);
      if (!editing && usesSeparateMediaSection && saved.id) {
        router.replace(
          `${productRoot}/content/section/${encodeURIComponent(sectionId)}/lesson?id=${encodeURIComponent(saved.id)}`,
        );
      } else {
        router.replace(`${productRoot}/content`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save the lesson.");
      setSaving(false);
    }
  }

  async function saveMedia(nextMediaId: string | null) {
    const previousMediaId = mediaId;
    setMediaId(nextMediaId);
    if (!editing || !school || !lessonId || saving) return;
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
  const heading = isDownload
    ? editing
      ? "Edit File"
      : "New File"
    : editing
      ? "Edit Lesson"
      : "New Lesson";

  const itemLabel = isDownload ? "file" : "lesson";
  const description = editing
    ? `Modify the details of your existing ${itemLabel}.`
    : `Create a new ${itemLabel} for this product.`;

  const breadcrumbItems = [
    { label: "Products", href: "/products" },
    { label: product?.title ?? "Product", href: productRoot },
    { label: "Content", href: `${productRoot}/content` },
    { label: heading },
  ];

  useSetBreadcrumb(breadcrumbItems);
  return (
    <AuthGate>
      <div className="page-shell">
        <header>
          <h1 className="text-4xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </header>
        {loading ? (
          <CourseLitLoading label="Loading lesson…" className="justify-start" />
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {!loading && !error ? (
          <>
            <form onSubmit={save} className="mb-4 space-y-8">
              {!isDownload ? (
                <div className="space-y-4">
                  <Label className="font-semibold">Lesson Type</Label>
                  <LessonTypeCards
                    value={type}
                    onChange={(nextType) => {
                      if (!editing) {
                        setType(nextType);
                        setContent(emptyContent(nextType));
                        if (nextType === "quiz") setRequiresEnrollment(true);
                        setError(null);
                        setFieldErrors({});
                      }
                    }}
                    disabled={editing}
                  />
                </div>
              ) : null}

              <div className="space-y-4">
                <Label htmlFor="lesson-title" className="font-semibold">
                  Title
                </Label>
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
                    setFieldErrors((current) => ({ ...current, title: undefined }));
                  }}
                  placeholder="Enter lesson title"
                />
                {fieldErrors.title ? (
                  <p className="text-sm text-destructive">{fieldErrors.title}</p>
                ) : null}
              </div>

              <div className="space-y-4">
                {type === "text" && school ? (
                  <>
                    <Label className="font-semibold">Content</Label>
                    <RichTextEditor
                      school={school}
                      purpose="lesson_content"
                      key={type}
                      initialContent={editorContent(content)}
                      onChange={(document) => {
                        setContent(document as LessonContent);
                        setFieldErrors((current) => ({
                          ...current,
                          content: undefined,
                        }));
                      }}
                      placeholder="Write something…"
                      className="rounded-md border bg-card"
                      contentClassName="max-w-none"
                      editorClassName="min-h-[260px]"
                    />
                  </>
                ) : null}
                {type === "embed" ? (
                  <>
                    <Label htmlFor="lesson-embed" className="font-semibold">
                      Embed code
                    </Label>
                    <Textarea
                      id="lesson-embed"
                      value={typeof content.value === "string" ? content.value : ""}
                      onChange={(event) => {
                        setContent({ value: event.target.value });
                        setFieldErrors((current) => ({
                          ...current,
                          content: undefined,
                        }));
                      }}
                      placeholder="e.g. a YouTube URL or iframe code"
                    />
                    <EmbedPreview
                      value={typeof content.value === "string" ? content.value : ""}
                    />
                  </>
                ) : null}
                {type === "quiz" ? (
                  <>
                    <Label className="font-semibold">Content</Label>
                    <QuizEditor
                      key={type}
                      value={content}
                      onChange={(next) => {
                        setContent(next);
                        setFieldErrors((current) => ({
                          ...current,
                          content: undefined,
                        }));
                      }}
                    />
                  </>
                ) : null}
                {fieldErrors.content ? (
                  <p className="text-sm text-destructive">{fieldErrors.content}</p>
                ) : null}
                {!isDownload && type !== "quiz" ? (
                  <ToggleRow
                    id="lesson-preview"
                    label="Preview"
                    description="Allow students to preview this lesson without enrolling"
                    checked={!requiresEnrollment}
                    onChange={(checked) => setRequiresEnrollment(!checked)}
                  />
                ) : null}
                <ToggleRow
                  id="lesson-visibility"
                  label="Visibility"
                  description="When unpublished, this lesson is hidden from enrolled learners."
                  checked={status === "published"}
                  statusLabel={status === "published" ? "Unpublish" : "Publish"}
                  onChange={(checked) => setStatus(checked ? "published" : "draft")}
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-6">
                {editing ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="size-4" /> Delete
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-3">
                  <Button asChild variant="outline">
                    <Link href={`${productRoot}/content`}>Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={saving}>
                    <Save className="size-4" />{" "}
                    {saving
                      ? "Saving…"
                      : `${editing ? "Update" : "Save"} ${isDownload ? "File" : "Lesson"}`}
                  </Button>
                </div>
              </div>
            </form>

            {type === "video" ||
            type === "audio" ||
            type === "pdf" ||
            type === "file" ? (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="font-semibold">Media</Label>
                  {editing && school ? (
                    <MediaPicker
                      school={school}
                      lessonType={type}
                      value={mediaId}
                      onChange={(nextMediaId) => void saveMedia(nextMediaId)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Save the lesson first, then select a reusable media library asset.
                    </p>
                  )}
                </div>
              </>
            ) : null}

            {type === "scorm" && editing && school && lessonId ? (
              <>
                <Separator />
                <section className="space-y-2">
                  <Label className="font-semibold">SCORM package</Label>
                  <ScormLessonUpload
                    school={school}
                    lessonId={lessonId}
                    content={content}
                    onUploadComplete={(nextContent, nextMediaId) => {
                      setContent(nextContent);
                      setMediaId(nextMediaId);
                    }}
                  />
                </section>
              </>
            ) : null}
          </>
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
