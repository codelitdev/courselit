import type { ResolvedMedia, ResolveMedia } from "@frontlit/text-editor/renderer";

type ObjectNode = {
  type?: unknown;
  attrs?: Record<string, unknown>;
  content?: unknown;
};

/** A learner lesson page: Tiptap JSON already stripped of quiz answers by the API. */
export type LessonPageDocument = { type: "doc"; content: Record<string, unknown>[] };

/** Blocks of the lesson profile that point at uploaded media by ID. */
export const LESSON_MEDIA_BLOCKS = ["image", "video", "audio", "pdf", "file"] as const;

const MAX_DEPTH = 128;

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

/** Learner lesson content as a page document, or null when it isn't one (SCORM, empty). */
export function readLessonPage(content: unknown): LessonPageDocument | null {
  if (!isObject(content) || content.type !== "doc" || !Array.isArray(content.content)) {
    return null;
  }
  return content as LessonPageDocument;
}

function visit(node: unknown, fn: (node: ObjectNode) => void, depth = 0): void {
  if (!isObject(node) || depth > MAX_DEPTH) return;
  fn(node as ObjectNode);
  if (Array.isArray(node.content)) {
    for (const child of node.content) visit(child, fn, depth + 1);
  }
}

/** Whether a learner lesson page holds a quiz. */
export function lessonPageHasQuiz(content: unknown): boolean {
  let found = false;
  visit(content, (node) => {
    if (node.type === "quiz") found = true;
  });
  return found;
}

/**
 * The media IDs a page's media blocks use, once each, in document order. An
 * image or video that points at Unsplash or YouTube/Vimeo has no media ID and
 * needs no lookup.
 */
export function lessonMediaIds(content: unknown): string[] {
  const ids = new Set<string>();
  visit(content, (node) => {
    if (!(LESSON_MEDIA_BLOCKS as readonly unknown[]).includes(node.type)) return;
    const media = node.attrs?.media;
    if (typeof media === "string" && media.length > 0) ids.add(media);
  });
  return [...ids];
}

/**
 * Where one of a lesson's media items is read (L5). Enrolled learners and the
 * public use the school's public route (the session cookie identifies the
 * learner); a preview uses the preview route with its token header.
 */
export function lessonMediaItemPath(input: {
  schoolId: string;
  productId: string;
  lessonId: string;
  mediaId: string;
  preview: boolean;
}): string {
  const lesson = `/products/${encodeURIComponent(input.productId)}/lessons/${encodeURIComponent(input.lessonId)}/media/${encodeURIComponent(input.mediaId)}`;
  return input.preview
    ? `/api/v1/preview${lesson}`
    : `/api/v1/public/${encodeURIComponent(input.schoolId)}${lesson}`;
}

/** A media read response as the renderer's resolved media, or null when it isn't usable. */
export function readLessonMedia(body: unknown): Exclude<ResolvedMedia, string> | null {
  if (!isObject(body) || typeof body.url !== "string") return null;
  try {
    const url = new URL(body.url);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  } catch {
    return null;
  }
  return {
    url: body.url,
    name: typeof body.fileName === "string" ? body.fileName : undefined,
    mimeType: typeof body.mimeType === "string" ? body.mimeType : undefined,
  };
}

/** The renderer's synchronous lookup over the media fetched so far. */
export function lessonMediaResolver(
  media: ReadonlyMap<string, Exclude<ResolvedMedia, string>>,
): ResolveMedia {
  return (id) => media.get(id) ?? null;
}

/**
 * Fetches every media item a page uses, in parallel. Items that fail are left
 * out, so their blocks render nothing.
 */
export async function fetchLessonMedia(
  input: {
    schoolId: string;
    productId: string;
    lessonId: string;
    mediaIds: readonly string[];
    previewToken: string | null;
    headers: (extra?: Record<string, string>) => HeadersInit;
  },
  fetcher: typeof fetch = fetch,
): Promise<Map<string, Exclude<ResolvedMedia, string>>> {
  const preview = Boolean(input.previewToken);
  const entries = await Promise.all(
    input.mediaIds.map(async (mediaId) => {
      try {
        const response = await fetcher(
          lessonMediaItemPath({ ...input, mediaId, preview }),
          {
            credentials: "include",
            cache: "no-store",
            headers: input.headers(
              input.previewToken
                ? { "x-preview-token": input.previewToken }
                : undefined,
            ),
          },
        );
        if (!response.ok) return null;
        const media = readLessonMedia(await response.json());
        return media ? ([mediaId, media] as const) : null;
      } catch {
        return null;
      }
    }),
  );
  return new Map(entries.filter((entry) => entry !== null));
}
