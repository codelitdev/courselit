"use client";

import type {
  communityReactionSchema,
  learnerFeedPostSchema,
} from "@courselit/api-contract";
import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import { MessageCircle, Plus, Reply, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { requestJson } from "@/components/communities/learner-community";
import { Button } from "@/components/ui/codelit/button";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

type FeedPost = z.infer<typeof learnerFeedPostSchema>;
type CommunityReaction = z.infer<typeof communityReactionSchema>;
type FeedCommunity = { id: string; name: string };

const FEED_PAGE_SIZE = 20;
const REACTION_EMOJIS = ["👍", "❤️", "😄", "🎉", "😢", "😮"] as const;

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

function PostContent({ value }: { value: string }) {
  const theme = useSchoolThemeStyle();
  const richText = parseContent(value);
  if (richText) {
    return <TextRenderer json={richText} theme={theme} className="text-sm leading-6" />;
  }
  return <p className="whitespace-pre-wrap text-sm leading-6">{value}</p>;
}

function formatPostDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function PostMedia({ post }: { post: FeedPost }) {
  if (!post.media.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {post.media.map((media) => {
        if (media.type === "image") {
          return (
            <img
              key={media.id}
              src={media.thumbnailUrl ?? media.url}
              alt={media.title}
              className="max-h-80 w-full rounded-md border object-cover"
            />
          );
        }
        if (media.type === "video") {
          return (
            <video
              key={media.id}
              src={media.url}
              poster={media.thumbnailUrl ?? undefined}
              controls
              className="max-h-80 w-full rounded-md border object-cover"
            />
          );
        }
        return (
          <a
            key={media.id}
            href={media.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border p-4 text-sm font-medium text-primary hover:bg-muted"
          >
            {media.fileName}
          </a>
        );
      })}
    </div>
  );
}

function ReactionBar({
  reactions,
  onReact,
}: {
  reactions: CommunityReaction[];
  onReact: (emoji: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {reactions.map((reaction) => (
        <Button
          key={reaction.emoji}
          type="button"
          size="sm"
          variant={reaction.active ? "soft" : "outline"}
          className="h-8 rounded-full px-2.5"
          onClick={() => onReact(reaction.emoji)}
        >
          {reaction.emoji} {reaction.count}
        </Button>
      ))}
      <details className="relative">
        <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
          <Plus className="size-4" aria-hidden="true" />
          <span className="sr-only">Add reaction</span>
        </summary>
        <div className="absolute bottom-10 left-0 z-10 flex gap-1 rounded-md border bg-popover p-2 shadow-md">
          {REACTION_EMOJIS.map((emoji) => (
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
    </div>
  );
}

function FeedPostCard({
  post,
  onReact,
}: {
  post: FeedPost;
  onReact: (emoji: string) => void;
}) {
  const authorName = post.author?.name || "Community member";
  return (
    <article className="overflow-hidden rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        {post.author?.imageUrl ? (
          <img
            src={post.author.imageUrl}
            alt=""
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {authorName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium">{authorName}</p>
          <p className="text-xs text-muted-foreground">
            {formatPostDate(post.updatedAt)} · {post.category} ·{" "}
            <Link
              href={`/dashboard/community/${encodeURIComponent(post.community.id)}`}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {post.community.name}
            </Link>
          </p>
        </div>
      </div>
      <div className="mt-7 space-y-4">
        <Link
          href={`/dashboard/community/${encodeURIComponent(post.community.id)}/${encodeURIComponent(post.id)}`}
          className="group block space-y-3"
        >
          <h2 className="text-lg font-semibold group-hover:text-primary">
            {post.title}
          </h2>
          <PostContent value={post.content} />
        </Link>
        <PostMedia post={post} />
      </div>
      <div className="mt-7 flex flex-wrap items-center gap-2 border-t pt-4">
        <ReactionBar reactions={post.reactions} onReact={onReact} />
        <Link
          href={`/dashboard/community/${encodeURIComponent(post.community.id)}/${encodeURIComponent(post.id)}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Reply className="size-4" aria-hidden="true" />
          <span className="tabular-nums">{post.commentsCount}</span>
          <span className="sr-only">
            {post.commentsCount === 1 ? "reply" : "replies"}
          </span>
        </Link>
      </div>
    </article>
  );
}

export function LearnerFeed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [communities, setCommunities] = useState<FeedCommunity[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([
      requestJson<{ items: FeedPost[]; nextCursor: string | null }>(
        `/api/v1/learner/feed?limit=${FEED_PAGE_SIZE}`,
      ),
      requestJson<{ items: FeedCommunity[] }>("/api/v1/learner/communities?limit=50"),
    ])
      .then(([feedBody, communityBody]) => {
        if (!active) return;
        setPosts(feedBody.items);
        setNextCursor(feedBody.nextCursor);
        setCommunities(communityBody.items);
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
  }, []);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const body = await requestJson<{
        items: FeedPost[];
        nextCursor: string | null;
      }>(
        `/api/v1/learner/feed?limit=${FEED_PAGE_SIZE}&cursor=${encodeURIComponent(nextCursor)}`,
      );
      setPosts((current) => [...current, ...body.items]);
      setNextCursor(body.nextCursor);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load more posts.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggleReaction(post: FeedPost, emoji: string) {
    try {
      const body = await requestJson<{ active: boolean }>(
        `/api/v1/learner/communities/${encodeURIComponent(post.community.id)}/reactions`,
        {
          method: "POST",
          body: JSON.stringify({ entityType: "post", entityId: post.id, emoji }),
        },
      );
      setPosts((current) =>
        current.map((item) => {
          if (item.id !== post.id) return item;
          const existing = item.reactions.find((reaction) => reaction.emoji === emoji);
          if (!existing && body.active) {
            return {
              ...item,
              reactions: [...item.reactions, { emoji, count: 1, active: true }],
            };
          }
          if (!existing) return item;
          const count = existing.count + (body.active ? 1 : -1);
          return {
            ...item,
            reactions:
              count > 0
                ? item.reactions.map((reaction) =>
                    reaction.emoji === emoji
                      ? { ...reaction, count, active: body.active }
                      : reaction,
                  )
                : item.reactions.filter((reaction) => reaction.emoji !== emoji),
          };
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to react to this post.",
      );
    }
  }

  return (
    <div className="page-shell">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-4" aria-label="Loading feed">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-72 animate-pulse rounded-xl border bg-card"
              />
            ))}
          </div>
          <div className="h-56 animate-pulse rounded-xl border bg-card" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="stack" aria-label="Community feed">
            {posts.length === 0 ? (
              <div className="card stack items-start">
                <MessageCircle className="size-8 text-muted-foreground" />
                <h2>No posts yet</h2>
                <p className="muted">
                  Posts from communities you join will appear here.
                </p>
                <Link
                  href="/communities"
                  className="font-medium text-primary hover:underline"
                >
                  Browse communities
                </Link>
              </div>
            ) : (
              posts.map((post) => (
                <FeedPostCard
                  key={`${post.community.id}:${post.id}`}
                  post={post}
                  onReact={(emoji) => void toggleReaction(post, emoji)}
                />
              ))
            )}
            {nextCursor ? (
              <Button
                type="button"
                variant="outline"
                className="self-center"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? "Loading posts…" : "Load more posts"}
              </Button>
            ) : null}
          </section>
          <aside className="card h-fit stack" aria-label="Your communities">
            <h2 className="text-xl font-semibold">Your communities</h2>
            {communities.length ? (
              <ul className="stack gap-2">
                {communities.map((community) => (
                  <li key={community.id}>
                    <Link
                      href={`/dashboard/community/${encodeURIComponent(community.id)}`}
                      className="block truncate text-sm hover:text-primary"
                    >
                      {community.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="stack items-start text-sm text-muted-foreground">
                <Users className="size-7" />
                <p>You have not joined any communities yet.</p>
                <Link
                  href="/communities"
                  className="font-medium text-primary hover:underline"
                >
                  Browse communities
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
