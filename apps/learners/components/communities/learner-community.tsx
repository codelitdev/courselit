"use client";

import type {
  communityCommentSchema,
  communityPaymentPlanSchema,
  communityPostSchema,
  communityReactionSchema,
  communitySchema,
  learnerSchema,
} from "@courselit/api-contract";
import { PlatformTabs } from "@courselit/components-library";
import { MediaUploadDialog, type SelectedMedia } from "@frontlit/media-uploader";
import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import {
  Bell,
  FileText,
  Film,
  Flag,
  MessageCircle,
  Paperclip,
  Pin,
  Plus,
  Send,
  Share2,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import { LearnerShell } from "@/components/layout/learner-shell";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import {
  type LearnerCommunityMedia,
  useLearnerCommunityMediaUploader,
} from "@/lib/community-media-uploader";
import { learnerHeaders, writeSchoolId } from "@/lib/school";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";
import { LearnerRichTextEditor } from "./learner-rich-text-editor";

type Learner = z.infer<typeof learnerSchema>;
type Community = z.infer<typeof communitySchema>;
type CommunityPost = z.infer<typeof communityPostSchema>;
type CommunityComment = z.infer<typeof communityCommentSchema>;
type CommunityPlan = z.infer<typeof communityPaymentPlanSchema>;
type CommunityReaction = z.infer<typeof communityReactionSchema>;

type PostDraft = {
  title: string;
  content: string;
  category: string;
};

type ApiError = { message?: string };

type CommunityMedia = CommunityPost["media"][number];
type CommunityMediaType = CommunityMedia["type"];

type MediaAttachment = {
  id: string;
  type: CommunityMediaType;
  title: string;
  url: string;
  thumbnailUrl: string | null;
  fileName: string;
  mimeType: string;
  byteSize: number;
};

const COMMUNITY_MEDIA_ACCEPTED_TYPES = ["image/*", "video/*", "application/pdf"];
const COMMUNITY_PAGE_SIZE = 10;

function communityPagePath(path: string, cursor?: string | null, category?: string) {
  const params = new URLSearchParams({ limit: String(COMMUNITY_PAGE_SIZE) });
  if (cursor) params.set("cursor", cursor);
  if (category && category !== "All") params.set("category", category);
  return `${path}?${params.toString()}`;
}

function selectedMediaType(media: LearnerCommunityMedia): CommunityMediaType {
  if (media.mimeType === "application/pdf") return "pdf";
  return media.mimeType.startsWith("video/") ? "video" : "image";
}

function selectedMediaToAttachment(media: LearnerCommunityMedia): MediaAttachment {
  return {
    id: media.id,
    type: selectedMediaType(media),
    title: media.title || media.fileName || "Attached media",
    url: media.url,
    thumbnailUrl: media.thumbnailUrl ?? null,
    fileName: media.fileName || "Attached media",
    mimeType: media.mimeType || "application/octet-stream",
    byteSize: media.byteSize ?? 0,
  };
}

function communityMediaToAttachment(media: CommunityMedia): MediaAttachment {
  return {
    id: media.id,
    type: media.type,
    title: media.title || media.fileName,
    url: media.url,
    thumbnailUrl: media.thumbnailUrl,
    fileName: media.fileName,
    mimeType: media.mimeType,
    byteSize: media.byteSize,
  };
}

function reactionCount(items: CommunityReaction[]) {
  return items.reduce((total, item) => total + item.count, 0);
}

function updateReactionItems(
  items: CommunityReaction[],
  emoji: string,
  active: boolean,
) {
  const existing = items.find((item) => item.emoji === emoji);
  if (!existing && active) {
    return [...items, { emoji, count: 1, active: true }];
  }
  if (!existing) return items;
  const count = existing.count + (active ? 1 : -1);
  return count > 0
    ? items.map((item) => (item.emoji === emoji ? { ...item, count, active } : item))
    : items.filter((item) => item.emoji !== emoji);
}

const COMMUNITY_REACTION_EMOJIS = ["👍", "❤️", "😄", "🎉", "😢", "😮"] as const;

function CommunityReactionsBar({
  reactions,
  onReact,
}: {
  reactions: CommunityReaction[];
  onReact: (emoji: string) => void;
}) {
  return (
    <fieldset
      className="flex flex-wrap items-center gap-1.5"
      title={`${reactionCount(reactions)} reactions`}
      aria-label={`${reactionCount(reactions)} reactions`}
    >
      {reactions
        .filter((reaction) => reaction.count > 0)
        .map((reaction) => (
          <Button
            key={reaction.emoji}
            type="button"
            size="sm"
            variant={reaction.active ? "soft" : "outline"}
            className="h-8 min-w-11 rounded-full px-2.5 text-sm"
            onClick={() => onReact(reaction.emoji)}
          >
            <span aria-hidden="true">{reaction.emoji}</span>
            <span className="tabular-nums text-xs">{reaction.count}</span>
          </Button>
        ))}
      <details className="relative">
        <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
          <Plus className="size-4" aria-hidden="true" />
          <span className="sr-only">Add reaction</span>
        </summary>
        <div className="absolute bottom-10 left-0 z-10 flex gap-1 rounded-md border bg-popover p-2 shadow-md">
          {COMMUNITY_REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="flex size-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-muted"
              onClick={() => onReact(emoji)}
              aria-label={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </details>
    </fieldset>
  );
}

function MediaAttachments({
  items,
  onRemove,
}: {
  items: MediaAttachment[];
  onRemove?: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <ul className="grid list-none gap-3 p-0 sm:grid-cols-2" aria-label="Attached media">
      {items.map((item) => (
        <li
          key={item.id}
          className="relative overflow-hidden rounded-md border bg-card"
        >
          {item.type === "image" && item.url ? (
            <Image
              src={item.thumbnailUrl ?? item.url}
              alt={item.title}
              width={640}
              height={360}
              unoptimized
              className="aspect-video w-full object-cover"
            />
          ) : item.type === "video" && item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="relative block aspect-video bg-muted hover:opacity-90"
            >
              {item.thumbnailUrl ? (
                <Image
                  src={item.thumbnailUrl}
                  alt={item.title}
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
              className="flex min-h-24 items-center gap-3 p-3 text-sm hover:bg-muted/40"
            >
              <FileText className="size-5 shrink-0 text-primary" />
              <span className="min-w-0 truncate">{item.fileName}</span>
            </a>
          )}
          <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs">
            <span className="min-w-0 truncate text-muted-foreground" title={item.title}>
              {item.title}
            </span>
            {onRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 px-2 text-xs"
                onClick={() => onRemove(item.id)}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = learnerHeaders(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers,
  });
  const body = (await response.json().catch(() => null)) as T & ApiError;
  if (!response.ok) {
    throw new Error(body?.message ?? "The request could not be completed.");
  }
  return body as T;
}

export function useLearnerSession(nextPath = "/communities") {
  const router = useRouter();
  const [learner, setLearner] = useState<Learner | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    void requestJson<Learner>("/api/v1/learner/me")
      .then((body) => {
        if (!active) return;
        writeSchoolId(body.schoolId);
        setLearner(body);
      })
      .catch(() => {
        if (active) router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [nextPath, router]);

  return { learner, checking };
}

function LoadingState({ label }: { label: string }) {
  return (
    <main className="flex min-h-[400px] items-center justify-center p-6 text-sm text-muted-foreground">
      {label}
    </main>
  );
}

function communityMembershipLabel(community: Community) {
  const status = community.membership?.status;
  if (status === "active") return "Member";
  if (status === "pending") return "Pending approval";
  if (status === "rejected") return "Membership rejected";
  if (status === "payment_failed") return "Payment failed";
  if (status === "expired") return "Membership expired";
  if (status === "paused") return "Membership paused";
  return "Join community";
}

function parseCommunityDescription(value: string): TextEditorContent | null {
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

function communityEditorContent(value: string): TextEditorContent | string {
  return parseCommunityDescription(value) ?? value;
}

function communityDescriptionHasContent(value: string) {
  const richText = parseCommunityDescription(value);
  if (!richText) return value.trim().length > 0;

  let hasContent = false;
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object" || hasContent) return;
    const record = node as { text?: unknown; content?: unknown };
    if (typeof record.text === "string" && record.text.trim()) {
      hasContent = true;
      return;
    }
    if (record.content && Array.isArray(record.content)) {
      for (const child of record.content) visit(child);
    }
  };
  visit(richText);
  return hasContent;
}

function CommunityDescription({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const theme = useSchoolThemeStyle();
  const richText = parseCommunityDescription(value);
  if (richText) {
    return <TextRenderer json={richText} theme={theme} className={className} />;
  }
  return <p className={className}>{value}</p>;
}

export function LearnerCommunities() {
  const { learner, checking } = useLearnerSession("/communities");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [joinedNextCursor, setJoinedNextCursor] = useState<string | null>(null);
  const [availableNextCursor, setAvailableNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCommunityCollections = useCallback(
    async (
      joinedCursor?: string | null,
      availableCursor?: string | null,
      append = false,
    ) => {
      const [joined, available] = await Promise.all([
        append && !joinedCursor
          ? Promise.resolve({ items: [], nextCursor: null })
          : requestJson<{ items: Community[]; nextCursor: string | null }>(
              communityPagePath("/api/v1/learner/communities", joinedCursor),
            ),
        append && !availableCursor
          ? Promise.resolve({ items: [], nextCursor: null })
          : requestJson<{ items: Community[]; nextCursor: string | null }>(
              communityPagePath(
                "/api/v1/learner/communities/available",
                availableCursor,
              ),
            ),
      ]);
      setCommunities((current) => {
        const byId = new Map((append ? current : []).map((item) => [item.id, item]));
        for (const item of available.items) byId.set(item.id, item);
        for (const item of joined.items) byId.set(item.id, item);
        return Array.from(byId.values());
      });
      setJoinedNextCursor(joined.nextCursor);
      setAvailableNextCursor(available.nextCursor);
    },
    [],
  );

  useEffect(() => {
    if (!learner) return;
    let active = true;
    setLoading(true);
    setError(null);
    setCommunities([]);
    setJoinedNextCursor(null);
    setAvailableNextCursor(null);
    void loadCommunityCollections()
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "Unable to load communities.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [learner, loadCommunityCollections]);

  async function loadMoreCommunities() {
    if ((!joinedNextCursor && !availableNextCursor) || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      await loadCommunityCollections(joinedNextCursor, availableNextCursor, true);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load more communities.",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  if (checking) return <LoadingState label="Loading your communities…" />;
  if (!learner) return null;

  return (
    <LearnerShell user={learner}>
      <main className="page-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">Community</p>
            <h1>Communities</h1>
            <p className="subtitle">
              Learn together, ask questions, and share progress.
            </p>
          </div>
          <Button asChild type="button" variant="outline" aria-label="Notifications">
            <Link href="/dashboard/notifications">
              <Bell className="size-4" />
              Notifications
            </Link>
          </Button>
        </header>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? <p className="muted">Loading communities…</p> : null}
        {!loading && communities.length === 0 ? (
          <section className="card stack">
            <Users className="size-8 text-muted-foreground" />
            <h2>No communities yet</h2>
            <p className="muted">Your school has not opened a community yet.</p>
          </section>
        ) : null}
        {!loading && communities.length > 0 ? (
          <section
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            aria-label="Communities"
          >
            {communities.map((community) => (
              <Link
                key={community.id}
                href={`/dashboard/community/${encodeURIComponent(community.id)}`}
                className="group card flex flex-col gap-4 transition-colors hover:border-primary/60"
              >
                {community.featuredMedia ? (
                  <Image
                    src={
                      community.featuredMedia.thumbnailUrl ??
                      community.featuredMedia.canonicalUrl
                    }
                    alt={community.featuredMedia.altText || community.name}
                    width={640}
                    height={360}
                    unoptimized
                    className="aspect-video w-full rounded-md border object-cover"
                  />
                ) : null}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold group-hover:text-primary">
                      {community.name}
                    </h2>
                    <CommunityDescription
                      value={community.description || "Join the conversation."}
                      className="mt-1 line-clamp-3 text-sm text-muted-foreground"
                    />
                  </div>
                  <MessageCircle className="size-5 shrink-0 text-primary" />
                </div>
                <div className="mt-auto flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {community.categories.slice(0, 3).map((category) => (
                    <span key={category} className="rounded-full border px-2 py-1">
                      {category}
                    </span>
                  ))}
                  <span className="ml-auto rounded-full bg-muted px-2 py-1">
                    {communityMembershipLabel(community)}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-1">
                    {community.membersCount.toLocaleString()} members
                  </span>
                </div>
              </Link>
            ))}
          </section>
        ) : null}
        {!loading && (joinedNextCursor || availableNextCursor) ? (
          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadMoreCommunities()}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading communities…" : "Load more communities"}
            </Button>
          </div>
        ) : null}
      </main>
    </LearnerShell>
  );
}

export function LearnerCommunity({
  communityId,
  postId,
}: {
  communityId: string;
  postId?: string;
}) {
  const { learner, checking } = useLearnerSession(
    `/dashboard/community/${encodeURIComponent(communityId)}${postId ? `/${encodeURIComponent(postId)}` : ""}`,
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const [commentTargetId, setCommentTargetId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.location.hash.slice(1) || null,
  );
  const requestedCategory = searchParams.get("category") ?? "All";
  const requestedPostId = postId ?? searchParams.get("post");
  const mediaAdapters = useLearnerCommunityMediaUploader();
  const [community, setCommunity] = useState<Community | null>(null);
  const [plans, setPlans] = useState<CommunityPlan[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [comments, setComments] = useState<Record<string, CommunityComment[]>>({});
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [subscribedPostIds, setSubscribedPostIds] = useState<Set<string>>(new Set());
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postEditDraft, setPostEditDraft] = useState<PostDraft>({
    title: "",
    content: "",
    category: "General",
  });
  const postEditDraftRef = useRef(postEditDraft);
  const postEditMediaIdsRef = useRef<string[]>([]);
  const postDraftRef = useRef<PostDraft>({
    title: "",
    content: "",
    category: "General",
  });
  const commentDraftsRef = useRef<Record<string, string>>({});
  const postMediaRef = useRef<LearnerCommunityMedia[]>([]);
  const commentMediaRefs = useRef<Record<string, LearnerCommunityMedia[]>>({});
  const [postDraft, setPostDraft] = useState(postDraftRef.current);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentEditorVersions, setCommentEditorVersions] = useState<
    Record<string, number>
  >({});
  const [postMedia, setPostMedia] = useState<LearnerCommunityMedia[]>([]);
  const [postEditMedia, setPostEditMedia] = useState<MediaAttachment[]>([]);
  const [commentMedia, setCommentMedia] = useState<
    Record<string, LearnerCommunityMedia[]>
  >({});
  const [reportTarget, setReportTarget] = useState<{
    contentType: "post" | "comment" | "reply";
    contentId: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [joinPlan, setJoinPlan] = useState<CommunityPlan | null>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joiningReason, setJoiningReason] = useState("");
  const joiningReasonRef = useRef("");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "post"; id: string }
    | { kind: "comment"; id: string; postId: string }
    | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [postsNextCursor, setPostsNextCursor] = useState<string | null>(null);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [commentNextCursors, setCommentNextCursors] = useState<
    Record<string, string | null>
  >({});
  const [loadingMoreCommentsPostId, setLoadingMoreCommentsPostId] = useState<
    string | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadPosts = useCallback(
    async (cursor?: string | null) => {
      const body = await requestJson<{
        items: CommunityPost[];
        nextCursor: string | null;
      }>(
        communityPagePath(
          `/api/v1/learner/communities/${encodeURIComponent(communityId)}/posts`,
          cursor,
          activeCategory,
        ),
      );
      setPosts((current) => (cursor ? [...current, ...body.items] : body.items));
      setPostsNextCursor(body.nextCursor);
      setSubscribedPostIds((current) => {
        const next = cursor ? new Set(current) : new Set<string>();
        for (const post of body.items) {
          if (post.subscribed) next.add(post.id);
          else next.delete(post.id);
        }
        return next;
      });
    },
    [activeCategory, communityId],
  );

  const load = useCallback(async () => {
    if (!learner) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, planBody] = await Promise.all([
        requestJson<Community>(
          `/api/v1/learner/communities/${encodeURIComponent(communityId)}`,
        ),
        requestJson<{ items: CommunityPlan[] }>(
          `/api/v1/learner/communities/${encodeURIComponent(communityId)}/plans`,
        ),
      ]);
      setCommunity(detail);
      setPlans(planBody.items);
      if (detail.membership?.status === "active") {
        setComments({});
        setCommentNextCursors({});
        await loadPosts();
      } else {
        setPosts([]);
        setPostsNextCursor(null);
        setComments({});
        setCommentNextCursors({});
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load this community.",
      );
    } finally {
      setLoading(false);
    }
  }, [communityId, learner, loadPosts]);

  useEffect(() => {
    if (learner) void load();
  }, [learner, load]);

  useEffect(() => {
    postEditDraftRef.current = postEditDraft;
  }, [postEditDraft]);

  const activeMember = community?.membership?.status === "active";
  const focusedPost = postId ? posts.find((post) => post.id === postId) : null;
  const displayedPosts = postId ? (focusedPost ? [focusedPost] : []) : posts;
  const canModerate =
    activeMember &&
    (community?.membership?.role === "moderator" ||
      community?.membership?.role === "owner");
  const categoryOptions = useMemo(
    () => (community?.categories.length ? community.categories : ["General"]),
    [community?.categories],
  );
  const feedCategories = useMemo(
    () => ["All", ...categoryOptions.filter((category) => category !== "All")],
    [categoryOptions],
  );
  const visibleFeedCategories = showAllCategories
    ? feedCategories
    : feedCategories.slice(0, 3);

  useEffect(() => {
    if (!community) return;
    const nextCategory =
      requestedCategory === "All" || community.categories.includes(requestedCategory)
        ? requestedCategory
        : "All";
    setActiveCategory((current) => (current === nextCategory ? current : nextCategory));
  }, [community, requestedCategory]);

  function selectCategory(category: string) {
    setActiveCategory(category);
    setShowAllCategories(false);
    setExpandedPostId(null);
    setComments({});
    setCommentNextCursors({});
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("post");
    if (category === "All") {
      nextParams.delete("category");
    } else {
      nextParams.set("category", category);
    }
    const query = nextParams.toString();
    router.replace(
      `/dashboard/community/${encodeURIComponent(communityId)}${query ? `?${query}` : ""}`,
      { scroll: false },
    );
  }

  function updatePostDraft(field: keyof PostDraft, value: string) {
    postDraftRef.current = { ...postDraftRef.current, [field]: value };
    setPostDraft(postDraftRef.current);
  }

  function updatePostEditContent(value: string) {
    const next = { ...postEditDraftRef.current, content: value };
    postEditDraftRef.current = next;
    setPostEditDraft(next);
  }

  function updatePostMedia(next: LearnerCommunityMedia[]) {
    postMediaRef.current = next;
    setPostMedia(next);
  }

  function selectPostEditMedia(selected: SelectedMedia<LearnerCommunityMedia>) {
    if (!selected.media) {
      setError("Select a media library item or upload the file first.");
      return;
    }
    const media = selected.media;
    const nextIds = [
      ...postEditMediaIdsRef.current.filter((id) => id !== media.id),
      media.id,
    ];
    if (nextIds.length > 10) {
      setError("A discussion can contain up to 10 attachments.");
      return;
    }
    postEditMediaIdsRef.current = nextIds;
    setPostEditMedia((current) => [
      ...current.filter((item) => item.id !== media.id),
      selectedMediaToAttachment(media),
    ]);
    setError(null);
  }

  function removePostEditMedia(id: string) {
    postEditMediaIdsRef.current = postEditMediaIdsRef.current.filter(
      (mediaId) => mediaId !== id,
    );
    setPostEditMedia((current) => current.filter((media) => media.id !== id));
  }

  function updateCommentMedia(postId: string, next: LearnerCommunityMedia[]) {
    commentMediaRefs.current = { ...commentMediaRefs.current, [postId]: next };
    setCommentMedia(commentMediaRefs.current);
  }

  function updateCommentDraft(postId: string, value: string) {
    commentDraftsRef.current = { ...commentDraftsRef.current, [postId]: value };
    setCommentDrafts(commentDraftsRef.current);
  }

  function resetCommentEditor(postId: string) {
    updateCommentDraft(postId, "");
    setCommentEditorVersions((current) => ({
      ...current,
      [postId]: (current[postId] ?? 0) + 1,
    }));
  }

  function toggleReplyTarget(postId: string, commentId: string) {
    setReplyToCommentId((current) => (current === commentId ? null : commentId));
    resetCommentEditor(postId);
  }

  function selectPostMedia(selected: SelectedMedia<LearnerCommunityMedia>) {
    if (!selected.media) {
      setError("Select a media library item or upload the file first.");
      return;
    }
    const next = [
      ...postMediaRef.current.filter((item) => item.id !== selected.media?.id),
      selected.media,
    ];
    if (next.length > 10) {
      setError("A discussion can contain up to 10 attachments.");
      return;
    }
    updatePostMedia([...next]);
    setError(null);
  }

  function selectCommentMedia(
    postId: string,
    selected: SelectedMedia<LearnerCommunityMedia>,
  ) {
    if (!selected.media) {
      setError("Select a media library item or upload the file first.");
      return;
    }
    const current = commentMediaRefs.current[postId] ?? [];
    const next = [
      ...current.filter((item) => item.id !== selected.media?.id),
      selected.media,
    ];
    if (next.length > 10) {
      setError("A comment can contain up to 10 attachments.");
      return;
    }
    updateCommentMedia(postId, next);
    setError(null);
  }

  function requestJoin(plan?: CommunityPlan) {
    if (!community) return;
    const requiresReason = !community.autoAcceptMembers || plan?.kind === "free";
    if (requiresReason) {
      joiningReasonRef.current = "";
      setJoiningReason("");
      setJoinPlan(plan ?? null);
      setJoinDialogOpen(true);
      return;
    }
    void join(plan, "");
  }

  async function join(plan?: CommunityPlan, reason = "") {
    if (!community || joining) return;
    setJoining(true);
    setError(null);
    try {
      if (plan) {
        const checkout = await requestJson<{
          checkoutUrl: string | null;
          checkoutData?: {
            provider: "stripe" | "lemonsqueezy" | "razorpay";
            publicKey?: string;
            orderId?: string;
            subscriptionId?: string;
            customerEmail?: string;
            customerName?: string;
          } | null;
          status: string;
        }>(`/api/v1/learner/communities/${encodeURIComponent(community.id)}/checkout`, {
          method: "POST",
          headers: {
            "idempotency-key": `community-${community.id}-${plan.id}-${Date.now()}`,
          },
          body: JSON.stringify({ planId: plan.id, joiningReason: reason }),
        });
        if (checkout.checkoutUrl) {
          window.location.assign(checkout.checkoutUrl);
          return;
        }
        if (checkout.checkoutData?.provider === "razorpay") {
          await openRazorpayCheckout({
            data: {
              publicKey: checkout.checkoutData.publicKey ?? "",
              orderId: checkout.checkoutData.orderId,
              subscriptionId: checkout.checkoutData.subscriptionId,
              customerEmail: checkout.checkoutData.customerEmail,
              customerName: checkout.checkoutData.customerName,
            },
            name: community.name,
            description: plan.name,
          });
        }
        setNotice(
          plan.kind === "free"
            ? "Your community membership request was submitted."
            : "Your community membership is being processed.",
        );
        await load();
        return;
      }
      const membership = await requestJson<Community["membership"]>(
        `/api/v1/learner/communities/${encodeURIComponent(community.id)}/join`,
        { method: "POST", body: JSON.stringify({ joiningReason: reason }) },
      );
      setCommunity((current) => (current ? { ...current, membership } : current));
      setNotice(
        membership?.status === "active"
          ? "You joined the community."
          : "Your request is awaiting approval.",
      );
      if (membership?.status === "active") await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to join this community.",
      );
    } finally {
      setJoining(false);
    }
  }

  function submitJoinRequest() {
    if (!joiningReasonRef.current.trim() || joining) return;
    setJoinDialogOpen(false);
    void join(joinPlan ?? undefined, joiningReasonRef.current.trim());
  }

  async function leave() {
    if (!community || !activeMember || leaving) return;
    setLeaving(true);
    setError(null);
    try {
      await requestJson<{ left: boolean }>(
        `/api/v1/learner/communities/${encodeURIComponent(community.id)}/leave`,
        { method: "POST" },
      );
      setCommunity((current) => (current ? { ...current, membership: null } : current));
      setPosts([]);
      setPostsNextCursor(null);
      setComments({});
      setCommentNextCursors({});
      setExpandedPostId(null);
      setNotice("You left the community.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to leave this community.",
      );
    } finally {
      setLeaving(false);
    }
  }

  function requestLeave() {
    if (!community || !activeMember || leaving) return;
    setLeaveDialogOpen(true);
  }

  async function shareCommunity() {
    if (!community) return;
    const url = `${window.location.origin}/dashboard/community/${encodeURIComponent(community.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Community link copied to clipboard.");
    } catch {
      setNotice(url);
    }
  }

  async function createPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = postDraftRef.current;
    if (!draft.title.trim() || !communityDescriptionHasContent(draft.content) || busy)
      return;
    setBusy(true);
    setError(null);
    try {
      await requestJson(
        `/api/v1/learner/communities/${encodeURIComponent(communityId)}/posts`,
        {
          method: "POST",
          body: JSON.stringify({
            ...draft,
            mediaIds: postMediaRef.current.map((media) => media.id),
          }),
        },
      );
      postDraftRef.current = { ...draft, title: "", content: "" };
      setPostDraft(postDraftRef.current);
      updatePostMedia([]);
      setNotice("Post published.");
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to publish your post.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadMorePosts() {
    if (!postsNextCursor || loadingMorePosts) return;
    setLoadingMorePosts(true);
    setError(null);
    try {
      await loadPosts(postsNextCursor);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load more posts.");
    } finally {
      setLoadingMorePosts(false);
    }
  }

  const loadComments = useCallback(async (postId: string, cursor?: string | null) => {
    setError(null);
    try {
      const body = await requestJson<{
        items: CommunityComment[];
        nextCursor: string | null;
      }>(
        communityPagePath(
          `/api/v1/learner/community-posts/${encodeURIComponent(postId)}/comments`,
          cursor,
        ),
      );
      setComments((current) => ({
        ...current,
        [postId]: cursor ? [...(current[postId] ?? []), ...body.items] : body.items,
      }));
      setCommentNextCursors((current) => ({ ...current, [postId]: body.nextCursor }));
      setExpandedPostId(postId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load comments.");
    }
  }, []);

  useEffect(() => {
    if (!requestedPostId || !activeMember || expandedPostId === requestedPostId) return;
    const visiblePost = posts.find((post) => post.id === requestedPostId);
    if (visiblePost) {
      void loadComments(visiblePost.id);
      return;
    }

    let active = true;
    void requestJson<CommunityPost>(
      `/api/v1/learner/community-posts/${encodeURIComponent(requestedPostId)}`,
    )
      .then((post) => {
        if (!active) return;
        setPosts((current) =>
          current.some((item) => item.id === post.id) ? current : [post, ...current],
        );
        setSubscribedPostIds((current) => {
          const next = new Set(current);
          if (post.subscribed) next.add(post.id);
          else next.delete(post.id);
          return next;
        });
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load this discussion.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [activeMember, expandedPostId, loadComments, posts, requestedPostId]);

  useEffect(() => {
    function updateCommentTarget() {
      setCommentTargetId(window.location.hash.slice(1) || null);
    }
    window.addEventListener("hashchange", updateCommentTarget);
    return () => window.removeEventListener("hashchange", updateCommentTarget);
  }, []);

  useEffect(() => {
    if (!commentTargetId || !requestedPostId || expandedPostId !== requestedPostId)
      return;
    let cancelled = false;
    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const findTarget = () => {
      if (cancelled) return;
      const target = document.getElementById(commentTargetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      attempts += 1;
      if (attempts < 30) timeoutId = setTimeout(findTarget, 50);
    };

    const frame = window.requestAnimationFrame(findTarget);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [commentTargetId, expandedPostId, requestedPostId]);

  async function loadMoreComments(postId: string) {
    const cursor = commentNextCursors[postId];
    if (!cursor || loadingMoreCommentsPostId) return;
    setLoadingMoreCommentsPostId(postId);
    try {
      await loadComments(postId, cursor);
    } catch {
      // loadComments reports the request error in the shared error state.
    } finally {
      setLoadingMoreCommentsPostId(null);
    }
  }

  async function createComment(postId: string, parentCommentId: string | null) {
    const draft = commentDraftsRef.current[postId]?.trim() ?? "";
    if (!communityDescriptionHasContent(draft) || busy) return;
    setBusy(true);
    try {
      await requestJson(
        `/api/v1/learner/community-posts/${encodeURIComponent(postId)}/comments`,
        {
          method: "POST",
          body: JSON.stringify({
            content: draft,
            parentCommentId,
            mediaIds: (commentMediaRefs.current[postId] ?? []).map((media) => media.id),
          }),
        },
      );
      resetCommentEditor(postId);
      updateCommentMedia(postId, []);
      setReplyToCommentId(null);
      await loadComments(postId);
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, commentsCount: post.commentsCount + 1 }
            : post,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to add your comment.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleReaction(postId: string, emoji: string) {
    try {
      const body = await requestJson<{ active: boolean }>(
        `/api/v1/learner/communities/${encodeURIComponent(communityId)}/reactions`,
        {
          method: "POST",
          body: JSON.stringify({ entityType: "post", entityId: postId, emoji }),
        },
      );
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                reactions: updateReactionItems(post.reactions, emoji, body.active),
              }
            : post,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to react to this post.",
      );
    }
  }

  async function toggleCommentReaction(comment: CommunityComment, emoji: string) {
    try {
      const body = await requestJson<{ active: boolean }>(
        `/api/v1/learner/communities/${encodeURIComponent(communityId)}/reactions`,
        {
          method: "POST",
          body: JSON.stringify({
            entityType: comment.parentCommentId ? "reply" : "comment",
            entityId: comment.id,
            emoji,
          }),
        },
      );
      setComments((current) => ({
        ...current,
        [comment.postId]: (current[comment.postId] ?? []).map((item) =>
          item.id === comment.id
            ? {
                ...item,
                reactions: updateReactionItems(item.reactions, emoji, body.active),
              }
            : item,
        ),
      }));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to react to this comment.",
      );
    }
  }

  async function toggleSubscription(postId: string) {
    const subscribed = !subscribedPostIds.has(postId);
    try {
      const body = await requestJson<{ subscribed: boolean }>(
        `/api/v1/learner/community-posts/${encodeURIComponent(postId)}/subscription`,
        { method: "POST", body: JSON.stringify({ subscribed }) },
      );
      setSubscribedPostIds((current) => {
        const next = new Set(current);
        if (body.subscribed) next.add(postId);
        else next.delete(postId);
        return next;
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to update notifications.",
      );
    }
  }

  function reportPost(postId: string) {
    setReportTarget({ contentType: "post", contentId: postId });
    setReportReason("");
  }

  function reportComment(comment: CommunityComment) {
    setReportTarget({
      contentType: comment.parentCommentId ? "reply" : "comment",
      contentId: comment.id,
    });
    setReportReason("");
  }

  async function submitReport() {
    if (!reportTarget || !reportReason.trim()) return;
    try {
      await requestJson(
        `/api/v1/learner/communities/${encodeURIComponent(communityId)}/reports`,
        {
          method: "POST",
          body: JSON.stringify({
            ...reportTarget,
            reason: reportReason.trim(),
          }),
        },
      );
      setReportTarget(null);
      setReportReason("");
      setNotice("Thanks. The content was sent for review.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to report this content.",
      );
    }
  }

  async function deletePost(postId: string) {
    try {
      await requestJson(
        `/api/v1/learner/community-posts/${encodeURIComponent(postId)}`,
        {
          method: "DELETE",
        },
      );
      setPosts((current) => current.filter((post) => post.id !== postId));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete this post.",
      );
    }
  }

  async function deleteComment(postId: string, commentId: string) {
    try {
      await requestJson(
        `/api/v1/learner/community-comments/${encodeURIComponent(commentId)}`,
        {
          method: "DELETE",
        },
      );
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, commentsCount: Math.max(0, post.commentsCount - 1) }
            : post,
        ),
      );
      await loadComments(postId);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete this comment.",
      );
    }
  }

  function requestDeletePost(postId: string) {
    setDeleteTarget({ kind: "post", id: postId });
  }

  function requestDeleteComment(postId: string, commentId: string) {
    setDeleteTarget({ kind: "comment", id: commentId, postId });
  }

  function confirmDelete() {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    if (target.kind === "post") {
      void deletePost(target.id);
    } else {
      void deleteComment(target.postId, target.id);
    }
  }

  function startEditing(post: CommunityPost) {
    const draft = { title: post.title, content: post.content, category: post.category };
    postEditDraftRef.current = draft;
    postEditMediaIdsRef.current = post.media.map((media) => media.id);
    setPostEditMedia(post.media.map(communityMediaToAttachment));
    setPostEditDraft(draft);
    setEditingPostId(post.id);
  }

  async function savePostEdit(postId: string) {
    const draft = postEditDraftRef.current;
    if (!draft.title.trim() || !communityDescriptionHasContent(draft.content)) return;
    try {
      const updated = await requestJson<CommunityPost>(
        `/api/v1/learner/community-posts/${encodeURIComponent(postId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...draft,
            mediaIds: postEditMediaIdsRef.current,
          }),
        },
      );
      setPosts((current) =>
        current.map((post) => (post.id === updated.id ? updated : post)),
      );
      setSubscribedPostIds((current) => {
        const next = new Set(current);
        if (updated.subscribed) next.add(updated.id);
        else next.delete(updated.id);
        return next;
      });
      setEditingPostId(null);
      setPostEditMedia([]);
      postEditMediaIdsRef.current = [];
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to update this post.",
      );
    }
  }

  if (checking) return <LoadingState label="Loading community…" />;
  if (!learner) return null;

  return (
    <LearnerShell user={learner}>
      <main className="page-shell">
        <header className="app-header">
          <div>
            <nav
              className="flex items-center gap-2 text-sm text-muted-foreground"
              aria-label="Breadcrumb"
            >
              <Link href="/communities" className="hover:text-primary">
                Communities
              </Link>
              <span aria-hidden="true">/</span>
              {postId ? (
                <>
                  <Link
                    href={`/dashboard/community/${encodeURIComponent(communityId)}`}
                    className="hover:text-primary"
                  >
                    {community?.name ?? "Community"}
                  </Link>
                  <span aria-hidden="true">/</span>
                  <span aria-current="page">Discussion</span>
                </>
              ) : (
                <span aria-current="page">{community?.name ?? "Community"}</span>
              )}
            </nav>
            <h1>{community?.name ?? "Community"}</h1>
            <CommunityDescription
              value={community?.description || "Join the conversation."}
              className="subtitle"
            />
            {community ? (
              <p className="text-sm text-muted-foreground">
                {community.membersCount.toLocaleString()} members
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void shareCommunity()}
              disabled={!community}
            >
              <Share2 className="size-4" /> Share
            </Button>
            {activeMember ? (
              <Button
                type="button"
                variant="outline"
                onClick={requestLeave}
                disabled={leaving}
              >
                {leaving ? "Leaving…" : "Leave community"}
              </Button>
            ) : null}
          </div>
        </header>
        {community?.featuredMedia ? (
          <Image
            src={
              community.featuredMedia.thumbnailUrl ??
              community.featuredMedia.canonicalUrl
            }
            alt={community.featuredMedia.altText || community.name}
            width={1280}
            height={480}
            unoptimized
            className="max-h-72 w-full rounded-xl border object-cover"
          />
        ) : null}
        {community?.banner && communityDescriptionHasContent(community.banner) ? (
          <section
            className="rounded-md border bg-muted/40 p-4"
            aria-label="Community announcement"
          >
            <CommunityDescription value={community.banner} />
          </section>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p
            className="rounded-md bg-[var(--primary-soft)] px-3 py-2 text-sm text-primary"
            role="status"
          >
            {notice}
          </p>
        ) : null}
        {loading ? <p className="muted">Loading discussions…</p> : null}
        {!loading && community && !activeMember ? (
          <section className="card stack">
            <h2 className="font-semibold">
              {community.membership?.status === "pending"
                ? "Request pending"
                : "Join this community"}
            </h2>
            <p className="muted">
              {community.membership?.status === "pending"
                ? "An administrator needs to approve your membership before you can participate."
                : community.joiningReasonText ||
                  "Join to post, comment, and follow the conversation."}
            </p>
            {!community.membership ||
            ["rejected", "payment_failed", "expired"].includes(
              community.membership.status,
            ) ? (
              <div className="stack">
                {plans.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {plans.map((plan) => (
                      <div key={plan.id} className="rounded-md border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-medium">{plan.name}</h3>
                            {plan.description ? (
                              <p className="muted mt-1">{plan.description}</p>
                            ) : null}
                          </div>
                          <span className="text-sm font-medium">
                            {plan.amountMinor === 0
                              ? "Free"
                              : new Intl.NumberFormat(undefined, {
                                  style: "currency",
                                  currency: plan.currency,
                                }).format(plan.amountMinor / 100)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          className="mt-4"
                          onClick={() => requestJoin(plan)}
                          disabled={joining}
                        >
                          {joining
                            ? "Joining…"
                            : plan.kind === "free"
                              ? "Join community"
                              : "Continue to payment"}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => requestJoin()}
                    disabled={joining}
                  >
                    {joining ? "Joining…" : "Join community"}
                  </Button>
                )}
              </div>
            ) : null}
          </section>
        ) : null}
        {!loading && activeMember ? (
          <>
            {!postId ? (
              <section className="card stack">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-5 text-primary" />
                  <h2 className="font-semibold">Start a discussion</h2>
                </div>
                <form onSubmit={(event) => void createPost(event)} className="stack">
                  <input
                    value={postDraft.title}
                    onChange={(event) => updatePostDraft("title", event.target.value)}
                    placeholder="Discussion title"
                    aria-label="Discussion title"
                    className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  />
                  <LearnerRichTextEditor
                    initialContent={communityEditorContent(postDraft.content)}
                    onChange={(document) =>
                      updatePostDraft("content", JSON.stringify(document))
                    }
                    placeholder="Share something with the community…"
                    className="rounded-md border bg-background"
                    editorClassName="min-h-[140px]"
                  />
                  <MediaAttachments
                    items={postMedia.map(selectedMediaToAttachment)}
                    onRemove={(id) =>
                      updatePostMedia(
                        postMediaRef.current.filter((media) => media.id !== id),
                      )
                    }
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={postDraft.category}
                        onChange={(event) =>
                          updatePostDraft("category", event.target.value)
                        }
                        aria-label="Discussion category"
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                      >
                        {categoryOptions.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                      <MediaUploadDialog<LearnerCommunityMedia>
                        {...mediaAdapters}
                        title="Attach media"
                        description="Add an image, video, or PDF to your discussion."
                        acceptedTypes={COMMUNITY_MEDIA_ACCEPTED_TYPES}
                        allowUnsplash={false}
                        maxUploadBytes={100_000_000}
                        onSelect={selectPostMedia}
                      >
                        <Button type="button" variant="outline" size="sm">
                          <Paperclip className="size-4" /> Attach media
                        </Button>
                      </MediaUploadDialog>
                    </div>
                    <Button
                      type="submit"
                      disabled={
                        busy ||
                        !postDraft.title.trim() ||
                        !communityDescriptionHasContent(postDraft.content)
                      }
                    >
                      <Send className="size-4" />{" "}
                      {busy ? "Publishing…" : "Publish post"}
                    </Button>
                  </div>
                </form>
              </section>
            ) : null}
            <section className="stack" aria-label="Community discussions">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Discussions</h2>
                <span className="text-sm text-muted-foreground">
                  {community.postsCount.toLocaleString()}{" "}
                  {community.postsCount === 1 ? "post" : "posts"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PlatformTabs
                  className="w-auto"
                  listClassName="border-b-0"
                  ariaLabel="Discussion categories"
                  value={activeCategory}
                  onValueChange={selectCategory}
                  items={visibleFeedCategories.map((category) => ({
                    value: category,
                    label: category,
                  }))}
                />
                {feedCategories.length > 3 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => setShowAllCategories((current) => !current)}
                  >
                    {showAllCategories ? "Less" : "More…"}
                  </Button>
                ) : null}
              </div>
              {displayedPosts.length === 0 ? (
                <div className="card text-sm text-muted-foreground">
                  {postId
                    ? "This discussion is no longer available."
                    : "No discussions yet."}
                </div>
              ) : null}
              {displayedPosts.map((post) => (
                <article key={post.id} className="card stack">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {post.pinned ? (
                          <span className="inline-flex items-center gap-1 text-primary">
                            <Pin className="size-3" /> Pinned
                          </span>
                        ) : null}
                        <span>{post.category}</span>
                        <span>·</span>
                        <span>
                          {post.author?.name ??
                            (post.authorKind === "admin"
                              ? "Admin"
                              : "Community member")}
                        </span>
                        <span>·</span>
                        <time dateTime={post.updatedAt}>
                          {new Date(post.updatedAt).toLocaleDateString()}
                        </time>
                      </div>
                      {editingPostId === post.id ? (
                        <div className="stack">
                          <input
                            value={postEditDraft.title}
                            onChange={(event) =>
                              setPostEditDraft((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                            className="h-9 rounded-md border bg-background px-3 text-sm"
                            aria-label="Edit post title"
                          />
                          <LearnerRichTextEditor
                            key={`${post.id}-${editingPostId}`}
                            initialContent={communityEditorContent(
                              postEditDraft.content,
                            )}
                            onChange={(document) =>
                              updatePostEditContent(JSON.stringify(document))
                            }
                            placeholder="Share something with the community…"
                            className="rounded-md border bg-background"
                            editorClassName="min-h-[120px]"
                          />
                          <MediaAttachments
                            items={postEditMedia}
                            onRemove={removePostEditMedia}
                          />
                          <MediaUploadDialog<LearnerCommunityMedia>
                            {...mediaAdapters}
                            title="Attach media"
                            description="Add an image, video, or PDF to your discussion."
                            acceptedTypes={COMMUNITY_MEDIA_ACCEPTED_TYPES}
                            allowUnsplash={false}
                            maxUploadBytes={100_000_000}
                            onSelect={selectPostEditMedia}
                          >
                            <Button type="button" variant="outline" size="sm">
                              <Paperclip className="size-4" /> Attach media
                            </Button>
                          </MediaUploadDialog>
                        </div>
                      ) : (
                        <h3 className="text-base font-semibold">{post.title}</h3>
                      )}
                    </div>
                    {post.authorId === learner.id || canModerate ? (
                      <div className="flex gap-2">
                        {post.authorId === learner.id && editingPostId === post.id ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void savePostEdit(post.id)}
                          >
                            Save
                          </Button>
                        ) : post.authorId === learner.id ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(post)}
                          >
                            Edit
                          </Button>
                        ) : null}
                        {post.authorId === learner.id || canModerate ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => requestDeletePost(post.id)}
                          >
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {editingPostId === post.id ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingPostId(null)}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <CommunityDescription
                      value={post.content}
                      className="text-sm leading-6 text-muted-foreground"
                    />
                  )}
                  {editingPostId === post.id ? null : (
                    <MediaAttachments
                      items={post.media.map(communityMediaToAttachment)}
                    />
                  )}
                  <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                    <CommunityReactionsBar
                      reactions={post.reactions}
                      onReact={(emoji) => void toggleReaction(post.id, emoji)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        expandedPostId === post.id
                          ? setExpandedPostId(null)
                          : void loadComments(post.id)
                      }
                    >
                      <MessageCircle className="size-4" />{" "}
                      {expandedPostId === post.id ? "Hide comments" : "Comments"}
                      {post.commentsCount > 0 ? ` (${post.commentsCount})` : null}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={subscribedPostIds.has(post.id) ? "soft" : "ghost"}
                      onClick={() => void toggleSubscription(post.id)}
                    >
                      <Bell className="size-4" />{" "}
                      {subscribedPostIds.has(post.id) ? "Following" : "Follow"}
                    </Button>
                    {post.authorId !== learner.id ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => reportPost(post.id)}
                      >
                        <Flag className="size-4" /> Report
                      </Button>
                    ) : null}
                  </div>
                  {expandedPostId === post.id ? (
                    <div className="stack border-t pt-4">
                      {(comments[post.id] ?? []).map((comment) => (
                        <div
                          key={comment.id}
                          id={comment.id}
                          className={`rounded-md bg-muted/40 p-3 text-sm ${comment.parentCommentId ? "ml-6" : ""}`}
                        >
                          <div className="mb-1 text-xs text-muted-foreground">
                            {comment.author?.name ??
                              (comment.authorKind === "admin"
                                ? "Admin"
                                : "Community member")}{" "}
                            · {new Date(comment.createdAt).toLocaleDateString()}
                          </div>
                          {comment.deletedAt ? (
                            <p className="italic text-muted-foreground">Deleted</p>
                          ) : (
                            <>
                              <CommunityDescription value={comment.content} />
                              <MediaAttachments
                                items={comment.media.map(communityMediaToAttachment)}
                              />
                            </>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {!comment.deletedAt ? (
                              <CommunityReactionsBar
                                reactions={comment.reactions}
                                onReact={(emoji) =>
                                  void toggleCommentReaction(comment, emoji)
                                }
                              />
                            ) : null}
                            {!comment.deletedAt &&
                            (comment.authorId === learner.id || canModerate) ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() =>
                                  requestDeleteComment(post.id, comment.id)
                                }
                              >
                                Delete
                              </Button>
                            ) : null}
                            {!comment.deletedAt && comment.authorId !== learner.id ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => reportComment(comment)}
                              >
                                <Flag className="size-3.5" /> Report
                              </Button>
                            ) : null}
                          </div>
                          {!comment.parentCommentId && !comment.deletedAt ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="mt-2"
                              onClick={() => toggleReplyTarget(post.id, comment.id)}
                            >
                              Reply
                            </Button>
                          ) : null}
                        </div>
                      ))}
                      {commentNextCursors[post.id] ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={loadingMoreCommentsPostId === post.id}
                          onClick={() => void loadMoreComments(post.id)}
                        >
                          {loadingMoreCommentsPostId === post.id
                            ? "Loading comments…"
                            : "Load more comments"}
                        </Button>
                      ) : null}
                      <MediaAttachments
                        items={(commentMedia[post.id] ?? []).map(
                          selectedMediaToAttachment,
                        )}
                        onRemove={(id) =>
                          updateCommentMedia(
                            post.id,
                            (commentMediaRefs.current[post.id] ?? []).filter(
                              (media) => media.id !== id,
                            ),
                          )
                        }
                      />
                      <div className="stack">
                        <LearnerRichTextEditor
                          key={`${post.id}-${replyToCommentId ?? "comment"}-${commentEditorVersions[post.id] ?? 0}`}
                          initialContent={communityEditorContent(
                            commentDrafts[post.id] ?? "",
                          )}
                          onChange={(document) =>
                            updateCommentDraft(post.id, JSON.stringify(document))
                          }
                          placeholder={
                            replyToCommentId ? "Write a reply…" : "Add a comment…"
                          }
                          showToolbar={false}
                          className="rounded-md border bg-background"
                          editorClassName="min-h-[100px]"
                        />
                        <div className="flex flex-wrap gap-2">
                          <MediaUploadDialog<LearnerCommunityMedia>
                            {...mediaAdapters}
                            title="Attach media"
                            description="Add an image, video, or PDF to your comment."
                            acceptedTypes={COMMUNITY_MEDIA_ACCEPTED_TYPES}
                            allowUnsplash={false}
                            maxUploadBytes={100_000_000}
                            onSelect={(selected) =>
                              selectCommentMedia(post.id, selected)
                            }
                          >
                            <Button type="button" variant="outline" size="sm">
                              <Paperclip className="size-4" /> Attach
                            </Button>
                          </MediaUploadDialog>
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              busy ||
                              !communityDescriptionHasContent(
                                commentDrafts[post.id] ?? "",
                              )
                            }
                            onClick={() =>
                              void createComment(post.id, replyToCommentId)
                            }
                          >
                            <Send className="size-4" />{" "}
                            {replyToCommentId ? "Reply" : "Comment"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
              {postsNextCursor ? (
                <Button
                  type="button"
                  variant="outline"
                  className="self-center"
                  disabled={loadingMorePosts}
                  onClick={() => void loadMorePosts()}
                >
                  {loadingMorePosts ? "Loading posts…" : "Load more posts"}
                </Button>
              ) : null}
            </section>
          </>
        ) : null}
        <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave community</DialogTitle>
              <DialogDescription>
                You’ll lose access to this community’s content, discussions, and
                included products. Any ongoing subscription will also be canceled.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLeaveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={leaving}
                onClick={() => {
                  setLeaveDialogOpen(false);
                  void leave();
                }}
              >
                {leaving ? "Leaving…" : "Leave community"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Delete {deleteTarget?.kind === "comment" ? "comment" : "post"}
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. The content and its media references will
                be removed from the community feed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={joinDialogOpen}
          onOpenChange={(open) => {
            setJoinDialogOpen(open);
            if (!open) {
              joiningReasonRef.current = "";
              setJoiningReason("");
              setJoinPlan(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join this community</DialogTitle>
              <DialogDescription>
                {community?.joiningReasonText ||
                  "Tell the community owner why you would like to join."}
              </DialogDescription>
            </DialogHeader>
            <textarea
              value={joiningReason}
              onChange={(event) => {
                joiningReasonRef.current = event.target.value;
                setJoiningReason(event.target.value);
              }}
              placeholder="Reason to join"
              aria-label="Reason to join"
              rows={4}
              maxLength={2000}
              className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setJoinDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!joiningReason.trim() || joining}
                onClick={submitJoinRequest}
              >
                {joining ? "Joining…" : "Submit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={Boolean(reportTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setReportTarget(null);
              setReportReason("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report content</DialogTitle>
              <DialogDescription>
                Tell the community moderators why this content should be reviewed.
              </DialogDescription>
            </DialogHeader>
            <textarea
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              placeholder="Reason for reporting"
              aria-label="Report reason"
              rows={4}
              maxLength={2000}
              className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReportTarget(null);
                  setReportReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!reportReason.trim()}
                onClick={() => void submitReport()}
              >
                Submit report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </LearnerShell>
  );
}
