"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import NextLink from "next/link";
import {
    FlagTriangleRight,
    Loader2,
    MessageSquare,
    MoreVertical,
    ThumbsUp,
    Trash,
    X,
} from "lucide-react";
import { FetchBuilder } from "@courselit/utils";
import {
    CommunityComment,
    CommunityCommentReply,
    Constants,
} from "@courselit/common-models";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";

import {
    Button,
    Header4,
    Link as ThemeLink,
    Text1,
    Text2,
    Textarea,
} from "@courselit/page-primitives";
import { ProfileContext, ThemeContext } from "@components/contexts";
import { isCommunityComment } from "@/components/community/utils";
import { formattedLocaleDate } from "@ui-lib/utils";
import {
    DELETED_COMMENT_PLACEHOLDER,
    LESSON_DISCUSSIONS_CANCEL,
    LESSON_DISCUSSIONS_CLOSE,
    LESSON_DISCUSSIONS_COMMENT_PLACEHOLDER,
    LESSON_DISCUSSIONS_DELETE,
    LESSON_DISCUSSIONS_DELETE_CONFIRM,
    LESSON_DISCUSSIONS_EMPTY_DESCRIPTION,
    LESSON_DISCUSSIONS_EMPTY_TITLE,
    LESSON_DISCUSSIONS_PANEL_TITLE,
    LESSON_DISCUSSIONS_POST_COMMENT,
    LESSON_DISCUSSIONS_POSTING,
    LESSON_DISCUSSIONS_REPLY,
    LESSON_DISCUSSIONS_REPLY_PLACEHOLDER,
    LESSON_DISCUSSIONS_REPORT,
    LESSON_DISCUSSIONS_REPORTED,
    LESSON_DISCUSSIONS_REPORT_REASON_PROMPT,
    LESSON_DISCUSSIONS_VIEW_ALL,
    TOAST_TITLE_ERROR,
} from "@/ui-config/strings";
import { useToast } from "@courselit/components-library";

interface DiscussionPost {
    communityId: string;
    postId: string;
    title: string;
    commentsCount: number;
}

interface DiscussionPanelProps {
    courseId: string;
    lessonId: string;
    backendUrl: string;
    open: boolean;
    courseDiscussionsHref: string;
    onClose?: () => void;
}

export default function DiscussionPanel({
    courseId,
    lessonId,
    backendUrl,
    open,
    courseDiscussionsHref,
    onClose,
}: DiscussionPanelProps) {
    const { theme } = useContext(ThemeContext);
    const { profile } = useContext(ProfileContext);
    const [post, setPost] = useState<DiscussionPost | null>(null);
    const [comments, setComments] = useState<CommunityComment[]>([]);
    const [loading, setLoading] = useState(false);
    const [posting, setPosting] = useState(false);
    const [content, setContent] = useState("");
    const { toast } = useToast();

    const fetchGraphQL = useCallback(
        async (query: string, variables?: Record<string, unknown>) => {
            const fetch = new FetchBuilder()
                .setUrl(`${backendUrl}/api/graph`)
                .setPayload({ query, variables })
                .setIsGraphQLEndpoint(true)
                .build();
            return fetch.exec();
        },
        [backendUrl],
    );

    const showError = useCallback(
        (err: any) => {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err?.message || TOAST_TITLE_ERROR,
                variant: "destructive",
            });
        },
        [toast],
    );

    const loadComments = useCallback(async () => {
        const commentsQuery = `
            query GetCourseDiscussionComments($courseId: String!, $lessonId: String!) {
                comments: getCourseDiscussionComments(courseId: $courseId, lessonId: $lessonId) {
                    commentId
                    postId
                    communityId
                    content
                    likesCount
                    hasLiked
                    deleted
                    updatedAt
                    user {
                        userId
                        name
                        avatar {
                            thumbnail
                        }
                    }
                    replies {
                        replyId
                        content
                        likesCount
                        hasLiked
                        deleted
                        updatedAt
                        parentReplyId
                        user {
                            userId
                            name
                            avatar {
                                thumbnail
                            }
                        }
                    }
                }
            }
        `;
        const response = await fetchGraphQL(commentsQuery, {
            courseId,
            lessonId,
        });
        setComments(response?.comments || []);
    }, [courseId, fetchGraphQL, lessonId]);

    const loadPostAndComments = useCallback(async () => {
        if (!courseId || !lessonId) return;

        setLoading(true);
        try {
            const postQuery = `
                query GetCourseDiscussionPost($courseId: String!, $lessonId: String!) {
                    post: getCourseDiscussionPost(courseId: $courseId, lessonId: $lessonId) {
                        communityId
                        postId
                        title
                        commentsCount
                    }
                }
            `;
            const response = await fetchGraphQL(postQuery, {
                courseId,
                lessonId,
            });

            setPost(response?.post || null);
            await loadComments();
        } catch (err: any) {
            showError(err);
        } finally {
            setLoading(false);
        }
    }, [courseId, fetchGraphQL, lessonId, loadComments, showError]);

    useEffect(() => {
        setPost(null);
        setComments([]);
        setContent("");
    }, [lessonId]);

    useEffect(() => {
        if (open) {
            loadPostAndComments();
        }
    }, [loadPostAndComments, open]);

    const handlePostComment = async () => {
        if (!content.trim()) return;

        setPosting(true);
        try {
            const mutation = `
                mutation CreateCourseDiscussionComment($courseId: String!, $lessonId: String!, $content: String!) {
                    comment: createCourseDiscussionComment(courseId: $courseId, lessonId: $lessonId, content: $content) {
                        commentId
                        postId
                        communityId
                        content
                        likesCount
                        hasLiked
                        deleted
                        updatedAt
                        user {
                            userId
                            name
                            avatar {
                                thumbnail
                            }
                        }
                        replies {
                            replyId
                        }
                    }
                }
            `;
            await fetchGraphQL(mutation, { courseId, lessonId, content });
            setContent("");
            await loadPostAndComments();
        } catch (err: any) {
            showError(err);
        } finally {
            setPosting(false);
        }
    };

    const handleReply = async (
        commentId: string,
        replyContent: string,
        parentReplyId?: string,
    ) => {
        if (!replyContent.trim()) return;

        setPosting(true);
        try {
            const mutation = `
                mutation CreateCourseDiscussionReply($courseId: String!, $lessonId: String!, $commentId: String!, $content: String!, $parentReplyId: String) {
                    comment: createCourseDiscussionReply(courseId: $courseId, lessonId: $lessonId, commentId: $commentId, content: $content, parentReplyId: $parentReplyId) {
                        commentId
                        postId
                        communityId
                        content
                        likesCount
                        hasLiked
                        deleted
                        updatedAt
                        user {
                            userId
                            name
                            avatar {
                                thumbnail
                            }
                        }
                        replies {
                            replyId
                            content
                            likesCount
                            hasLiked
                            deleted
                            updatedAt
                            parentReplyId
                            user {
                                userId
                                name
                                avatar {
                                    thumbnail
                                }
                            }
                        }
                    }
                }
            `;
            const response = await fetchGraphQL(mutation, {
                courseId,
                lessonId,
                commentId,
                content: replyContent,
                parentReplyId,
            });

            if (response?.comment) {
                replaceComment(response.comment);
            } else {
                await loadComments();
            }
        } catch (err: any) {
            showError(err);
        } finally {
            setPosting(false);
        }
    };

    const handleLike = async (commentId: string, replyId?: string) => {
        const targetComment = comments.find(
            (comment) => comment.commentId === commentId,
        );
        const communityId = targetComment?.communityId || post?.communityId;
        const postId = targetComment?.postId || post?.postId;

        if (!communityId || !postId) return;

        try {
            const mutation = replyId
                ? `
                    mutation ToggleCommentReplyLike($communityId: String!, $postId: String!, $commentId: String!, $replyId: String!) {
                        comment: toggleCommentReplyLike(communityId: $communityId, postId: $postId, commentId: $commentId, replyId: $replyId) {
                            commentId postId communityId content likesCount hasLiked deleted updatedAt
                            user { userId name avatar { thumbnail } }
                            replies { replyId content likesCount hasLiked deleted updatedAt parentReplyId user { userId name avatar { thumbnail } } }
                        }
                    }
                `
                : `
                    mutation ToggleCommentLike($communityId: String!, $postId: String!, $commentId: String!) {
                        comment: toggleCommentLike(communityId: $communityId, postId: $postId, commentId: $commentId) {
                            commentId postId communityId content likesCount hasLiked deleted updatedAt
                            user { userId name avatar { thumbnail } }
                            replies { replyId content likesCount hasLiked deleted updatedAt parentReplyId user { userId name avatar { thumbnail } } }
                        }
                    }
                `;
            const response = await fetchGraphQL(mutation, {
                communityId,
                postId,
                commentId,
                replyId,
            });

            if (response?.comment) {
                replaceComment(response.comment);
            }
        } catch (err: any) {
            showError(err);
        }
    };

    const handleDelete = async (comment: CommentOrReply) => {
        const parentComment = isCommunityComment(comment)
            ? comment
            : comments.find((item) => item.commentId === comment.commentId);

        if (!parentComment) return;

        try {
            const mutation = `
                mutation DeleteComment($communityId: String!, $postId: String!, $commentId: String!, $replyId: String) {
                    comment: deleteComment(communityId: $communityId, postId: $postId, commentId: $commentId, replyId: $replyId) {
                        commentId postId communityId content likesCount hasLiked deleted updatedAt
                        user { userId name avatar { thumbnail } }
                        replies { replyId content likesCount hasLiked deleted updatedAt parentReplyId user { userId name avatar { thumbnail } } }
                    }
                }
            `;
            const response = await fetchGraphQL(mutation, {
                communityId: parentComment.communityId,
                postId: parentComment.postId,
                commentId: parentComment.commentId,
                replyId: isCommunityComment(comment)
                    ? undefined
                    : comment.replyId,
            });

            if (response?.comment) {
                replaceComment(response.comment);
            } else if (isCommunityComment(comment)) {
                setComments((items) =>
                    items.filter(
                        (item) => item.commentId !== comment.commentId,
                    ),
                );
            }
        } catch (err: any) {
            showError(err);
        }
    };

    const handleReport = async (comment: CommentOrReply, reason: string) => {
        const contentId = isCommunityComment(comment)
            ? comment.commentId
            : comment.replyId;
        const contentParentId = isCommunityComment(comment)
            ? undefined
            : comment.commentId;
        const type = isCommunityComment(comment)
            ? Constants.CommunityReportType.COMMENT.toUpperCase()
            : Constants.CommunityReportType.REPLY.toUpperCase();

        try {
            const mutation = `
                mutation ReportCommunityContent($communityId: String!, $contentId: String!, $type: CommunityReportContentType!, $reason: String!, $contentParentId: String) {
                    report: reportCommunityContent(communityId: $communityId, contentId: $contentId, type: $type, reason: $reason, contentParentId: $contentParentId) {
                        reportId
                    }
                }
            `;
            await fetchGraphQL(mutation, {
                communityId: comment.communityId,
                contentId,
                type,
                reason,
                contentParentId,
            });
            toast({ title: LESSON_DISCUSSIONS_REPORTED });
        } catch (err: any) {
            showError(err);
        }
    };

    const replaceComment = (comment: CommunityComment) => {
        setComments((items) =>
            items.map((item) =>
                item.commentId === comment.commentId ? comment : item,
            ),
        );
    };

    return (
        <div className="flex w-full h-full min-h-0 flex-col bg-background text-foreground">
            {/* Header */}
            <div className="border-b px-4 py-3 flex items-start justify-between">
                <div className="flex flex-col">
                    <Header4
                        theme={theme.theme}
                        className="flex items-center gap-2"
                    >
                        <MessageSquare className="h-4 w-4" />
                        {LESSON_DISCUSSIONS_PANEL_TITLE}
                    </Header4>
                    <NextLink href={courseDiscussionsHref}>
                        <ThemeLink
                            theme={theme.theme}
                            className="mt-1 inline-flex text-xs"
                        >
                            {LESSON_DISCUSSIONS_VIEW_ALL}
                        </ThemeLink>
                    </NextLink>
                </div>
                {onClose && (
                    <Button
                        theme={theme.theme}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onClose}
                        aria-label={LESSON_DISCUSSIONS_CLOSE}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Comment list */}
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {loading ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                ) : comments.length ? (
                    <div className="space-y-1">
                        {comments.map((comment) => (
                            <DiscussionComment
                                key={comment.commentId}
                                comment={comment}
                                theme={theme.theme}
                                profileUserId={profile?.userId}
                                onLike={handleLike}
                                onReply={handleReply}
                                onDelete={handleDelete}
                                onReport={handleReport}
                                isPosting={posting}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                        <Text1 theme={theme.theme} className="font-medium">
                            {LESSON_DISCUSSIONS_EMPTY_TITLE}
                        </Text1>
                        <Text2 theme={theme.theme} className="mt-1">
                            {LESSON_DISCUSSIONS_EMPTY_DESCRIPTION}
                        </Text2>
                    </div>
                )}
            </div>

            {/* Compose */}
            <div className="border-t p-3">
                <div className="flex flex-col gap-2">
                    <Textarea
                        theme={theme.theme}
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        placeholder={LESSON_DISCUSSIONS_COMMENT_PLACEHOLDER}
                        className="min-h-20 resize-none"
                        disabled={posting}
                    />
                    <Button
                        theme={theme.theme}
                        onClick={handlePostComment}
                        disabled={posting || !content.trim()}
                    >
                        {posting
                            ? LESSON_DISCUSSIONS_POSTING
                            : LESSON_DISCUSSIONS_POST_COMMENT}
                    </Button>
                </div>
            </div>
        </div>
    );
}

type CommentOrReply =
    | CommunityComment
    | (CommunityCommentReply & {
          commentId: string;
          postId: string;
          communityId: string;
      });

function DiscussionComment({
    comment,
    theme,
    profileUserId,
    onLike,
    onReply,
    onDelete,
    onReport,
    isPosting,
    depth = 0,
}: {
    comment: CommentOrReply;
    theme: any;
    profileUserId?: string;
    onLike: (commentId: string, replyId?: string) => void;
    onReply: (
        commentId: string,
        content: string,
        parentReplyId?: string,
    ) => void;
    onDelete: (comment: CommentOrReply) => void;
    onReport: (comment: CommentOrReply, reason: string) => void;
    isPosting?: boolean;
    depth?: number;
}) {
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState("");
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [showReportAlert, setShowReportAlert] = useState(false);
    const [reportReason, setReportReason] = useState("");

    const itemId = isCommunityComment(comment)
        ? comment.commentId
        : comment.replyId;
    const canDelete = profileUserId === comment.user.userId;
    const canReport = profileUserId && profileUserId !== comment.user.userId;

    const avatarFallback = (comment.user.name || "")
        .toUpperCase()
        .split(" ")
        .map((n) => n[0])
        .join("");

    return (
        <>
            <div
                id={itemId}
                className={`space-y-2 rounded-xl border border-transparent px-3 py-3 transition-[background-color,border-color,box-shadow] duration-500 ${
                    depth > 0 ? "ml-6" : ""
                }`}
            >
                <div className="flex items-start gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage
                            src={
                                comment.user.avatar?.thumbnail ||
                                "/courselit_backdrop_square.webp"
                            }
                            alt={`${comment.user.name}'s avatar`}
                        />
                        <AvatarFallback>{avatarFallback}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                                <Text1
                                    theme={theme}
                                    className="text-sm font-semibold"
                                >
                                    {comment.user.name}
                                </Text1>
                                <Text2 theme={theme} className="text-xs">
                                    {formattedLocaleDate(comment.updatedAt)}
                                </Text2>
                            </div>

                            {!comment.deleted && (canDelete || canReport) && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            theme={theme}
                                            variant="ghost"
                                            size="sm"
                                            className="text-muted-foreground border-0 shadow-none"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {canDelete && (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setShowDeleteAlert(true)
                                                }
                                            >
                                                <Trash className="h-4 w-4" />
                                                {LESSON_DISCUSSIONS_DELETE}
                                            </DropdownMenuItem>
                                        )}
                                        {canReport && (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setShowReportAlert(true)
                                                }
                                            >
                                                <FlagTriangleRight className="h-4 w-4" />
                                                {LESSON_DISCUSSIONS_REPORT}
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>

                        <Text1
                            theme={theme}
                            className="mt-1 whitespace-pre-wrap text-sm"
                        >
                            {comment.deleted ? (
                                <span className="italic opacity-60">
                                    {DELETED_COMMENT_PLACEHOLDER}
                                </span>
                            ) : (
                                comment.content
                            )}
                        </Text1>

                        {!comment.deleted && (
                            <div className="flex items-center gap-4 mt-2">
                                <Button
                                    theme={theme}
                                    variant="ghost"
                                    size="sm"
                                    className="border-0 shadow-none"
                                    onClick={() => onLike(comment.commentId)}
                                >
                                    <ThumbsUp className="h-4 w-4 mr-2" />
                                    {comment.likesCount}
                                </Button>
                                <Button
                                    theme={theme}
                                    variant="ghost"
                                    size="sm"
                                    className="border-0 shadow-none"
                                    onClick={() =>
                                        setIsReplying((value) => !value)
                                    }
                                >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    {LESSON_DISCUSSIONS_REPLY}
                                </Button>
                            </div>
                        )}

                        {isReplying && !comment.deleted && (
                            <div className="mt-2 space-y-2 p-1">
                                <Textarea
                                    theme={theme}
                                    value={replyContent}
                                    onChange={(event) =>
                                        setReplyContent(event.target.value)
                                    }
                                    placeholder={
                                        LESSON_DISCUSSIONS_REPLY_PLACEHOLDER
                                    }
                                    className="min-h-16 resize-none"
                                    disabled={isPosting}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button
                                        theme={theme}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsReplying(false)}
                                    >
                                        {LESSON_DISCUSSIONS_CANCEL}
                                    </Button>
                                    <Button
                                        theme={theme}
                                        size="sm"
                                        disabled={
                                            isPosting || !replyContent.trim()
                                        }
                                        onClick={() => {
                                            if (!replyContent.trim()) return;
                                            isCommunityComment(comment)
                                                ? onReply(
                                                      comment.commentId,
                                                      replyContent,
                                                  )
                                                : onReply(
                                                      comment.commentId,
                                                      replyContent,
                                                      comment.replyId,
                                                  );
                                            setReplyContent("");
                                            setIsReplying(false);
                                        }}
                                    >
                                        {LESSON_DISCUSSIONS_REPLY}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {isCommunityComment(comment) &&
                    comment.replies?.map((reply) => (
                        <DiscussionComment
                            key={reply.replyId}
                            comment={{
                                ...reply,
                                commentId: comment.commentId,
                                postId: comment.postId,
                                communityId: comment.communityId,
                            }}
                            theme={theme}
                            profileUserId={profileUserId}
                            onLike={() =>
                                onLike(comment.commentId, reply.replyId)
                            }
                            onReply={onReply}
                            onDelete={onDelete}
                            onReport={onReport}
                            isPosting={isPosting}
                            depth={depth + 1}
                        />
                    ))}
            </div>

            {/* Delete confirmation alert */}
            <AlertDialog
                open={showDeleteAlert}
                onOpenChange={setShowDeleteAlert}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {LESSON_DISCUSSIONS_DELETE}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {LESSON_DISCUSSIONS_DELETE_CONFIRM}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setShowDeleteAlert(false)}
                        >
                            {LESSON_DISCUSSIONS_CANCEL}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                onDelete(comment);
                                setShowDeleteAlert(false);
                            }}
                        >
                            {LESSON_DISCUSSIONS_DELETE}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Report alert */}
            <AlertDialog
                open={showReportAlert}
                onOpenChange={setShowReportAlert}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {LESSON_DISCUSSIONS_REPORT}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {LESSON_DISCUSSIONS_REPORT_REASON_PROMPT}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea
                        theme={theme}
                        placeholder="Reason for reporting..."
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="min-h-20 resize-none"
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => {
                                setShowReportAlert(false);
                                setReportReason("");
                            }}
                        >
                            {LESSON_DISCUSSIONS_CANCEL}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={!reportReason.trim()}
                            onClick={() => {
                                onReport(comment, reportReason);
                                setShowReportAlert(false);
                                setReportReason("");
                            }}
                        >
                            Submit
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
