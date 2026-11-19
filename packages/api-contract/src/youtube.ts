/**
 * YouTube link helpers. Dependency-free so browser code can import them
 * without the rest of the contract.
 */

/** YouTube hosts a post's video link may point at. */
const YOUTUBE_HOST = /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com)$/i;
const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
/**
 * The video ID in a YouTube link (watch, share, embed, shorts or live), or
 * null when the link is not a YouTube video. A missing protocol is allowed.
 */
export function youtubeVideoId(value: string): string | null {
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  let id: string | null = null;
  if (/^(?:www\.)?youtu\.be$/i.test(url.hostname)) {
    id = url.pathname.split("/")[1] ?? null;
  } else if (YOUTUBE_HOST.test(url.hostname)) {
    const [, first, second] = url.pathname.split("/");
    if (first === "watch") id = url.searchParams.get("v");
    else if (first === "embed" || first === "shorts" || first === "live") id = second ?? null;
  }
  return id && YOUTUBE_VIDEO_ID.test(id) ? id : null;
}
/** The privacy-enhanced embed link a post stores for a YouTube link, or null. */
export function youtubeEmbedUrl(value: string): string | null {
  const id = youtubeVideoId(value);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}
