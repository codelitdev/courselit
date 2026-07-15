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
    CommunityReaction,
    compareCommunityReactionsStable,
    Membership,
} from "@courselit/common-models";
import {
    focusHashTarget,
    getCurrentHashTargetId,
    scrollToHashTarget,
} from "@/lib/hash-target";

function toggleReactionLocally(
    reactions: CommunityReaction[] | undefined,
    emoji: string,
    userId: string,
    userName?: string,
): CommunityReaction[] {
    const list = [...(reactions || [])];
    const idx = list.findIndex((r) => r.emoji === emoji);

    if (idx === -1) {
        const next: CommunityReaction[] = [
            ...list,
            {
                emoji,
                count: 1,
                hasReacted: true,
                reactors: [
                    {
                        userId,
                        name: userName,
                        avatar: {} as CommunityReaction["reactors"][number]["avatar"],
                    },
                ],
            },
        ];
        return next.sort(compareCommunityReactionsStable);
    }

    const existing = list[idx];
    if (existing.hasReacted) {
        const nextCount = existing.count - 1;
        if (nextCount <= 0) {
            return list.filter((_, i) => i !== idx);
        }
        return list.map((r, i) =>
            i === idx
                ? {
                      ...r,
                      count: nextCount,
                      hasReacted: false,
                      reactors: r.reactors.filter((x) => x.userId !== userId),
                  }
                : r,
        );
    }

    return list.map((r, i) =>
        i === idx
            ? {
                  ...r,
                  count: r.count + 1,
                  hasReacted: true,
                  reactors: [
                      ...r.reactors,
                      {
                          userId,
                          name: userName,
                          avatar: {} as CommunityReaction["reactors"][number]["avatar"],
                      },
                  ],
              }
            : r,
    );
}

const focusCommentTarget = (targetId: string) => {
    focusHashTarget({
        targetId,
        eventName: "community-comment-target-change",
    });
};

const REACTIONS_FRAGMENT = `
    reactions {
        emoji
        count
        hasReacted
        reactors {
            userId
            name
            avatar {
                mediaId
                file
                thumbnail
            }
        }
    }
`;

const REPLY_FIELDS = `
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
    ${REACTIONS_FRAGMENT}
    deleted
`;

const COMMENT_FIELDS = `
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
    ${REACTIONS_FRAGMENT}
    replies {
        ${REPLY_FIELDS}
    }
    hasLiked
    updatedAt
    deleted
`;

export default function CommentSection({
    communityId,
    postId,
    onPostUpdated,
    membership,
}: {
    communityId: string;
    postId: string;
    onPostUpdated: (postId: string, commentsCount: number) => void;
    membership: Pick<Membership, "status" | "role" | "rejectionReason">;
}) {
    const [comments, setComments] = useState<CommunityComment[]>([]);
    const [content, setContent] = useState("");
    const address = useContext(AddressContext);
    const [post, setPost] = useState<CommunityPost>();
    const { profile } = useContext(ProfileContext);
    const { toast } = useToast();
    const [isPosting, setIsPosting] = useState(false);
    // Track hash target in state so notification / reply focus can re-scroll
    // without depending on the full `comments` array (reaction updates would
    // re-scroll and cause layout jump if we keyed off array identity).
    const [hashTargetId, setHashTargetId] = useState(() =>
        getCurrentHashTargetId(),
    );

    useEffect(() => {
        loadPost();
        loadComments();
    }, []);

    useEffect(() => {
        const syncFromHash = () => {
            setHashTargetId(getCurrentHashTargetId());
        };

        // Client navigations / pushState may set the hash after mount.
        syncFromHash();
        window.addEventListener("hashchange", syncFromHash);
        // pushState does not fire hashchange; notifications use this event.
        window.addEventListener(
            "community-comment-target-change",
            syncFromHash,
        );

        return () => {
            window.removeEventListener("hashchange", syncFromHash);
            window.removeEventListener(
                "community-comment-target-change",
                syncFromHash,
            );
        };
    }, []);

    useEffect(() => {
        if (!hashTargetId || comments.length === 0) {
            return;
        }

        // Defer until after paint so nested reply nodes are in the DOM.
        let cancelled = false;
        const frame = window.requestAnimationFrame(() => {
            if (cancelled) {
                return;
            }
            if (!scrollToHashTarget({ targetId: hashTargetId })) {
                // Retry once for nested replies that paint a frame later.
                window.requestAnimationFrame(() => {
                    if (!cancelled) {
                        scrollToHashTarget({ targetId: hashTargetId });
                    }
                });
            }
        });

        return () => {
            cancelled = true;
            window.cancelAnimationFrame(frame);
        };
        // Intentionally depend on comments.length (not `comments`) so reaction
        // optimistic updates — which keep the same count — do not re-scroll.
    }, [hashTargetId, comments.length]);

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
                    ${COMMENT_FIELDS}
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
                    ${COMMENT_FIELDS}
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
                // Newest first — match getComments sort and keep new posts near the composer.
                setComments((prevComments) => [
                    response.comment,
                    ...prevComments,
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
                    ${COMMENT_FIELDS}
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

    const handleCommentReact = async (commentId: string, emoji: string) => {
        const userId = profile?.userId;
        if (!userId) return;

        // Optimistic update so the pill appears immediately
        setComments((prev) =>
            prev.map((c) =>
                c.commentId === commentId
                    ? {
                          ...c,
                          reactions: toggleReactionLocally(
                              c.reactions,
                              emoji,
                              userId,
                              profile?.name,
                          ),
                      }
                    : c,
            ),
        );

        const query = `
            mutation ($communityId: String!, $postId: String!, $commentId: String!, $emoji: String!) {
                comment: toggleCommentReaction(communityId: $communityId, postId: $postId, commentId: $commentId, emoji: $emoji) {
                    ${COMMENT_FIELDS}
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
                    emoji,
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
            // Re-sync from server on failure
            loadComments();
            toast({
                title: "Error",
                description: err.message,
            });
        }
    };

    const handleReplyReact = async (
        commentId: string,
        emoji: string,
        replyId: string,
    ) => {
        const userId = profile?.userId;
        if (!userId) return;

        // Optimistic update on the specific reply
        setComments((prev) =>
            prev.map((c) => {
                if (c.commentId !== commentId) return c;
                return {
                    ...c,
                    replies: (c.replies || []).map((r) =>
                        r.replyId === replyId
                            ? {
                                  ...r,
                                  reactions: toggleReactionLocally(
                                      r.reactions,
                                      emoji,
                                      userId,
                                      profile?.name,
                                  ),
                              }
                            : r,
                    ),
                };
            }),
        );

        const query = `
            mutation ($communityId: String!, $postId: String!, $commentId: String!, $replyId: String!, $emoji: String!) {
                comment: toggleCommentReplyReaction(communityId: $communityId, postId: $postId, commentId: $commentId, replyId: $replyId, emoji: $emoji) {
                    ${COMMENT_FIELDS}
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
                    emoji,
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
            loadComments();
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
                    ${COMMENT_FIELDS}
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
                c.commentId === comment.commentId
                    ? {
                          ...comment,
                          // Ensure new array identity so nested reply bars re-render
                          replies: comment.replies
                              ? comment.replies.map((r) => ({ ...r }))
                              : [],
                          reactions: comment.reactions
                              ? [...comment.reactions]
                              : [],
                      }
                    : c,
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
            <div className="space-y-4 overflow-y-auto">
                {comments.map((comment) => (
                    <Comment
                        communityId={communityId}
                        key={comment.commentId}
                        membership={membership}
                        comment={comment}
                        onReact={(
                            commentId: string,
                            emoji: string,
                            replyId?: string,
                        ) => {
                            if (replyId) {
                                handleReplyReact(commentId, emoji, replyId);
                            } else {
                                handleCommentReact(commentId, emoji);
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
        </div>
    );
}
