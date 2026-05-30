"use client";

import { useEffect, useState, useContext } from "react";
import { FetchBuilder } from "@courselit/utils";
import { useRouter } from "next/navigation";
import {
    AddressContext,
    ProfileContext,
    ThemeContext,
} from "@components/contexts";
import { Button } from "@components/ui/button";
import { Textarea } from "@components/ui/textarea";
import { Avatar, AvatarFallback } from "@components/ui/avatar";
import { Skeleton } from "@components/ui/skeleton";
import { useToast } from "@courselit/components-library";
import { MessageSquare, X, Heart, Reply, ChevronRight } from "lucide-react";
import {
    LESSON_DISCUSSIONS_HEADER,
    LESSON_DISCUSSIONS_WRITE_COMMENT,
    LESSON_DISCUSSIONS_VIEW_ALL,
    LESSON_DISCUSSIONS_EMPTY,
    TOAST_TITLE_ERROR,
    DELETED_COMMENT_PLACEHOLDER,
} from "@ui-config/strings";
import { truncate } from "@courselit/utils";
import type { Profile } from "@courselit/common-models";

interface LessonDiscussionPanelProps {
    courseId: string;
    lessonId: string;
    slug: string;
}

interface Comment {
    commentId: string;
    content: string;
    userId: string;
    likesCount: number;
    hasLiked: boolean;
    updatedAt: string;
    replies: Reply[];
    deleted: boolean;
    user?: {
        userId: string;
        name: string;
        email: string;
        avatar?: { file?: string };
    };
}

interface Reply {
    replyId: string;
    content: string;
    userId: string;
    likesCount: number;
    hasLiked: boolean;
    parentReplyId?: string;
    updatedAt: string;
    deleted: boolean;
    user?: {
        userId: string;
        name: string;
        email: string;
        avatar?: { file?: string };
    };
}

interface Post {
    postId: string;
    communityId: string;
    title: string;
    lessonId: string;
}

export function LessonDiscussionPanel({
    courseId,
    lessonId,
    slug,
}: LessonDiscussionPanelProps) {
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const address = useContext(AddressContext);
    const { profile } = useContext(ProfileContext);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        if (courseId && lessonId) {
            loadDiscussionPost();
        }
    }, [courseId, lessonId]);

    const loadDiscussionPost = async () => {
        setLoading(true);
        try {
            const query = `
                query {
                    posts: getCourseDiscussionPosts(
                        courseId: "${courseId}",
                        lessonId: "${lessonId}"
                    ) {
                        postId
                        communityId
                        title
                        lessonId
                    }
                }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetch.exec();
            if (response.posts && response.posts.length > 0) {
                const discussionPost = response.posts[0];
                setPost(discussionPost);
                await loadComments(
                    discussionPost.communityId,
                    discussionPost.postId,
                );
            }
        } catch (err: any) {
            // Discussion not available
        } finally {
            setLoading(false);
        }
    };

    const loadComments = async (communityId: string, postId: string) => {
        try {
            const query = `
                query {
                    comments: getComments(
                        communityId: "${communityId}",
                        postId: "${postId}"
                    ) {
                        commentId
                        content
                        userId
                        likesCount
                        hasLiked
                        updatedAt
                        deleted
                        user {
                            userId
                            name
                            email
                            avatar {
                                file
                            }
                        }
                        replies {
                            replyId
                            content
                            userId
                            likesCount
                            hasLiked
                            parentReplyId
                            updatedAt
                            deleted
                            user {
                                userId
                                name
                                email
                                avatar {
                                    file
                                }
                            }
                        }
                    }
                }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetch.exec();
            if (response.comments) {
                setComments(response.comments);
            }
        } catch (err: any) {
            // Comments unavailable
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim() || !post) return;
        setSubmitting(true);
        try {
            const query = `
                mutation {
                    comment: postComment(
                        communityId: "${post.communityId}",
                        postId: "${post.postId}",
                        content: "${escapeString(newComment)}"
                    ) {
                        commentId
                    }
                }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();
            await fetch.exec();
            setNewComment("");
            await loadComments(post.communityId, post.postId);
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handlePostReply = async (commentId: string) => {
        if (!replyContent.trim() || !post) return;
        setSubmitting(true);
        try {
            const query = `
                mutation {
                    comment: postComment(
                        communityId: "${post.communityId}",
                        postId: "${post.postId}",
                        content: "${escapeString(replyContent)}",
                        parentCommentId: "${commentId}"
                    ) {
                        commentId
                    }
                }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();
            await fetch.exec();
            setReplyTo(null);
            setReplyContent("");
            await loadComments(post.communityId, post.postId);
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleLike = async (commentId: string) => {
        if (!post) return;
        try {
            const query = `
                mutation {
                    comment: toggleCommentLike(
                        communityId: "${post.communityId}",
                        postId: "${post.postId}",
                        commentId: "${commentId}"
                    ) {
                        commentId
                    }
                }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();
            await fetch.exec();
            await loadComments(post.communityId, post.postId);
        } catch (err: any) {
            // ignore
        }
    };

    const getInitials = (name?: string, email?: string) => {
        const displayName = name || email || "U";
        return displayName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
    };

    return (
        <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">
                        {LESSON_DISCUSSIONS_HEADER}
                    </h3>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {loading && (
                    <div className="space-y-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                )}

                {!loading && comments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        {LESSON_DISCUSSIONS_EMPTY}
                    </p>
                )}

                {comments.map((comment) => (
                    <div key={comment.commentId} className="space-y-2">
                        <div className="flex gap-2">
                            <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                    {getInitials(
                                        comment.user?.name,
                                        comment.user?.email,
                                    )}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium">
                                        {comment.user?.name ||
                                            comment.user?.email ||
                                            "User"}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(
                                            comment.updatedAt,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm mt-1 break-words">
                                    {comment.deleted
                                        ? DELETED_COMMENT_PLACEHOLDER
                                        : comment.content}
                                </p>
                                {!comment.deleted && (
                                    <div className="flex items-center gap-3 mt-1">
                                        <button
                                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                            onClick={() =>
                                                handleToggleLike(
                                                    comment.commentId,
                                                )
                                            }
                                        >
                                            <Heart
                                                className={`h-3 w-3 ${comment.hasLiked ? "fill-red-500 text-red-500" : ""}`}
                                            />
                                            {comment.likesCount > 0 &&
                                                comment.likesCount}
                                        </button>
                                        <button
                                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                            onClick={() =>
                                                setReplyTo(
                                                    replyTo ===
                                                        comment.commentId
                                                        ? null
                                                        : comment.commentId,
                                                )
                                            }
                                        >
                                            <Reply className="h-3 w-3" />
                                            Reply
                                        </button>
                                    </div>
                                )}

                                {replyTo === comment.commentId && (
                                    <div className="mt-2 flex gap-2">
                                        <Textarea
                                            className="min-h-[60px] text-sm"
                                            placeholder="Write a reply..."
                                            value={replyContent}
                                            onChange={(e) =>
                                                setReplyContent(e.target.value)
                                            }
                                            disabled={submitting}
                                        />
                                        <div className="flex flex-col gap-1">
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    handlePostReply(
                                                        comment.commentId,
                                                    )
                                                }
                                                disabled={
                                                    submitting ||
                                                    !replyContent.trim()
                                                }
                                            >
                                                {submitting ? "..." : "Reply"}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setReplyTo(null);
                                                    setReplyContent("");
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {comment.replies?.length > 0 && (
                                    <div className="ml-4 mt-2 space-y-2 border-l-2 pl-3">
                                        {comment.replies.map((reply) => (
                                            <div
                                                key={reply.replyId}
                                                className="flex gap-2"
                                            >
                                                <Avatar className="h-5 w-5">
                                                    <AvatarFallback className="text-[10px]">
                                                        {getInitials(
                                                            reply.user?.name,
                                                            reply.user?.email,
                                                        )}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium">
                                                            {reply.user?.name ||
                                                                reply.user
                                                                    ?.email ||
                                                                "User"}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(
                                                                reply.updatedAt,
                                                            ).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm mt-1 break-words">
                                                        {reply.deleted
                                                            ? DELETED_COMMENT_PLACEHOLDER
                                                            : reply.content}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="px-4 py-3 border-t">
                <div className="flex gap-2">
                    <Textarea
                        className="min-h-[60px] text-sm"
                        placeholder={LESSON_DISCUSSIONS_WRITE_COMMENT}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={submitting || !post}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handlePostComment();
                            }
                        }}
                    />
                    <Button
                        size="sm"
                        onClick={handlePostComment}
                        disabled={submitting || !newComment.trim() || !post}
                        className="self-end"
                    >
                        {submitting ? "..." : "Post"}
                    </Button>
                </div>
            </div>

            <div className="px-4 py-2 border-t">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() =>
                        router.push(`/course/${slug}/${courseId}#discussions`)
                    }
                >
                    {LESSON_DISCUSSIONS_VIEW_ALL}
                    <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
            </div>
        </div>
    );
}

function escapeString(str: string): string {
    return str
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n");
}
