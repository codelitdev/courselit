"use client";

import type { MediaRef } from "@courselit/api-contract";
import {
  type Editor,
  type TextEditorContent,
  TextRenderer,
} from "@frontlit/text-editor";
import { FileText, Film } from "lucide-react";
import Image from "next/image";
import type { ComponentProps } from "react";
import type { SalesPage, StorefrontPlan } from "@/components/products/product-types";
import { cn } from "@/lib/utils";

export type School = {
  id: string;
  name: string;
  subdomain?: string;
  storefrontHost?: string | null;
  currency: string;
  permissions?: readonly string[];
  selected?: boolean;
};

export type CommunityActor = {
  id: string;
  kind: "learner" | "admin";
  name: string;
  email: string | null;
  imageUrl: string | null;
};

export type Community = {
  id: string;
  schoolId: string;
  name: string;
  slug: string;
  description: string;
  banner: string;
  categories: string[];
  autoAcceptMembers: boolean;
  joiningReasonText: string;
  enabled: boolean;
  featuredImage: MediaRef | null;
  membersCount: number;
  postsCount: number;
  createdAt: string;
  updatedAt: string;
  salesPage?: SalesPage | null;
};

export type Membership = {
  id: string;
  communityId: string;
  learnerId: string | null;
  adminUserId: string | null;
  member: CommunityActor | null;
  status: "active" | "payment_failed" | "expired" | "pending" | "rejected" | "paused";
  role: "member" | "moderator" | "owner";
  joiningReason: string;
  rejectionReason: string | null;
  paymentPlanId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Post = {
  id: string;
  author: CommunityActor | null;
  authorKind: "learner" | "admin" | null;
  title: string;
  content: string;
  category: string;
  pinned: boolean;
  createdAt: string;
};

export type CommunityMedia = {
  id: string;
  type: "image" | "video" | "pdf";
  title: string;
  url: string;
  thumbnailUrl: string | null;
  fileName: string;
  mimeType: string;
  byteSize: number;
};

export type Report = {
  id: string;
  communityId: string;
  contentType: "post" | "comment" | "reply";
  contentId: string;
  contentParentId: string | null;
  authorKind: "learner" | "admin" | null;
  content: {
    id: string;
    content: string;
    media: CommunityMedia[];
    author: CommunityActor | null;
  } | null;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommunityRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export type { SalesPage, StorefrontPlan };

export const COMMUNITY_PAGE_SIZE = 10;

export function communityPagePath(
  path: string,
  cursor?: string | null,
  extra?: Record<string, string | undefined>,
) {
  const separator = path.includes("?") ? "&" : "?";
  const params = new URLSearchParams({ limit: String(COMMUNITY_PAGE_SIZE) });
  if (cursor) params.set("cursor", cursor);
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) params.set(key, value);
  }
  return `${path}${separator}${params.toString()}`;
}

export function displayDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

/** Short relative date for activity lists: "Today", "Yesterday", "Oct 5". */
export function relativeDay(value: string) {
  const date = new Date(value);
  const today = new Date();
  const startOf = (day: Date) =>
    new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  }).format(date);
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function communityEditorContent(
  value: string,
): ComponentProps<typeof Editor>["initialContent"] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Communities created before rich-text support contain plain text.
  }
  return value;
}

export function communityRichTextContent(value: string): TextEditorContent | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as { type?: unknown }).type === "doc" &&
      Array.isArray((parsed as { content?: unknown }).content)
    ) {
      return parsed as TextEditorContent;
    }
  } catch {
    // Communities created before rich-text support contain plain text.
  }
  return null;
}

/** Plain text of stored community content, which is rich-text JSON or plain text. */
export function communityPlainText(value: string): string {
  const richText = communityRichTextContent(value);
  if (!richText) return value.trim();
  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const { text, content, type } = node as {
      text?: unknown;
      content?: unknown;
      type?: unknown;
    };
    if (typeof text === "string") parts.push(text);
    if (Array.isArray(content)) content.forEach(walk);
    if (type === "paragraph" || type === "heading") parts.push("\n");
  };
  walk(richText);
  return parts.join("").replace(/\n+/g, "\n").trim();
}

export function CommunityPostContent({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const richText = communityRichTextContent(value);
  return richText ? (
    <TextRenderer json={richText} className={cn("text-sm leading-6", className)} />
  ) : (
    <p className={cn("whitespace-pre-wrap text-sm leading-6", className)}>{value}</p>
  );
}

export function CommunityMediaPreview({ items }: { items: CommunityMedia[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-3 grid list-none gap-3 p-0 sm:grid-cols-2" aria-label="Post media">
      {items.map((item) => (
        <li key={item.id} className="overflow-hidden rounded-md border bg-muted/20">
          {item.type === "image" ? (
            <a href={item.url} target="_blank" rel="noreferrer">
              <Image
                src={item.thumbnailUrl ?? item.url}
                alt={item.title || item.fileName}
                width={640}
                height={360}
                unoptimized
                className="aspect-video w-full object-cover hover:opacity-90"
              />
            </a>
          ) : item.type === "video" ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="relative block aspect-video bg-muted hover:opacity-90"
            >
              {item.thumbnailUrl ? (
                <Image
                  src={item.thumbnailUrl}
                  alt={item.title || item.fileName}
                  width={640}
                  height={360}
                  unoptimized
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Film className="size-5" /> Open video
                </span>
              )}
            </a>
          ) : (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-20 items-center gap-3 p-3 text-sm hover:bg-muted/40"
            >
              <FileText className="size-5 shrink-0 text-primary" />
              <span className="min-w-0 truncate">{item.fileName}</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** A card section with the title/description header used across community screens. */
export function CommunityCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children ? <div className="mt-4 space-y-4">{children}</div> : null}
    </section>
  );
}

/** Segmented filter used by the Members and Reports tabs. */
export function SegmentedFilter<T extends string>({
  value,
  onChange,
  items,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string; count?: number | string | null }[];
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-lg bg-muted p-1"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-card font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {item.count !== undefined && item.count !== null ? (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  active ? "bg-[var(--primary-soft)] text-primary" : "",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "muted";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "success" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        tone === "warning" && "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
        tone === "danger" && "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}
