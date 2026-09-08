import type { WidgetInstance } from "@frontlit/page-builder/models";
import type { TextEditorContent } from "@frontlit/text-editor";

const API_URL = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");

export interface PublicSettings {
  title: string | null;
  subtitle: string | null;
  logo: Record<string, unknown> | null;
  themeId: string | null;
  theme: Record<string, unknown> | null;
  codeInjectionHead: string;
  codeInjectionBody: string;
}

export interface PublicPage {
  pageId: string;
  name: string;
  slug: string;
  layout: WidgetInstance[];
  title: string | null;
  description: string | null;
  socialImage: Record<string, unknown> | null;
  robotsAllowed: boolean | null;
  publishedAt: string | null;
  updatedAt: string | null;
}

export interface PublicArticle {
  documentId: string;
  slug: string;
  title: string | null;
  content: TextEditorContent | null;
  excerpt: string | null;
  featuredImage: Record<string, unknown> | null;
  publishedAt: string | null;
  updatedAt: string | null;
}

async function getFromApi<T>(
  path: string,
  host: string,
  options: { noStore?: boolean } = {},
): Promise<T | null> {
  if (!host) return null;
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        accept: "application/json",
        "x-forwarded-host": host,
      },
      ...(options.noStore
        ? { cache: "no-store" as const }
        : { next: { revalidate: 60 } }),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function getSettings(host: string): Promise<PublicSettings | null> {
  return getFromApi<PublicSettings>("/v1/public/site/settings", host, {
    noStore: true,
  });
}

/** Pass an empty slug to resolve the homepage. */
export function getPageBySlug(host: string, slug = ""): Promise<PublicPage | null> {
  const query = new URLSearchParams({ slug });
  return getFromApi<PublicPage>(`/v1/public/site/pages?${query.toString()}`, host);
}

export async function listPublicArticles(
  host: string,
): Promise<{ items: PublicArticle[]; total: number }> {
  const result = await getFromApi<{ items: PublicArticle[]; total: number }>(
    "/v1/public/site/blogs",
    host,
  );
  return result ?? { items: [], total: 0 };
}

export function getPublicArticleBySlug(
  host: string,
  slug: string,
): Promise<PublicArticle | null> {
  if (!slug) return Promise.resolve(null);
  return getFromApi<PublicArticle>(
    `/v1/public/site/blogs/${encodeURIComponent(slug)}`,
    host,
  );
}

export interface PublicProductSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: "course" | "download";
}

export interface PublicCommunitySummary {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export function getPublicProduct(
  host: string,
  idOrSlug: string,
): Promise<PublicProductSummary | null> {
  if (!idOrSlug) return Promise.resolve(null);
  return getFromApi<PublicProductSummary>(
    `/v1/products/${encodeURIComponent(idOrSlug)}`,
    host,
  );
}

export function getPublicCommunity(
  host: string,
  idOrSlug: string,
): Promise<PublicCommunitySummary | null> {
  if (!idOrSlug) return Promise.resolve(null);
  return getFromApi<PublicCommunitySummary>(
    `/v1/public/communities/${encodeURIComponent(idOrSlug)}`,
    host,
  );
}
