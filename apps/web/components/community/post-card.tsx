"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card";
import {
    normalizeTextEditorContent,
    TextRenderer,
    truncateTextEditorContent,
} from "@courselit/page-blocks";
import { CommunityMedia, CommunityPost } from "@courselit/common-models";
import { capitalize, truncate } from "@courselit/utils";
import { MessageSquare, Pin } from "lucide-react";
import Link from "next/link";
import { useContext } from "react";
import { ThemeContext } from "@components/contexts";
import { ReactionsBar } from "./reactions-bar";

interface CommunityPostCardProps {
    post: CommunityPost;
    communityName?: string;
    communityId?: string;
    canModerate?: boolean;
    formatTimestamp: (value?: string) => string;
    renderMediaPreview: (media: CommunityMedia) => React.ReactNode;
    onOpen: (postId: string) => void;
    onTogglePin?: (postId: string, e?: React.MouseEvent) => void;
    onReact?: (postId: string, emoji: string, e?: React.MouseEvent) => void;
}

export default function CommunityPostCard({
    post,
    communityName,
    communityId,
    canModerate = false,
    formatTimestamp,
    renderMediaPreview,
    onOpen,
    onTogglePin,
    onReact,
}: CommunityPostCardProps) {
    const { theme } = useContext(ThemeContext);

    return (
        <Card
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => onOpen(post.postId)}
        >
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage
                                src={
                                    post.user.avatar?.file ||
                                    "/courselit_backdrop_square.webp"
                                }
                                alt={`${post.user.name}'s avatar`}
                            />
                            <AvatarFallback>
                                {post.user.name &&
                                    post.user.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm">
                                {post.user.name || post.user.email}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {formatTimestamp(post.updatedAt)} •{" "}
                                {capitalize(post.category)}
                                {communityName && communityId && (
                                    <>
                                        {" "}
                                        •{" "}
                                        <Link
                                            href={`/dashboard/community/${communityId}`}
                                            className="underline underline-offset-2 hover:text-foreground"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {truncate(communityName, 50)}
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {canModerate && onTogglePin && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`flex-shrink-0 rounded-full ${post.pinned ? "bg-accent" : ""}`}
                        onClick={(e) => onTogglePin(post.postId, e)}
                    >
                        <Pin className="h-4 w-4" />
                        <span className="sr-only">Pin post</span>
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <p className="mb-4 line-clamp-3 text-base font-semibold">
                    {post.title}
                </p>
                <div className="mb-4 text-sm">
                    <TextRenderer
                        json={truncateTextEditorContent(
                            normalizeTextEditorContent(post.content),
                            500,
                        )}
                        className="text-sm [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base"
                        theme={theme.theme}
                    />
                </div>
                {post.media && (
                    <div className="flex gap-2 overflow-x-auto">
                        {post.media.map((media, index) => (
                            <div
                                className="flex-shrink-0"
                                key={
                                    media.media?.mediaId ||
                                    media.url ||
                                    `${media.type}:${media.title || "untitled"}:${index}`
                                }
                            >
                                {renderMediaPreview(media)}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <div className="flex items-center gap-4">
                    <ReactionsBar
                        reactions={post.reactions || []}
                        onReact={(emoji) => onReact?.(post.postId, emoji)}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                    >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        {post.commentsCount}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
