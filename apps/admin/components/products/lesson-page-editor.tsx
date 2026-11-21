"use client";

import {
  LESSON_MEDIA_ACCEPT,
  lessonProfile,
  quizBlock,
} from "@courselit/lesson-content";
import { MediaUploadDialog, type SelectedMedia } from "@frontlit/media-uploader";
import {
  BlockFrame,
  type BlockSettingsProps,
  type BlockUi,
  Editor,
  MediaPickerContextProvider,
  mediaUrl,
  type NodeViewComponent,
  type PickMedia,
  type ResolveMedia,
  SettingsField,
  useEditorBlocks,
} from "@frontlit/text-editor";
import { CircleHelp, Image as ImageIcon } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type CourseLitMedia,
  filterCourseLitMediaAdapters,
  getCourseLitMedia,
  mediaMatchesAcceptedTypes,
  useCourseLitMediaUploader,
} from "@/lib/course-media-uploader";
import {
  editorUnavailableBlocks,
  type ImagePick,
  imageAttrsForPick,
  isPendingImageToken,
  pendingImageToken,
} from "@/lib/lesson-page";
import {
  emptyQuizContent,
  type QuizEditorAction,
  quizContentError,
  quizContentFromEditor,
  quizEditorReducer,
  quizEditorState,
  sameQuizContent,
} from "@/lib/lesson-quiz";
import { cn } from "@/lib/utils";
import { QuizEditor } from "./quiz-editor";

type ReactNodeViewProps = ComponentProps<NodeViewComponent>;
type MediaKind = "image" | "video" | "audio" | "pdf" | "file";
type Json = Record<string, unknown>;

/** What node views need from the host: the picker, Unsplash picks and the quiz count. */
type LessonEditorHost = {
  pickImage(): Promise<ImagePick | null>;
  /** Unsplash picks made from the `/` menu, by placeholder ID (see `pendingImageToken`). */
  pendingImages: Map<string, ImagePick>;
  /** Quiz node views register here, so the menu greys out a second quiz at once. Stable. */
  registerQuiz(key: object): () => void;
  quizOrder(key: object): number;
  /** Changes when quizzes come and go, so views re-check their order. */
  quizCount: number;
  /** False while autosave is stopped (a version conflict); node views don't re-render on `setEditable`. */
  editable: boolean;
};

const LessonEditorHostContext = createContext<LessonEditorHost | null>(null);

const useHost = () => useContext(LessonEditorHostContext);

function isAllowedImageUrl(url: string): boolean {
  return lessonProfile.blockSchemas.get("image")?.attrs.src?.validate(url) === true;
}

function QuizBlockView(props: ReactNodeViewProps) {
  const host = useHost();
  const attrs = props.node.attrs as Json;
  const [quiz, setQuiz] = useState(() => quizEditorState(attrs));
  const quizRef = useRef(quiz);
  quizRef.current = quiz;
  const key = useRef({}).current;
  const [order, setOrder] = useState(0);
  const editable = host ? host.editable : props.editor.isEditable;

  const registerQuiz = host?.registerQuiz;
  useEffect(() => registerQuiz?.(key), [registerQuiz, key]);
  const quizCount = host?.quizCount ?? 0;
  useEffect(() => {
    // Re-checked whenever a quiz is added or removed.
    if (host && quizCount >= 0) setOrder(host.quizOrder(key));
  }, [host, key, quizCount]);

  // Attributes changed outside this form (undo, a reload) or lack IDs:
  // follow them, and write back filled-in IDs so every save keeps them.
  useEffect(() => {
    if (sameQuizContent(quizRef.current, attrs)) return;
    const next = quizEditorState(attrs);
    setQuiz(next);
    if (editable && !sameQuizContent(next, attrs)) {
      props.updateAttributes(quizContentFromEditor(next));
    }
  }, [attrs, editable, props.updateAttributes]);

  const dispatch = useCallback(
    (action: QuizEditorAction) => {
      const next = quizEditorReducer(quizRef.current, action);
      if (next === quizRef.current) return;
      quizRef.current = next;
      setQuiz(next);
      props.updateAttributes(quizContentFromEditor(next));
    },
    [props.updateAttributes],
  );

  const incomplete = quizContentError(quizContentFromEditor(quiz));
  return (
    <BlockFrame label="Quiz" props={props}>
      <div className="te-block__content space-y-3" contentEditable={false}>
        {order > 0 ? (
          <p role="alert" className="text-sm text-destructive">
            A lesson holds one quiz. Move these questions into the first quiz, then
            remove this one.
          </p>
        ) : null}
        <QuizEditor quiz={quiz} dispatch={dispatch} disabled={!editable} />
        {incomplete ? (
          <p className="text-xs text-muted-foreground">
            Draft quiz: {incomplete} The lesson can be saved, but not made live, until
            this is fixed.
          </p>
        ) : null}
      </div>
    </BlockFrame>
  );
}

/** The Quiz block's editing UI; its schema (and grading) live in `@courselit/lesson-content`. */
export const quizBlockUi: BlockUi = {
  schema: quizBlock,
  insert: {
    label: "Quiz",
    description: "Graded questions; one per lesson",
    group: "Interactive",
    icon: CircleHelp,
    keywords: ["question", "test", "assessment", "exam"],
    create: () => ({ type: "quiz", attrs: emptyQuizContent() }),
  },
  view: QuizBlockView,
};

function ImageBlockView(props: ReactNodeViewProps) {
  const host = useHost();
  const { previews, resolveMedia } = useEditorBlocks();
  const attrs = props.node.attrs as { media?: unknown; src?: unknown; alt?: unknown };
  const editable = host ? host.editable : props.editor.isEditable;

  // An Unsplash pick from the `/` menu arrives as a placeholder ID.
  useEffect(() => {
    if (!host || !isPendingImageToken(attrs.media)) return;
    // Kept in the map (it's tiny): effects may run twice in development,
    // and a second run must not undo the first.
    const pick = host.pendingImages.get(attrs.media);
    if (pick) props.updateAttributes(imageAttrsForPick(pick, attrs.alt));
  }, [attrs.media, attrs.alt, host, props.updateAttributes]);

  let url: string | null = null;
  if (typeof attrs.src === "string" && attrs.src) url = attrs.src;
  else if (typeof attrs.media === "string" && !isPendingImageToken(attrs.media)) {
    url =
      previews.get(attrs.media)?.url ??
      mediaUrl(resolveMedia, attrs.media)?.url ??
      null;
  }
  const chosen = Boolean(attrs.src || attrs.media);

  return (
    <BlockFrame label="Image" props={props}>
      <div className="te-block__content" contentEditable={false}>
        {url ? (
          // biome-ignore lint/performance/noImgElement: editor preview of the author's image
          <img
            src={url}
            alt={typeof attrs.alt === "string" ? attrs.alt : ""}
            className="h-auto max-w-full rounded-md"
          />
        ) : (
          <p className="te-block__empty">
            {chosen ? "Image preview unavailable." : "No image chosen yet."}
          </p>
        )}
        {editable && host ? (
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-7 items-center rounded-md border border-input px-2 text-xs hover:bg-muted"
              onClick={() =>
                void host.pickImage().then((pick) => {
                  if (pick) props.updateAttributes(imageAttrsForPick(pick, attrs.alt));
                })
              }
            >
              {chosen ? "Replace image" : "Choose image"}
            </button>
            {typeof attrs.src === "string" && attrs.src ? (
              <span className="text-xs text-muted-foreground">From Unsplash</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </BlockFrame>
  );
}

function ImageSettings({ attrs, update }: BlockSettingsProps) {
  return (
    <SettingsField label="Alt text">
      <input
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
        value={typeof attrs.alt === "string" ? attrs.alt : ""}
        onChange={(event) => update({ alt: event.target.value || null })}
      />
    </SettingsField>
  );
}

const imageSchema = lessonProfile.blockSchemas.get("image");

/**
 * Image with uploads and Unsplash: the library's Image UI only knows media
 * IDs, while lesson images may also be Unsplash URLs (section 4.1).
 */
export const imageBlockUi: BlockUi | null = imageSchema
  ? {
      schema: imageSchema,
      insert: {
        label: "Image",
        description: "Upload, pick from the library or Unsplash",
        group: "Media",
        icon: ImageIcon,
        keywords: ["picture", "photo", "img", "unsplash"],
        create: () => ({ type: "image", attrs: { media: null, src: null } }),
      },
      view: ImageBlockView,
      settings: ImageSettings,
    }
  : null;

const LESSON_BLOCK_UI = [quizBlockUi, ...(imageBlockUi ? [imageBlockUi] : [])];

type PickRequest = {
  kind: MediaKind;
  resolve: (pick: { media: CourseLitMedia } | { unsplash: ImagePick } | null) => void;
};

const MEDIA_NOUNS: Record<MediaKind, string> = {
  image: "image",
  video: "video",
  audio: "audio file",
  pdf: "PDF",
  file: "file",
};

export type LessonPageEditorProps = {
  school: { id: string };
  initialContent: Json;
  /** Block name → reason it may not be added now (`trial`, `plan_required`). */
  unavailableReasons: Record<string, string>;
  editable: boolean;
  onChange: (content: Json) => void;
  onFlushChangeReady?: (flush: () => void) => void;
  /** Shown above the page inside the editor's scroll area (the title heading). */
  beforeContent?: ReactNode;
  /** The editor fills its container; the block toolbar sticks to the top. */
  className?: string;
};

/**
 * The page editor of a lesson (docs/wip/lesson-pages.md, section 3.4):
 * `@frontlit/text-editor` with the lesson profile, the `/` menu, drag
 * handles, the admin's media library for media blocks and CourseLit's Quiz.
 */
export function LessonPageEditor({
  school,
  initialContent,
  unavailableReasons,
  editable,
  onChange,
  onFlushChangeReady,
  beforeContent,
  className,
}: LessonPageEditorProps) {
  const [request, setRequest] = useState<PickRequest | null>(null);
  const requestRef = useRef<PickRequest | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [mediaById, setMediaById] = useState<Map<string, CourseLitMedia>>(new Map());
  const quizKeys = useRef<object[]>([]);
  const [quizCount, setQuizCount] = useState(0);
  const registerQuiz = useCallback((key: object) => {
    quizKeys.current = [...quizKeys.current, key];
    setQuizCount(quizKeys.current.length);
    return () => {
      quizKeys.current = quizKeys.current.filter((item) => item !== key);
      setQuizCount(quizKeys.current.length);
    };
  }, []);
  const pendingImages = useRef(new Map<string, ImagePick>()).current;
  const pendingSequence = useRef(0);
  const adapters = useCourseLitMediaUploader({
    schoolId: school.id,
    purpose: "lesson_media",
    accessPolicy: "private",
  });
  const kind = request?.kind ?? "file";
  const acceptedTypes = useMemo(() => [...(LESSON_MEDIA_ACCEPT[kind] ?? [])], [kind]);
  const filteredAdapters = filterCourseLitMediaAdapters(adapters, acceptedTypes);

  // Previews for media the page already uses.
  useEffect(() => {
    const ids = new Set<string>();
    const visit = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const record = node as { attrs?: { media?: unknown }; content?: unknown };
      if (typeof record.attrs?.media === "string") ids.add(record.attrs.media);
      if (Array.isArray(record.content)) record.content.forEach(visit);
    };
    visit(initialContent);
    let active = true;
    void Promise.all(
      [...ids].map((id) => getCourseLitMedia(school.id, id).catch(() => null)),
    ).then((items) => {
      if (!active) return;
      setMediaById(
        new Map(items.flatMap((item) => (item ? [[item.id, item] as const] : []))),
      );
    });
    return () => {
      active = false;
    };
  }, [initialContent, school.id]);

  const resolveMedia = useCallback<ResolveMedia>(
    (id) => {
      const item = mediaById.get(id);
      return item
        ? { url: item.url, name: item.fileName, mimeType: item.mimeType }
        : null;
    },
    [mediaById],
  );

  const open = useCallback(
    (nextKind: MediaKind) =>
      new Promise<Parameters<PickRequest["resolve"]>[0]>((resolve) => {
        requestRef.current?.resolve(null);
        const next = { kind: nextKind, resolve };
        requestRef.current = next;
        setPickError(null);
        setRequest(next);
      }),
    [],
  );

  const finish = useCallback((result: Parameters<PickRequest["resolve"]>[0]) => {
    const current = requestRef.current;
    requestRef.current = null;
    setRequest(null);
    current?.resolve(result);
  }, []);

  function select(selected: SelectedMedia<CourseLitMedia>) {
    const current = requestRef.current;
    if (!current) return;
    const accepted = [...(LESSON_MEDIA_ACCEPT[current.kind] ?? [])];
    if (selected.media) {
      if (!mediaMatchesAcceptedTypes(selected.media, accepted)) {
        setPickError(
          `That file isn't a ${MEDIA_NOUNS[current.kind]}. Choose another one.`,
        );
        finish(null);
        return;
      }
      setMediaById((map) => new Map(map).set(selected.media!.id, selected.media!));
      finish({ media: selected.media });
      return;
    }
    if (current.kind === "image" && isAllowedImageUrl(selected.src)) {
      finish({ unsplash: { kind: "unsplash", url: selected.src, alt: selected.alt } });
      return;
    }
    setPickError("Choose a file from your media library or upload one.");
    finish(null);
  }

  const pickMedia = useCallback<PickMedia>(
    async ({ kind: requested }) => {
      const result = await open(requested);
      if (!result) return null;
      if ("unsplash" in result) {
        pendingSequence.current += 1;
        const token = pendingImageToken(pendingSequence.current);
        pendingImages.set(token, result.unsplash);
        return { id: token, previewUrl: result.unsplash.url };
      }
      const { media } = result;
      return {
        id: media.id,
        previewUrl: media.url,
        name: media.fileName,
        mimeType: media.mimeType,
        alt: media.alt ?? undefined,
      };
    },
    [open, pendingImages],
  );

  const host = useMemo<LessonEditorHost>(
    () => ({
      async pickImage() {
        const result = await open("image");
        if (!result) return null;
        if ("unsplash" in result) return result.unsplash;
        return {
          kind: "media",
          id: result.media.id,
          url: result.media.url,
          alt: result.media.alt,
        };
      },
      pendingImages,
      registerQuiz,
      quizOrder: (key) => quizKeys.current.indexOf(key),
      quizCount,
      editable,
    }),
    [editable, open, pendingImages, quizCount, registerQuiz],
  );

  const unavailable = useMemo(
    () => editorUnavailableBlocks(unavailableReasons, { hasQuiz: quizCount > 0 }),
    [quizCount, unavailableReasons],
  );

  return (
    <LessonEditorHostContext.Provider value={host}>
      <MediaPickerContextProvider pickMedia={pickMedia}>
        <Editor
          profile={lessonProfile}
          blocks={LESSON_BLOCK_UI}
          unavailable={unavailable}
          resolveMedia={resolveMedia}
          initialContent={initialContent}
          onChange={(json) => onChange(json as Json)}
          onFlushChangeReady={onFlushChangeReady}
          editable={editable}
          ariaLabel="Lesson page"
          placeholder="Write the lesson, or type / to add a video, quiz or other block"
          className={cn(
            "writing-editor h-full min-h-0 gap-0 overflow-x-hidden overflow-y-auto rounded-none border-0 bg-background",
            className,
          )}
          contentClassName="max-w-[46rem] pb-24"
          editorClassName="writing-editor-content min-h-[420px]"
          beforeContent={beforeContent}
        >
          {pickError ? (
            <p role="alert" className="px-6 text-sm text-destructive sm:px-10">
              {pickError}
            </p>
          ) : null}
        </Editor>
      </MediaPickerContextProvider>
      <MediaUploadDialog<CourseLitMedia>
        {...filteredAdapters}
        open={Boolean(request)}
        onOpenChange={(next) => {
          if (!next) finish(null);
        }}
        title={`Choose ${MEDIA_NOUNS[kind] === "image" ? "an image" : `a ${MEDIA_NOUNS[kind]}`}`}
        acceptedTypes={acceptedTypes}
        allowUnsplash={kind === "image"}
        metadataMode={kind === "image" ? "alt" : "auto"}
        onSelect={select}
      />
    </LessonEditorHostContext.Provider>
  );
}
