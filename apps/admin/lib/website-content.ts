import type { MediaRef } from "@courselit/api-contract";
import type { TextEditorContent } from "@frontlit/text-editor";

export type WebsiteContentStatus = "draft" | "published" | "published_with_changes";

export type WebsiteWidget = {
  widgetId: string;
  name: string;
  deletable: boolean;
  moveable: boolean;
  shared: boolean;
  settings?: Record<string, unknown>;
};

export type WebsiteTheme = {
  themeId: string;
  name: string;
  style: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
};

export type WebsiteSettings = {
  title: string | null;
  subtitle: string | null;
  logo: MediaRef | null;
  themeId: string | null;
};

export type WebsitePage = {
  pageId: string;
  name: string;
  slug: string;
  deletable: boolean;
  status: WebsiteContentStatus;
  layout: WebsiteWidget[];
  draftLayout: WebsiteWidget[];
  title?: string | null;
  description?: string | null;
  socialImage?: Record<string, unknown> | null;
  robotsAllowed?: boolean | null;
  draftTitle?: string | null;
  draftDescription?: string | null;
  draftSocialImage?: Record<string, unknown> | null;
  draftRobotsAllowed?: boolean | null;
  /** CourseLit attaches these fields when the page is a product/community
   * sales page so the editor can render its real blocks without URL state. */
  salesResourceType?: "product" | "community" | null;
  salesResourceId?: string | null;
  salesResourceKind?: "course" | "download" | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type WebsiteBlog = {
  blogId: string;
  slug: string;
  status: WebsiteContentStatus;
  featuredImage?: MediaRef | null;
  draftFeaturedImage?: MediaRef | null;
  draftTitle: string;
  draftContent: TextEditorContent;
  draftExcerpt?: string | null;
  draftMeta: Record<string, unknown>;
  updatedAt?: string | null;
};

export async function websiteRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body === undefined ? {} : { "content-type": "application/json" }),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message || "Unable to save website content.");
  }
  return (await response.json()) as T;
}

export function contentStatusLabel(status: WebsiteContentStatus): string {
  if (status === "published_with_changes") return "Published · changes";
  return status === "published" ? "Published" : "Draft";
}

export function resolveEditorRedirect(value: string | null, fallback: string): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
