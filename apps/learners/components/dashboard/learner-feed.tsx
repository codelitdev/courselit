"use client";

import type { SelectedMedia } from "@frontlit/media-uploader";
import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import { FileText, Info, MessagesSquare, Pin, Reply, SmilePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useLearnerSession } from "@/components/communities/learner-community";
import { LearnerPostComposerDialog } from "@/components/communities/learner-post-composer-dialog";
import {
  LearnerButton as Button,
  LearnerAvatar,
  LearnerAvatarFallback,
  LearnerAvatarImage,
  LearnerCard,
  LearnerCardContent,
  LearnerCardImage,
  LearnerHeader2,
  LearnerLink,
  LearnerReactionPicker,
  LearnerText2,
} from "@/components/themed-page-builder";
import { toast } from "@/components/themed-sonner";
import {
  type LearnerCommunityMedia,
  useLearnerCommunityMediaUploader,
} from "@/lib/community-media-uploader";
import { requestJson } from "@/lib/request-json";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

const FEED_PAGE_SIZE = 20;
const REACTION_EMOJIS = ["👍", "❤️", "😄", "🎉", "😢", "😮"] as const;

const mediaRefSchema = z.object({
  url: z.string(),
  thumbnailUrl: z.string().nullable().optional(),
  alt: z.string().optional(),
});

const spaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  logo: z.string(),
  featuredImage: mediaRefSchema.nullable(),
  whoCanPost: z.enum(["members", "admin"]),
  canPost: z.boolean().optional(),
  followed: z.boolean().optional(),
});

const actorSchema = z.object({
  id: z.string(),
  kind: z.enum(["learner", "admin"]),
  name: z.string(),
  email: z.string().nullable(),
  imageUrl: z.string().nullable(),
});

const reactionSchema = z.object({
  emoji: z.string(),
  count: z.number().int().nonnegative(),
  active: z.boolean(),
});

const feedPostSchema = z.object({
  id: z.string(),
  communityId: z.string().optional(),
  authorId: z.string().nullable().optional(),
  authorKind: z.enum(["learner", "admin"]).nullable().optional(),
  author: actorSchema.nullable().optional(),
  title: z.string(),
  content: z.string(),
  category: z.string().optional(),
  media: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["image", "video", "pdf"]),
        title: z.string(),
        url: z.string(),
        thumbnailUrl: z.string().nullable(),
        fileName: z.string(),
        mimeType: z.string(),
        byteSize: z.number(),
      }),
    )
    .optional(),
  reactions: z.array(reactionSchema).optional(),
  commentsCount: z.number().int().nonnegative().optional(),
  subscribed: z.boolean().optional(),
  pinned: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  spaceId: z.string().nullable().optional(),
  space: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      description: z.string(),
      logo: z.string(),
      featuredImage: mediaRefSchema.nullable(),
    })
    .optional(),
});

const feedResponseSchema = z.object({
  items: z.array(feedPostSchema),
  nextCursor: z.string().nullable(),
  banner: z.string().default(""),
});

type LearnerSpace = z.infer<typeof spaceSchema>;
type FeedPost = z.infer<typeof feedPostSchema>;
type Reaction = z.infer<typeof reactionSchema>;
type CreatedPost = Pick<FeedPost, "id" | "title" | "content"> & {
  spaceId: string;
};

function learnerFeedPath(spaceId: string | null, cursor?: string | null) {
  const params = new URLSearchParams({ limit: String(FEED_PAGE_SIZE) });
  if (cursor) params.set("cursor", cursor);
  if (spaceId) params.set("spaceId", spaceId);
  return `/api/v1/learner/feed?${params.toString()}`;
}

function parseContent(value: string): TextEditorContent | null {
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
    // Older posts may contain plain text.
  }
  return null;
}

function contentHasText(value: string) {
  const richText = parseContent(value);
  if (!richText) return value.trim().length > 0;

  let hasText = false;
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object" || hasText) return;
    const record = node as { text?: unknown; content?: unknown };
    if (typeof record.text === "string" && record.text.trim()) {
      hasText = true;
      return;
    }
    if (Array.isArray(record.content)) {
      for (const child of record.content) visit(child);
    }
  };
  visit(richText);
  return hasText;
}

function initials(name: string) {
  const value = name.trim();
  if (!value) return "L";
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatPostDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function PostAuthor({ post }: { post: FeedPost }) {
  const name = post.author?.name || post.author?.email || "Learner";
  return (
    <LearnerAvatar className="size-12">
      {post.author?.imageUrl ? (
        <LearnerAvatarImage src={post.author.imageUrl} alt={`${name}'s profile`} />
      ) : null}
      <LearnerAvatarFallback>{initials(name)}</LearnerAvatarFallback>
    </LearnerAvatar>
  );
}

function PostContent({ value, className }: { value: string; className?: string }) {
  const theme = useSchoolThemeStyle();
  const richText = parseContent(value);
  if (richText) {
    return (
      <TextRenderer
        json={richText}
        theme={theme}
        className={`text-base leading-7 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg ${className ?? ""}`}
      />
    );
  }
  return (
    <LearnerText2 className={`whitespace-pre-wrap leading-7 ${className ?? ""}`}>
      {value}
    </LearnerText2>
  );
}

function PostMedia({ post }: { post: FeedPost }) {
  if (!post.media?.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {post.media.map((media) =>
        media.type === "image" ? (
          <LearnerCardImage
            key={media.id}
            src={media.thumbnailUrl ?? media.url}
            alt={media.title}
            className="aspect-video w-full object-cover"
          />
        ) : (
          <LearnerLink
            key={media.id}
            href={media.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md border p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <FileText className="size-5 shrink-0" aria-hidden="true" />
            <LearnerText2 component="span" className="truncate">
              {media.title}
            </LearnerText2>
          </LearnerLink>
        ),
      )}
    </div>
  );
}

function reactionCount(reactions: Reaction[]) {
  return reactions.reduce((total, reaction) => total + reaction.count, 0);
}

function updateReactionItems(reactions: Reaction[], emoji: string, active: boolean) {
  const existing = reactions.find((reaction) => reaction.emoji === emoji);
  if (!existing && active) {
    return [...reactions, { emoji, count: 1, active: true }];
  }
  if (!existing) return reactions;
  const count = existing.count + (active ? 1 : -1);
  return count > 0
    ? reactions.map((reaction) =>
        reaction.emoji === emoji ? { ...reaction, count, active } : reaction,
      )
    : reactions.filter((reaction) => reaction.emoji !== emoji);
}

function ReactionsBar({
  reactions,
  commentsCount,
  onReact,
  onReply,
}: {
  reactions: Reaction[];
  commentsCount: number;
  onReact: (emoji: string) => void;
  onReply: () => void;
}) {
  return (
    <fieldset
      className="m-0 flex flex-wrap items-center gap-2 border-0 p-0"
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
            onClick={(event) => {
              event.stopPropagation();
              onReact(reaction.emoji);
            }}
          >
            <span aria-hidden="true">{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </Button>
        ))}
      <LearnerReactionPicker emojis={REACTION_EMOJIS} onReact={onReact}>
        <SmilePlus className="size-5" aria-hidden="true" />
      </LearnerReactionPicker>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          onReply();
        }}
        aria-label="Reply to post"
      >
        <Reply className="size-5" aria-hidden="true" />
        <span>{commentsCount}</span>
      </Button>
    </fieldset>
  );
}

function FeedPostCard({
  post,
  space,
  onReact,
  onOpen,
  onReply,
}: {
  post: FeedPost;
  space: LearnerSpace | undefined;
  onReact: (emoji: string) => void;
  onOpen: () => void;
  onReply: () => void;
}) {
  const postSpace = post.space ?? space;
  const authorName = post.author?.name || post.author?.email || "Learner";
  const date = formatPostDate(post.updatedAt ?? post.createdAt);
  const spaceName = postSpace?.name ?? post.category ?? "Space";

  return (
    <LearnerCard
      className="cursor-pointer transition-colors hover:bg-muted/20"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <LearnerCardContent className="grid gap-8">
        <div className="flex items-start gap-4">
          <PostAuthor post={post} />
          <div className="min-w-0 flex-1">
            <LearnerText2 className="font-medium">{authorName}</LearnerText2>
            <LearnerText2 className="text-sm text-muted-foreground">
              {date ? `${date} · ${spaceName}` : spaceName}
            </LearnerText2>
          </div>
          {post.pinned ? (
            <Pin className="size-5 shrink-0" aria-label="Pinned post" />
          ) : null}
        </div>
        <div className="grid gap-7">
          <LearnerHeader2>{post.title}</LearnerHeader2>
          <PostContent value={post.content} />
          <PostMedia post={post} />
        </div>
        <div className="border-t pt-5">
          <ReactionsBar
            reactions={post.reactions ?? []}
            commentsCount={post.commentsCount ?? 0}
            onReact={onReact}
            onReply={onReply}
          />
        </div>
      </LearnerCardContent>
    </LearnerCard>
  );
}

function FeedComposer({ onOpen }: { onOpen: () => void }) {
  return (
    <LearnerCard
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <LearnerCardContent>
        <LearnerText2 className="text-muted-foreground">Write something…</LearnerText2>
      </LearnerCardContent>
    </LearnerCard>
  );
}

function FeedAnnouncement({ banner }: { banner: string }) {
  if (!contentHasText(banner)) return null;

  return (
    <LearnerCard>
      <LearnerCardContent className="flex items-start gap-3">
        <Info className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1 text-muted-foreground">
          <PostContent
            value={banner}
            className="[&>h1:first-child]:!mt-0 [&>h2:first-child]:!mt-0 [&>h3:first-child]:!mt-0 [&>p:first-child]:!mt-0"
          />
        </div>
      </LearnerCardContent>
    </LearnerCard>
  );
}

export function LearnerFeed({ spaceId }: { spaceId?: string }) {
  const router = useRouter();
  const requestedSpaceId = spaceId ?? null;
  const currentPath = requestedSpaceId
    ? `/dashboard/s/${encodeURIComponent(requestedSpaceId)}`
    : "/dashboard";
  const { learner } = useLearnerSession(currentPath);
  const mediaAdapters = useLearnerCommunityMediaUploader();
  const [spaces, setSpaces] = useState<LearnerSpace[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [banner, setBanner] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSpaceId, setComposeSpaceId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postMedia, setPostMedia] = useState<LearnerCommunityMedia[]>([]);
  const postMediaRef = useRef<LearnerCommunityMedia[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [feedRevision, setFeedRevision] = useState(0);

  const selectedSpaceId = useMemo(() => {
    if (!requestedSpaceId) return null;
    return spaces.some((space) => space.id === requestedSpaceId)
      ? requestedSpaceId
      : null;
  }, [requestedSpaceId, spaces]);

  const postableSpaces = useMemo(
    () => spaces.filter((space) => space.canPost ?? space.whoCanPost === "members"),
    [spaces],
  );

  useEffect(() => {
    void feedRevision;
    let active = true;
    setLoading(true);
    setError(null);
    setBanner("");
    void requestJson<{ items: unknown[] }>("/api/v1/learner/spaces")
      .then((body) => {
        const parsed = z.array(spaceSchema).safeParse(body.items);
        if (!parsed.success) throw new Error("Unable to load your spaces.");
        if (!active) return;
        setSpaces(parsed.data);
        const validSpaceId = parsed.data.some((space) => space.id === requestedSpaceId)
          ? requestedSpaceId
          : null;
        if (requestedSpaceId && !validSpaceId) router.replace("/dashboard");
        return requestJson<unknown>(learnerFeedPath(validSpaceId));
      })
      .then((body) => {
        if (!active || !body) return;
        const parsed = feedResponseSchema.safeParse(body);
        if (!parsed.success) throw new Error("Unable to load your feed.");
        setPosts(parsed.data.items);
        setBanner(parsed.data.banner);
        setNextCursor(parsed.data.nextCursor);
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "Unable to load your feed.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [feedRevision, requestedSpaceId, router]);

  useEffect(() => {
    if (!composeOpen && postableSpaces.length > 0) {
      setComposeSpaceId((current) => {
        if (current && postableSpaces.some((space) => space.id === current)) {
          return current;
        }
        if (
          selectedSpaceId &&
          postableSpaces.some((space) => space.id === selectedSpaceId)
        ) {
          return selectedSpaceId;
        }
        return postableSpaces[0]!.id;
      });
    }
  }, [composeOpen, postableSpaces, selectedSpaceId]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const body = await requestJson<unknown>(
        learnerFeedPath(selectedSpaceId, nextCursor),
      );
      const parsed = feedResponseSchema.safeParse(body);
      if (!parsed.success) throw new Error("Unable to load more posts.");
      setPosts((current) => [...current, ...parsed.data.items]);
      setBanner(parsed.data.banner);
      setNextCursor(parsed.data.nextCursor);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load more posts.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggleReaction(post: FeedPost, emoji: string) {
    if (!post.communityId) return;
    try {
      const body = await requestJson<{ active: boolean }>(
        `/api/v1/learner/communities/${encodeURIComponent(post.communityId)}/reactions`,
        {
          method: "POST",
          body: JSON.stringify({ entityType: "post", entityId: post.id, emoji }),
        },
      );
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                reactions: updateReactionItems(
                  item.reactions ?? [],
                  emoji,
                  body.active,
                ),
              }
            : item,
        ),
      );
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Unable to react to this post.",
      );
    }
  }

  async function publishPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!composeSpaceId || !title.trim() || !contentHasText(content) || publishing)
      return;
    setPublishing(true);
    try {
      const created = await requestJson<CreatedPost>(
        `/api/v1/learner/spaces/${encodeURIComponent(composeSpaceId)}/posts`,
        {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            mediaIds: postMediaRef.current.map((media) => media.id),
          }),
        },
      );
      if (selectedSpaceId === null || selectedSpaceId === created.spaceId) {
        setFeedRevision((current) => current + 1);
      }
      setTitle("");
      setContent("");
      postMediaRef.current = [];
      setPostMedia([]);
      setComposeOpen(false);
      toast.success("Post published.");
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Unable to publish the post.",
      );
    } finally {
      setPublishing(false);
    }
  }

  function selectPostMedia(selected: SelectedMedia<LearnerCommunityMedia>) {
    if (!selected.media) {
      toast.error("Select a media item or upload the file first.");
      return;
    }
    const next = [
      ...postMediaRef.current.filter((media) => media.id !== selected.media?.id),
      selected.media,
    ];
    if (next.length > 10) {
      toast.error("A post can contain up to 10 attachments.");
      return;
    }
    postMediaRef.current = next;
    setPostMedia(next);
  }

  function removePostMedia(id: string) {
    const next = postMediaRef.current.filter((media) => media.id !== id);
    postMediaRef.current = next;
    setPostMedia(next);
  }

  const spaceById = new Map(spaces.map((space) => [space.id, space]));
  const selectedSpace = selectedSpaceId ? spaceById.get(selectedSpaceId) : undefined;

  function openPost(post: FeedPost, reply = false) {
    const targetSpaceId = post.spaceId ?? post.space?.id;
    if (!targetSpaceId) return;
    const suffix = reply ? "?reply=1" : "";
    router.push(
      `/dashboard/s/${encodeURIComponent(targetSpaceId)}/${encodeURIComponent(post.id)}${suffix}`,
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-7">
      {postableSpaces.length > 0 ? (
        <FeedComposer onOpen={() => setComposeOpen(true)} />
      ) : null}
      <FeedAnnouncement banner={banner} />

      {error ? (
        <LearnerText2 className="text-destructive" role="alert">
          {error}
        </LearnerText2>
      ) : null}

      {loading ? (
        <div className="grid gap-6" role="status" aria-label="Loading feed">
          {[1, 2, 3].map((item) => (
            <LearnerCard key={item}>
              <LearnerCardContent className="h-72 animate-pulse">
                <span aria-hidden="true" />
              </LearnerCardContent>
            </LearnerCard>
          ))}
        </div>
      ) : (
        <section className="grid gap-6" aria-label="Feed">
          {posts.length === 0 ? (
            <LearnerCard>
              <LearnerCardContent className="grid justify-items-start gap-4">
                <MessagesSquare
                  className="size-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <LearnerHeader2>
                  {selectedSpace ? "No posts in this space yet" : "No posts yet"}
                </LearnerHeader2>
                <LearnerText2 className="text-muted-foreground">
                  {selectedSpace
                    ? "Be the first member to start a conversation."
                    : spaces.length
                      ? "Posts from your accessible spaces will appear here."
                      : "You do not have access to any spaces yet."}
                </LearnerText2>
                {!spaces.length ? (
                  <LearnerLink href="/join">Browse spaces</LearnerLink>
                ) : null}
              </LearnerCardContent>
            </LearnerCard>
          ) : (
            posts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                space={spaceById.get(post.spaceId ?? post.space?.id ?? "")}
                onReact={(emoji) => void toggleReaction(post, emoji)}
                onOpen={() => openPost(post)}
                onReply={() => openPost(post, true)}
              />
            ))
          )}
          {nextCursor ? (
            <Button
              type="button"
              variant="outline"
              className="justify-self-center"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? "Loading posts…" : "Load more posts"}
            </Button>
          ) : null}
        </section>
      )}

      <LearnerPostComposerDialog
        open={composeOpen}
        onOpenChange={(open) => {
          setComposeOpen(open);
          if (!open) {
            setTitle("");
            setContent("");
            postMediaRef.current = [];
            setPostMedia([]);
          }
        }}
        learnerName={learner?.name || learner?.email || "Learner"}
        destinations={postableSpaces}
        destinationId={composeSpaceId}
        destinationLabel="Select a space"
        onDestinationChange={setComposeSpaceId}
        title={title}
        onTitleChange={setTitle}
        content={content}
        onContentChange={setContent}
        media={postMedia}
        mediaAdapters={mediaAdapters}
        onMediaSelected={selectPostMedia}
        onMediaRemove={removePostMedia}
        canSubmit={Boolean(composeSpaceId && title.trim() && contentHasText(content))}
        submitting={publishing}
        onSubmit={publishPost}
      />
    </div>
  );
}
