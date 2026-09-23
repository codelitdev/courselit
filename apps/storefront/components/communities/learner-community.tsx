"use client";

import type {
  communityCommentSchema,
  communityPaymentPlanSchema,
  communityPostSchema,
  communityReactionSchema,
  communitySchema,
  learnerSchema,
} from "@courselit/api-contract";
import { MediaUploadDialog, type SelectedMedia } from "@frontlit/media-uploader";
import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  FileText,
  Film,
  Flag,
  Info,
  MessageCircle,
  Paperclip,
  Pencil,
  Pin,
  Reply,
  Send,
  Share2,
  SmilePlus,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import { CourseLitLoading, CourseLitLoadingIcon } from "@/components/course-lit-loader";
import { useLearnerSessionState } from "@/components/auth/learner-session";
import { LearnerShell } from "@/components/layout/learner-shell";
import {
  LearnerAlertDialog as AlertDialog,
  LearnerAlertDialogAction as AlertDialogAction,
  LearnerAlertDialogCancel as AlertDialogCancel,
  LearnerAlertDialogContent as AlertDialogContent,
  LearnerAlertDialogDescription as AlertDialogDescription,
  LearnerAlertDialogFooter as AlertDialogFooter,
  LearnerAlertDialogHeader as AlertDialogHeader,
  LearnerAlertDialogTitle as AlertDialogTitle,
  LearnerButton as Button,
  LearnerDialog as Dialog,
  LearnerDialogContent as DialogContent,
  LearnerDialogDescription as DialogDescription,
  LearnerDialogFooter as DialogFooter,
  LearnerDialogHeader as DialogHeader,
  LearnerDialogTitle as DialogTitle,
  LearnerActionMenu,
  LearnerAvatar,
  LearnerAvatarFallback,
  LearnerAvatarImage,
  LearnerCardImage,
  LearnerDropdownMenuItem,
  LearnerHeader1,
  LearnerHeader2,
  LearnerHeader3,
  LearnerInput,
  LearnerReactionPicker,
  LearnerText2,
  LearnerTextarea,
  LearnerCard as PageCard,
  LearnerCardContent as PageCardContent,
} from "@/components/themed-page-builder";
import { toast } from "@/components/themed-sonner";
import {
  type LearnerCommunityMedia,
  useLearnerCommunityMediaUploader,
} from "@/lib/community-media-uploader";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { requestJson } from "@/lib/request-json";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";
import { LearnerPostComposerDialog } from "./learner-post-composer-dialog";
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
  onReply,
  repliesCount,
}: {
  reactions: CommunityReaction[];
  onReact: (emoji: string) => void;
  onReply?: () => void;
  repliesCount?: number;
}) {
  return (
    <fieldset
      className="m-0 flex flex-wrap items-center gap-1.5 border-0 p-0"
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
            variant={reaction.active ? "secondary" : "outline"}
            onClick={() => onReact(reaction.emoji)}
          >
            <span aria-hidden="true">{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </Button>
        ))}
      <LearnerReactionPicker emojis={COMMUNITY_REACTION_EMOJIS} onReact={onReact}>
        <SmilePlus className="size-4" aria-hidden="true" />
      </LearnerReactionPicker>
      {onReply ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onReply}
          aria-label="Reply to post"
        >
          <Reply className="size-4" />
          {repliesCount !== undefined ? <span>{repliesCount}</span> : null}
        </Button>
      ) : null}
    </fieldset>
  );
}

function PostActionsMenu({
  onEdit,
  onDelete,
  onReport,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}) {
  if (!onEdit && !onDelete && !onReport) return null;

  return (
    <LearnerActionMenu
      label="Post actions"
      menu={
        <>
          {onReport ? (
            <LearnerDropdownMenuItem onSelect={onReport}>
              <Flag className="size-4" /> Report
            </LearnerDropdownMenuItem>
          ) : null}
          {onEdit ? (
            <LearnerDropdownMenuItem onSelect={onEdit}>
              <Pencil className="size-4" /> Edit
            </LearnerDropdownMenuItem>
          ) : null}
          {onDelete ? (
            <LearnerDropdownMenuItem onSelect={onDelete}>
              <Trash2 className="size-4" /> Delete
            </LearnerDropdownMenuItem>
          ) : null}
        </>
      }
    >
      <EllipsisVertical className="size-5" aria-hidden="true" />
    </LearnerActionMenu>
  );
}

function isOwnedByLearner(
  content: {
    authorId: string | null;
    author: { id: string; email: string | null } | null;
  },
  learner: Learner,
) {
  if (content.authorId === learner.id || content.author?.id === learner.id) {
    return true;
  }

  return Boolean(
    content.author?.email &&
      content.author.email.trim().toLowerCase() === learner.email.trim().toLowerCase(),
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
        <li key={item.id} className="min-w-0">
          <PageCard className="relative overflow-hidden">
            {item.type === "image" && item.url ? (
              <LearnerCardImage
                src={item.thumbnailUrl ?? item.url}
                alt={item.title}
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
                  <LearnerCardImage
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="size-full object-cover"
                  />
                ) : (
                  <LearnerText2 className="flex size-full items-center justify-center gap-2 text-muted-foreground">
                    <Film className="size-5" /> Open video
                  </LearnerText2>
                )}
              </a>
            ) : (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-24 items-center gap-3 p-3 hover:bg-muted/40"
              >
                <FileText className="size-5 shrink-0 text-primary" />
                <LearnerText2 component="span" className="min-w-0 truncate">
                  {item.fileName}
                </LearnerText2>
              </a>
            )}
            <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
              <LearnerText2
                component="span"
                className="min-w-0 truncate text-muted-foreground"
                title={item.title}
              >
                {item.title}
              </LearnerText2>
              {onRemove ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(item.id)}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </PageCard>
        </li>
      ))}
    </ul>
  );
}

export { requestJson } from "@/lib/request-json";

export function useLearnerSession(_nextPath = "/communities") {
  const { learner, checking } = useLearnerSessionState();
  return { learner: learner as Learner | null, checking };
}

function LoadingState({
  label,
  headerTitle = "Community",
  embedded = false,
}: {
  label: string;
  headerTitle?: string;
  embedded?: boolean;
}) {
  const content = (
    <main className="flex min-h-[400px] items-center justify-center p-6">
      <CourseLitLoading label={label} />
    </main>
  );
  if (embedded) return content;
  return (
    <LearnerShell user={null} loading headerTitle={headerTitle}>
      {content}
    </LearnerShell>
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
  return <LearnerText2 className={className}>{value}</LearnerText2>;
}

function CommunityInfoCard({
  community,
  activeMember,
  leaving,
  onShare,
  onLeave,
}: {
  community: Community;
  activeMember: boolean;
  leaving: boolean;
  onShare: () => void;
  onLeave: () => void;
}) {
  return (
    <PageCard className="h-fit">
      <PageCardContent className="grid gap-5">
        <div className="flex items-start justify-between gap-3">
          <LearnerHeader2 className="max-w-[18rem] leading-tight">
            {community.name}
          </LearnerHeader2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onShare}
            aria-label="Share community"
          >
            <Share2 className="size-4" />
          </Button>
        </div>
        <LearnerCardImage
          src={
            community.featuredImage?.thumbnailUrl ??
            community.featuredImage?.url ??
            "/courselit_backdrop_square.webp"
          }
          alt={community.featuredImage?.alt || community.name}
          className="aspect-square w-full object-cover"
        />
        <LearnerText2>
          {community.membersCount.toLocaleString()}{" "}
          {community.membersCount === 1 ? "member" : "members"}
        </LearnerText2>
        {activeMember ? (
          <div className="grid gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onLeave}
              disabled={leaving}
            >
              {leaving ? "Leaving…" : "Leave community"}
            </Button>
          </div>
        ) : null}
      </PageCardContent>
    </PageCard>
  );
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

  if (checking) {
    return <LoadingState label="Loading your community…" headerTitle="Communities" />;
  }
  if (!learner) return null;

  return (
    <LearnerShell user={learner}>
      <main className="grid gap-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <LearnerText2 className="text-muted-foreground">Community</LearnerText2>
            <LearnerHeader1>Communities</LearnerHeader1>
            <LearnerText2 className="mt-2 text-muted-foreground">
              Learn together, ask questions, and share progress.
            </LearnerText2>
          </div>
        </header>
        {error ? (
          <LearnerText2 className="text-destructive" role="alert">
            {error}
          </LearnerText2>
        ) : null}
        {loading ? (
          <CourseLitLoading label="Loading communities…" />
        ) : null}
        {!loading && communities.length === 0 ? (
          <PageCard>
            <PageCardContent className="grid justify-items-start gap-3">
              <Users className="size-8 text-muted-foreground" />
              <LearnerHeader2>No communities yet</LearnerHeader2>
              <LearnerText2 className="text-muted-foreground">
                Your school has not opened a community yet.
              </LearnerText2>
            </PageCardContent>
          </PageCard>
        ) : null}
        {!loading && communities.length > 0 ? (
          <section
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            aria-label="Communities"
          >
            {communities.map((community) => (
              <Link key={community.id} href="/join" className="group block">
                <PageCard
                  isLink
                  className="flex flex-col gap-4 transition-colors hover:border-primary/60"
                >
                  {community.featuredImage ? (
                    <LearnerCardImage
                      src={
                        community.featuredImage.thumbnailUrl ??
                        community.featuredImage.url
                      }
                      alt={community.featuredImage.alt || community.name}
                      className="aspect-video w-full rounded-md border object-cover"
                    />
                  ) : null}
                  <PageCardContent className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <LearnerHeader2 className="group-hover:text-primary">
                          {community.name}
                        </LearnerHeader2>
                        <CommunityDescription
                          value={community.description || "Join the conversation."}
                          className="mt-1 line-clamp-3 text-sm text-muted-foreground"
                        />
                      </div>
                      <MessageCircle className="size-5 shrink-0 text-primary" />
                    </div>
                    <div className="mt-auto flex flex-wrap gap-2">
                      {community.categories.slice(0, 3).map((category) => (
                        <LearnerText2
                          key={category}
                          component="span"
                          className="rounded-full border px-2 py-1 text-muted-foreground"
                        >
                          {category}
                        </LearnerText2>
                      ))}
                      <LearnerText2
                        component="span"
                        className="ml-auto rounded-full bg-muted px-2 py-1 text-muted-foreground"
                      >
                        {communityMembershipLabel(community)}
                      </LearnerText2>
                      <LearnerText2
                        component="span"
                        className="rounded-full bg-muted px-2 py-1 text-muted-foreground"
                      >
                        {community.membersCount.toLocaleString()} members
                      </LearnerText2>
                    </div>
                  </PageCardContent>
                </PageCard>
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
              aria-label={loadingMore ? "Loading communities" : "Load more communities"}
            >
              {loadingMore ? (
                <CourseLitLoadingIcon size={14} />
              ) : (
                "Load more communities"
              )}
            </Button>
          </div>
        ) : null}
      </main>
    </LearnerShell>
  );
}

export function LearnerSpacePost({
  spaceId,
  postId,
  embedded = false,
}: {
  spaceId: string;
  postId: string;
  embedded?: boolean;
}) {
  const routePath = `/dashboard/s/${encodeURIComponent(spaceId)}/${encodeURIComponent(postId)}`;
  const { learner, checking } = useLearnerSession(routePath);
  const [spacePost, setSpacePost] = useState<CommunityPost | null>(null);
  const [spaceName, setSpaceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!learner) return;
    let active = true;
    setSpacePost(null);
    setSpaceName(null);
    setError(null);
    void requestJson<CommunityPost & { communityId: string; space?: { name: string } }>(
      `/api/v1/learner/spaces/${encodeURIComponent(spaceId)}/posts/${encodeURIComponent(postId)}`,
    )
      .then((post) => {
        if (active) {
          setSpacePost(post);
          setSpaceName(post.space?.name ?? null);
        }
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
  }, [learner, postId, spaceId]);

  if (checking) {
    return (
      <LoadingState
        label="Loading discussion…"
        headerTitle="Space"
        embedded={embedded}
      />
    );
  }
  if (!learner) return null;
  if (error) {
    return (
      <main className="flex min-h-[400px] items-center justify-center p-6">
        <LearnerText2 className="text-destructive" role="alert">
          {error}
        </LearnerText2>
      </main>
    );
  }
  if (!spacePost) return <LoadingState label="Loading discussion…" />;

  return (
    <LearnerCommunity
      communityId={spacePost.communityId}
      spaceId={spaceId}
      postId={postId}
      initialPost={spacePost}
      spaceName={spaceName ?? undefined}
      routePath={routePath}
      embedded={embedded}
    />
  );
}

export function LearnerCommunity({
  communityId,
  spaceId,
  postId,
  initialPost,
  spaceName,
  routePath,
  embedded = false,
}: {
  communityId: string;
  spaceId?: string;
  postId?: string;
  initialPost?: CommunityPost;
  spaceName?: string;
  routePath?: string;
  embedded?: boolean;
}) {
  const { learner, checking } = useLearnerSession(
    routePath ??
      (spaceId && postId
        ? `/dashboard/s/${encodeURIComponent(spaceId)}/${encodeURIComponent(postId)}`
        : "/dashboard"),
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const [commentTargetId, setCommentTargetId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.location.hash.slice(1) || null,
  );
  const requestedCategory = searchParams.get("category") ?? "All";
  const requestedPostId = postId ?? searchParams.get("post");
  const shouldFocusReply = searchParams.get("reply") === "1";
  const spaceFeedPath = spaceId
    ? `/dashboard/s/${encodeURIComponent(spaceId)}`
    : "/dashboard";
  const postDetailPath = (targetPostId: string) =>
    spaceId ? `${spaceFeedPath}/${encodeURIComponent(targetPostId)}` : "/dashboard";
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
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [postsNextCursor, setPostsNextCursor] = useState<string | null>(null);
  const [postsPage, setPostsPage] = useState(1);
  const [postPages, setPostPages] = useState<CommunityPost[][]>([]);
  const [postPageCursors, setPostPageCursors] = useState<Record<number, string | null>>(
    {},
  );
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

  const loadPosts = useCallback(
    async (cursor?: string | null, category = activeCategory, page = 1) => {
      const body = await requestJson<{
        items: CommunityPost[];
        nextCursor: string | null;
      }>(
        communityPagePath(
          `/api/v1/learner/communities/${encodeURIComponent(communityId)}/posts`,
          cursor,
          category,
        ),
      );
      setPosts(body.items);
      setPostsPage(page);
      setPostPages((current) => {
        const next = [...current];
        next[page - 1] = body.items;
        return next.slice(0, page);
      });
      setPostPageCursors((current) => ({ ...current, [page]: body.nextCursor }));
      setPostsNextCursor(body.nextCursor);
      setSubscribedPostIds((current) => {
        const next = new Set(cursor ? current : []);
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
      if (initialPost) {
        setComments({});
        setCommentNextCursors({});
        setPostsPage(1);
        setPostPages([[initialPost]]);
        setPostPageCursors({ 1: null });
        setPosts([initialPost]);
        setPostsNextCursor(null);
        setSubscribedPostIds(
          initialPost.subscribed ? new Set([initialPost.id]) : new Set(),
        );
      } else if (detail.membership?.status === "active") {
        setComments({});
        setCommentNextCursors({});
        setPostsPage(1);
        setPostPages([]);
        setPostPageCursors({});
        await loadPosts(null, requestedCategory, 1);
      } else {
        setPosts([]);
        setPostsNextCursor(null);
        setPostsPage(1);
        setPostPages([]);
        setPostPageCursors({});
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
  }, [communityId, initialPost, learner, loadPosts, requestedCategory]);

  useEffect(() => {
    if (learner) void load();
  }, [learner, load]);

  useEffect(() => {
    postEditDraftRef.current = postEditDraft;
  }, [postEditDraft]);

  const hasCommunityMembership = community?.membership?.status === "active";
  const activeMember = Boolean(initialPost) || hasCommunityMembership;
  const focusedPost = postId ? posts.find((post) => post.id === postId) : null;
  const displayedPosts = postId ? (focusedPost ? [focusedPost] : []) : posts;
  const canModerate =
    hasCommunityMembership &&
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
  const totalPostPages = Math.max(
    postsPage,
    Math.ceil((community?.postsCount ?? 0) / COMMUNITY_PAGE_SIZE),
  );

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
    setPostsPage(1);
    setPostPages([]);
    setPostPageCursors({});
    void loadPosts(null, category, 1).catch((caught) => {
      setError(
        caught instanceof Error ? caught.message : "Unable to load discussions.",
      );
    });
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("post");
    if (category === "All") {
      nextParams.delete("category");
    } else {
      nextParams.set("category", category);
    }
    const query = nextParams.toString();
    router.replace(`${spaceFeedPath}${query ? `?${query}` : ""}`, { scroll: false });
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

  function requestJoin(plan: CommunityPlan) {
    if (!community) return;
    const isFree = plan.kind === "free" || plan.type === "free";
    const requiresReason = isFree && !community.autoAcceptMembers;
    if (requiresReason) {
      joiningReasonRef.current = "";
      setJoiningReason("");
      setJoinPlan(plan);
      setJoinDialogOpen(true);
      return;
    }
    void checkout(plan, "");
  }

  async function checkout(plan: CommunityPlan, reason = "") {
    if (!community || joining) return;
    setJoining(true);
    setError(null);
    try {
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
      toast.success(
        plan.kind === "free"
          ? "Your community membership request was submitted."
          : "Your community membership is being processed.",
      );
      await load();
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
    if (!joinPlan) return;
    void checkout(joinPlan, joiningReasonRef.current.trim());
  }

  async function leave() {
    if (!community || !hasCommunityMembership || leaving) return;
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
      setPostsPage(1);
      setPostPages([]);
      setPostPageCursors({});
      setComments({});
      setCommentNextCursors({});
      setExpandedPostId(null);
      toast.success("You left the community.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to leave this community.",
      );
    } finally {
      setLeaving(false);
    }
  }

  function requestLeave() {
    if (!community || !hasCommunityMembership || leaving) return;
    setLeaveDialogOpen(true);
  }

  async function shareCommunity() {
    if (!community) return;
    const url = `${window.location.origin}${postId ? postDetailPath(postId) : spaceFeedPath}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Community link copied to clipboard.");
    } catch {
      toast.info("Copy this community link", { description: url, duration: 10_000 });
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
      setPostDialogOpen(false);
      toast.success("Post published.");
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
      await loadPosts(postsNextCursor, activeCategory, postsPage + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load more posts.");
    } finally {
      setLoadingMorePosts(false);
    }
  }

  function loadPreviousPosts() {
    if (postsPage <= 1 || loadingMorePosts) return;
    const previousPage = postPages[postsPage - 2];
    if (!previousPage) return;
    setPosts(previousPage);
    setPostsPage(postsPage - 1);
    setPostsNextCursor(postPageCursors[postsPage - 1] ?? null);
    setSubscribedPostIds((current) => {
      const next = new Set(current);
      for (const post of previousPage) {
        if (post.subscribed) next.add(post.id);
        else next.delete(post.id);
      }
      return next;
    });
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

  function openPostReply(targetPostId: string) {
    if (embedded) {
      if (expandedPostId !== targetPostId) void loadComments(targetPostId);
      return;
    }
    router.push(`${postDetailPath(targetPostId)}?reply=1`);
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
      toast.success("Thanks. The content was sent for review.");
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

  function commentComposer(targetPostId: string, parentCommentId: string | null) {
    const isReply = Boolean(parentCommentId);
    return (
      <div className="grid gap-3">
        <MediaAttachments
          items={(commentMedia[targetPostId] ?? []).map(selectedMediaToAttachment)}
          onRemove={(id) =>
            updateCommentMedia(
              targetPostId,
              (commentMediaRefs.current[targetPostId] ?? []).filter(
                (media) => media.id !== id,
              ),
            )
          }
        />
        <LearnerRichTextEditor
          key={[
            targetPostId,
            parentCommentId ?? "comment",
            commentEditorVersions[targetPostId] ?? 0,
          ].join("-")}
          initialContent={communityEditorContent(commentDrafts[targetPostId] ?? "")}
          onChange={(document) =>
            updateCommentDraft(targetPostId, JSON.stringify(document))
          }
          placeholder={isReply ? "Write a reply…" : "Add a comment…"}
          autoFocus={isReply || Boolean(postId && shouldFocusReply)}
          showToolbar={false}
          className="rounded-md border bg-background"
          editorClassName="min-h-[100px]"
        />
        <div className="flex flex-wrap justify-end gap-2">
          <MediaUploadDialog<LearnerCommunityMedia>
            {...mediaAdapters}
            title="Attach media"
            description="Add an image, video, or PDF to your comment."
            acceptedTypes={COMMUNITY_MEDIA_ACCEPTED_TYPES}
            allowUnsplash={false}
            maxUploadBytes={100_000_000}
            onSelect={(selected) => selectCommentMedia(targetPostId, selected)}
          >
            <Button type="button" variant="outline" size="sm">
              <Paperclip className="size-4" /> Attach
            </Button>
          </MediaUploadDialog>
          {isReply ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                resetCommentEditor(targetPostId);
                setReplyToCommentId(null);
              }}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={
              busy || !communityDescriptionHasContent(commentDrafts[targetPostId] ?? "")
            }
            onClick={() => void createComment(targetPostId, parentCommentId)}
          >
            <Send className="size-4" /> {isReply ? "Reply" : "Comment"}
          </Button>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <LoadingState
        label="Loading community…"
        headerTitle={postId ? (spaceName ?? "Space") : (community?.name ?? "Community")}
        embedded={embedded}
      />
    );
  }
  if (!learner) return null;

  const content = (
    <main
        className={`grid items-start content-start gap-6 ${
          postId ? "mx-auto w-full max-w-4xl lg:grid-cols-1" : "lg:grid-cols-3"
        }`}
      >
        {!postId && community ? (
          <aside className="order-last self-start lg:col-start-3 lg:row-start-1 lg:order-none">
            <CommunityInfoCard
              community={community}
              activeMember={Boolean(hasCommunityMembership)}
              leaving={leaving}
              onShare={() => void shareCommunity()}
              onLeave={requestLeave}
            />
          </aside>
        ) : null}
        <div
          className={`grid min-w-0 content-start gap-6 self-start lg:col-start-1 lg:row-start-1 ${
            postId ? "lg:col-span-1" : "lg:col-span-2"
          }`}
        >
          {error ? (
            <LearnerText2 className="text-destructive" role="alert">
              {error}
            </LearnerText2>
          ) : null}
          {loading ? <CourseLitLoading label="Loading discussions…" /> : null}
          {!loading && community && !activeMember ? (
            <PageCard>
              <PageCardContent className="grid gap-4">
                <LearnerHeader2>
                  {community.membership?.status === "pending"
                    ? "Request pending"
                    : "Join this community"}
                </LearnerHeader2>
                <LearnerText2 className="text-muted-foreground">
                  {community.membership?.status === "pending"
                    ? "An administrator needs to approve your membership before you can participate."
                    : community.joiningReasonText ||
                      "Join to post, comment, and follow the conversation."}
                </LearnerText2>
                {!community.membership ||
                ["rejected", "payment_failed", "expired"].includes(
                  community.membership.status,
                ) ? (
                  <div className="grid gap-4">
                    {plans.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {plans.map((plan) => (
                          <PageCard key={plan.id}>
                            <PageCardContent className="grid gap-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <LearnerHeader3>{plan.name}</LearnerHeader3>
                                  {plan.description ? (
                                    <LearnerText2 className="mt-1 text-muted-foreground">
                                      {plan.description}
                                    </LearnerText2>
                                  ) : null}
                                </div>
                                <LearnerText2 component="span" className="font-medium">
                                  {plan.amountMinor === 0
                                    ? "Free"
                                    : new Intl.NumberFormat(undefined, {
                                        style: "currency",
                                        currency: plan.currency,
                                      }).format(plan.amountMinor / 100)}
                                </LearnerText2>
                              </div>
                              <Button
                                type="button"
                                onClick={() => requestJoin(plan)}
                                disabled={joining}
                              >
                                {joining
                                  ? "Joining…"
                                  : plan.kind === "free"
                                    ? "Join community"
                                    : "Continue to payment"}
                              </Button>
                            </PageCardContent>
                          </PageCard>
                        ))}
                      </div>
                    ) : (
                      <LearnerText2>
                        No active community plans are available right now.
                      </LearnerText2>
                    )}
                  </div>
                ) : null}
              </PageCardContent>
            </PageCard>
          ) : null}
          {!loading && activeMember ? (
            <div className="grid min-w-0 content-start gap-6 self-start">
              {!postId ? (
                <LearnerPostComposerDialog
                  open={postDialogOpen}
                  onOpenChange={setPostDialogOpen}
                  trigger={
                    <PageCard className="cursor-text transition-colors hover:border-primary/60">
                      <PageCardContent className="py-4">
                        <LearnerText2 className="text-muted-foreground">
                          Write something…
                        </LearnerText2>
                      </PageCardContent>
                    </PageCard>
                  }
                  learnerName={learner.name || learner.email}
                  destinations={categoryOptions.map((category) => ({
                    id: category,
                    name: category,
                  }))}
                  destinationId={postDraft.category}
                  destinationLabel="Select a category"
                  destinationLocked={false}
                  onDestinationChange={(category) =>
                    updatePostDraft("category", category)
                  }
                  title={postDraft.title}
                  onTitleChange={(value) => updatePostDraft("title", value)}
                  content={postDraft.content}
                  onContentChange={(value) => updatePostDraft("content", value)}
                  media={postMedia}
                  mediaAdapters={mediaAdapters}
                  onMediaSelected={selectPostMedia}
                  onMediaRemove={(id) =>
                    updatePostMedia(
                      postMediaRef.current.filter((media) => media.id !== id),
                    )
                  }
                  canSubmit={Boolean(
                    postDraft.title.trim() &&
                      communityDescriptionHasContent(postDraft.content),
                  )}
                  submitting={busy}
                  onSubmit={(event) => void createPost(event)}
                />
              ) : null}
              {!postId ? (
                <div
                  className="flex flex-wrap items-center gap-2"
                  role="tablist"
                  aria-label="Discussion categories"
                >
                  {visibleFeedCategories.map((category) => {
                    const active = category === activeCategory;
                    return (
                      <Button
                        key={category}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        variant={active ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => selectCategory(category)}
                      >
                        {category}
                      </Button>
                    );
                  })}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAllCategories((current) => !current)}
                  >
                    {showAllCategories ? "Less" : "More…"}
                  </Button>
                </div>
              ) : null}
              {!postId &&
              community?.banner &&
              communityDescriptionHasContent(community.banner) ? (
                <PageCard aria-label="Community announcement">
                  <PageCardContent className="flex items-center gap-3 py-4">
                    <Info className="size-5 shrink-0 text-muted-foreground" />
                    <CommunityDescription value={community.banner} />
                  </PageCardContent>
                </PageCard>
              ) : null}
              <section className="grid gap-4" aria-label="Community discussions">
                {!postId ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <LearnerHeader2>Discussions</LearnerHeader2>
                    <LearnerText2 component="span" className="text-muted-foreground">
                      {(community?.postsCount ?? 0).toLocaleString()}{" "}
                      {community?.postsCount === 1 ? "post" : "posts"}
                    </LearnerText2>
                  </div>
                ) : null}
                {displayedPosts.length === 0 ? (
                  <PageCard>
                    <PageCardContent className="text-muted-foreground">
                      {postId
                        ? "This discussion is no longer available."
                        : "No discussions yet."}
                    </PageCardContent>
                  </PageCard>
                ) : null}
                {displayedPosts.map((post) => (
                  <PageCard
                    key={post.id}
                    isLink={!postId}
                    className="min-w-0"
                    onClick={(event) => {
                      if (
                        (event.target as HTMLElement).closest(
                          "button,a,input,textarea,select,[contenteditable='true']",
                        )
                      ) {
                        return;
                      }
                      if (!postId && editingPostId !== post.id) {
                        router.push(postDetailPath(post.id));
                      }
                    }}
                  >
                    <PageCardContent className="grid gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <LearnerAvatar className="size-10">
                            {post.author?.imageUrl ? (
                              <LearnerAvatarImage
                                src={post.author.imageUrl}
                                alt={post.author.name}
                              />
                            ) : null}
                            <LearnerAvatarFallback>
                              {(post.author?.name ?? "C").slice(0, 1).toUpperCase()}
                            </LearnerAvatarFallback>
                          </LearnerAvatar>
                          <div className="min-w-0">
                            <LearnerText2 className="truncate font-medium">
                              {post.author?.name ??
                                (post.authorKind === "admin"
                                  ? "Admin"
                                  : "Community member")}
                            </LearnerText2>
                            <LearnerText2 className="text-sm text-muted-foreground">
                              <time dateTime={post.updatedAt}>
                                {new Date(post.updatedAt).toLocaleDateString()}
                              </time>{" "}
                              · {post.category}
                            </LearnerText2>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {post.pinned === true ? (
                            <Pin
                              className="size-4 text-muted-foreground"
                              aria-label="Pinned"
                            />
                          ) : null}
                          {postId ? (
                            <PostActionsMenu
                              onReport={
                                isOwnedByLearner(post, learner)
                                  ? undefined
                                  : () => reportPost(post.id)
                              }
                              onEdit={
                                isOwnedByLearner(post, learner)
                                  ? () => startEditing(post)
                                  : undefined
                              }
                              onDelete={
                                isOwnedByLearner(post, learner) || canModerate
                                  ? () => requestDeletePost(post.id)
                                  : undefined
                              }
                            />
                          ) : null}
                          {editingPostId === post.id ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void savePostEdit(post.id)}
                            >
                              Save
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {editingPostId === post.id ? (
                        <div className="grid gap-4">
                          <LearnerInput
                            value={postEditDraft.title}
                            onChange={(event) =>
                              setPostEditDraft((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                            className="h-9"
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
                        <LearnerHeader3>{post.title}</LearnerHeader3>
                      )}
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
                          onReply={() => openPostReply(post.id)}
                          repliesCount={post.commentsCount}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            subscribedPostIds.has(post.id) ? "secondary" : "ghost"
                          }
                          onClick={() => void toggleSubscription(post.id)}
                        >
                          <Bell className="size-4" />{" "}
                          {subscribedPostIds.has(post.id) ? "Following" : "Follow"}
                        </Button>
                      </div>
                      {expandedPostId === post.id ? (
                        <div className="grid gap-4 border-t pt-4">
                          {(comments[post.id] ?? []).map((comment) => (
                            <div
                              key={comment.id}
                              id={comment.id}
                              className={
                                "grid gap-2 text-sm " +
                                (comment.parentCommentId ? "ml-10" : "")
                              }
                            >
                              <div className="flex items-start gap-3">
                                <LearnerAvatar className="size-9">
                                  {comment.author?.imageUrl ? (
                                    <LearnerAvatarImage
                                      src={comment.author.imageUrl}
                                      alt={comment.author.name}
                                    />
                                  ) : null}
                                  <LearnerAvatarFallback>
                                    {(comment.author?.name ?? "C")
                                      .slice(0, 1)
                                      .toUpperCase()}
                                  </LearnerAvatarFallback>
                                </LearnerAvatar>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                                      <LearnerText2
                                        component="span"
                                        className="font-medium text-foreground"
                                      >
                                        {comment.author?.name ??
                                          (comment.authorKind === "admin"
                                            ? "Admin"
                                            : "Community member")}
                                      </LearnerText2>
                                      <span>
                                        {new Date(
                                          comment.createdAt,
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                    {!comment.deletedAt ? (
                                      <PostActionsMenu
                                        onDelete={
                                          isOwnedByLearner(comment, learner) ||
                                          canModerate
                                            ? () =>
                                                requestDeleteComment(
                                                  post.id,
                                                  comment.id,
                                                )
                                            : undefined
                                        }
                                        onReport={
                                          !isOwnedByLearner(comment, learner)
                                            ? () => reportComment(comment)
                                            : undefined
                                        }
                                      />
                                    ) : null}
                                  </div>
                                  {comment.deletedAt ? (
                                    <p className="italic text-muted-foreground">
                                      Deleted
                                    </p>
                                  ) : (
                                    <>
                                      <CommunityDescription value={comment.content} />
                                      <MediaAttachments
                                        items={comment.media.map(
                                          communityMediaToAttachment,
                                        )}
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
                                        onReply={() =>
                                          toggleReplyTarget(post.id, comment.id)
                                        }
                                      />
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                              {replyToCommentId === comment.id
                                ? commentComposer(post.id, comment.id)
                                : null}
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
                              {loadingMoreCommentsPostId === post.id ? (
                                <CourseLitLoadingIcon size={14} />
                              ) : (
                                "Load more comments"
                              )}
                            </Button>
                          ) : null}
                          {!replyToCommentId ? commentComposer(post.id, null) : null}
                        </div>
                      ) : null}
                    </PageCardContent>
                  </PageCard>
                ))}
                {!postId && (postsPage > 1 || postsNextCursor) ? (
                  <nav
                    className="flex items-center justify-center gap-3 pt-2"
                    aria-label="Discussion pages"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={postsPage <= 1 || loadingMorePosts}
                      onClick={loadPreviousPosts}
                    >
                      <ChevronLeft className="size-4" /> Previous
                    </Button>
                    <LearnerText2 component="span" className="tabular-nums">
                      {postsPage}
                    </LearnerText2>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Load more posts"
                      disabled={!postsNextCursor || loadingMorePosts}
                      onClick={() => void loadMorePosts()}
                    >
                      Next <ChevronRight className="size-4" />
                    </Button>
                    <LearnerText2 component="span" className="text-muted-foreground">
                      of {totalPostPages}
                    </LearnerText2>
                  </nav>
                ) : null}
              </section>
            </div>
          ) : null}
        </div>
        <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave community</AlertDialogTitle>
              <AlertDialogDescription>
                You’ll lose access to this community’s content, discussions, and
                included products. Any ongoing subscription will also be canceled.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button asChild variant="outline">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
              </Button>
              <Button asChild variant="destructive" disabled={leaving}>
                <AlertDialogAction
                  onClick={() => {
                    setLeaveDialogOpen(false);
                    void leave();
                  }}
                >
                  {leaving ? "Leaving…" : "Leave community"}
                </AlertDialogAction>
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete {deleteTarget?.kind === "comment" ? "comment" : "post"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The content and its media references will
                be removed from the feed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button asChild variant="outline">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
              </Button>
              <Button asChild variant="destructive">
                <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
            <LearnerTextarea
              value={joiningReason}
              onChange={(event) => {
                joiningReasonRef.current = event.target.value;
                setJoiningReason(event.target.value);
              }}
              placeholder="Reason to join"
              aria-label="Reason to join"
              rows={4}
              maxLength={2000}
              className="w-full resize-y"
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
            <LearnerTextarea
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              placeholder="Reason for reporting"
              aria-label="Report reason"
              rows={4}
              maxLength={2000}
              className="w-full resize-y"
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
  );

  if (embedded) return content;

  return (
    <LearnerShell
      user={learner}
      headerTitle={postId ? (spaceName ?? "Space") : (community?.name ?? "Community")}
      headerTitleHref={postId ? spaceFeedPath : undefined}
      headerContext={postId ? (focusedPost?.title ?? "Discussion") : undefined}
    >
      {content}
    </LearnerShell>
  );
}
