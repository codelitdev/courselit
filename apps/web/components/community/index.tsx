"use client";

import { useState, useEffect, useRef } from "react";
import { CreatePostDialog } from "./create-post-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { MessageSquare, ThumbsUp, Pin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { mockPosts, Post, Comment as CommentType } from "./mock-data";
import { Comment } from "./comment";
import { useRouter } from "next/navigation";

const allCategories = [
    "All",
    "General discussion",
    "Tips",
    "Questions",
    "Announcements",
    "Events",
    "Feedback",
    "Ideas",
    "Off-topic",
];

export function CommunityForum({
    activeCategory = "All",
}: {
    activeCategory?: string;
}) {
    const router = useRouter();
    const [showAllCategories, setShowAllCategories] = useState(false);
    const [posts, setPosts] = useState<Post[]>(mockPosts);
    const [newComments, setNewComments] = useState<{
        [postId: number]: string;
    }>({});
    const commentsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollToBottom();
    }, [posts]);

    const scrollToBottom = () => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const visibleCategories = showAllCategories
        ? allCategories
        : allCategories.slice(0, 3);

    const toggleCategories = () => {
        setShowAllCategories((prev) => !prev);
    };

    const handleCategoryClick = (category: string) => {
        router.push(`/dashboard4/community?category=${category}`);
    };

    const handleLike = (postId: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setPosts((prevPosts) =>
            prevPosts.map((post) =>
                post.id === postId
                    ? {
                          ...post,
                          likes: post.hasLiked
                              ? post.likes - 1
                              : post.likes + 1,
                          hasLiked: !post.hasLiked,
                      }
                    : post,
            ),
        );
    };

    const togglePin = (postId: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setPosts((prevPosts) =>
            prevPosts.map((post) =>
                post.id === postId
                    ? { ...post, isPinned: !post.isPinned }
                    : post,
            ),
        );
    };

    const handleCommentLike = (postId: number, commentId: number) => {
        setPosts((prevPosts) =>
            prevPosts.map((post) =>
                post.id === postId
                    ? {
                          ...post,
                          comments: likeComment(post.comments, commentId),
                      }
                    : post,
            ),
        );
    };

    const likeComment = (
        comments: CommentType[],
        commentId: number,
    ): CommentType[] => {
        return comments.map((comment) =>
            comment.id === commentId
                ? {
                      ...comment,
                      likes: comment.hasLiked
                          ? comment.likes - 1
                          : comment.likes + 1,
                      hasLiked: !comment.hasLiked,
                  }
                : {
                      ...comment,
                      replies: likeComment(comment.replies, commentId),
                  },
        );
    };

    const handleCommentReply = (
        postId: number,
        parentCommentId: number,
        content: string,
    ) => {
        setPosts((prevPosts) =>
            prevPosts.map((post) =>
                post.id === postId
                    ? {
                          ...post,
                          comments: addReplyToComment(
                              post.comments,
                              parentCommentId,
                              content,
                          ),
                      }
                    : post,
            ),
        );
    };

    const addReplyToComment = (
        comments: CommentType[],
        parentCommentId: number,
        content: string,
    ): CommentType[] => {
        return comments.map((comment) =>
            comment.id === parentCommentId
                ? {
                      ...comment,
                      replies: [
                          ...comment.replies,
                          {
                              id: Date.now(),
                              author: "Current User",
                              avatar: "/placeholder.svg",
                              content,
                              likes: 0,
                              hasLiked: false,
                              time: "Just now",
                              replies: [],
                          },
                      ],
                  }
                : {
                      ...comment,
                      replies: addReplyToComment(
                          comment.replies,
                          parentCommentId,
                          content,
                      ),
                  },
        );
    };

    const handleNewCommentChange = (postId: number, content: string) => {
        setNewComments((prev) => ({ ...prev, [postId]: content }));
    };

    const handlePostComment = (postId: number) => {
        const content = newComments[postId];
        if (content && content.trim()) {
            setPosts((prevPosts) =>
                prevPosts.map((post) =>
                    post.id === postId
                        ? {
                              ...post,
                              comments: [
                                  ...post.comments,
                                  {
                                      id: Date.now(),
                                      author: "Current User",
                                      avatar: "/placeholder.svg",
                                      content: content.trim(),
                                      likes: 0,
                                      hasLiked: false,
                                      time: "Just now",
                                      replies: [],
                                  },
                              ],
                          }
                        : post,
                ),
            );
            setNewComments((prev) => ({ ...prev, [postId]: "" }));
        }
    };

    const addNewPost = (
        newPost: Omit<
            Post,
            "id" | "likes" | "comments" | "isPinned" | "hasLiked"
        >,
    ) => {
        const post: Post = {
            ...newPost,
            id: Date.now(),
            likes: 0,
            comments: [],
            isPinned: false,
            hasLiked: false,
        };
        setPosts((prevPosts) => [post, ...prevPosts]);
    };

    const renderMediaPreview = (media: Post["media"]) => {
        if (!media) return null;

        switch (media.type) {
            case "image":
            case "gif":
                return (
                    <img
                        src={media.url}
                        alt="Post media"
                        className="w-24 h-24 object-cover rounded-md"
                    />
                );
            case "video":
                return (
                    <video
                        src={media.url}
                        className="w-24 h-24 object-cover rounded-md"
                    >
                        Your browser does not support the video tag.
                    </video>
                );
            case "youtube":
                return (
                    <img
                        src={`https://img.youtube.com/vi/${media.url.split("/").pop()}/hqdefault.jpg`}
                        alt="YouTube thumbnail"
                        className="w-24 h-24 object-cover rounded-md"
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-4 space-y-6">
            <CreatePostDialog onPostCreated={addNewPost} />

            <div className="flex gap-2 flex-wrap">
                {visibleCategories.map((category, index) => (
                    <Button
                        key={category}
                        variant={
                            category === activeCategory ? "primary" : "outline"
                        }
                        size="sm"
                        className={`rounded-full ${category === activeCategory ? "bg-gray-500 text-white" : ""}`}
                        onClick={() => handleCategoryClick(category)}
                    >
                        {category}
                    </Button>
                ))}
                <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={toggleCategories}
                >
                    {showAllCategories ? "Less" : "More..."}
                </Button>
            </div>

            <Alert>
                <AlertDescription>
                    Welcome to our community forum! Please be respectful and
                    follow our community guidelines.
                </AlertDescription>
            </Alert>

            {posts.length > 0 ? (
                posts.map((post) => (
                    <Dialog key={post.id}>
                        <DialogTrigger asChild>
                            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                                <CardHeader className="flex flex-row items-start space-y-0 gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Avatar className="h-10 w-10 flex-shrink-0">
                                                <AvatarImage
                                                    src={post.avatar}
                                                    alt={`${post.author}'s avatar`}
                                                />
                                                <AvatarFallback>
                                                    {post.author
                                                        .split(" ")
                                                        .map((n) => n[0])
                                                        .join("")}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold truncate">
                                                    {post.author}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {post.time} •{" "}
                                                    {post.category}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-sm mb-4 line-clamp-3">
                                            {post.content}
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`text-muted-foreground ${post.hasLiked ? "bg-accent" : ""}`}
                                                onClick={(e) =>
                                                    handleLike(post.id, e)
                                                }
                                            >
                                                <ThumbsUp className="h-4 w-4 mr-2" />
                                                {post.likes}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-muted-foreground"
                                            >
                                                <MessageSquare className="h-4 w-4 mr-2" />
                                                {post.comments.length}
                                            </Button>
                                        </div>
                                    </div>
                                    {post.media && (
                                        <div className="flex-shrink-0">
                                            {renderMediaPreview(post.media)}
                                        </div>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`flex-shrink-0 rounded-full ${post.isPinned ? "bg-accent" : ""}`}
                                        onClick={(e) => togglePin(post.id, e)}
                                    >
                                        <Pin className="h-4 w-4" />
                                        <span className="sr-only">
                                            Pin post
                                        </span>
                                    </Button>
                                </CardHeader>
                            </Card>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] w-full overflow-y-auto max-h-[calc(100vh-4rem)] my-8">
                            <div className="grid gap-4">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage
                                            src={post.avatar}
                                            alt={`${post.author}'s avatar`}
                                        />
                                        <AvatarFallback>
                                            {post.author
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-semibold">
                                            {post.author}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {post.time} • {post.category}
                                        </div>
                                    </div>
                                </div>
                                <p>{post.content}</p>
                                {post.media && (
                                    <div className="w-full">
                                        {renderMediaPreview(post.media)}
                                    </div>
                                )}
                                <div className="flex items-center gap-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`text-muted-foreground ${post.hasLiked ? "bg-accent" : ""}`}
                                        onClick={() => handleLike(post.id)}
                                    >
                                        <ThumbsUp className="h-4 w-4 mr-2" />
                                        {post.likes}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground"
                                    >
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        {post.comments.length}
                                    </Button>
                                </div>
                                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                                    {post.comments.map((comment) => (
                                        <Comment
                                            key={comment.id}
                                            comment={comment}
                                            onLike={(commentId) =>
                                                handleCommentLike(
                                                    post.id,
                                                    commentId,
                                                )
                                            }
                                            onReply={(commentId, content) =>
                                                handleCommentReply(
                                                    post.id,
                                                    commentId,
                                                    content,
                                                )
                                            }
                                        />
                                    ))}
                                    <div ref={commentsEndRef} />
                                </div>
                                <Textarea
                                    placeholder="Add a comment..."
                                    value={newComments[post.id] || ""}
                                    onChange={(e) =>
                                        handleNewCommentChange(
                                            post.id,
                                            e.target.value,
                                        )
                                    }
                                />
                                <Button
                                    onClick={() => handlePostComment(post.id)}
                                >
                                    Post Comment
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                ))
            ) : (
                <div className="text-center py-8">No posts found.</div>
            )}
        </div>
    );
}
