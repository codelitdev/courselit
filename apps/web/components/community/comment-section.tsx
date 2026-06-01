import { AddressContext, ProfileContext } from "@components/contexts";
import { Button } from "@components/ui/button";
import { Textarea } from "@components/ui/textarea";
import { FetchBuilder } from "@courselit/utils";
import { useContext, useEffect, useState } from "react";
import { Link, useToast } from "@courselit/components-library";
import { Comment } from "./comment";
import {
    CommunityComment,
    CommunityCommentReply,
    CommunityPost,
    Membership,
} from "@courselit/common-models";

const HASH_HIGHLIGHT_CLASSES = [
    "border-border",
    "bg-accent/40",
    "shadow-sm",
    "ring-1",
    "ring-ring/20",
];

const scrollToHashTarget = () => {
    const hash = window.location.hash.slice(1);

    if (!hash) {
        return false;
    }

    const el = document.getElementById(hash);

    if (!el) {
        return false;
    }

    el.scrollIntoView({
        behavior: "smooth",
        block: "center",
    });
    el.classList.add(...HASH_HIGHLIGHT_CLASSES);
    window.setTimeout(
        () => el.classList.remove(...HASH_HIGHLIGHT_CLASSES),
        2200,
    );

    return true;
};

const focusCommentTarget = (targetId: string) => {
    const url = new URL(window.location.href);
    url.hash = targetId;
    window.history.pushState({}, "", url.toString());
    window.dispatchEvent(new Event("community-comment-target-change"));
};

export default function CommentSection({
    communityId,
    postId,
    onPostUpdated,
    membership,
    canModerate,
}: {
    communityId: string;
    postId: string;
    onPostUpdated: (postId: string, commentsCount: number) => void;
    membership?: Pick<Membership, "status" | "role" | "rejectionReason">;
    canModerate?: boolean;
}) {
    const [comments, setComments] = useState<CommunityComment[]>([]);
    const [content, setContent] = useState("");
    const address = useContext(AddressContext);
    const [post, setPost] = useState<CommunityPost>();
    const { profile } = useContext(ProfileContext);
    const { toast } = useToast();
    const [isPosting, setIsPosting] = useState(false);

    useEffect(() => {
        loadPost();
        loadComments();
    }, []);

    useEffect(() => {
        if (comments.length === 0) return;
        if (scrollToHashTarget()) return;
    }, [comments]);

    useEffect(() => {
        if (comments.length === 0) {
            return;
        }

        const handleTargetChange = () => {
            scrollToHashTarget();
        };

        window.addEventListener("hashchange", handleTargetChange);
        window.addEventListener(
            "community-comment-target-change",
            handleTargetChange,
        );

        return () => {
            window.removeEventListener("hashchange", handleTargetChange);
            window.removeEventListener(
                "community-comment-target-change",
                handleTargetChange,
            );
        };
    }, [comments.length]);

    useEffect(() => {
        if (post && typeof post.commentsCount !== "undefined") {
            onPostUpdated(postId, post.commentsCount);
        }
    }, [post]);

    const loadPost = async () => {
        const query = `
            query ($communityId: String!, $postId: String!) {
                post: getPost(communityId: $communityId, postId: $postId) {
                    commentsCount
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    communityId,
                    postId,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.post) {
                setPost(response.post);
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
            });
        }
    };

    const loadComments = async () => {
        const query = `
            query ($communityId: String!, $postId: String!) {
                comments: getComments(communityId: $communityId, postId: $postId) {
                    communityId
                    postId
                    commentId
                    content
                    user {
                        userId
                        name
                        avatar {
                            mediaId
                            file
                            thumbnail
                        }
                    }
                    media {
                        type
                        media {
                            mediaId
                            file
                            thumbnail
                            size
                        }
                    }
                    likesCount
                    replies {
                        replyId
                        content
                        user {
                            userId
                            name
                            avatar {
                                mediaId
                                file
                                thumbnail
                            }
                        }
                        updatedAt
                        likesCount
                        hasLiked
                        deleted
                    } 
                    hasLiked
                    updatedAt
                    deleted
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    communityId,
                    postId,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.comments) {
                setComments(response.comments);
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
            });
        }
    };

    const handlePostComment = async () => {
        if (!content) return;

        const query = `
            mutation ($communityId: String!, $postId: String!, $content: String!) {
                comment: postComment(communityId: $communityId, postId: $postId, content: $content) {
                    communityId
                    postId
                    commentId
                    content
                    user {
                        userId
                        name
                        avatar {
                            mediaId
                            file
                            thumbnail
                        }
                    }
                    media {
                        type
                        media {
                            mediaId
                            file
                            thumbnail
                            size
                        }
                    }
                    likesCount
                    replies {
                        replyId
                        content
                        user {
                            userId
                            name
                            avatar {
                                mediaId
                                file
                                thumbnail
                            }
                        }
                        updatedAt
                        likesCount
                        hasLiked
                        deleted
                    } 
                    hasLiked
                    updatedAt
                    deleted
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    communityId,
                    postId,
                    content,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        setIsPosting(true);
        try {
            const response = await fetch.exec();
            if (response.comment) {
                setComments((prevComments) => [
                    ...prevComments,
                    response.comment,
                ]);
                setContent("");
                focusCommentTarget(response.comment.commentId);
                setPost((prevPost) => {
                    if (prevPost) {
                        return {
                            ...prevPost,
                            commentsCount: prevPost.commentsCount + 1,
                        };
                    }
                    return prevPost;
                });
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
            });
        } finally {
            setIsPosting(false);
        }
    };

    const handleCommentReply = async (
        commentId: string,
        content: string,
        parentReplyId?: string,
    ) => {
        const query = `
            mutation ($communityId: String!, $postId: String!, $commentId: String!, $content: String!, $parentReplyId: String, $media: [CommunityPostInputMedia]) {
                comment: postComment(communityId: $communityId, postId: $postId, parentCommentId: $commentId, content: $content, parentReplyId: $parentReplyId, media: $media) {
                    communityId
                    postId
                    commentId
                    content
                    user {
                        userId
                        name
                        avatar {
                            mediaId
                            file
                            thumbnail
                        }
                    }
                    media {
                        type
                        media {
                            mediaId
                            file
                            thumbnail
                            size
                        }
                    }
                    likesCount
                    replies {
                        replyId
                        content
                        user {
                            userId
                            name
                            avatar {
                                mediaId
                                file
                                thumbnail
                            }
                        }
                        updatedAt
                        likesCount
                        hasLiked
                        deleted
                    } 
                    hasLiked
                    updatedAt
                    deleted
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    communityId,
                    postId,
                    commentId,
                    content,
                    parentReplyId,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.comment) {
                replaceComment(response.comment);
                const latestReply =
                    response.comment.replies[
                        response.comment.replies.length - 1
                    ];
                focusCommentTarget(latestReply?.replyId || commentId);
                setPost((prevPost) => {
                    if (prevPost) {
                        return {
                            ...prevPost,
                            commentsCount: prevPost.commentsCount + 1,
                        };
                    }
                    return prevPost;
                });
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
            });
        }
    };

    const handleCommentLike = async (commentId: string) => {
        const query = `
            mutation ($communityId: String!, $postId: String!, $commentId: String!) {
                comment: toggleCommentLike(communityId: $communityId, postId: $postId, commentId: $commentId) {
                    communityId
                    postId
                    commentId
                    content
                    user {
                        userId
                        name
                        avatar {
                            mediaId
                            file
                            thumbnail
                        }
                    }
                    media {
                        type
                        media {
                            mediaId
                            file
                            thumbnail
                            size
                        }
                    }
                    likesCount
                    replies {
                        replyId
                        content
                        user {
                            userId
                            name
                            avatar {
                                mediaId
                                file
                                thumbnail
                            }
                        }
                        updatedAt
                        likesCount
                        hasLiked
                        deleted
                    } 
                    hasLiked
                    updatedAt
                    deleted
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    communityId,
                    postId,
                    commentId,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.comment) {
                replaceComment(response.comment);
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
            });
        }
    };

    const handleReplyLike = async (commentId: string, replyId: string) => {
        const query = `
            mutation ($communityId: String!, $postId: String!, $commentId: String!, $replyId: String!) {
                comment: toggleCommentReplyLike(communityId: $communityId, postId: $postId, commentId: $commentId, replyId: $replyId) {
                    communityId
                    postId
                    commentId
                    content
                    user {
                        userId
                        name
                        avatar {
                            mediaId
                            file
                            thumbnail
                        }
                    }
                    media {
                        type
                        media {
                            mediaId
                            file
                            thumbnail
                        }
                    }
                    likesCount
                    replies {
                        replyId
                        content
                        user {
                            userId
                            name
                            avatar {
                                mediaId
                                file
                                thumbnail
                            }
                        }
                        updatedAt
                        likesCount
                        hasLiked
                        deleted
                    } 
                    hasLiked
                    updatedAt
                    deleted
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    communityId,
                    postId,
                    commentId,
                    replyId,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.comment) {
                replaceComment(response.comment);
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
            });
        }
    };

    const handleDeleteComment = async (
        comment: CommunityComment | CommunityCommentReply,
    ) => {
        const query = `
            mutation ($communityId: String!, $postId: String!, $commentId: String!, $replyId: String) {
                comment: deleteComment(communityId: $communityId, postId: $postId, commentId: $commentId, replyId: $replyId) {
                    communityId
                    postId
                    commentId
                    content
                    user {
                        userId
                        name
                        avatar {
                            mediaId
                            file
                            thumbnail
                        }
                    }
                    media {
                        type
                        media {
                            mediaId
                            file
                            thumbnail
                            size
                        }
                    }
                    likesCount
                    replies {
                        replyId
                        content
                        user {
                            userId
                            name
                            avatar {
                                mediaId
                                file
                                thumbnail
                            }
                        }
                        updatedAt
                        likesCount
                        hasLiked
                        deleted
                    } 
                    hasLiked
                    updatedAt
                    deleted
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    communityId,
                    postId,
                    commentId: (comment as CommunityComment).commentId,
                    replyId: (comment as CommunityCommentReply).replyId,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.comment) {
                replaceComment(response.comment);
            } else {
                removeComment(comment as CommunityComment);
            }
            loadPost();
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
            });
        }
    };

    const replaceComment = (comment: CommunityComment) => {
        setComments((prevComments) =>
            prevComments.map((c) =>
                c.commentId === comment.commentId ? comment : c,
            ),
        );
    };

    const removeComment = (comment: CommunityComment) => {
        setComments((prevComments) =>
            prevComments.filter((c) => c.commentId !== comment.commentId),
        );
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="space-y-4 overflow-y-auto">
                {comments.map((comment) => (
                    <Comment
                        communityId={communityId}
                        key={comment.commentId}
                        membership={membership}
                        canModerate={canModerate}
                        comment={comment}
                        onLike={(commentId: string, replyId?: string) => {
                            if (replyId) {
                                handleReplyLike(commentId, replyId);
                            } else {
                                handleCommentLike(commentId);
                            }
                        }}
                        onReply={(commentId, content, parentReplyId?: string) =>
                            handleCommentReply(
                                commentId,
                                content,
                                parentReplyId,
                            )
                        }
                        onDelete={handleDeleteComment}
                        isPosting={isPosting}
                    />
                ))}
            </div>
            {!profile?.name && (
                <div className="text-center text-gray-500">
                    Complete your{" "}
                    <span className="underline">
                        <Link href={"/dashboard/profile"}>profile</Link>
                    </span>{" "}
                    to join this community or post here
                </div>
            )}
            {profile?.name && (
                <div className="flex flex-col gap-2">
                    <Textarea
                        placeholder="Add a comment..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                    <Button onClick={handlePostComment} disabled={isPosting}>
                        {isPosting ? "Posting..." : "Post Comment"}
                    </Button>
                </div>
            )}
        </div>
    );
}
