"use client";

import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import { MessageSquare, ThumbsUp, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { learnerHeaders } from "../lib/school";
import { useSchoolThemeStyle } from "../lib/school-theme-context";
import { LearnerDiscussionEditor } from "./learner-discussion-editor";
import {
  LearnerButton as Button,
  LearnerDialog as Dialog,
  LearnerDialogContent as DialogContent,
  LearnerDialogDescription as DialogDescription,
  LearnerDialogFooter as DialogFooter,
  LearnerDialogHeader as DialogHeader,
  LearnerDialogTitle as DialogTitle,
  LearnerLabel,
  LearnerText2,
  LearnerTextarea,
} from "./themed-page-builder";

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
  className = "",
  onClose,
}: {
  productId: string;
  lessonId: string;
  enabled: boolean;
  viewerId: string;
  previewToken?: string | null;
  className?: string;
  onClose?: () => void;
}) {
  const theme = useSchoolThemeStyle();
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
    <section
      className={`${onClose ? "mt-0 border-0 pt-0" : "mt-5 border-t pt-5"} ${className}`.trim()}
      aria-label="Lesson discussions"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <LearnerText2 className="flex items-center gap-2 text-lg font-semibold">
            <MessageSquare className="size-4" /> Discussions
          </LearnerText2>
          <LearnerText2 className="text-muted-foreground">
            Ask questions and learn with other learners.
          </LearnerText2>
        </div>
        <div className="flex items-center gap-3">
          {!previewToken ? (
            <>
              {summary ? (
                <LearnerText2 component="span" className="text-muted-foreground">
                  {summary.totalCount} {summary.totalCount === 1 ? "post" : "posts"}
                </LearnerText2>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-primary hover:underline"
                onClick={() => void toggleSubscription()}
              >
                {subscribed ? "Unsubscribe" : "Subscribe"}
              </Button>
            </>
          ) : null}
          {onClose ? (
            <Button
              type="button"
              aria-label="Close discussions"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <LearnerText2 role="alert" className="mt-3 text-destructive">
          {error}
        </LearnerText2>
      ) : null}
      {notice ? (
        <LearnerText2 role="status" className="mt-3 text-primary">
          {notice}
        </LearnerText2>
      ) : null}
      {!previewToken ? (
        <div className="mt-4 grid gap-4">
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
      <div className="mt-5 grid gap-4">
        {comments.length === 0 ? (
          <LearnerText2 className="text-muted-foreground">
            No comments yet.
          </LearnerText2>
        ) : null}
        {comments.map((comment) => (
          <article
            key={comment.id}
            id={`discussion-comment-${comment.id}`}
            className="grid gap-4 rounded-lg border p-4"
          >
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <LearnerText2 component="span">
                {displayName(comment.authorId, comment.authorKind)} ·{" "}
                {new Date(comment.createdAt).toLocaleString()}
                {comment.isEdited ? " · edited" : ""}
              </LearnerText2>
              {!previewToken && !comment.deleted && comment.authorId !== viewerId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 hover:underline"
                  onClick={() => requestReport("comment", comment.id)}
                >
                  Report
                </Button>
              ) : null}
            </div>
            {editing?.type === "comment" && editing.id === comment.id ? (
              <div className="grid gap-4">
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
              <LearnerText2 className="italic text-muted-foreground">
                This comment was removed.
              </LearnerText2>
            ) : (
              <TextRenderer json={comment.content} theme={theme} className="text-sm" />
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {!previewToken && !comment.deleted ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 hover:underline"
                  onClick={() => void like("comment", comment.id)}
                >
                  <ThumbsUp className="size-3.5" /> {comment.likesCount}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:underline"
                onClick={() => void toggleReplies(comment.id)}
              >
                {expanded.has(comment.id)
                  ? "Hide replies"
                  : `View replies (${comment.replyCount})`}
              </Button>
              {!comment.deleted ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 hover:underline"
                  onClick={() => {
                    setReplyingTo({ commentId: comment.id });
                    clearReplyDraft();
                    setExpanded((current) => new Set(current).add(comment.id));
                    void loadReplies(comment.id);
                  }}
                >
                  Reply
                </Button>
              ) : null}
              {!previewToken && !comment.deleted && comment.authorId === viewerId ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:underline"
                    onClick={() =>
                      setEditing({
                        type: "comment",
                        id: comment.id,
                        value: comment.content,
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:underline"
                    onClick={() => requestDelete("comment", comment.id)}
                  >
                    Delete
                  </Button>
                </>
              ) : null}
            </div>
            {expanded.has(comment.id) ? (
              <div className="ml-4 grid gap-4 border-l pl-4">
                {(replies[comment.id] ?? []).map((reply) => (
                  <div
                    key={reply.id}
                    id={`discussion-reply-${reply.id}`}
                    className="grid gap-4"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <LearnerText2 component="span">
                        {displayName(reply.authorId, reply.authorKind)} ·{" "}
                        {new Date(reply.createdAt).toLocaleString()}
                        {reply.isEdited ? " · edited" : ""}
                      </LearnerText2>
                      {!previewToken &&
                      !reply.deleted &&
                      reply.authorId !== viewerId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 hover:underline"
                          onClick={() => requestReport("reply", reply.id)}
                        >
                          Report
                        </Button>
                      ) : null}
                    </div>
                    {editing?.type === "reply" && editing.id === reply.id ? (
                      <div className="grid gap-4">
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
                      <LearnerText2 className="italic text-muted-foreground">
                        This reply was removed.
                      </LearnerText2>
                    ) : (
                      <TextRenderer
                        json={reply.content}
                        theme={theme}
                        className="text-sm"
                      />
                    )}
                    {!previewToken && !reply.deleted ? (
                      <div className="flex gap-3 text-sm">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 hover:underline"
                          onClick={() => void like("reply", reply.id)}
                        >
                          <ThumbsUp className="size-3.5" /> {reply.likesCount}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 hover:underline"
                          onClick={() => {
                            setReplyingTo({
                              commentId: comment.id,
                              parentReplyId: reply.id,
                            });
                            clearReplyDraft();
                          }}
                        >
                          Reply
                        </Button>
                        {reply.authorId === viewerId ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 hover:underline"
                              onClick={() =>
                                setEditing({
                                  type: "reply",
                                  id: reply.id,
                                  value: reply.content,
                                })
                              }
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 hover:underline"
                              onClick={() => requestDelete("reply", reply.id)}
                            >
                              Delete
                            </Button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
                {replyHasMore[comment.id] && replyCursors[comment.id] ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto self-start p-0 text-primary hover:underline"
                    onClick={() =>
                      void loadReplies(comment.id, replyCursors[comment.id])
                    }
                  >
                    View more replies
                  </Button>
                ) : null}
                {replyingTo?.commentId === comment.id ? (
                  <div className="grid gap-4">
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
          <LearnerLabel className="grid gap-2 font-medium">
            Reason
            <LearnerTextarea
              className="min-h-24 w-full font-normal"
              value={reportReason}
              maxLength={2000}
              onChange={(event) => {
                reportReasonRef.current = event.target.value;
                setReportReason(event.target.value);
              }}
              placeholder="Describe the issue"
              autoFocus
            />
          </LearnerLabel>
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
