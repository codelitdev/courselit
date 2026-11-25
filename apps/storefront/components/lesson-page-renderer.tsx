"use client";

import { LESSON_IMAGE_HOSTS, lessonProfile } from "@courselit/lesson-content";
import {
  isAllowedImageUrl,
  isVideoId,
  videoEmbedUrl,
} from "@frontlit/text-editor/blocks";
import {
  type BlockRenderer,
  type BlockRendererProps,
  ContentRenderer,
  type ResolvedMedia,
} from "@frontlit/text-editor/renderer";
import {
  CircleAlert,
  CircleCheck,
  Download,
  FileText,
  Info,
  Lightbulb,
  OctagonAlert,
  StickyNote,
} from "lucide-react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LessonQuiz } from "@/components/lesson-quiz";
import { useSchoolId } from "@/components/school-context";
import {
  LearnerButton,
  LearnerCaption,
  LearnerImage,
  LearnerInset,
  LearnerText1,
} from "@/components/themed-page-builder";
import {
  fetchLessonMedia,
  type LessonPageDocument,
  lessonMediaIds,
  lessonMediaResolver,
} from "@/lib/lesson-page";
import { readLearnerQuiz } from "@/lib/quiz-attempt";
import { learnerHeaders } from "@/lib/school";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";
import { cn } from "@/lib/utils";

type LessonPageContextValue = {
  productId: string;
  lessonId: string;
  gradable: boolean;
  onQuizChanged: () => void;
  onQuizPassed?: () => void;
};

const LessonPageContext = createContext<LessonPageContextValue | null>(null);

function Figure({ caption, children }: { caption?: unknown; children: ReactNode }) {
  return (
    <figure className="grid gap-2">
      {children}
      {typeof caption === "string" && caption ? (
        <LearnerCaption className="text-muted-foreground">{caption}</LearnerCaption>
      ) : null}
    </figure>
  );
}

function resolved(props: BlockRendererProps): Exclude<ResolvedMedia, string> | null {
  const id = props.attrs.media;
  if (typeof id !== "string" || !props.resolveMedia) return null;
  const value = props.resolveMedia(id);
  if (!value) return null;
  return typeof value === "string" ? { url: value } : value;
}

function QuizBlock({ attrs }: BlockRendererProps) {
  const context = useContext(LessonPageContext);
  // A quiz that still carries answers, or isn't one, is never shown (L1).
  const quiz = readLearnerQuiz(attrs);
  if (!context || !quiz) return null;
  return (
    <LessonQuiz
      key={quiz.id}
      quiz={quiz}
      productId={context.productId}
      lessonId={context.lessonId}
      gradable={context.gradable}
      onQuizChanged={context.onQuizChanged}
      onPassed={context.onQuizPassed}
    />
  );
}

const CALLOUT_ICONS = {
  note: StickyNote,
  tip: Lightbulb,
  info: Info,
  success: CircleCheck,
  warning: CircleAlert,
  danger: OctagonAlert,
} as const;

function CalloutBlock({ attrs, children }: BlockRendererProps) {
  const type = (
    attrs.type in CALLOUT_ICONS ? attrs.type : "info"
  ) as keyof typeof CALLOUT_ICONS;
  const Icon = CALLOUT_ICONS[type];
  return (
    <LearnerInset role="note" data-type={type} className="flex gap-3">
      <Icon
        aria-hidden
        className={cn(
          "mt-1 size-5 shrink-0",
          type === "danger" || type === "warning" ? "text-destructive" : "text-primary",
        )}
      />
      <div className="grid min-w-0 flex-1 gap-2">
        {typeof attrs.title === "string" && attrs.title ? (
          <LearnerText1>{attrs.title}</LearnerText1>
        ) : null}
        {children}
      </div>
    </LearnerInset>
  );
}

function ImageBlock(props: BlockRendererProps) {
  const { attrs } = props;
  const src = attrs.media
    ? resolved(props)?.url
    : typeof attrs.src === "string" && isAllowedImageUrl(attrs.src, LESSON_IMAGE_HOSTS)
      ? attrs.src
      : null;
  if (!src) return null;
  return (
    <LearnerImage
      src={src}
      alt={typeof attrs.alt === "string" ? attrs.alt : ""}
      title={typeof attrs.title === "string" ? attrs.title : undefined}
      width={typeof attrs.width === "number" ? attrs.width : undefined}
      height={typeof attrs.height === "number" ? attrs.height : undefined}
      className="h-auto w-auto max-w-full object-contain"
    />
  );
}

function VideoBlock(props: BlockRendererProps) {
  const { provider, videoId, caption } = props.attrs;
  if (provider && isVideoId(provider, videoId)) {
    const src = videoEmbedUrl(provider, videoId);
    if (!src) return null;
    return (
      <Figure caption={caption}>
        <iframe
          className="aspect-video w-full border-0"
          src={src}
          title={typeof caption === "string" && caption ? caption : "Video"}
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
        />
      </Figure>
    );
  }
  const file = resolved(props);
  if (!file) return null;
  return (
    <Figure caption={caption}>
      {/* biome-ignore lint/a11y/useMediaCaption: lessons carry no caption tracks yet. */}
      <video className="w-full" src={file.url} controls preload="metadata" />
    </Figure>
  );
}

function AudioBlock(props: BlockRendererProps) {
  const file = resolved(props);
  if (!file) return null;
  return (
    <Figure caption={props.attrs.caption}>
      {/* biome-ignore lint/a11y/useMediaCaption: lessons carry no caption tracks yet. */}
      <audio className="w-full" src={file.url} controls preload="metadata" />
    </Figure>
  );
}

function DownloadButton({
  url,
  name,
  label,
  icon: Icon,
}: {
  url: string;
  name?: string;
  label: string;
  icon: typeof Download;
}) {
  return (
    <LearnerButton asChild variant="outline" className="w-fit">
      <a href={url} download={name ?? true} rel="noopener noreferrer">
        <Icon aria-hidden className="size-4" />
        {label}
      </a>
    </LearnerButton>
  );
}

function PdfBlock(props: BlockRendererProps) {
  const file = resolved(props);
  if (!file) return null;
  const title = typeof props.attrs.title === "string" ? props.attrs.title : "";
  return (
    <div className="grid gap-2">
      <object
        className="h-[70vh] w-full"
        data={file.url}
        type="application/pdf"
        aria-label={title || "PDF"}
      />
      <DownloadButton
        url={file.url}
        name={file.name}
        label={title ? `Open ${title}` : "Open PDF"}
        icon={FileText}
      />
    </div>
  );
}

function FileBlock(props: BlockRendererProps) {
  const file = resolved(props);
  if (!file) return null;
  const label =
    (typeof props.attrs.label === "string" && props.attrs.label) ||
    file.name ||
    "Download file";
  return (
    <DownloadButton url={file.url} name={file.name} label={label} icon={Download} />
  );
}

/**
 * Host renderers for the lesson profile's blocks that are controls or carry
 * text, built from page-builder primitives so a lesson follows the school's
 * theme. Embed and code blocks stay the package's: an embed only ever runs in
 * its sandboxed `srcdoc` frame (L3).
 */
export const LESSON_BLOCK_RENDERERS: Record<string, BlockRenderer> = {
  quiz: QuizBlock,
  callout: CalloutBlock,
  image: ImageBlock,
  video: VideoBlock,
  audio: AudioBlock,
  pdf: PdfBlock,
  file: FileBlock,
};

/** Fetches the media a page uses through the lesson's own media route (L5). */
function useLessonMedia(
  document: LessonPageDocument,
  productId: string,
  lessonId: string,
  previewToken: string | null,
) {
  const schoolId = useSchoolId();
  const ids = useMemo(() => lessonMediaIds(document), [document]);
  const key = ids.join("\n");
  const [media, setMedia] = useState<Map<string, Exclude<ResolvedMedia, string>>>(
    () => new Map(),
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for `ids`.
  useEffect(() => {
    setMedia(new Map());
    if (ids.length === 0) return;
    let active = true;
    void fetchLessonMedia({
      schoolId,
      productId,
      lessonId,
      mediaIds: ids,
      previewToken,
      headers: learnerHeaders,
    }).then((loaded) => {
      if (active) setMedia(loaded);
    });
    return () => {
      active = false;
    };
  }, [key, lessonId, previewToken, productId, schoolId]);

  return useMemo(() => lessonMediaResolver(media), [media]);
}

/**
 * A lesson page as learners, the public and previews see it: FrontLit's
 * renderer with the lesson profile, themed from the school's page-builder
 * theme, with the quiz in its place in the page.
 */
export function LessonPageRenderer({
  document,
  productId,
  lessonId,
  previewToken,
  onQuizChanged,
  onQuizPassed,
}: {
  document: LessonPageDocument;
  productId: string;
  lessonId: string;
  previewToken: string | null;
  onQuizChanged: () => void;
  onQuizPassed?: () => void;
}) {
  const theme = useSchoolThemeStyle();
  const resolveMedia = useLessonMedia(document, productId, lessonId, previewToken);
  const context = useMemo<LessonPageContextValue>(
    () => ({
      productId,
      lessonId,
      gradable: !previewToken,
      onQuizChanged,
      onQuizPassed,
    }),
    [lessonId, onQuizChanged, onQuizPassed, previewToken, productId],
  );
  return (
    <LessonPageContext.Provider value={context}>
      <ContentRenderer
        profile={lessonProfile}
        json={document}
        theme={theme}
        blocks={LESSON_BLOCK_RENDERERS}
        resolveMedia={resolveMedia}
        className="lesson-rich-text"
      />
    </LessonPageContext.Provider>
  );
}
