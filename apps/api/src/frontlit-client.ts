import type { MediaRef } from "@courselit/api-contract";

/**
 * CourseLit’s server-side adapter for FrontLit’s supported API. This is
 * intentionally hand-written: CourseLit must not import FrontLit’s private
 * workspace contract or server modules.
 */

export type FrontLitConfig = {
  server: string | null;
  provisioningSecret: string | null;
};

export type FrontLitProvisionResult = {
  teamId: string;
  name: string;
  apiKey?: string;
};

export type FrontLitProvisionWidget = {
  widgetId: string;
  name: string;
  deletable: boolean;
  moveable: boolean;
  shared: boolean;
  settings?: Record<string, unknown>;
};

export type FrontLitProvisionPage =
  | string
  | {
      slug: string;
      name?: string;
      deletable?: boolean;
      layout?: readonly FrontLitProvisionWidget[];
    };

export const COURSELIT_FRONTLIT_PROVISION_PAGES: readonly FrontLitProvisionPage[] = [
  { slug: "", name: "Homepage", deletable: false },
  { slug: "terms", name: "Terms of Service", deletable: false },
  { slug: "privacy", name: "Privacy policy", deletable: false },
];

export type FrontLitContentSummary = {
  id: string;
  name: string;
  kind: "page" | "blog";
  slug: string;
  status: FrontLitContentStatus;
  featuredImage?: MediaRef | null;
  excerpt?: string | null;
  updatedAt?: string | null;
};

export type FrontLitContentStatus = "draft" | "published" | "published_with_changes";

export type FrontLitWidget = {
  widgetId: string;
  name: string;
  deletable: boolean;
  moveable: boolean;
  shared: boolean;
  settings?: Record<string, unknown>;
};

type FrontLitPageResponse = {
  pageId: string;
  name: string;
  slug: string;
  deletable: boolean;
  status?: FrontLitContentStatus;
  publishedAt?: string | null;
  layout: FrontLitWidget[];
  title?: string | null;
  description?: string | null;
  socialImage?: Record<string, unknown> | null;
  robotsAllowed?: boolean | null;
  draftLayout: FrontLitWidget[];
  draftTitle?: string | null;
  draftDescription?: string | null;
  draftSocialImage?: Record<string, unknown> | null;
  draftRobotsAllowed?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type FrontLitThemeResponse = {
  themeId: string;
  name: string;
  style: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
};

export type FrontLitSettingsResponse = {
  title: string | null;
  subtitle: string | null;
  logo: MediaRef | null;
  themeId: string | null;
};

type FrontLitBlogResponse = {
  documentId: string;
  title?: string | null;
  draftTitle: string;
  slug: string;
  status: string;
  publishedAt?: string | null;
  content?: Record<string, unknown> | null;
  excerpt?: string | null;
  featuredImage?: MediaRef | null;
  meta: Record<string, unknown>;
  draftContent: Record<string, unknown>;
  draftExcerpt?: string | null;
  draftFeaturedImage?: MediaRef | null;
  draftMeta: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type FrontLitPage = FrontLitContentSummary & {
  deletable: boolean;
  publishedAt?: string | null;
  layout: FrontLitWidget[];
  title?: string | null;
  description?: string | null;
  socialImage?: Record<string, unknown> | null;
  robotsAllowed?: boolean | null;
  draftLayout: FrontLitWidget[];
  draftTitle?: string | null;
  draftDescription?: string | null;
  draftSocialImage?: Record<string, unknown> | null;
  draftRobotsAllowed?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type FrontLitTheme = FrontLitThemeResponse;

export type FrontLitBlog = FrontLitContentSummary & {
  publishedAt?: string | null;
  title?: string | null;
  content?: Record<string, unknown> | null;
  excerpt?: string | null;
  featuredImage?: MediaRef | null;
  meta: Record<string, unknown>;
  draftTitle: string;
  draftContent: Record<string, unknown>;
  draftExcerpt?: string | null;
  draftFeaturedImage?: MediaRef | null;
  draftMeta: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type FrontLitPublicSettings = {
  title: string | null;
  subtitle: string | null;
  logo: MediaRef | null;
  themeId: string | null;
  theme: Record<string, unknown> | null;
};

export type FrontLitPublicPage = {
  pageId: string;
  name: string;
  slug: string;
  layout: FrontLitWidget[];
  title: string | null;
  description: string | null;
  socialImage: Record<string, unknown> | null;
  robotsAllowed: boolean | null;
  publishedAt: string | null;
  updatedAt: string | null;
};

export type FrontLitPublicBlog = {
  documentId: string;
  slug: string;
  title: string | null;
  content: Record<string, unknown> | null;
  excerpt: string | null;
  featuredImage: MediaRef | null;
  meta: Record<string, unknown>;
  publishedAt: string | null;
  updatedAt: string | null;
};

export class FrontLitApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable = true,
  ) {
    super(message);
    this.name = "FrontLitApiError";
  }
}

export function frontLitConfig(
  env: Record<string, string | undefined> = process.env,
): FrontLitConfig {
  const localDefaults = env.NODE_ENV === "development";
  return {
    server:
      env.FRONTLIT_SERVER?.trim().replace(/\/$/, "") ||
      (localDefaults ? "http://127.0.0.1:4100" : null),
    provisioningSecret:
      env.FRONTLIT_APIKEY?.trim() ||
      (localDefaults ? "courselit-local-frontlit-provisioning-secret" : null),
  };
}

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function errorMessage(status: number, body: string): string {
  const detail = body.replace(/\s+/g, " ").trim().slice(0, 300);
  return detail
    ? `FrontLit API error ${status}: ${detail}`
    : `FrontLit API error ${status}`;
}

function toFrontLitPageSummary(page: FrontLitPageResponse): FrontLitContentSummary {
  return {
    id: page.pageId,
    name: page.name,
    kind: "page",
    slug: page.slug,
    status: page.status ?? "draft",
  };
}

function toFrontLitPage(page: FrontLitPageResponse): FrontLitPage {
  return { ...page, ...toFrontLitPageSummary(page), id: page.pageId, kind: "page" };
}

function normalizeFrontLitMedia(input: unknown): MediaRef | null {
  if (typeof input === "string") {
    const url = input.trim();
    return url ? { url } : null;
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  const url = [value.url, value.file, value.src].find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );
  if (!url) return null;
  const mediaId = typeof value.mediaId === "string" ? value.mediaId.trim() : "";
  const thumbnailUrl = [value.thumbnailUrl, value.thumbnail, value.thumbUrl].find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );
  const alt = [value.alt, value.caption].find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );
  const fileName = typeof value.fileName === "string" ? value.fileName.trim() : "";
  const mimeType = typeof value.mimeType === "string" ? value.mimeType.trim() : "";
  const byteSize = typeof value.byteSize === "number" ? value.byteSize : undefined;
  const title = [value.title, value.caption].find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );
  const kind =
    value.kind === "image" ||
    value.kind === "video" ||
    value.kind === "audio" ||
    value.kind === "document" ||
    value.kind === "other"
      ? value.kind
      : undefined;
  return {
    ...(mediaId ? { mediaId } : {}),
    url: url.trim(),
    ...(thumbnailUrl ? { thumbnailUrl: thumbnailUrl.trim() } : {}),
    ...(alt ? { alt: alt.trim() } : {}),
    ...(fileName ? { fileName } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(byteSize !== undefined ? { byteSize } : {}),
    ...(title ? { title: title.trim() } : {}),
    ...(kind ? { kind } : {}),
  };
}

function toFrontLitBlogSummary(blog: FrontLitBlogResponse): FrontLitContentSummary {
  const featuredImage = normalizeFrontLitMedia(
    blog.draftFeaturedImage ?? blog.featuredImage,
  );
  const excerpt = blog.draftExcerpt ?? blog.excerpt ?? null;
  return {
    id: blog.documentId,
    name: blog.draftTitle || blog.title || "Untitled blog",
    kind: "blog",
    slug: blog.slug,
    status: normalizeFrontLitContentStatus(blog.status),
    ...(featuredImage ? { featuredImage } : {}),
    ...(excerpt !== null ? { excerpt } : {}),
    ...(blog.updatedAt ? { updatedAt: blog.updatedAt } : {}),
  };
}

function toFrontLitBlog(blog: FrontLitBlogResponse): FrontLitBlog {
  return {
    ...blog,
    featuredImage: normalizeFrontLitMedia(blog.featuredImage),
    draftFeaturedImage: normalizeFrontLitMedia(blog.draftFeaturedImage),
    ...toFrontLitBlogSummary(blog),
    id: blog.documentId,
    kind: "blog",
  };
}

async function requestJson<T>(
  config: FrontLitConfig,
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH";
    apiKey?: string;
    provisioningSecret?: string;
    body?: unknown;
  },
  fetcher: FetchLike = fetch,
): Promise<T> {
  if (!config.server) {
    throw new FrontLitApiError("FRONTLIT_SERVER is not configured", undefined, false);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    let response: Response;
    try {
      response = await fetcher(`${config.server}${path}`, {
        method: options.method ?? "GET",
        headers: {
          accept: "application/json",
          ...(options.body === undefined ? {} : { "content-type": "application/json" }),
          ...(options.apiKey ? { "x-frontlit-apikey": options.apiKey } : {}),
          ...(options.provisioningSecret
            ? { "x-frontlit-provisioning-secret": options.provisioningSecret }
            : {}),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "FrontLit request timed out"
          : "FrontLit is unreachable";
      throw new FrontLitApiError(message);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new FrontLitApiError(
        errorMessage(response.status, body),
        response.status,
        response.status === 408 || response.status === 429 || response.status >= 500,
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new FrontLitApiError(
        "FrontLit returned an invalid JSON response",
        response.status,
      );
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function provisionFrontLitTeam(
  input: {
    externalId: string;
    ownerEmail: string;
    name: string;
    pages?: readonly FrontLitProvisionPage[];
  },
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitProvisionResult> {
  const config = options.config ?? frontLitConfig();
  if (!config.provisioningSecret) {
    throw new FrontLitApiError("FRONTLIT_APIKEY is not configured", undefined, false);
  }
  return requestJson<FrontLitProvisionResult>(
    config,
    "/provisioning/teams",
    {
      method: "POST",
      provisioningSecret: config.provisioningSecret,
      body: input,
    },
    options.fetcher,
  );
}

export async function setFrontLitSubdomain(
  teamApiKey: string,
  slug: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<void> {
  const config = options.config ?? frontLitConfig();
  await requestJson(
    config,
    "/domain",
    { method: "PATCH", apiKey: teamApiKey, body: { slug } },
    options.fetcher,
  );
}

export async function listFrontLitPages(
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitContentSummary[]> {
  const config = options.config ?? frontLitConfig();
  const response = await requestJson<
    { items?: FrontLitPageResponse[] } | FrontLitPageResponse[]
  >(config, "/pages", { apiKey: teamApiKey }, options.fetcher);
  const pages = Array.isArray(response) ? response : (response.items ?? []);
  return pages.map(toFrontLitPageSummary);
}

export async function createFrontLitPage(
  input: { name: string },
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitContentSummary> {
  const config = options.config ?? frontLitConfig();
  const page = await requestJson<FrontLitPageResponse>(
    config,
    "/pages",
    { method: "POST", apiKey: teamApiKey, body: input },
    options.fetcher,
  );
  return toFrontLitPageSummary(page);
}

export async function getFrontLitPage(
  pageId: string,
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitPage> {
  const config = options.config ?? frontLitConfig();
  const page = await requestJson<FrontLitPageResponse>(
    config,
    `/pages/${encodeURIComponent(pageId)}`,
    { apiKey: teamApiKey },
    options.fetcher,
  );
  return toFrontLitPage(page);
}

export async function updateFrontLitPage(
  pageId: string,
  patch: {
    name?: string;
    slug?: string;
    layout?: FrontLitWidget[];
    title?: string;
    description?: string;
    socialImage?: Record<string, unknown> | null;
    robotsAllowed?: boolean;
  },
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitPage> {
  const config = options.config ?? frontLitConfig();
  const page = await requestJson<FrontLitPageResponse>(
    config,
    `/pages/${encodeURIComponent(pageId)}`,
    { method: "PATCH", apiKey: teamApiKey, body: patch },
    options.fetcher,
  );
  return toFrontLitPage(page);
}

export async function getFrontLitSettings(
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitSettingsResponse> {
  const config = options.config ?? frontLitConfig();
  const settings = await requestJson<FrontLitSettingsResponse>(
    config,
    "/settings",
    { apiKey: teamApiKey },
    options.fetcher,
  );
  return { ...settings, logo: normalizeFrontLitMedia(settings.logo) };
}

export async function updateFrontLitSettings(
  patch: Partial<{
    title: string | null;
    subtitle: string | null;
    logo: MediaRef | null;
    themeId: string | null;
  }>,
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitSettingsResponse> {
  const config = options.config ?? frontLitConfig();
  const settings = await requestJson<FrontLitSettingsResponse>(
    config,
    "/settings",
    { method: "PATCH", apiKey: teamApiKey, body: patch },
    options.fetcher,
  );
  return { ...settings, logo: normalizeFrontLitMedia(settings.logo) };
}

export async function listFrontLitThemes(
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitTheme[]> {
  const config = options.config ?? frontLitConfig();
  const response = await requestJson<{ items?: FrontLitThemeResponse[] }>(
    config,
    "/themes",
    { apiKey: teamApiKey },
    options.fetcher,
  );
  return response.items ?? [];
}

export async function createFrontLitTheme(
  input: { name: string; style: Record<string, unknown> },
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitTheme> {
  const config = options.config ?? frontLitConfig();
  return requestJson<FrontLitTheme>(
    config,
    "/themes",
    { method: "POST", apiKey: teamApiKey, body: input },
    options.fetcher,
  );
}

export async function updateFrontLitTheme(
  themeId: string,
  patch: { name?: string; style?: Record<string, unknown> },
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitTheme> {
  const config = options.config ?? frontLitConfig();
  return requestJson<FrontLitTheme>(
    config,
    `/themes/${encodeURIComponent(themeId)}`,
    { method: "PATCH", apiKey: teamApiKey, body: patch },
    options.fetcher,
  );
}

export async function discardFrontLitPageDraft(
  pageId: string,
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitPage> {
  const config = options.config ?? frontLitConfig();
  const page = await requestJson<FrontLitPageResponse>(
    config,
    `/pages/${encodeURIComponent(pageId)}/discard-draft`,
    { method: "POST", apiKey: teamApiKey, body: undefined },
    options.fetcher,
  );
  return toFrontLitPage(page);
}

export async function publishFrontLitPage(
  pageId: string,
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitPage> {
  const config = options.config ?? frontLitConfig();
  const page = await requestJson<FrontLitPageResponse>(
    config,
    `/pages/${encodeURIComponent(pageId)}/publish`,
    { method: "POST", apiKey: teamApiKey, body: undefined },
    options.fetcher,
  );
  return toFrontLitPage(page);
}

export async function listFrontLitBlogs(
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitContentSummary[]> {
  const config = options.config ?? frontLitConfig();
  const response = await requestJson<{ items?: FrontLitBlogResponse[] }>(
    config,
    "/content/articles?offset=1&itemsPerPage=100",
    { apiKey: teamApiKey },
    options.fetcher,
  );
  return (response.items ?? []).map(toFrontLitBlogSummary);
}

export async function createFrontLitBlog(
  input: { title: string },
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitContentSummary> {
  const config = options.config ?? frontLitConfig();
  const blog = await requestJson<FrontLitBlogResponse>(
    config,
    "/content/articles",
    {
      method: "POST",
      apiKey: teamApiKey,
      body: { title: input.title, meta: { tags: [] } },
    },
    options.fetcher,
  );
  return toFrontLitBlogSummary(blog);
}

export async function publishFrontLitBlog(
  documentId: string,
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitContentSummary> {
  const config = options.config ?? frontLitConfig();
  const blog = await requestJson<FrontLitBlogResponse>(
    config,
    `/content/articles/${encodeURIComponent(documentId)}/publish`,
    { method: "POST", apiKey: teamApiKey, body: undefined },
    options.fetcher,
  );
  return toFrontLitBlogSummary(blog);
}

export async function getFrontLitBlog(
  documentId: string,
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitBlog> {
  const config = options.config ?? frontLitConfig();
  const blog = await requestJson<FrontLitBlogResponse>(
    config,
    `/content/articles/${encodeURIComponent(documentId)}`,
    { apiKey: teamApiKey },
    options.fetcher,
  );
  return toFrontLitBlog(blog);
}

/** Public site reads are intentionally made by the CourseLit API adapter, not
 * by the learners app. The remote public team id is kept server-side. */
export async function getPublicFrontLitSettings(
  remoteTeamId: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitPublicSettings> {
  const config = options.config ?? frontLitConfig();
  const settings = await requestJson<FrontLitPublicSettings>(
    config,
    `/public/${encodeURIComponent(remoteTeamId)}/settings`,
    {},
    options.fetcher,
  );
  return { ...settings, logo: normalizeFrontLitMedia(settings.logo) };
}

export async function getPublicFrontLitPage(
  remoteTeamId: string,
  slug = "",
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitPublicPage> {
  const config = options.config ?? frontLitConfig();
  const query = new URLSearchParams({ slug });
  return requestJson<FrontLitPublicPage>(
    config,
    `/public/${encodeURIComponent(remoteTeamId)}/pages?${query.toString()}`,
    {},
    options.fetcher,
  );
}

export async function listPublicFrontLitBlogs(
  remoteTeamId: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<{ items: FrontLitPublicBlog[]; total: number }> {
  const config = options.config ?? frontLitConfig();
  const response = await requestJson<{ items: FrontLitPublicBlog[]; total: number }>(
    config,
    `/public/${encodeURIComponent(remoteTeamId)}/content/articles?offset=1&itemsPerPage=100`,
    {},
    options.fetcher,
  );
  return {
    ...response,
    items: response.items.map((blog) => ({
      ...blog,
      featuredImage: normalizeFrontLitMedia(blog.featuredImage),
    })),
  };
}

export async function getPublicFrontLitBlog(
  remoteTeamId: string,
  slug: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitPublicBlog> {
  const config = options.config ?? frontLitConfig();
  const blog = await requestJson<FrontLitPublicBlog>(
    config,
    `/public/${encodeURIComponent(remoteTeamId)}/content/articles/${encodeURIComponent(slug)}`,
    {},
    options.fetcher,
  );
  return { ...blog, featuredImage: normalizeFrontLitMedia(blog.featuredImage) };
}

export async function updateFrontLitBlog(
  documentId: string,
  patch: {
    slug?: string;
    title?: string;
    content?: Record<string, unknown>;
    excerpt?: string;
    featuredImage?: MediaRef | null;
    meta?: Record<string, unknown>;
  },
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitBlog> {
  const config = options.config ?? frontLitConfig();
  const blog = await requestJson<FrontLitBlogResponse>(
    config,
    `/content/articles/${encodeURIComponent(documentId)}`,
    { method: "PATCH", apiKey: teamApiKey, body: patch },
    options.fetcher,
  );
  return toFrontLitBlog(blog);
}

export async function discardFrontLitBlogDraft(
  documentId: string,
  teamApiKey: string,
  options: { config?: FrontLitConfig; fetcher?: FetchLike } = {},
): Promise<FrontLitBlog> {
  const config = options.config ?? frontLitConfig();
  const blog = await requestJson<FrontLitBlogResponse>(
    config,
    `/content/articles/${encodeURIComponent(documentId)}/discard-draft`,
    { method: "POST", apiKey: teamApiKey, body: undefined },
    options.fetcher,
  );
  return toFrontLitBlog(blog);
}

function normalizeFrontLitContentStatus(
  status: string | undefined,
): FrontLitContentStatus {
  if (
    status === "published" ||
    status === "published_with_changes" ||
    status === "draft"
  ) {
    return status;
  }
  return "draft";
}
