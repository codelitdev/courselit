import type { TextEditorContent } from "@frontlit/text-editor";

export type FrontLitContentStatus = "draft" | "published" | "published_with_changes";

export type FrontLitWidget = {
  widgetId: string;
  name: string;
  deletable: boolean;
  moveable: boolean;
  shared: boolean;
  settings?: Record<string, unknown>;
};

export type FrontLitTheme = {
  themeId: string;
  name: string;
  style: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
};

export type FrontLitSettings = {
  title: string | null;
  subtitle: string | null;
  logo: Record<string, unknown> | null;
  themeId: string | null;
};

export type FrontLitPage = {
  pageId: string;
  name: string;
  slug: string;
  deletable: boolean;
  status: FrontLitContentStatus;
  layout: FrontLitWidget[];
  draftLayout: FrontLitWidget[];
  title?: string | null;
  description?: string | null;
  socialImage?: Record<string, unknown> | null;
  robotsAllowed?: boolean | null;
  draftTitle?: string | null;
  draftDescription?: string | null;
  draftSocialImage?: Record<string, unknown> | null;
  draftRobotsAllowed?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type FrontLitBlog = {
  documentId: string;
  slug: string;
  status: FrontLitContentStatus;
  featuredImage?: Record<string, unknown> | null;
  draftFeaturedImage?: Record<string, unknown> | null;
  draftTitle: string;
  draftContent: TextEditorContent;
  draftExcerpt?: string | null;
  draftMeta: Record<string, unknown>;
  updatedAt?: string | null;
};

export async function frontLitRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export function contentStatusLabel(status: FrontLitContentStatus): string {
  if (status === "published_with_changes") return "Published · changes";
  return status === "published" ? "Published" : "Draft";
}

export function resolveEditorRedirect(value: string | null, fallback: string): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
