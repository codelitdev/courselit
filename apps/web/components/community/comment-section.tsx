"use client";

import { AddressContext, ProfileContext } from "@components/contexts";
import { Button } from "@components/ui/button";
import { FetchBuilder, extractVideoId } from "@courselit/utils";
import { useContext, useEffect, useState, useCallback } from "react";
import { Link, useToast } from "@courselit/components-library";
import { Comment } from "./comment";
import {
    CommunityComment,
    CommunityCommentReply,
    CommunityPost,
    Membership,
    TextEditorContent,
} from "@courselit/common-models";
import { Editor, emptyDoc as TextEditorEmptyDoc } from "@courselit/text-editor";
import { MediaPreview } from "./media-preview";
import type { MediaItem } from "./media-item";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Paperclip, Video, Image as ImageIcon } from "lucide-react";
import { GifSelector } from "./gif-selector";

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

const createClientId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

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
    const [content, setContent] = useState<TextEditorContent>(
        TextEditorEmptyDoc as TextEditorContent,
    );
    const [media, setMedia] = useState<MediaItem[]>([]);
    const address = useContext(AddressContext);
    const [post, setPost] = useState<CommunityPost>();
    const { profile } = useContext(ProfileContext);
    const { toast } = useToast();
    const [isPosting, setIsPosting] = useState(false);
    const [isGifSelectorOpen, setIsGifSelectorOpen] = useState(false);
    const [videoUrl, setVideoUrl] = useState("");

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
                        title
                        url
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
                        media {
                            type
                            title
                            url
                            media {
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

    const handleFileUpload = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (files) {
                const nextItems: MediaItem[] = Array.from(files).map((file) => {
                    const url = URL.createObjectURL(file);
                    const isPdf = file.type === "application/pdf";
                    const isImage = file.type.startsWith("image/");
                    const type = isPdf ? "pdf" : isImage ? "image" : "video";

                    return {
                        type,
                        url,
                        title: file.name,
                        file,
                        clientId: createClientId(),
                        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)}mb`,
                    };
                });

                setMedia((prevMedia) => [...prevMedia, ...nextItems]);
            }
        },
        [],
    );

    const handleMediaRemove = useCallback((index: number) => {
        setMedia((prevMedia) => {
            const mediaToRemove = prevMedia[index];
            if (mediaToRemove?.file && mediaToRemove.url?.startsWith("blob:")) {
                URL.revokeObjectURL(mediaToRemove.url);
            }
            return prevMedia.filter((_, i) => i !== index);
        });
    }, []);

    const handleGifSelect = useCallback((gifUrl: string) => {
        setMedia((prevMedia) => [
            ...prevMedia,
            {
                type: "gif",
                url: gifUrl,
                title: "GIF",
                clientId: createClientId(),
            },
        ]);
        setIsGifSelectorOpen(false);
    }, []);

    const handleVideoAdd = useCallback((url: string) => {
        const videoId = extractVideoId(url, "youtube");
        if (videoId) {
            setMedia((prevMedia) => [
                ...prevMedia,
                {
                    type: "youtube",
                    url: `https://www.youtube.com/embed/${videoId}`,
                    title: "YouTube Video",
                    clientId: createClientId(),
                },
            ]);
        }
        setVideoUrl("");
    }, []);

    const handlePostComment = async () => {
        if (!content || !profile?.name) return;

        const query = `
            mutation ($communityId: String!, $postId: String!, $content: JSONObject!, $media: [CommunityPostInputMedia]) {
                comment: postComment(communityId: $communityId, postId: $postId, content: $content, media: $media) {
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
                        title
                        url
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
                        media {
                            type
                            title
                            url
                            media {
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
                    media:
                        media.length > 0
                            ? media.map((m) => ({
                                  type: m.type,
                                  title: m.title,
                                  url: m.url,
                                  media: m.media,
                              }))
                            : undefined,
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
                setContent(TextEditorEmptyDoc as TextEditorContent);
                setMedia([]);
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
        replyContent: TextEditorContent | string,
        replyMedia: MediaItem[],
        parentReplyId?: string,
    ) => {
        const query = `
            mutation ($communityId: String!, $postId: String!, $commentId: String!, $content: JSONObject!, $parentReplyId: String, $media: [CommunityPostInputMedia]) {
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
                        title
                        url
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
                        media {
                            type
                            title
                            url
                            media {
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
                    content: replyContent,
                    parentReplyId,
                    media:
                        replyMedia.length > 0
                            ? replyMedia.map((m) => ({
                                  type: m.type,
                                  title: m.title,
                                  url: m.url,
                                  media: m.media,
                              }))
                            : undefined,
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
                        title
                        url
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
                        media {
                            type
                            title
                            url
                            media {
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
                        title
                        url
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
                        media {
                            type
                            title
                            url
                            media {
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
                        title
                        url
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
                        media {
                            type
                            title
                            url
                            media {
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
                        comment={comment}
                        onLike={(commentId: string, replyId?: string) => {
                            if (replyId) {
                                handleReplyLike(commentId, replyId);
                            } else {
                                handleCommentLike(commentId);
                            }
                        }}
                        onReply={(
                            commentId,
                            replyContent,
                            replyMedia,
                            parentReplyId?: string,
                        ) =>
                            handleCommentReply(
                                commentId,
                                replyContent,
                                replyMedia,
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
                    <div>
                        <Editor
                            url={address.backend}
                            initialContent={content}
                            onChange={(value) =>
                                setContent(value as TextEditorContent)
                            }
                            placeholder="Add a comment..."
                            showToolbar={false}
                        />
                    </div>
                    {media.length > 0 && (
                        <div className="overflow-x-auto">
                            <MediaPreview
                                items={media}
                                onRemove={handleMediaRemove}
                            />
                        </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                            <Popover modal={true}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9"
                                    >
                                        <Paperclip className="h-5 w-5" />
                                        <span className="sr-only">
                                            Attach files
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <div className="grid gap-4">
                                        <h4 className="font-medium leading-none">
                                            Attach files
                                        </h4>
                                        <Input
                                            id="comment-file"
                                            type="file"
                                            multiple
                                            accept="image/*,video/*,application/pdf"
                                            onChange={handleFileUpload}
                                        />
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <Popover
                                open={isGifSelectorOpen}
                                onOpenChange={setIsGifSelectorOpen}
                                modal={true}
                            >
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9"
                                    >
                                        <ImageIcon className="h-5 w-5" />
                                        <span className="sr-only">Add GIF</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <GifSelector
                                        onGifSelect={handleGifSelect}
                                    />
                                </PopoverContent>
                            </Popover>
                            <Popover modal={true}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9"
                                    >
                                        <Video className="h-5 w-5" />
                                        <span className="sr-only">
                                            Add video
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <div className="grid gap-4">
                                        <h4 className="font-medium leading-none">
                                            Add video
                                        </h4>
                                        <Input
                                            id="comment-video"
                                            type="url"
                                            placeholder="https://youtube.com/watch?v="
                                            value={videoUrl}
                                            onChange={(e) =>
                                                setVideoUrl(e.target.value)
                                            }
                                        />
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                handleVideoAdd(videoUrl)
                                            }
                                            disabled={!videoUrl.trim()}
                                        >
                                            Add Video
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Button
                            onClick={handlePostComment}
                            disabled={isPosting}
                        >
                            {isPosting ? "Posting..." : "Post Comment"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
