"use client";

import { useContext, useEffect, useState, useMemo, useRef } from "react";
import type React from "react";
import { useParams } from "next/navigation";
import DashboardContent from "@components/admin/dashboard-content";
import useProduct from "@/hooks/use-product";
import { AddressContext, ThemeContext } from "@components/contexts";
import { FetchBuilder, truncate } from "@courselit/utils";
import { TextRenderer } from "@courselit/page-blocks";
import { Editor, emptyDoc as TextEditorEmptyDoc } from "@courselit/text-editor";
import type { TextEditorContent } from "@courselit/common-models";
import { UIConstants } from "@courselit/common-models";
import { isTextEditorNonEmpty } from "@ui-lib/utils";
import {
    COURSE_DISCUSSIONS_ADMIN_BROWSE_TARGET,
    COURSE_DISCUSSIONS_ADMIN_COLLAPSE_REPLIES,
    COURSE_DISCUSSIONS_ADMIN_EXPAND_REPLIES,
    COURSE_DISCUSSIONS_ADMIN_NEXT,
    COURSE_DISCUSSIONS_ADMIN_NO_CONTENT,
    COURSE_DISCUSSIONS_ADMIN_PAGE_OF,
    COURSE_DISCUSSIONS_ADMIN_POST_REPLY,
    COURSE_DISCUSSIONS_ADMIN_PREVIOUS,
    COURSE_DISCUSSIONS_ADMIN_REPLY,
    COURSE_DISCUSSIONS_ADMIN_REPLY_COUNT,
    COURSE_DISCUSSIONS_DELETED,
    COURSE_DISCUSSIONS_REPORTED,
    COURSE_DISCUSSIONS_TITLE,
    LOAD_MORE_TEXT,
    MANAGE_COURSES_PAGE_HEADING,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { ReportReasonDialog } from "./report-reason-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@courselit/components-library";
import {
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    Flag,
    MessageSquare,
    Reply,
    X,
    ThumbsUp,
} from "lucide-react";

const { permissions } = UIConstants;

const PAGE_SIZE = 20;

type DiscussionContent = {
    commentId: string;
    replyId?: string;
    content: TextEditorContent | null;
    deleted: boolean;
    userId: string;
    createdAt: string;
    replies?: DiscussionContent[];
    replyCount?: number;
    replyNextCursor?: string;
    hasMoreReplies?: boolean;
    likesCount?: number;
    hasLiked?: boolean;
    user?: {
        name?: string;
        email?: string;
        avatar?: {
            file?: string;
            thumbnail?: string;
        };
    };
};

const COMMENT_FIELDS = `
    commentId
    userId
    content
    deleted
    createdAt
    replyCount
    replyNextCursor
    hasMoreReplies
    likesCount
    hasLiked
    user {
        name
        email
        avatar {
            file
            thumbnail
        }
    }
    replies {
        commentId
        replyId
        userId
        content
        deleted
        createdAt
        likesCount
        hasLiked
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
    commentId
    replyId
    userId
    content
    deleted
    createdAt
    likesCount
    hasLiked
    user {
        name
        email
        avatar {
            file
            thumbnail
        }
    }
`;

export default function DiscussionDetailPage() {
    const params = useParams();
    const productId = params?.id as string;
    const entityId = params?.entityId as string;
    const { product } = useProduct(productId);
    const address = useContext(AddressContext);
    const { theme } = useContext(ThemeContext);
    const { toast } = useToast();

    // Pagination state
    const [allComments, setAllComments] = useState<DiscussionContent[]>([]);
    const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingRepliesFor, setLoadingRepliesFor] = useState<string>();

    // Reply state
    const [posting, setPosting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{
        commentId: string;
        parentReplyId?: string;
    }>();
    const [replyContent, setReplyContent] = useState<TextEditorContent>(
        TextEditorEmptyDoc as TextEditorContent,
    );
    const [replyRefresh, setReplyRefresh] = useState(0);

    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [pendingReport, setPendingReport] = useState<{
        contentType: "COMMENT" | "REPLY";
        contentId: string;
    } | null>(null);

    const [highlightedId, setHighlightedId] = useState("");
    const [targetCommentId, setTargetCommentId] = useState("");
    const [targetReplyId, setTargetReplyId] = useState("");

    useEffect(() => {
        if (typeof window === "undefined") return;

        function updateHash() {
            const hash = window.location.hash.replace("#", "");
            setHighlightedId(hash);
            if (hash.includes("__")) {
                const parts = hash.split("__");
                if (parts[0] === "discussion-reply" && parts[1] && parts[2]) {
                    setTargetCommentId(parts[1]);
                    setTargetReplyId(parts[2]);
                } else {
                    setTargetCommentId("");
                    setTargetReplyId("");
                }
            } else if (hash.startsWith("discussion-comment-")) {
                setTargetCommentId(hash.replace("discussion-comment-", ""));
                setTargetReplyId("");
            } else {
                setTargetCommentId("");
                setTargetReplyId("");
            }
        }

        updateHash();
        window.addEventListener("hashchange", updateHash);
        return () => window.removeEventListener("hashchange", updateHash);
    }, [allComments]);

    useEffect(() => {
        if (!highlightedId || allComments.length === 0) {
            return;
        }

        // Use a polling interval to find the element, in case replies are being auto-fetched asynchronously
        let attempts = 0;
        const interval = window.setInterval(() => {
            let domId = highlightedId;
            if (highlightedId.includes("__")) {
                const parts = highlightedId.split("__");
                if (parts[0] === "discussion-reply" && parts[2]) {
                    domId = `discussion-reply-${parts[2]}`;
                }
            }
            const element = document.getElementById(domId);
            attempts++;
            if (element) {
                element.scrollIntoView({ block: "center", behavior: "smooth" });
                window.clearInterval(interval);
            } else if (attempts > 30) {
                // Limit retry to 3 seconds
                window.clearInterval(interval);
            }
        }, 100);

        const clearHighlightTimeout = window.setTimeout(() => {
            setHighlightedId("");
            setTargetCommentId("");
            setTargetReplyId("");
        }, 4000);

        return () => {
            window.clearInterval(interval);
            window.clearTimeout(clearHighlightTimeout);
        };
    }, [highlightedId, allComments]);

    const lessonsById = useMemo(() => {
        if (!product?.lessons) return {};
        return Object.fromEntries(
            product.lessons.map((lesson: any) => [
                lesson.lessonId,
                lesson.title,
            ]),
        );
    }, [product]);

    const targetTitle = lessonsById[entityId] || entityId;

    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: product ? truncate(product.title || "", 20) || "..." : "...",
            href: `/dashboard/product/${productId}`,
        },
        {
            label: COURSE_DISCUSSIONS_TITLE,
            href: `/dashboard/product/${productId}/manage/discussions`,
        },
        { label: targetTitle, href: "#" },
    ];

    useEffect(() => {
        if (productId && entityId && address?.backend) {
            loadPage(0);
        }
    }, [productId, entityId, address?.backend]);

    async function graph(payload: Record<string, unknown>) {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(payload)
            .setIsGraphQLEndpoint(true)
            .build();

        return await fetch.exec();
    }

    async function loadPage(pageIndex: number) {
        setLoading(true);
        const cursor = cursors[pageIndex];
        try {
            const response = await graph({
                query: `
                    query GetAdminProductDiscussionComments($productId: String!, $entityId: String!, $cursor: String) {
                        comments: getProductDiscussionComments(productId: $productId, entityType: LESSON, entityId: $entityId, admin: true, cursor: $cursor, limit: ${PAGE_SIZE}, replyPreviewLimit: 3) {
                            items { ${COMMENT_FIELDS} }
                            nextCursor
                            hasMore
                        }
                    }
                `,
                variables: { productId, entityId, cursor },
            });
            const page = response.comments;
            setAllComments(page.items);
            setCurrentPage(pageIndex);
            setHasMore(page.hasMore);

            setCursors((prev) => {
                const updated = [...prev];
                if (page.hasMore && !updated[pageIndex + 1]) {
                    updated[pageIndex + 1] = page.nextCursor;
                }
                return updated;
            });

            setTotalPages((prev) =>
                page.hasMore ? Math.max(prev, pageIndex + 2) : pageIndex + 1,
            );
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

    function openReportDialog(
        contentType: "COMMENT" | "REPLY",
        contentId: string,
    ) {
        setPendingReport({ contentType, contentId });
        setReportDialogOpen(true);
    }

    async function handleReportSubmit(reason: string) {
        setReportDialogOpen(false);
        if (!pendingReport) return;
        const { contentType, contentId } = pendingReport;
        setPendingReport(null);

        try {
            await graph({
                query: `
                    mutation CreateProductDiscussionReport($productId: String!, $entityId: String!, $contentType: ProductDiscussionContentType!, $contentId: String!, $reason: String!) {
                        createProductDiscussionReport(productId: $productId, entityType: LESSON, entityId: $entityId, contentType: $contentType, contentId: $contentId, reason: $reason) {
                            reportId
                        }
                    }
                `,
                variables: {
                    productId,
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

    async function postReply() {
        if (!replyingTo || !isTextEditorNonEmpty(replyContent)) return;
        setPosting(true);
        try {
            const response = await graph({
                query: `
                    mutation CreateProductDiscussionReply($productId: String!, $entityId: String!, $commentId: String!, $parentReplyId: String, $content: JSONObject!) {
                        reply: createProductDiscussionReply(productId: $productId, entityType: LESSON, entityId: $entityId, commentId: $commentId, parentReplyId: $parentReplyId, content: $content) {
                            ${REPLY_FIELDS}
                        }
                    }
                `,
                variables: {
                    productId,
                    entityId,
                    commentId: replyingTo.commentId,
                    parentReplyId: replyingTo.parentReplyId,
                    content: replyContent,
                },
            });
            setAllComments((current) =>
                current.map((comment) =>
                    comment.commentId === replyingTo.commentId
                        ? {
                              ...comment,
                              replyCount: (comment.replyCount ?? 0) + 1,
                              replies: [
                                  ...(comment.replies || []),
                                  response.reply,
                              ],
                              hasMoreReplies: false,
                          }
                        : comment,
                ),
            );
            setReplyingTo(undefined);
            setReplyContent(TextEditorEmptyDoc as TextEditorContent);
            setReplyRefresh((v) => v + 1);
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

    async function loadMoreReplies(comment: DiscussionContent) {
        if (!comment.replyNextCursor) {
            return;
        }
        setLoadingRepliesFor(comment.commentId);
        try {
            const response = await graph({
                query: `
                    query GetAdminProductDiscussionReplies($commentId: String!, $cursor: String) {
                        replies: getProductDiscussionReplies(commentId: $commentId, admin: true, cursor: $cursor, limit: 20) {
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
            setAllComments((current) =>
                current.map((item) => {
                    if (item.commentId !== comment.commentId) {
                        return item;
                    }
                    const existingReplyIds = new Set(
                        (item.replies || []).map((reply) => reply.replyId),
                    );
                    return {
                        ...item,
                        replies: [
                            ...(item.replies || []),
                            ...page.items.filter(
                                (reply: DiscussionContent) =>
                                    !existingReplyIds.has(reply.replyId),
                            ),
                        ],
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
        try {
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
        patch: Partial<DiscussionContent>,
    ) {
        setAllComments((current) =>
            current.map((comment) => {
                if (
                    contentType === "COMMENT" &&
                    comment.commentId === contentId
                ) {
                    return { ...comment, ...patch };
                }

                return {
                    ...comment,
                    replies: (comment.replies || []).map((reply) =>
                        reply.replyId === contentId
                            ? { ...reply, ...patch }
                            : reply,
                    ),
                };
            }),
        );
    }

    return (
        <>
            <DashboardContent
                breadcrumbs={breadcrumbs}
                permissions={[
                    permissions.manageAnyCourse,
                    permissions.manageCourse,
                ]}
            >
                <div className="space-y-6 w-full">
                    {/* Page header */}
                    <div>
                        <h1 className="text-4xl font-semibold">
                            {targetTitle}
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            {COURSE_DISCUSSIONS_ADMIN_BROWSE_TARGET}
                        </p>
                    </div>

                    {/* Comment cards */}
                    <div className="space-y-3">
                        {loading && allComments.length === 0 && (
                            <div className="text-sm text-muted-foreground py-8 text-center">
                                Loading…
                            </div>
                        )}

                        {!loading && allComments.length === 0 && (
                            <div className="text-sm text-muted-foreground py-8 text-center">
                                No comments yet.
                            </div>
                        )}

                        {allComments.map((comment, idx) => (
                            <CommentCard
                                key={comment.commentId}
                                comment={comment}
                                index={currentPage * PAGE_SIZE + idx + 1}
                                address={address}
                                theme={theme.theme}
                                loadingRepliesFor={loadingRepliesFor}
                                replyingTo={replyingTo}
                                replyContent={replyContent}
                                replyRefresh={replyRefresh}
                                posting={posting}
                                onLike={toggleLike}
                                onReport={() =>
                                    openReportDialog(
                                        "COMMENT",
                                        comment.commentId,
                                    )
                                }
                                onReportReply={(replyId) =>
                                    openReportDialog("REPLY", replyId)
                                }
                                onLoadMoreReplies={() =>
                                    loadMoreReplies(comment)
                                }
                                onStartReply={(parentReplyId) =>
                                    setReplyingTo({
                                        commentId: comment.commentId,
                                        parentReplyId,
                                    })
                                }
                                onCancelReply={() => setReplyingTo(undefined)}
                                onReplyChange={setReplyContent}
                                onPostReply={postReply}
                                targetCommentId={targetCommentId}
                                targetReplyId={targetReplyId}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 0 || loading}
                                onClick={() => loadPage(currentPage - 1)}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                {COURSE_DISCUSSIONS_ADMIN_PREVIOUS}
                            </Button>

                            <span className="text-sm text-muted-foreground">
                                {currentPage + 1}{" "}
                                {COURSE_DISCUSSIONS_ADMIN_PAGE_OF} {totalPages}
                                {hasMore ? "+" : ""}
                            </span>

                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!hasMore || loading}
                                onClick={() => loadPage(currentPage + 1)}
                            >
                                {COURSE_DISCUSSIONS_ADMIN_NEXT}
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </div>
            </DashboardContent>

            <ReportReasonDialog
                isOpen={reportDialogOpen}
                onClose={() => {
                    setReportDialogOpen(false);
                    setPendingReport(null);
                }}
                onSubmit={handleReportSubmit}
            />
        </>
    );
}

// ─── CommentCard ──────────────────────────────────────────────────────────────

function CommentCard({
    comment,
    index,
    address,
    theme,
    loadingRepliesFor,
    replyingTo,
    replyContent,
    replyRefresh,
    posting,
    onLike,
    onReport,
    onReportReply,
    onLoadMoreReplies,
    onStartReply,
    onCancelReply,
    onReplyChange,
    onPostReply,
    targetCommentId,
    targetReplyId,
}: {
    comment: DiscussionContent;
    index: number;
    address: any;
    theme: any;
    loadingRepliesFor?: string;
    replyingTo?: { commentId: string; parentReplyId?: string };
    replyContent: TextEditorContent;
    replyRefresh: number;
    posting: boolean;
    onLike: (
        contentType: "COMMENT" | "REPLY",
        contentId: string,
        liked: boolean,
    ) => void;
    onReport: () => void;
    onReportReply: (replyId: string) => void;
    onLoadMoreReplies: () => void;
    onStartReply: (parentReplyId?: string) => void;
    onCancelReply: () => void;
    onReplyChange: (content: TextEditorContent) => void;
    onPostReply: () => void;
    targetCommentId?: string;
    targetReplyId?: string;
}) {
    const isTargetComment =
        comment.commentId === targetCommentId && !targetReplyId;

    const [open, setOpen] = useState(comment.commentId === targetCommentId);
    const [repliesOpen, setRepliesOpen] = useState(
        !!targetReplyId && comment.commentId === targetCommentId,
    );

    useEffect(() => {
        if (comment.commentId === targetCommentId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setOpen(true);
            if (targetReplyId) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setRepliesOpen(true);
            }
        }
    }, [targetCommentId, targetReplyId, comment.commentId]);

    // Auto-fetch replies if targetReplyId is set but the reply is not in the list
    useEffect(() => {
        if (comment.commentId === targetCommentId && targetReplyId) {
            const hasReply = comment.replies?.some(
                (r) => r.replyId === targetReplyId,
            );
            if (!hasReply && comment.hasMoreReplies && !loadingRepliesFor) {
                onLoadMoreReplies();
            }
        }
    }, [
        comment.commentId,
        targetCommentId,
        targetReplyId,
        comment.replies,
        comment.hasMoreReplies,
        loadingRepliesFor,
        onLoadMoreReplies,
    ]);

    const isReplyingToThis =
        replyingTo?.commentId === comment.commentId &&
        !replyingTo?.parentReplyId;

    const displayName =
        comment.user?.name || comment.user?.email || comment.userId;
    const initials = getInitials(displayName);
    const displayDate = new Date(comment.createdAt).toLocaleDateString();
    const replyCount = comment.replyCount ?? comment.replies?.length ?? 0;

    const preview = getTextPreview(comment.content);

    // Auto-expand replies panel when a reply is submitted
    const prevReplyCount = useRef(replyCount);
    useEffect(() => {
        if (replyCount > prevReplyCount.current) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setRepliesOpen(true);
        }
        prevReplyCount.current = replyCount;
    }, [replyCount]);

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <Card
                id={`discussion-comment-${comment.commentId}`}
                className={`w-full overflow-hidden transition-colors duration-500 ${
                    isTargetComment
                        ? "bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900"
                        : ""
                }`}
            >
                {/* ── Collapsed header (always visible) ── */}
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-accent/40 transition-colors py-4 px-5">
                        <div className="flex items-center gap-3 w-full min-w-0">
                            {/* Avatar */}
                            <Avatar className="h-8 w-8 flex-shrink-0">
                                {comment.user?.avatar &&
                                    (comment.user.avatar.thumbnail ||
                                        comment.user.avatar.file) && (
                                        <AvatarImage
                                            src={
                                                comment.user.avatar.thumbnail ||
                                                comment.user.avatar.file
                                            }
                                            alt={displayName}
                                        />
                                    )}
                                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>

                            {/* Meta */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm">
                                        {displayName}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {displayDate}
                                    </span>
                                    {comment.deleted && (
                                        <Badge
                                            variant="destructive"
                                            className="text-[10px] px-1.5 py-0"
                                        >
                                            {COURSE_DISCUSSIONS_DELETED}
                                        </Badge>
                                    )}
                                    {replyCount > 0 && (
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <MessageSquare className="h-3 w-3" />
                                            {replyCount}{" "}
                                            {
                                                COURSE_DISCUSSIONS_ADMIN_REPLY_COUNT
                                            }
                                        </span>
                                    )}
                                </div>
                                {/* One-line preview when collapsed */}
                                {!open && (
                                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                                        {comment.deleted
                                            ? COURSE_DISCUSSIONS_ADMIN_NO_CONTENT
                                            : preview}
                                    </p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {replyCount > 0 && (
                                    <span className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                                        <MessageSquare className="h-4 w-4" />
                                        <span>{replyCount}</span>
                                    </span>
                                )}
                                <ChevronDown
                                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                                        open ? "rotate-180" : ""
                                    }`}
                                />
                            </div>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                {/* ── Expanded content ── */}
                <CollapsibleContent>
                    <CardContent className="px-5 pb-5 pt-0 space-y-4">
                        {/* Divider */}
                        <div className="h-px bg-border" />

                        {/* Full content */}
                        <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0 text-sm leading-relaxed">
                                {comment.content ? (
                                    <TextRenderer
                                        json={comment.content}
                                        theme={theme}
                                    />
                                ) : (
                                    <span className="text-muted-foreground italic">
                                        {COURSE_DISCUSSIONS_ADMIN_NO_CONTENT}
                                    </span>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 flex-shrink-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onReport();
                                }}
                            >
                                <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                        </div>

                        {/* Action bar */}
                        {!comment.deleted && (
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`gap-1.5 h-7 px-2 text-xs text-muted-foreground hover:text-foreground ${comment.hasLiked ? "bg-accent text-accent-foreground" : ""}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLike(
                                            "COMMENT",
                                            comment.commentId,
                                            !comment.hasLiked,
                                        );
                                    }}
                                >
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                    <span>{comment.likesCount || 0}</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1.5 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isReplyingToThis) {
                                            onCancelReply();
                                        } else {
                                            onStartReply();
                                        }
                                    }}
                                >
                                    {isReplyingToThis ? (
                                        <>
                                            <X className="h-3.5 w-3.5" />
                                            Cancel
                                        </>
                                    ) : (
                                        <>
                                            <Reply className="h-3.5 w-3.5" />
                                            {COURSE_DISCUSSIONS_ADMIN_REPLY}
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}

                        {/* Inline reply composer */}
                        {isReplyingToThis && (
                            <ReplyComposer
                                address={address}
                                content={replyContent}
                                refresh={replyRefresh}
                                posting={posting}
                                onChange={onReplyChange}
                                onSubmit={onPostReply}
                            />
                        )}

                        {/* Replies section */}
                        {replyCount > 0 && (
                            <div className="space-y-2">
                                <Collapsible
                                    open={repliesOpen}
                                    onOpenChange={setRepliesOpen}
                                >
                                    <CollapsibleTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="gap-1.5 text-xs h-7 px-2"
                                        >
                                            {repliesOpen ? (
                                                <>
                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                    {
                                                        COURSE_DISCUSSIONS_ADMIN_COLLAPSE_REPLIES
                                                    }
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                    {
                                                        COURSE_DISCUSSIONS_ADMIN_EXPAND_REPLIES
                                                    }{" "}
                                                    ({replyCount})
                                                </>
                                            )}
                                        </Button>
                                    </CollapsibleTrigger>

                                    <CollapsibleContent className="mt-2 space-y-2 pl-4 border-l-2 border-border">
                                        {comment.replies?.map((reply) => (
                                            <ReplyRow
                                                key={reply.replyId}
                                                reply={reply}
                                                theme={theme}
                                                onReport={() =>
                                                    onReportReply(
                                                        reply.replyId || "",
                                                    )
                                                }
                                                targetReplyId={targetReplyId}
                                                onLike={() =>
                                                    onLike(
                                                        "REPLY",
                                                        reply.replyId || "",
                                                        !reply.hasLiked,
                                                    )
                                                }
                                                onStartReply={() => {
                                                    if (
                                                        replyingTo?.commentId ===
                                                            comment.commentId &&
                                                        replyingTo?.parentReplyId ===
                                                            reply.replyId
                                                    ) {
                                                        onCancelReply();
                                                    } else {
                                                        onStartReply(
                                                            reply.replyId,
                                                        );
                                                    }
                                                }}
                                                isReplying={
                                                    replyingTo?.commentId ===
                                                        comment.commentId &&
                                                    replyingTo?.parentReplyId ===
                                                        reply.replyId
                                                }
                                                replyComposer={
                                                    replyingTo?.commentId ===
                                                        comment.commentId &&
                                                    replyingTo?.parentReplyId ===
                                                        reply.replyId ? (
                                                        <ReplyComposer
                                                            address={address}
                                                            content={
                                                                replyContent
                                                            }
                                                            refresh={
                                                                replyRefresh
                                                            }
                                                            posting={posting}
                                                            onChange={
                                                                onReplyChange
                                                            }
                                                            onSubmit={
                                                                onPostReply
                                                            }
                                                        />
                                                    ) : undefined
                                                }
                                            />
                                        ))}

                                        {comment.hasMoreReplies && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs h-7 px-2"
                                                disabled={
                                                    loadingRepliesFor ===
                                                    comment.commentId
                                                }
                                                onClick={onLoadMoreReplies}
                                            >
                                                {LOAD_MORE_TEXT}
                                            </Button>
                                        )}
                                    </CollapsibleContent>
                                </Collapsible>
                            </div>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}

// ─── ReplyComposer ────────────────────────────────────────────────────────────

function ReplyComposer({
    address,
    content,
    refresh,
    posting,
    onChange,
    onSubmit,
}: {
    address: any;
    content: TextEditorContent;
    refresh: number;
    posting: boolean;
    onChange: (content: TextEditorContent) => void;
    onSubmit: () => void;
}) {
    const { theme } = useContext(ThemeContext);
    const inputStyles = theme.theme?.interactives?.input;
    const canSubmit = isTextEditorNonEmpty(content);

    return (
        <div className="space-y-2">
            <div className="max-h-[200px] overflow-y-auto rounded-[inherit]">
                <Editor
                    url={address?.backend}
                    initialContent={content}
                    refresh={refresh}
                    editable={true}
                    onChange={(value: unknown) =>
                        onChange(value as TextEditorContent)
                    }
                    placeholder={COURSE_DISCUSSIONS_ADMIN_REPLY + "…"}
                    showToolbar={false}
                    editorClassName="min-h-[48px] max-w-none"
                    className={`${inputStyles?.border?.radius} ${inputStyles?.border?.width} ${inputStyles?.border?.style} ${inputStyles?.shadow} ${inputStyles?.custom}`}
                />
            </div>
            <div className="flex justify-end">
                <Button
                    size="sm"
                    disabled={posting || !canSubmit}
                    onClick={onSubmit}
                >
                    {COURSE_DISCUSSIONS_ADMIN_POST_REPLY}
                </Button>
            </div>
        </div>
    );
}

// ─── ReplyRow ─────────────────────────────────────────────────────────────────

function ReplyRow({
    reply,
    theme,
    onReport,
    targetReplyId,
    onLike,
    onStartReply,
    isReplying,
    replyComposer,
}: {
    reply: DiscussionContent;
    theme: any;
    onReport: () => void;
    targetReplyId?: string;
    onLike: () => void;
    onStartReply: () => void;
    isReplying: boolean;
    replyComposer?: React.ReactNode;
}) {
    const displayName = reply.user?.name || reply.user?.email || reply.userId;
    const initials = getInitials(displayName);
    const displayDate = new Date(reply.createdAt).toLocaleDateString();
    const isTargetReply = targetReplyId === reply.replyId;

    return (
        <div
            id={`discussion-reply-${reply.replyId}`}
            className={`flex items-start gap-3 py-2 px-2 rounded-md transition-colors duration-500 ${
                isTargetReply
                    ? "bg-yellow-50/70 dark:bg-yellow-950/20 border border-yellow-200/50 dark:border-yellow-900/50"
                    : ""
            }`}
        >
            <Avatar className="h-6 w-6 flex-shrink-0">
                {reply.user?.avatar &&
                    (reply.user.avatar.thumbnail || reply.user.avatar.file) && (
                        <AvatarImage
                            src={
                                reply.user.avatar.thumbnail ||
                                reply.user.avatar.file
                            }
                            alt={displayName}
                        />
                    )}
                <AvatarFallback className="text-[10px] font-semibold bg-accent">
                    {initials}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs">{displayName}</span>
                    <span className="text-[11px] text-muted-foreground">
                        {displayDate}
                    </span>
                    {reply.deleted && (
                        <Badge
                            variant="destructive"
                            className="text-[10px] px-1.5 py-0"
                        >
                            {COURSE_DISCUSSIONS_DELETED}
                        </Badge>
                    )}
                </div>
                <div className="text-sm leading-relaxed">
                    {reply.content ? (
                        <TextRenderer json={reply.content} theme={theme} />
                    ) : (
                        <span className="text-muted-foreground italic text-xs">
                            {COURSE_DISCUSSIONS_ADMIN_NO_CONTENT}
                        </span>
                    )}
                </div>
                {!reply.deleted && (
                    <div className="flex items-center gap-3 mt-1.5">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`gap-1 h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground ${reply.hasLiked ? "bg-accent text-accent-foreground" : ""}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onLike();
                            }}
                        >
                            <ThumbsUp className="h-3 w-3" />
                            <span>{reply.likesCount || 0}</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`gap-1 h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground ${isReplying ? "bg-accent text-accent-foreground" : ""}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onStartReply();
                            }}
                        >
                            <Reply className="h-3 w-3" />
                            <span>Reply</span>
                        </Button>
                    </div>
                )}
                {isReplying && replyComposer && (
                    <div className="mt-2 w-full">{replyComposer}</div>
                )}
            </div>
            <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 flex-shrink-0"
                onClick={onReport}
            >
                <Flag className="h-3 w-3 text-muted-foreground" />
            </Button>
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
    return (
        name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "?"
    );
}

function getTextPreview(content: TextEditorContent | null): string {
    if (!content) return "";
    try {
        const walk = (nodes: any[]): string => {
            for (const node of nodes) {
                if (node.type === "text" && node.text) return node.text;
                if (node.content) {
                    const found = walk(node.content);
                    if (found) return found;
                }
            }
            return "";
        };
        return walk((content as any).content || []);
    } catch {
        return "";
    }
}
