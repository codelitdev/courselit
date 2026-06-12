"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { FetchBuilder } from "@courselit/utils";
import type { Address, TextEditorContent } from "@courselit/common-models";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ThemeContext, ProfileContext } from "@components/contexts";
import { TextRenderer } from "@courselit/page-blocks";
import { Editor, emptyDoc as TextEditorEmptyDoc } from "@courselit/text-editor";
import { isTextEditorNonEmpty, formattedLocaleDate } from "@ui-lib/utils";
import { Button, Caption, Text1, Text2 } from "@courselit/page-primitives";
import {
    COURSE_DISCUSSIONS_COMMENT_PLACEHOLDER,
    COURSE_DISCUSSIONS_CONTENT_REQUIRED,
    COURSE_DISCUSSIONS_CONTENT_TOO_LONG,
    COURSE_DISCUSSIONS_DELETE,
    COURSE_DISCUSSIONS_DELETED,
    COURSE_DISCUSSIONS_DELETE_CONFIRM,
    COURSE_DISCUSSIONS_EMPTY,
    COURSE_DISCUSSIONS_POST_COMMENT,
    COURSE_DISCUSSIONS_POST_REPLY,
    COURSE_DISCUSSIONS_REPLY,
    COURSE_DISCUSSIONS_REPLY_PLACEHOLDER,
    COURSE_DISCUSSIONS_REPORT,
    COURSE_DISCUSSIONS_REPORTED,
    COURSE_DISCUSSIONS_TITLE,
    COURSE_DISCUSSIONS_VIEW_ALL,
    LOAD_MORE_TEXT,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { useToast } from "@courselit/components-library";
import { ThumbsUp, MessageSquare, Trash2, Flag, X } from "lucide-react";
import { ReportReasonDialog } from "./report-reason-dialog";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    appendCourseViewerSessionParamsToHref,
    getCourseViewerSessionParams,
} from "@/lib/course-viewer-session-params";

type DiscussionContent = {
    productId: string;
    entityType: "LESSON";
    entityId: string;
    commentId?: string;
    replyId?: string;
    parentReplyId?: string;
    userId: string;
    content: TextEditorContent | null;
    likesCount: number;
    hasLiked: boolean;
    deleted: boolean;
    createdAt: string;
    user?: {
        name?: string;
        email?: string;
        avatar?: {
            file?: string;
            thumbnail?: string;
        };
    };
};

type DiscussionReply = DiscussionContent & {
    commentId: string;
    replyId: string;
};

type DiscussionComment = DiscussionContent & {
    commentId: string;
    replyCount: number;
    replyNextCursor?: string;
    hasMoreReplies: boolean;
    replies: DiscussionReply[];
};

interface ProductDiscussionPanelProps {
    address: Address;
    productId: string;
    slug: string;
    entityId: string;
    className?: string;
    onClose?: () => void;
}

const COMMENT_FIELDS = `
    productId
    entityType
    entityId
    commentId
    userId
    content
    likesCount
    hasLiked
    replyCount
    replyNextCursor
    hasMoreReplies
    deleted
    createdAt
    user {
        name
        email
        avatar {
            file
            thumbnail
        }
    }
    replies {
        productId
        entityType
        entityId
        commentId
        replyId
        parentReplyId
        userId
        content
        likesCount
        hasLiked
        deleted
        createdAt
        user {
            name
            email
            avatar {
                file
                thumbnail
            }
        }
    }
`;

const REPLY_FIELDS = `
    productId
    entityType
    entityId
    commentId
    replyId
    parentReplyId
    userId
    content
    likesCount
    hasLiked
    deleted
    createdAt
    user {
        name
        email
        avatar {
            file
            thumbnail
        }
    }
`;

const MAX_DISCUSSION_CONTENT_BYTES = 32768;
const MAX_DISCUSSION_TEXT_LENGTH = 5000;

const composerSchema = z.object({
    content: z.custom<TextEditorContent>().superRefine((value, ctx) => {
        const error = getComposerContentError(value);
        if (error) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: error,
            });
        }
    }),
});

type ComposerForm = z.infer<typeof composerSchema>;

export default function ProductDiscussionPanel({
    address,
    productId,
    slug,
    entityId,
    className = "",
    onClose,
}: ProductDiscussionPanelProps) {
    const { theme } = useContext(ThemeContext);
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const viewerSessionParams = getCourseViewerSessionParams(searchParams);
    const allDiscussionsHref = appendCourseViewerSessionParamsToHref(
        `/course/${slug}/${productId}/discussions`,
        viewerSessionParams,
    );
    const [comments, setComments] = useState<DiscussionComment[]>([]);
    const [nextCursor, setNextCursor] = useState<string>();
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [posting, setPosting] = useState(false);
    const [loadingRepliesFor, setLoadingRepliesFor] = useState<string>();
    const [composerContent, setComposerContent] = useState<TextEditorContent>(
        TextEditorEmptyDoc as TextEditorContent,
    );
    const [composerRefresh, setComposerRefresh] = useState(0);
    const [replyingTo, setReplyingTo] = useState<{
        commentId: string;
        parentReplyId?: string;
    }>();
    const [replyFocusToken, setReplyFocusToken] = useState(0);
    const replyComposerRef = useRef<HTMLDivElement | null>(null);
    const [replyContent, setReplyContent] = useState<TextEditorContent>(
        TextEditorEmptyDoc as TextEditorContent,
    );
    const [replyRefresh, setReplyRefresh] = useState(0);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [pendingReport, setPendingReport] = useState<{
        contentType: "COMMENT" | "REPLY";
        contentId: string;
    } | null>(null);
    const [hashTargetId, setHashTargetId] = useState(() =>
        readDiscussionHash(),
    );
    const [highlightedId, setHighlightedId] = useState(hashTargetId);
    const highlightedTarget = useMemo(
        () => getDiscussionTargetFromHash(hashTargetId),
        [hashTargetId],
    );

    useEffect(() => {
        function syncHighlightedIdFromHash() {
            const nextHash = readDiscussionHash();
            setHashTargetId(nextHash);
            setHighlightedId(nextHash);
        }

        syncHighlightedIdFromHash();
        window.addEventListener("hashchange", syncHighlightedIdFromHash);
        return () =>
            window.removeEventListener("hashchange", syncHighlightedIdFromHash);
    }, []);

    useEffect(() => {
        const nextHash = readDiscussionHash();
        setHashTargetId(nextHash);
        setHighlightedId(nextHash);
    }, [productId, entityId]);

    useEffect(
        () => {
            loadComments();
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            productId,
            entityId,
            highlightedTarget?.contentType,
            highlightedTarget?.contentId,
        ],
    );

    useEffect(() => {
        if (!highlightedId) {
            return;
        }

        const element = document.getElementById(highlightedId);
        if (!element) {
            return;
        }

        element.scrollIntoView({ block: "center", behavior: "smooth" });
        const timeout = window.setTimeout(() => setHighlightedId(""), 3000);

        return () => window.clearTimeout(timeout);
    }, [highlightedId, comments.length]);

    useEffect(() => {
        if (!replyingTo || !replyComposerRef.current) {
            return;
        }

        const timeout = window.setTimeout(() => {
            const composer = replyComposerRef.current;
            composer?.scrollIntoView({
                block: "center",
                behavior: "smooth",
            });
            const editor = composer?.querySelector<HTMLElement>(
                '[contenteditable="true"], textarea, [role="textbox"]',
            );
            editor?.focus();
        }, 0);

        return () => window.clearTimeout(timeout);
    }, [replyingTo, replyFocusToken]);

    async function graph(payload: Record<string, unknown>) {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(payload)
            .setIsGraphQLEndpoint(true)
            .build();

        return await fetch.exec();
    }

    async function loadComments(cursor?: string) {
        setLoading(true);
        try {
            const response = await graph({
                query: `
                    query GetProductDiscussionComments($productId: String!, $entityType: ProductDiscussionEntityType!, $entityId: String!, $cursor: String, $targetContentType: ProductDiscussionContentType, $targetContentId: String) {
                        comments: getProductDiscussionComments(productId: $productId, entityType: $entityType, entityId: $entityId, cursor: $cursor, limit: 20, replyPreviewLimit: 3, targetContentType: $targetContentType, targetContentId: $targetContentId) {
                            items { ${COMMENT_FIELDS} }
                            nextCursor
                            hasMore
                        }
                    }
                `,
                variables: {
                    productId,
                    entityType: "LESSON",
                    entityId,
                    cursor,
                    targetContentType: cursor
                        ? undefined
                        : highlightedTarget?.contentType,
                    targetContentId: cursor
                        ? undefined
                        : highlightedTarget?.contentId,
                },
            });

            const page = response.comments;
            setComments((current) =>
                cursor ? [...current, ...page.items] : page.items,
            );
            setNextCursor(page.nextCursor);
            setHasMore(page.hasMore);
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    async function postComment() {
        if (!isTextEditorNonEmpty(composerContent)) return;
        setPosting(true);
        try {
            const response = await graph({
                query: `
                    mutation CreateProductDiscussionComment($productId: String!, $entityType: ProductDiscussionEntityType!, $entityId: String!, $content: JSONObject!) {
                        comment: createProductDiscussionComment(productId: $productId, entityType: $entityType, entityId: $entityId, content: $content) {
                            ${COMMENT_FIELDS}
                        }
                    }
                `,
                variables: {
                    productId,
                    entityType: "LESSON",
                    entityId,
                    content: composerContent,
                },
            });
            setComments((current) => [
                { ...response.comment, replies: [] },
                ...current,
            ]);
            setComposerContent(TextEditorEmptyDoc as TextEditorContent);
            setComposerRefresh((value) => value + 1);
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setPosting(false);
        }
    }

    async function postReply() {
        if (!replyingTo || !isTextEditorNonEmpty(replyContent)) return;
        setPosting(true);
        try {
            const response = await graph({
                query: `
                    mutation CreateProductDiscussionReply($productId: String!, $entityType: ProductDiscussionEntityType!, $entityId: String!, $commentId: String!, $parentReplyId: String, $content: JSONObject!) {
                        reply: createProductDiscussionReply(productId: $productId, entityType: $entityType, entityId: $entityId, commentId: $commentId, parentReplyId: $parentReplyId, content: $content) {
                            ${REPLY_FIELDS}
                        }
                    }
                `,
                variables: {
                    productId,
                    entityType: "LESSON",
                    entityId,
                    commentId: replyingTo.commentId,
                    parentReplyId: replyingTo.parentReplyId,
                    content: replyContent,
                },
            });
            setComments((current) =>
                current.map((comment) =>
                    comment.commentId === replyingTo.commentId
                        ? {
                              ...comment,
                              replyCount: comment.replyCount + 1,
                              replies: [...comment.replies, response.reply],
                              hasMoreReplies: false,
                          }
                        : comment,
                ),
            );
            setReplyingTo(undefined);
            setReplyContent(TextEditorEmptyDoc as TextEditorContent);
            setReplyRefresh((value) => value + 1);
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setPosting(false);
        }
    }

    async function loadMoreReplies(comment: DiscussionComment) {
        if (!comment.replyNextCursor) {
            return;
        }

        setLoadingRepliesFor(comment.commentId);
        try {
            const response = await graph({
                query: `
                    query GetProductDiscussionReplies($commentId: String!, $cursor: String) {
                        replies: getProductDiscussionReplies(commentId: $commentId, cursor: $cursor, limit: 20) {
                            items { ${REPLY_FIELDS} }
                            nextCursor
                            hasMore
                        }
                    }
                `,
                variables: {
                    commentId: comment.commentId,
                    cursor: comment.replyNextCursor,
                },
            });
            const page = response.replies;
            setComments((current) =>
                current.map((item) => {
                    if (item.commentId !== comment.commentId) {
                        return item;
                    }

                    const existingReplyIds = new Set(
                        item.replies.map((reply) => reply.replyId),
                    );
                    const nextReplies = page.items.filter(
                        (reply: DiscussionReply) =>
                            !existingReplyIds.has(reply.replyId),
                    );

                    return {
                        ...item,
                        replies: [...item.replies, ...nextReplies],
                        replyNextCursor: page.nextCursor,
                        hasMoreReplies: page.hasMore,
                    };
                }),
            );
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoadingRepliesFor(undefined);
        }
    }

    async function toggleLike(
        contentType: "COMMENT" | "REPLY",
        contentId: string,
        liked: boolean,
    ) {
        const response = await graph({
            query: `
                mutation ToggleProductDiscussionLike($productId: String!, $entityType: ProductDiscussionEntityType!, $entityId: String!, $contentType: ProductDiscussionContentType!, $contentId: String!, $liked: Boolean!) {
                    like: toggleProductDiscussionLike(productId: $productId, entityType: $entityType, entityId: $entityId, contentType: $contentType, contentId: $contentId, liked: $liked) {
                        contentType
                        contentId
                        likesCount
                        hasLiked
                    }
                }
            `,
            variables: {
                productId,
                entityType: "LESSON",
                entityId,
                contentType,
                contentId,
                liked,
            },
        });
        updateContent(contentType, contentId, {
            likesCount: response.like.likesCount,
            hasLiked: response.like.hasLiked,
        });
    }

    async function deleteContent(
        contentType: "COMMENT" | "REPLY",
        contentId: string,
    ) {
        if (!window.confirm(COURSE_DISCUSSIONS_DELETE_CONFIRM)) {
            return;
        }

        await graph({
            query:
                contentType === "COMMENT"
                    ? `mutation DeleteProductDiscussionComment($commentId: String!) { deleteProductDiscussionComment(commentId: $commentId) { commentId deleted } }`
                    : `mutation DeleteProductDiscussionReply($replyId: String!) { deleteProductDiscussionReply(replyId: $replyId) { replyId deleted } }`,
            variables:
                contentType === "COMMENT"
                    ? { commentId: contentId }
                    : { replyId: contentId },
        });
        updateContent(contentType, contentId, {
            deleted: true,
            content: null,
        });
    }

    function openReportDialog(
        contentType: "COMMENT" | "REPLY",
        contentId: string,
    ) {
        setPendingReport({ contentType, contentId });
        setReportDialogOpen(true);
    }

    function startReply(target: { commentId: string; parentReplyId?: string }) {
        setReplyingTo(target);
        setReplyFocusToken((value) => value + 1);
    }

    async function handleReportSubmit(reason: string) {
        setReportDialogOpen(false);
        if (!pendingReport) return;
        const { contentType, contentId } = pendingReport;
        setPendingReport(null);

        try {
            await graph({
                query: `
                    mutation CreateProductDiscussionReport($productId: String!, $entityType: ProductDiscussionEntityType!, $entityId: String!, $contentType: ProductDiscussionContentType!, $contentId: String!, $reason: String!) {
                        createProductDiscussionReport(productId: $productId, entityType: $entityType, entityId: $entityId, contentType: $contentType, contentId: $contentId, reason: $reason) {
                            reportId
                        }
                    }
                `,
                variables: {
                    productId,
                    entityType: "LESSON",
                    entityId,
                    contentType,
                    contentId,
                    reason,
                },
            });
            toast({
                title: TOAST_TITLE_SUCCESS,
                description: COURSE_DISCUSSIONS_REPORTED,
            });
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    }

    function updateContent(
        contentType: "COMMENT" | "REPLY",
        contentId: string,
        patch: Partial<DiscussionComment & DiscussionReply>,
    ) {
        setComments((current) =>
            current.map((comment) => {
                if (
                    contentType === "COMMENT" &&
                    comment.commentId === contentId
                ) {
                    return { ...comment, ...patch };
                }

                return {
                    ...comment,
                    replies: comment.replies.map((reply) =>
                        reply.replyId === contentId
                            ? { ...reply, ...patch }
                            : reply,
                    ),
                };
            }),
        );
    }

    return (
        <aside
            className={`flex h-full min-h-0 flex-col bg-background text-foreground ${className}`}
        >
            <header className="border-b px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <Text2 theme={theme.theme} className="font-semibold">
                            {COURSE_DISCUSSIONS_TITLE}
                        </Text2>
                    </div>
                    {onClose && (
                        <Button
                            theme={theme.theme}
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <Link href={allDiscussionsHref} className="block">
                    <Caption
                        theme={theme.theme}
                        className="underline hover:text-foreground transition-colors"
                    >
                        {COURSE_DISCUSSIONS_VIEW_ALL}
                    </Caption>
                </Link>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {!loading && comments.length === 0 && (
                    <Text2 theme={theme.theme}>
                        {COURSE_DISCUSSIONS_EMPTY}
                    </Text2>
                )}
                <div className="space-y-6">
                    {comments.map((comment) => (
                        <DiscussionItem
                            key={comment.commentId}
                            item={comment}
                            itemId={`discussion-comment-${comment.commentId}`}
                            highlightedId={highlightedId}
                            onLike={() =>
                                toggleLike(
                                    "COMMENT",
                                    comment.commentId,
                                    !comment.hasLiked,
                                )
                            }
                            onDelete={() =>
                                deleteContent("COMMENT", comment.commentId)
                            }
                            onReport={() =>
                                openReportDialog("COMMENT", comment.commentId)
                            }
                            onReply={() =>
                                startReply({
                                    commentId: comment.commentId,
                                })
                            }
                        >
                            {comment.replies.map((reply) => (
                                <DiscussionItem
                                    key={reply.replyId}
                                    item={reply}
                                    itemId={`discussion-reply-${reply.replyId}`}
                                    highlightedId={highlightedId}
                                    compact
                                    onLike={() =>
                                        toggleLike(
                                            "REPLY",
                                            reply.replyId,
                                            !reply.hasLiked,
                                        )
                                    }
                                    onDelete={() =>
                                        deleteContent("REPLY", reply.replyId)
                                    }
                                    onReport={() =>
                                        openReportDialog("REPLY", reply.replyId)
                                    }
                                    onReply={() =>
                                        startReply({
                                            commentId: comment.commentId,
                                            parentReplyId: reply.replyId,
                                        })
                                    }
                                />
                            ))}
                            {comment.hasMoreReplies && (
                                <Button
                                    theme={theme.theme}
                                    variant="secondary"
                                    size="sm"
                                    disabled={
                                        loadingRepliesFor === comment.commentId
                                    }
                                    onClick={() => loadMoreReplies(comment)}
                                >
                                    {LOAD_MORE_TEXT}
                                </Button>
                            )}
                            {replyingTo?.commentId === comment.commentId && (
                                <div ref={replyComposerRef}>
                                    <Composer
                                        content={replyContent}
                                        refresh={replyRefresh}
                                        placeholder={
                                            COURSE_DISCUSSIONS_REPLY_PLACEHOLDER
                                        }
                                        buttonLabel={
                                            COURSE_DISCUSSIONS_POST_REPLY
                                        }
                                        address={address}
                                        posting={posting}
                                        onChange={setReplyContent}
                                        onSubmit={postReply}
                                    />
                                </div>
                            )}
                        </DiscussionItem>
                    ))}
                </div>
                {hasMore && (
                    <Button
                        theme={theme.theme}
                        variant="secondary"
                        className="mt-4 w-full"
                        disabled={loading}
                        onClick={() => loadComments(nextCursor)}
                    >
                        {LOAD_MORE_TEXT}
                    </Button>
                )}
            </div>
            <div className="border-t p-4">
                <Composer
                    content={composerContent}
                    refresh={composerRefresh}
                    placeholder={COURSE_DISCUSSIONS_COMMENT_PLACEHOLDER}
                    buttonLabel={COURSE_DISCUSSIONS_POST_COMMENT}
                    address={address}
                    posting={posting}
                    onChange={setComposerContent}
                    onSubmit={postComment}
                />
            </div>
            <ReportReasonDialog
                isOpen={reportDialogOpen}
                onClose={() => {
                    setReportDialogOpen(false);
                    setPendingReport(null);
                }}
                onSubmit={handleReportSubmit}
            />
        </aside>
    );
}

function getDiscussionTargetFromHash(hash: string) {
    if (hash.startsWith("discussion-comment-")) {
        return {
            contentType: "COMMENT",
            contentId: hash.replace("discussion-comment-", ""),
        };
    }

    if (hash.startsWith("discussion-reply-")) {
        return {
            contentType: "REPLY",
            contentId: hash.replace("discussion-reply-", ""),
        };
    }

    return null;
}

function readDiscussionHash() {
    return typeof window === "undefined"
        ? ""
        : window.location.hash.replace("#", "");
}

function getComposerContentError(content: TextEditorContent) {
    if (!isTextEditorNonEmpty(content)) {
        return COURSE_DISCUSSIONS_CONTENT_REQUIRED;
    }

    if (
        new Blob([JSON.stringify(content)]).size > MAX_DISCUSSION_CONTENT_BYTES
    ) {
        return COURSE_DISCUSSIONS_CONTENT_TOO_LONG;
    }

    if (extractText(content).length > MAX_DISCUSSION_TEXT_LENGTH) {
        return COURSE_DISCUSSIONS_CONTENT_TOO_LONG;
    }

    return "";
}

function extractText(node: unknown): string {
    if (!node || typeof node !== "object") {
        return "";
    }

    const record = node as Record<string, unknown>;
    const ownText = typeof record.text === "string" ? record.text : "";
    const children = Array.isArray(record.content)
        ? record.content.map(extractText).join("")
        : "";

    return `${ownText}${children}`;
}

function DiscussionItem({
    item,
    itemId,
    highlightedId,
    compact = false,
    children,
    onLike,
    onReply,
    onDelete,
    onReport,
}: {
    item: DiscussionContent;
    itemId: string;
    highlightedId: string;
    compact?: boolean;
    children?: React.ReactNode;
    onLike: () => void;
    onReply: () => void;
    onDelete: () => void;
    onReport: () => void;
}) {
    const { theme } = useContext(ThemeContext);
    const { profile } = useContext(ProfileContext);
    const isHighlighted = highlightedId === itemId;
    const isOwn = profile?.userId === item.userId;
    const displayName = item.user?.name || item.user?.email || item.userId;
    const initials =
        displayName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "?";

    const displayDate = formattedLocaleDate(item.createdAt);

    const avatarUrl = item.user?.avatar?.thumbnail || item.user?.avatar?.file;

    return (
        <article
            id={itemId}
            className={`scroll-mt-4 transition-[background-color,border-color,box-shadow] duration-500 ${
                isHighlighted
                    ? "bg-yellow-100 text-black dark:bg-yellow-950/40 dark:text-yellow-100 px-4 -mx-4 rounded-lg shadow-sm"
                    : ""
            } ${compact ? "ml-8 mt-4 space-y-3" : "py-4 space-y-3"}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={displayName}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            initials
                        )}
                    </div>
                    <div className="flex items-baseline gap-2 flex-wrap min-w-0 flex-1">
                        <Text2
                            theme={theme.theme}
                            className="font-semibold text-sm leading-none"
                        >
                            {displayName}
                        </Text2>
                        <Caption theme={theme.theme} className="leading-none">
                            {displayDate}
                        </Caption>
                    </div>
                </div>
                {!item.deleted && !isOwn && (
                    <Button
                        theme={theme.theme}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={onReport}
                        aria-label={COURSE_DISCUSSIONS_REPORT}
                        title={COURSE_DISCUSSIONS_REPORT}
                    >
                        <Flag className="h-4 w-4 text-muted-foreground" />
                    </Button>
                )}
                {!item.deleted && isOwn && (
                    <Button
                        theme={theme.theme}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={onDelete}
                        aria-label={COURSE_DISCUSSIONS_DELETE}
                        title={COURSE_DISCUSSIONS_DELETE}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <div className="text-sm leading-normal">
                {item.deleted || !item.content ? (
                    <Text1
                        theme={theme.theme}
                        className="italic opacity-60 text-sm"
                    >
                        {COURSE_DISCUSSIONS_DELETED}
                    </Text1>
                ) : (
                    <TextRenderer json={item.content} theme={theme.theme} />
                )}
            </div>
            {!item.deleted && (
                <div className="flex items-center gap-3 pt-1">
                    <Button
                        theme={theme.theme}
                        variant="ghost"
                        size="sm"
                        className={`flex items-center gap-1.5 h-8 px-2.5 py-1 transition-colors ${
                            item.hasLiked
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={onLike}
                    >
                        <ThumbsUp
                            className={`h-4 w-4 transition-colors ${
                                item.hasLiked
                                    ? "fill-current text-foreground"
                                    : ""
                            }`}
                        />
                        <Caption
                            theme={theme.theme}
                            className="text-xs font-medium"
                        >
                            {item.likesCount}
                        </Caption>
                    </Button>
                    <Button
                        theme={theme.theme}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1.5 h-8 px-2.5 py-1 text-muted-foreground hover:text-foreground"
                        onClick={onReply}
                    >
                        <MessageSquare className="h-4 w-4" />
                        <Caption
                            theme={theme.theme}
                            className="text-xs font-medium"
                        >
                            {COURSE_DISCUSSIONS_REPLY}
                        </Caption>
                    </Button>
                </div>
            )}
            {children && <div className="mt-4 space-y-4">{children}</div>}
        </article>
    );
}

function Composer({
    content,
    refresh,
    placeholder,
    buttonLabel,
    address,
    posting,
    onChange,
    onSubmit,
}: {
    content: TextEditorContent;
    refresh: number;
    placeholder: string;
    buttonLabel: string;
    address: Address;
    posting: boolean;
    onChange: (content: TextEditorContent) => void;
    onSubmit: () => void;
}) {
    const { theme } = useContext(ThemeContext);
    const inputStyles = theme.theme?.interactives?.input;
    const currentContentRef = useRef<TextEditorContent>(content);
    const form = useForm<ComposerForm>({
        resolver: zodResolver(composerSchema),
        defaultValues: { content },
        mode: "onChange",
    });
    const canSubmit = isTextEditorNonEmpty(form.watch("content"));
    const contentError = form.formState.errors.content?.message;

    useEffect(() => {
        currentContentRef.current = content;
        form.setValue("content", content, { shouldValidate: true });
    }, [content, form]);

    function handleEditorChange(value: unknown) {
        const nextContent = value as TextEditorContent;
        currentContentRef.current = nextContent;
        form.setValue("content", nextContent, { shouldValidate: true });
        onChange(nextContent);
    }

    return (
        <form
            className="space-y-2"
            onSubmit={form.handleSubmit(() => onSubmit())}
        >
            <div className="max-h-[200px] overflow-y-auto rounded-[inherit]">
                <Editor
                    url={address.backend}
                    initialContent={content}
                    refresh={refresh}
                    onChange={handleEditorChange}
                    placeholder={placeholder}
                    showToolbar={false}
                    editorClassName="min-h-[80px] max-w-none"
                    className={`${inputStyles?.border?.radius} ${inputStyles?.border?.width} ${inputStyles?.border?.style} ${inputStyles?.shadow} ${inputStyles?.custom}`}
                />
            </div>
            <Button
                theme={theme.theme}
                type="submit"
                className="w-full"
                disabled={posting || !canSubmit || Boolean(contentError)}
            >
                {buttonLabel}
            </Button>
            {contentError && (
                <Caption theme={theme.theme} className="text-destructive">
                    {contentError}
                </Caption>
            )}
        </form>
    );
}
