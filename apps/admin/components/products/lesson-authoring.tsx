"use client";

import { type Editor, extractTextFromTextEditorContent } from "@frontlit/text-editor";
import {
  File,
  FileImage,
  FileText,
  Headphones,
  HelpCircle,
  Package,
  Trash2,
  Tv,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ComponentProps, type FormEvent, useEffect, useId, useState } from "react";
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
import { Switch } from "@/components/ui/codelit/switch";
import { Textarea } from "@/components/ui/codelit/textarea";
import { truncateText } from "@/lib/truncate";
import { PLAN_FEATURE_COPY, usePlanFeatures } from "@/lib/plan-features";
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

function LessonTypeChips({
  value: selectedValue,
  onChange,
  disabled = false,
  locked = [],
}: {
  value: LessonType;
  onChange: (value: LessonType) => void;
  disabled?: boolean;
  /** Types the school's plan doesn't include. */
  locked?: readonly LessonType[];
}) {
  return (
    <div role="radiogroup" aria-label="Lesson type" className="flex flex-wrap gap-1.5">
      {lessonTypes.map(({ value, label, icon: Icon }) => {
        const selected = value === selectedValue;
        const isLocked = locked.includes(value) && !selected;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={(disabled && !selected) || isLocked}
            title={isLocked ? PLAN_FEATURE_COPY[value] : undefined}
            onClick={() => onChange(value)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-[var(--radius)] border px-3 text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              selected
                ? "border-primary bg-[var(--primary-soft)] font-semibold text-[var(--primary-ink)]"
                : "bg-card font-medium hover:bg-muted"
            } ${disabled || isLocked ? "cursor-default disabled:opacity-50" : ""}`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
            {value === "scorm" ? (
              <span className="rounded border px-1 text-[10px] font-medium text-muted-foreground">
                {isLocked ? "Business" : "Alpha"}
              </span>
            ) : null}
          </button>
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
      /* No allow-same-origin: a srcDoc frame inherits this page's origin, so
          with scripts allowed the embed could reach the parent page and call
          the API with the viewer's cookies. */
      sandbox="allow-scripts allow-popups allow-forms"
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
  const scormIncluded = usePlanFeatures(school?.id).has("scorm");
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<LessonType>("text");
  const [content, setContent] = useState<LessonContent>({ type: "doc", content: [] });
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [downloadable, setDownloadable] = useState(false);
  const [requiresEnrollment, setRequiresEnrollment] = useState(true);
  const [status, setStatus] = useState<Lesson["status"]>("draft");
  const [sectionChoice, setSectionChoice] = useState(sectionId);
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
          setStatus(detail.newLessonStatus ?? "draft");
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

  async function save(
    event: FormEvent<HTMLFormElement>,
    nextStatus: Lesson["status"] = status,
  ) {
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
            sectionId: sectionChoice,
            status: nextStatus,
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
          `${productRoot}/content/section/${encodeURIComponent(sectionChoice)}/lesson?id=${encodeURIComponent(saved.id)}`,
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
  const itemLabel = isDownload ? "file" : "lesson";
  const heading = editing
    ? title.trim() || `Untitled ${itemLabel}`
    : `New ${itemLabel}`;
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
          <>
            <form
              id="lesson-form"
              onSubmit={(event) => void save(event)}
              className="space-y-4"
            >
              <section className="rounded-xl border bg-card shadow-sm">
                <div className="px-5 pt-5">
                  <h2 className="text-base font-bold">
                    {isDownload ? "File" : "Lesson"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lessonLive
                      ? "Learners can see this lesson."
                      : "Drafts are hidden from learners until you make them live."}
                  </p>
                </div>
                <div className="space-y-5 px-5 pb-5 pt-4">
                  {!isDownload ? (
                    <div className="field">
                      <span>Type</span>
                      <LessonTypeChips
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
                        locked={scormIncluded ? [] : ["scorm"]}
                      />
                      {!editing && !scormIncluded ? (
                        <p className="text-xs text-muted-foreground">
                          {PLAN_FEATURE_COPY.scorm}
                        </p>
                      ) : null}
                      {editing ? (
                        <p className="text-xs text-muted-foreground">
                          The type can&apos;t change after a lesson is created.
                        </p>
                      ) : null}
                    </div>
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
                          setFieldErrors((current) => ({
                            ...current,
                            title: undefined,
                          }));
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

                  {type === "text" && school ? (
                    <div className="field">
                      <span>Content</span>
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
                    </div>
                  ) : null}
                  {type === "embed" ? (
                    <div className="field">
                      <Label htmlFor="lesson-embed">Embed code</Label>
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
                    </div>
                  ) : null}
                  {type === "quiz" ? (
                    <div className="field">
                      <span>Content</span>
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
                    </div>
                  ) : null}
                  {fieldErrors.content ? (
                    <p className="text-sm text-destructive">{fieldErrors.content}</p>
                  ) : null}

                  {type === "video" ||
                  type === "audio" ||
                  type === "pdf" ||
                  type === "file" ? (
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
                          Save the {itemLabel} first, then select a reusable media
                          library asset.
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
                          onUploadComplete={(nextContent, nextMediaId) => {
                            setContent(nextContent);
                            setMediaId(nextMediaId);
                          }}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Save the lesson first, then upload its SCORM package.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {!isDownload && type !== "quiz" ? (
                    <ToggleRow
                      id="lesson-preview"
                      label="Free preview"
                      description="Anyone can open this lesson from the sales page without joining."
                      checked={!requiresEnrollment}
                      onChange={(checked) => setRequiresEnrollment(!checked)}
                    />
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
                        void save(
                          event as unknown as FormEvent<HTMLFormElement>,
                          "draft",
                        )
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
