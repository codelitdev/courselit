"use client";

import { Button } from "@codelitdev/design-system";
import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import { MessageSquare, ThumbsUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { learnerHeaders } from "../lib/school";
import { LearnerDiscussionEditor } from "./learner-discussion-editor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/codelit/dialog";

type Content = TextEditorContent;
type Comment = {
  id: string;
  authorId: string | null;
  authorKind: "learner" | "admin" | null;
  content: Content;
  likesCount: number;
  hasLiked: boolean;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  deleted: boolean;
  replyNextCursor?: string | null;
  hasMoreReplies?: boolean;
  replies?: Reply[];
};
type Reply = {
  id: string;
  parentReplyId: string | null;
  authorId: string | null;
  authorKind: "learner" | "admin" | null;
  content: Content;
  likesCount: number;
  hasLiked: boolean;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  deleted: boolean;
};

const emptyDocument: Content = { type: "doc", content: [] };

function hasContent(value: Content): boolean {
  let result = false;
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object" || result) return;
    const record = node as { text?: unknown; content?: unknown };
    if (typeof record.text === "string" && record.text.trim()) {
      result = true;
      return;
    }
    if (Array.isArray(record.content)) {
      for (const child of record.content) visit(child);
    }
  };
  visit(value);
  return result;
}

function displayName(id: string | null, kind: Comment["authorKind"]): string {
  if (kind === "admin") return "Course admin";
  if (id) return "Learner";
  return "Former member";
}

export function CourseDiscussions({
  productId,
  lessonId,
  enabled,
  viewerId,
  previewToken = null,
}: {
  productId: string;
  lessonId: string;
  enabled: boolean;
  viewerId: string;
  previewToken?: string | null;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [commentDraft, setCommentDraft] = useState<Content>(emptyDocument);
  const commentDraftRef = useRef<Content>(emptyDocument);
  const [commentRefresh, setCommentRefresh] = useState(0);
  const [replyDraft, setReplyDraft] = useState<Content>(emptyDocument);
  const replyDraftRef = useRef<Content>(emptyDocument);
  const [replyRefresh, setReplyRefresh] = useState(0);
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    parentReplyId?: string;
  } | null>(null);
  const [summary, setSummary] = useState<{ totalCount: number } | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [replyCursors, setReplyCursors] = useState<Record<string, string | null>>({});
  const [replyHasMore, setReplyHasMore] = useState<Record<string, boolean>>({});
  const [subscribed, setSubscribed] = useState(false);
  const [editing, setEditing] = useState<{
    type: "comment" | "reply";
    id: string;
    value: Content;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    contentType: "comment" | "reply";
    contentId: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const reportReasonRef = useRef("");
  const [deleteTarget, setDeleteTarget] = useState<{
    contentType: "comment" | "reply";
    contentId: string;
  } | null>(null);
  const discussionRoot = previewToken
    ? `/api/v1/preview/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lessonId)}/discussions`
    : `/api/v1/learner/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lessonId)}/discussions`;
  const discussionHeaders = useMemo(
    () =>
      previewToken
        ? learnerHeaders({ "x-preview-token": previewToken })
        : learnerHeaders(),
    [previewToken],
  );

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setComments([]);
    setReplies({});
    setNextCursor(null);
    setHasMore(false);
    setReplyCursors({});
    setReplyHasMore({});
    setSubscribed(false);
    setEditing(null);
    commentDraftRef.current = emptyDocument;
    setCommentDraft(emptyDocument);
    setCommentRefresh((value) => value + 1);
    replyDraftRef.current = emptyDocument;
    setReplyDraft(emptyDocument);
    setReplyRefresh((value) => value + 1);
    setSummary(null);
    setError(null);
    void fetch(discussionRoot, {
      credentials: "include",
      cache: "no-store",
      headers: discussionHeaders,
    })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          if (
            response.status !== 401 &&
            response.status !== 403 &&
            response.status !== 404
          ) {
            setError("Unable to load discussions.");
          }
          return;
        }
        const body = (await response.json()) as {
          items?: Comment[];
          nextCursor?: string | null;
          hasMore?: boolean;
          summary?: { totalCount: number };
        };
        const items = body.items ?? [];
        setComments(items);
        setReplies(
          Object.fromEntries(
            items
              .filter((item) => item.replies?.length)
              .map((item) => [item.id, item.replies ?? []]),
          ),
        );
        setReplyCursors(
          Object.fromEntries(
            items.map((item) => [item.id, item.replyNextCursor ?? null]),
          ),
        );
        setReplyHasMore(
          Object.fromEntries(
            items.map((item) => [item.id, Boolean(item.hasMoreReplies)]),
          ),
        );
        setNextCursor(body.nextCursor ?? null);
        setHasMore(Boolean(body.hasMore));
        setSummary(body.summary ?? null);
      })
      .catch(() => {
        if (active) setError("Unable to load discussions.");
      });
    return () => {
      active = false;
    };
  }, [discussionHeaders, discussionRoot, enabled]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    if (!targetId.startsWith("discussion-")) return;

    const targetComment = comments.find((comment) =>
      (replies[comment.id] ?? comment.replies ?? []).some(
        (reply) => `discussion-reply-${reply.id}` === targetId,
      ),
    );
    if (targetComment && !expanded.has(targetComment.id)) {
      setExpanded((current) => new Set(current).add(targetComment.id));
    }

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [comments, enabled, expanded, replies]);

  async function loadMoreComments() {
    if (!nextCursor) return;
    const query = new URLSearchParams({ cursor: nextCursor });
    const response = await fetch(`${discussionRoot}?${query}`, {
      credentials: "include",
      cache: "no-store",
      headers: discussionHeaders,
    });
    if (!response.ok) return;
    const body = (await response.json()) as {
      items?: Comment[];
      nextCursor?: string | null;
      hasMore?: boolean;
    };
    const items = body.items ?? [];
    setComments((current) => [...current, ...items]);
    setReplies((current) => ({
      ...current,
      ...Object.fromEntries(
        items
          .filter((item) => item.replies?.length)
          .map((item) => [item.id, item.replies ?? []]),
      ),
    }));
    setReplyCursors((current) => ({
      ...current,
      ...Object.fromEntries(
        items.map((item) => [item.id, item.replyNextCursor ?? null]),
      ),
    }));
    setReplyHasMore((current) => ({
      ...current,
      ...Object.fromEntries(
        items.map((item) => [item.id, Boolean(item.hasMoreReplies)]),
      ),
    }));
    setNextCursor(body.nextCursor ?? null);
    setHasMore(Boolean(body.hasMore));
  }

  async function loadReplies(commentId: string, cursor?: string | null) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const response = await fetch(
      `${discussionRoot}/comments/${encodeURIComponent(commentId)}/replies${query}`,
      {
        credentials: "include",
        cache: "no-store",
        headers: discussionHeaders,
      },
    );
    if (!response.ok) return;
    const body = (await response.json()) as {
      items?: Reply[];
      nextCursor?: string | null;
      hasMore?: boolean;
    };
    setReplies((current) => ({
      ...current,
      [commentId]: cursor
        ? [...(current[commentId] ?? []), ...(body.items ?? [])]
        : (body.items ?? []),
    }));
    setReplyCursors((current) => ({
      ...current,
      [commentId]: body.nextCursor ?? null,
    }));
    setReplyHasMore((current) => ({ ...current, [commentId]: Boolean(body.hasMore) }));
  }

  async function toggleReplies(commentId: string) {
    const next = new Set(expanded);
    if (next.has(commentId)) next.delete(commentId);
    else {
      next.add(commentId);
      if (!replies[commentId]) await loadReplies(commentId);
    }
    setExpanded(next);
  }

  function updateCommentDraft(content: Content) {
    commentDraftRef.current = content;
    setCommentDraft(content);
  }

  function updateReplyDraft(content: Content) {
    replyDraftRef.current = content;
    setReplyDraft(content);
  }

  function clearReplyDraft() {
    updateReplyDraft(emptyDocument);
    setReplyRefresh((value) => value + 1);
  }

  async function postComment() {
    if (!hasContent(commentDraftRef.current)) return;
    setNotice(null);
    const response = await fetch(
      `/api/v1/learner/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lessonId)}/discussions`,
      {
        method: "POST",
        credentials: "include",
        headers: learnerHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ content: commentDraftRef.current }),
      },
    );
    if (!response.ok) {
      setError(
        response.status === 429
          ? "You have reached the discussion posting limit. Try again later."
          : "Unable to post your comment.",
      );
      return;
    }
    const comment = (await response.json()) as Comment;
    setComments((current) => [comment, ...current]);
    setSummary((current) => ({ totalCount: (current?.totalCount ?? 0) + 1 }));
    updateCommentDraft(emptyDocument);
    setCommentRefresh((value) => value + 1);
    setNotice("Comment posted.");
  }

  async function postReply() {
    if (!replyingTo || !hasContent(replyDraftRef.current)) return;
    const response = await fetch(
      `/api/v1/learner/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lessonId)}/discussions/comments/${encodeURIComponent(replyingTo.commentId)}/replies`,
      {
        method: "POST",
        credentials: "include",
        headers: learnerHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({
          content: replyDraftRef.current,
          parentReplyId: replyingTo.parentReplyId,
        }),
      },
    );
    if (!response.ok) {
      setError(
        response.status === 429
          ? "You have reached the discussion posting limit. Try again later."
          : "Unable to post your reply.",
      );
      return;
    }
    const reply = (await response.json()) as Reply;
    setReplies((current) => ({
      ...current,
      [replyingTo.commentId]: [...(current[replyingTo.commentId] ?? []), reply],
    }));
    setComments((current) =>
      current.map((comment) =>
        comment.id === replyingTo.commentId
          ? { ...comment, replyCount: comment.replyCount + 1 }
          : comment,
      ),
    );
    setSummary((current) => ({ totalCount: (current?.totalCount ?? 0) + 1 }));
    clearReplyDraft();
    setReplyingTo(null);
    setNotice("Reply posted.");
  }

  async function updateComment(commentId: string) {
    const currentEditing = editing;
    if (currentEditing?.type !== "comment" || currentEditing.id !== commentId) return;
    if (!hasContent(currentEditing.value)) return;
    const response = await fetch(
      `/api/v1/learner/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lessonId)}/discussions/comments/${encodeURIComponent(commentId)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: learnerHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ content: currentEditing.value }),
      },
    );
    if (!response.ok) {
      setError("Unable to update your comment.");
      return;
    }
    const updated = (await response.json()) as Comment;
    setComments((current) =>
      current.map((comment) => (comment.id === commentId ? updated : comment)),
    );
    setEditing(null);
    setNotice("Comment updated.");
  }

  async function updateReply(replyId: string) {
    const currentEditing = editing;
    if (currentEditing?.type !== "reply" || currentEditing.id !== replyId) return;
    if (!hasContent(currentEditing.value)) return;
    const response = await fetch(
      `/api/v1/learner/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lessonId)}/discussions/replies/${encodeURIComponent(replyId)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: learnerHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ content: currentEditing.value }),
      },
    );
    if (!response.ok) {
      setError("Unable to update your reply.");
      return;
    }
    const updated = (await response.json()) as Reply;
    setReplies((current) =>
      Object.fromEntries(
        Object.entries(current).map(([key, items]) => [
          key,
          items.map((reply) => (reply.id === replyId ? updated : reply)),
        ]),
      ),
    );
    setEditing(null);
    setNotice("Reply updated.");
  }

  async function deleteComment(commentId: string) {
    const response = await fetch(
      `/api/v1/learner/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lessonId)}/discussions/comments/${encodeURIComponent(commentId)}`,
      { method: "DELETE", credentials: "include", headers: learnerHeaders() },
    );
    if (!response.ok) {
      setError("Unable to delete your comment.");
      return;
    }
    setComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              content: { type: "doc", content: [] },
              deleted: true,
              likesCount: 0,
            }
          : comment,
      ),
    );
    setSummary((current) =>
      current ? { totalCount: Math.max(0, current.totalCount - 1) } : current,
    );
    setNotice("Comment deleted.");
  }

  async function deleteReply(replyId: string) {
    const response = await fetch(
      `/api/v1/learner/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lessonId)}/discussions/replies/${encodeURIComponent(replyId)}`,
      { method: "DELETE", credentials: "include", headers: learnerHeaders() },
    );
    if (!response.ok) {
      setError("Unable to delete your reply.");
      return;
    }
    setReplies((current) =>
      Object.fromEntries(
        Object.entries(current).map(([key, items]) => [
          key,
          items.map((reply) =>
            reply.id === replyId
              ? {
                  ...reply,
                  content: { type: "doc", content: [] },
                  deleted: true,
                  likesCount: 0,
                }
              : reply,
          ),
        ]),
      ),
    );
    setSummary((current) =>
      current ? { totalCount: Math.max(0, current.totalCount - 1) } : current,
    );
    setNotice("Reply deleted.");
  }

  async function toggleSubscription() {
    const response = await fetch(
      `/api/v1/learner/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lessonId)}/discussions/subscription`,
      {
        method: "POST",
        credentials: "include",
        headers: learnerHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ subscription: !subscribed }),
      },
    );
    if (!response.ok) {
      setError("Unable to update discussion notifications.");
      return;
    }
    const result = (await response.json()) as { active: boolean };
    setSubscribed(result.active);
  }

  async function like(contentType: "comment" | "reply", contentId: string) {
    const response = await fetch(
      `/api/v1/learner/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lessonId)}/discussions/likes`,
      {
        method: "POST",
        credentials: "include",
        headers: learnerHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ contentType, contentId }),
      },
    );
    if (!response.ok) return;
    const result = (await response.json()) as { active: boolean; likesCount: number };
    if (contentType === "comment") {
      setComments((current) =>
        current.map((comment) =>
          comment.id === contentId
            ? { ...comment, hasLiked: result.active, likesCount: result.likesCount }
            : comment,
        ),
      );
    } else {
      setReplies((current) =>
        Object.fromEntries(
          Object.entries(current).map(([key, items]) => [
            key,
            items.map((reply) =>
              reply.id === contentId
                ? { ...reply, hasLiked: result.active, likesCount: result.likesCount }
                : reply,
            ),
          ]),
        ),
      );
    }
  }

  async function report(contentType: "comment" | "reply", contentId: string) {
    const reason = reportReasonRef.current.trim();
    if (!reason) {
      setError("Please provide a reason for the report.");
      return;
    }
    const response = await fetch(
      `/api/v1/learner/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lessonId)}/discussions/reports`,
      {
        method: "POST",
        credentials: "include",
        headers: learnerHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ contentType, contentId, reason: reason.trim() }),
      },
    );
    setNotice(
      response.status === 409
        ? "You already reported this content."
        : response.ok
          ? "Report submitted."
          : "Unable to submit the report.",
    );
    setReportTarget(null);
    setReportReason("");
    reportReasonRef.current = "";
  }

  function requestReport(contentType: "comment" | "reply", contentId: string) {
    setError(null);
    setReportReason("");
    reportReasonRef.current = "";
    setReportTarget({ contentType, contentId });
  }

  function requestDelete(contentType: "comment" | "reply", contentId: string) {
    setDeleteTarget({ contentType, contentId });
  }

  async function confirmDelete() {
    const target = deleteTarget;
    if (!target) return;
    setDeleteTarget(null);
    if (target.contentType === "comment") {
      await deleteComment(target.contentId);
    } else {
      await deleteReply(target.contentId);
    }
  }

  if (!enabled) return null;
  return (
    <section className="mt-5 border-t pt-5" aria-label="Lesson discussions">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <MessageSquare className="size-4" /> Discussions
          </h3>
          <p className="text-sm text-muted-foreground">
            Ask questions and learn with other learners.
          </p>
        </div>
        {!previewToken ? (
          <div className="flex items-center gap-3">
            {summary ? (
              <span className="text-sm text-muted-foreground">
                {summary.totalCount} {summary.totalCount === 1 ? "post" : "posts"}
              </span>
            ) : null}
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => void toggleSubscription()}
            >
              {subscribed ? "Unsubscribe" : "Subscribe"}
            </button>
          </div>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-3 text-sm text-primary">
          {notice}
        </p>
      ) : null}
      {!previewToken ? (
        <div className="mt-4 stack">
          <LearnerDiscussionEditor
            initialContent={commentDraft}
            refresh={commentRefresh}
            placeholder="Share a question or insight…"
            onChange={updateCommentDraft}
          />
          <div>
            <Button
              type="button"
              onClick={() => void postComment()}
              disabled={!hasContent(commentDraft)}
            >
              Post comment
            </Button>
          </div>
        </div>
      ) : null}
      <div className="mt-5 stack">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : null}
        {comments.map((comment) => (
          <article
            key={comment.id}
            id={`discussion-comment-${comment.id}`}
            className="rounded-lg border p-4 stack"
          >
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {displayName(comment.authorId, comment.authorKind)} ·{" "}
                {new Date(comment.createdAt).toLocaleString()}
                {comment.isEdited ? " · edited" : ""}
              </span>
              {!previewToken && !comment.deleted && comment.authorId !== viewerId ? (
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => requestReport("comment", comment.id)}
                >
                  Report
                </button>
              ) : null}
            </div>
            {editing?.type === "comment" && editing.id === comment.id ? (
              <div className="stack">
                <LearnerDiscussionEditor
                  initialContent={editing.value}
                  onChange={(value) =>
                    setEditing((current) => (current ? { ...current, value } : current))
                  }
                />
                <div className="flex gap-2">
                  <Button type="button" onClick={() => void updateComment(comment.id)}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : comment.deleted ? (
              <p className="text-sm italic text-muted-foreground">
                This comment was removed.
              </p>
            ) : (
              <TextRenderer json={comment.content} className="text-sm" />
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {!previewToken && !comment.deleted ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:underline"
                  onClick={() => void like("comment", comment.id)}
                >
                  <ThumbsUp className="size-3.5" /> {comment.likesCount}
                </button>
              ) : null}
              <button
                type="button"
                className="hover:underline"
                onClick={() => void toggleReplies(comment.id)}
              >
                {expanded.has(comment.id)
                  ? "Hide replies"
                  : `View replies (${comment.replyCount})`}
              </button>
              {!comment.deleted ? (
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => {
                    setReplyingTo({ commentId: comment.id });
                    clearReplyDraft();
                    setExpanded((current) => new Set(current).add(comment.id));
                    void loadReplies(comment.id);
                  }}
                >
                  Reply
                </button>
              ) : null}
              {!previewToken && !comment.deleted && comment.authorId === viewerId ? (
                <>
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() =>
                      setEditing({
                        type: "comment",
                        id: comment.id,
                        value: comment.content,
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => requestDelete("comment", comment.id)}
                  >
                    Delete
                  </button>
                </>
              ) : null}
            </div>
            {expanded.has(comment.id) ? (
              <div className="ml-4 border-l pl-4 stack">
                {(replies[comment.id] ?? []).map((reply) => (
                  <div
                    key={reply.id}
                    id={`discussion-reply-${reply.id}`}
                    className="stack"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {displayName(reply.authorId, reply.authorKind)} ·{" "}
                        {new Date(reply.createdAt).toLocaleString()}
                        {reply.isEdited ? " · edited" : ""}
                      </span>
                      {!previewToken &&
                      !reply.deleted &&
                      reply.authorId !== viewerId ? (
                        <button
                          type="button"
                          className="hover:underline"
                          onClick={() => requestReport("reply", reply.id)}
                        >
                          Report
                        </button>
                      ) : null}
                    </div>
                    {editing?.type === "reply" && editing.id === reply.id ? (
                      <div className="stack">
                        <LearnerDiscussionEditor
                          initialContent={editing.value}
                          onChange={(value) =>
                            setEditing((current) =>
                              current ? { ...current, value } : current,
                            )
                          }
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={() => void updateReply(reply.id)}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : reply.deleted ? (
                      <p className="text-sm italic text-muted-foreground">
                        This reply was removed.
                      </p>
                    ) : (
                      <TextRenderer json={reply.content} className="text-sm" />
                    )}
                    {!previewToken && !reply.deleted ? (
                      <div className="flex gap-3 text-sm">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:underline"
                          onClick={() => void like("reply", reply.id)}
                        >
                          <ThumbsUp className="size-3.5" /> {reply.likesCount}
                        </button>
                        <button
                          type="button"
                          className="hover:underline"
                          onClick={() => {
                            setReplyingTo({
                              commentId: comment.id,
                              parentReplyId: reply.id,
                            });
                            clearReplyDraft();
                          }}
                        >
                          Reply
                        </button>
                        {reply.authorId === viewerId ? (
                          <>
                            <button
                              type="button"
                              className="hover:underline"
                              onClick={() =>
                                setEditing({
                                  type: "reply",
                                  id: reply.id,
                                  value: reply.content,
                                })
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="hover:underline"
                              onClick={() => requestDelete("reply", reply.id)}
                            >
                              Delete
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
                {replyHasMore[comment.id] && replyCursors[comment.id] ? (
                  <button
                    type="button"
                    className="self-start text-sm text-primary hover:underline"
                    onClick={() =>
                      void loadReplies(comment.id, replyCursors[comment.id])
                    }
                  >
                    View more replies
                  </button>
                ) : null}
                {replyingTo?.commentId === comment.id ? (
                  <div className="stack">
                    <LearnerDiscussionEditor
                      initialContent={replyDraft}
                      refresh={replyRefresh}
                      placeholder="Write a reply…"
                      onChange={updateReplyDraft}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => void postReply()}
                        disabled={!hasContent(replyDraft)}
                      >
                        Post reply
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setReplyingTo(null);
                          clearReplyDraft();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
        {hasMore && nextCursor ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadMoreComments()}
          >
            Load more comments
          </Button>
        ) : null}
      </div>
      <Dialog
        open={reportTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReportTarget(null);
            setReportReason("");
            reportReasonRef.current = "";
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {reportTarget?.contentType}</DialogTitle>
            <DialogDescription>
              Tell the course admin why this content should be reviewed.
            </DialogDescription>
          </DialogHeader>
          <label className="stack text-sm font-medium">
            Reason
            <textarea
              className="min-h-24 w-full rounded-md border bg-background p-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={reportReason}
              maxLength={2000}
              onChange={(event) => {
                reportReasonRef.current = event.target.value;
                setReportReason(event.target.value);
              }}
              placeholder="Describe the issue"
              autoFocus
            />
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReportTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!reportReason.trim()}
              onClick={() => {
                if (reportTarget) {
                  void report(reportTarget.contentType, reportTarget.contentId);
                }
              }}
            >
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete this {deleteTarget?.contentType ?? "content"}?
            </DialogTitle>
            <DialogDescription>
              This will remove the content from the discussion.
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
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
