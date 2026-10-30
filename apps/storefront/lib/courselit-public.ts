import type { MediaRef } from "@courselit/api-contract";
import type { WidgetInstance } from "@frontlit/page-builder/models";
import type { TextEditorContent } from "@frontlit/text-editor";

const API_URL = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");

export interface PublicSettings {
  title: string | null;
  subtitle: string | null;
  logo: MediaRef | null;
  themeId: string | null;
  theme: Record<string, unknown> | null;
  codeInjectionHead: string;
  codeInjectionBody: string;
  canonicalHost?: string | null;
}

export interface PublicPage {
  pageId: string;
  name: string;
  slug: string;
  layout: WidgetInstance[];
  title: string | null;
  description: string | null;
  socialImage: MediaRef | null;
  robotsAllowed: boolean | null;
  publishedAt: string | null;
  updatedAt: string | null;
}

export interface PublicArticle {
  blogId: string;
  slug: string;
  title: string | null;
  content: TextEditorContent | null;
  excerpt: string | null;
  featuredImage: MediaRef | null;
  meta: Record<string, unknown>;
  author: { name: string; imageUrl: string | null } | null;
  createdAt: string;
  publishedAt: string | null;
  updatedAt: string | null;
}

function publicPath(schoolId: string, suffix: string): string {
  return `/v1/public/${encodeURIComponent(schoolId)}${suffix}`;
}

async function getFromApi<T>(
  schoolId: string,
  suffix: string,
  options: { noStore?: boolean; tags?: string[] } = {},
): Promise<T | null> {
  if (!schoolId) return null;
  try {
    const tags = options.tags ?? [`school-${schoolId}`];
    const response = await fetch(`${API_URL}${publicPath(schoolId, suffix)}`, {
      headers: { accept: "application/json" },
      ...(options.noStore || process.env.NODE_ENV === "development"
        ? { cache: "no-store" as const }
        : { next: { revalidate: 60, tags } }),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function getSettings(
  schoolId: string,
  options: { noStore?: boolean } = {},
): Promise<PublicSettings | null> {
  return getFromApi<PublicSettings>(schoolId, "/site/settings", options);
}

/** Pass an empty slug to resolve the homepage. */
export function getPageBySlug(schoolId: string, slug = ""): Promise<PublicPage | null> {
  const query = new URLSearchParams({ slug });
  return getFromApi<PublicPage>(schoolId, `/site/pages?${query.toString()}`);
}

export async function listPublicArticles(
  schoolId: string,
): Promise<{ items: PublicArticle[]; total: number }> {
  const result = await getFromApi<{ items: PublicArticle[]; total: number }>(
    schoolId,
    "/site/blogs",
  );
  return result ?? { items: [], total: 0 };
}

export function getPublicArticleBySlug(
  schoolId: string,
  slug: string,
): Promise<PublicArticle | null> {
  if (!slug) return Promise.resolve(null);
  return getFromApi<PublicArticle>(schoolId, `/site/blogs/${encodeURIComponent(slug)}`);
}

export interface PublicProductSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: "course" | "download";
}

export interface PublicProductDetail extends PublicProductSummary {
  enrolled: boolean;
  leadMagnet: boolean;
  includedWithCommunity?: boolean;
  featuredImage: MediaRef | null;
  sections: Array<{ id: string; title: string }>;
  lessons: Array<{
    id: string;
    title: string;
    sectionId: string | null;
    requiresEnrollment: boolean;
  }>;
}

export interface PublicProductPlan {
  id: string;
  name: string;
  description: string;
  type: "free" | "onetime" | "emi" | "subscription";
  currency: string;
  amountMinor: number;
  billingInterval: "month" | "year" | null;
  installmentCount: number | null;
  isDefault: boolean;
}

export interface PublicCommunitySummary {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface PublicCommunityDetail extends PublicCommunitySummary {
  banner: string;
  categories: string[];
  autoAcceptMembers: boolean;
  joiningReasonText: string;
  featuredImage: MediaRef | null;
  membersCount: number;
  postsCount: number;
  deletedAt: string | null;
  membership?: { status?: string } | null;
}

export interface PublicCommunityPlan {
  id: string;
  name: string;
  description: string;
  type: "free" | "onetime" | "emi" | "subscription";
  currency: string;
  amountMinor: number;
  billingInterval: "month" | "year" | null;
  installmentCount: number | null;
  isDefault: boolean;
}

export function getPublicProduct(
  schoolId: string,
  idOrSlug: string,
): Promise<PublicProductSummary | null> {
  if (!idOrSlug) return Promise.resolve(null);
  return getFromApi<PublicProductSummary>(
    schoolId,
    `/products/${encodeURIComponent(idOrSlug)}`,
  );
}

export function getPublicProductDetail(
  schoolId: string,
  idOrSlug: string,
): Promise<PublicProductDetail | null> {
  if (!idOrSlug) return Promise.resolve(null);
  return getFromApi<PublicProductDetail>(
    schoolId,
    `/products/${encodeURIComponent(idOrSlug)}`,
  );
}

export async function getPublicProductPlans(
  schoolId: string,
  idOrSlug: string,
): Promise<PublicProductPlan[]> {
  if (!idOrSlug) return [];
  const result = await getFromApi<{ items?: PublicProductPlan[] }>(
    schoolId,
    `/products/${encodeURIComponent(idOrSlug)}/plans`,
  );
  return result?.items ?? [];
}

export function getPublicCommunity(
  schoolId: string,
  idOrSlug: string,
): Promise<PublicCommunityDetail | null> {
  if (!idOrSlug) return Promise.resolve(null);
  return getFromApi<PublicCommunityDetail>(
    schoolId,
    `/communities/${encodeURIComponent(idOrSlug)}`,
  );
}

export async function getPublicCommunityPlans(
  schoolId: string,
  idOrSlug: string,
): Promise<PublicCommunityPlan[]> {
  if (!idOrSlug) return [];
  const result = await getFromApi<{ items?: PublicCommunityPlan[] }>(
    schoolId,
    `/communities/${encodeURIComponent(idOrSlug)}/plans`,
  );
  return result?.items ?? [];
}
