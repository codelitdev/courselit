"use client";

import { useContext, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    ThumbsUp,
    MessageSquare,
    MoreVertical,
    FlagTriangleRight,
    Trash,
} from "lucide-react";
import {
    CommunityComment,
    CommunityCommentReply,
    Constants,
    CommunityMedia,
    Membership,
    TextEditorContent,
} from "@courselit/common-models";
import {
    formattedLocaleDate,
    hasCommunityPermission,
    isTextEditorNonEmpty,
} from "@ui-lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddressContext, ProfileContext } from "@components/contexts";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { isCommunityComment } from "./utils";
import { DELETED_COMMENT_PLACEHOLDER } from "@ui-config/strings";
import { useToast } from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import { TextRenderer } from "@courselit/page-blocks";
import { MediaPreview } from "./media-preview";
import type { MediaItem } from "./media-item";
import { Editor, emptyDoc as TextEditorEmptyDoc } from "@courselit/text-editor";

const createClientId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

type CommentOrReply =
    | CommunityComment
    | (CommunityCommentReply & { commentId: string });

interface CommentProps {
    communityId: string;
    comment: CommentOrReply;
    onLike: (commentId: string, replyId?: string) => void;
    onReply: (
        commentId: string,
        content: TextEditorContent | string,
        media: MediaItem[],
        parentReplyId?: string,
    ) => void;
    onDelete: (comment: CommentOrReply) => void;
    depth?: number;
    membership: Pick<Membership, "status" | "role" | "rejectionReason">;
    isPosting?: boolean;
}

export function Comment({
    communityId,
    comment,
    onLike,
    onReply,
    onDelete,
    membership,
    depth = 0,
    isPosting = false,
}: CommentProps) {
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState<TextEditorContent>(
        TextEditorEmptyDoc as TextEditorContent,
    );
    const [replyMedia, setReplyMedia] = useState<MediaItem[]>([]);
    const [replyEditorKey, setReplyEditorKey] = useState(0);
    const [commentToDelete, setCommentToDelete] =
        useState<CommentOrReply | null>(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [showReportConfirmation, setShowReportConfirmation] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [commentToReport, setCommentToReport] =
        useState<CommentOrReply | null>(null);
    const { profile } = useContext(ProfileContext);
    const address = useContext(AddressContext);
    const { toast } = useToast();

    const handleDeletePost = (comment: CommentOrReply) => {
        setCommentToDelete(comment);
        setShowDeleteConfirmation(true);
    };

    const confirmDeletePost = () => {
        if (commentToDelete) {
            onDelete(commentToDelete);
            setShowDeleteConfirmation(false);
            setCommentToDelete(null);
        }
    };

    const handleReportPost = (comment: CommentOrReply) => {
        setCommentToReport(comment);
        setShowReportConfirmation(true);
    };

    const confirmReportPost = () => {
        if (commentToReport && reportReason.trim()) {
            if (isCommunityComment(commentToReport)) {
                handleReport(commentToReport.commentId, reportReason);
            } else {
                handleReport(
                    commentToReport.replyId,
                    reportReason,
                    commentToReport.commentId,
                );
            }
            setShowReportConfirmation(false);
            setCommentToReport(null);
            setReportReason("");
        }
    };

    const handleReport = async (
        contentId: string,
        reason: string,
        contentParentId?: string,
    ) => {
        const query = `
            mutation ($communityId: String!, $contentId: String!, $type: CommunityReportContentType!, $reason: String!, $contentParentId: String) {
                report: reportCommunityContent(communityId: $communityId, contentId: $contentId, type: $type, reason: $reason, contentParentId: $contentParentId) {
                    communityId
                    reportId
                    content {
                        id
                        content
                    }
                    type
                    reason
                    status
                    contentParentId
                    rejectionReason
                    createdAt
                    updatedAt
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    communityId: communityId,
                    contentId,
                    type: contentParentId
                        ? Constants.CommunityReportType.REPLY.toUpperCase()
                        : Constants.CommunityReportType.COMMENT.toUpperCase(),
                    reason,
                    contentParentId,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            await fetch.exec();
            toast({
                title: "Reported",
                description: "Content has been reported",
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        }
    };

    const itemId = isCommunityComment(comment)
        ? comment.commentId
        : (comment as CommunityCommentReply).replyId;

    const renderContent = () => {
        if (comment.deleted) {
            return (
                <span className="italic text-gray-500">
                    {DELETED_COMMENT_PLACEHOLDER}
                </span>
            );
        }

        const content = comment.content;
        if (typeof content === "string") {
            return (
                <p className="text-sm mt-1 whitespace-pre-wrap">{content}</p>
            );
        }

        return (
            <div className="text-sm mt-1">
                <TextRenderer json={content} />
            </div>
        );
    };

    const renderMedia = (media: CommunityMedia[] | undefined) => {
        if (!media || media.length === 0) return null;

        const mediaItems: MediaItem[] = media.map((m) => ({
            ...m,
        }));

        return (
            <div className="mt-2 overflow-x-auto">
                <MediaPreview items={mediaItems} onRemove={() => {}} />
            </div>
        );
    };

    return (
        <div
            id={itemId}
            className={`space-y-2 rounded-xl border border-transparent px-3 py-3 transition-[background-color,border-color,box-shadow] duration-500 ${depth > 0 ? "ml-6" : ""}`}
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
                    <AvatarFallback>
                        {(comment.user.name || "")
                            .toUpperCase()
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                                {comment.user.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {formattedLocaleDate(comment.updatedAt)}
                            </span>
                        </div>
                        {!comment.deleted && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground mr-1"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {(hasCommunityPermission(
                                        membership,
                                        Constants.MembershipRole.MODERATE,
                                    ) ||
                                        profile?.userId ===
                                            comment.user.userId) && (
                                        <DropdownMenuItem
                                            onClick={() =>
                                                handleDeletePost(comment)
                                            }
                                        >
                                            <Trash className="h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    )}
                                    {profile?.userId !==
                                        comment.user.userId && (
                                        <DropdownMenuItem
                                            onClick={() =>
                                                handleReportPost(comment)
                                            }
                                        >
                                            <FlagTriangleRight /> Report
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                    {renderContent()}
                    {renderMedia(
                        isCommunityComment(comment)
                            ? (comment as CommunityComment).media
                            : (comment as CommunityCommentReply).media,
                    )}
                    <div className="flex items-center gap-4 mt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`text-muted-foreground ${comment.hasLiked ? "bg-accent" : ""}`}
                            onClick={() => onLike(comment.commentId)}
                        >
                            <ThumbsUp className="h-4 w-4 mr-2" />
                            {comment.likesCount}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => setIsReplying(!isReplying)}
                        >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Reply
                        </Button>
                    </div>
                </div>
            </div>
            {isReplying && profile?.name && (
                <div className="mt-2 space-y-2 p-1">
                    <div className="rounded-md border border-input px-3 py-2">
                        <Editor
                            key={replyEditorKey}
                            url={address.backend}
                            initialContent={replyContent}
                            onChange={(value) =>
                                setReplyContent(value as TextEditorContent)
                            }
                            placeholder="Write a reply..."
                            showToolbar={false}
                        />
                        {replyMedia.length > 0 && (
                            <div className="mt-2">
                                <MediaPreview
                                    items={replyMedia}
                                    onRemove={(index) =>
                                        setReplyMedia((prev) => {
                                            const toRemove = prev[index];
                                            if (
                                                toRemove?.file &&
                                                toRemove.url?.startsWith(
                                                    "blob:",
                                                )
                                            ) {
                                                URL.revokeObjectURL(
                                                    toRemove.url,
                                                );
                                            }
                                            return prev.filter(
                                                (_, i) => i !== index,
                                            );
                                        })
                                    }
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 items-center">
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                multiple
                                accept="image/*,video/*,application/pdf"
                                className="sr-only"
                                onChange={(e) => {
                                    const files = e.target.files;
                                    if (!files) return;
                                    const nextItems: MediaItem[] = Array.from(
                                        files,
                                    ).map((file) => {
                                        const url = URL.createObjectURL(file);
                                        const isPdf =
                                            file.type === "application/pdf";
                                        const isImage =
                                            file.type.startsWith("image/");
                                        const type = isPdf
                                            ? "pdf"
                                            : isImage
                                              ? "image"
                                              : "video";
                                        return {
                                            type,
                                            url,
                                            title: file.name,
                                            file,
                                            clientId: createClientId(),
                                            fileSize: `${(file.size / (1024 * 1024)).toFixed(1)}mb`,
                                        };
                                    });
                                    setReplyMedia((prev) => [
                                        ...prev,
                                        ...nextItems,
                                    ]);
                                    e.target.value = "";
                                }}
                            />
                            <span className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3">
                                Attach
                            </span>
                        </label>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setIsReplying(false);
                                setReplyContent(
                                    TextEditorEmptyDoc as TextEditorContent,
                                );
                                setReplyMedia([]);
                                setReplyEditorKey((k) => k + 1);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                const hasContent =
                                    isTextEditorNonEmpty(replyContent);
                                const hasMedia = replyMedia.length > 0;
                                if (!hasContent && !hasMedia) return;
                                if (isCommunityComment(comment)) {
                                    onReply(
                                        comment.commentId,
                                        replyContent,
                                        replyMedia,
                                    );
                                } else {
                                    onReply(
                                        comment.commentId,
                                        replyContent,
                                        replyMedia,
                                        comment.replyId,
                                    );
                                }
                                setReplyContent(
                                    TextEditorEmptyDoc as TextEditorContent,
                                );
                                setReplyMedia([]);
                                setReplyEditorKey((k) => k + 1);
                                setIsReplying(false);
                            }}
                            disabled={
                                isPosting ||
                                (!isTextEditorNonEmpty(replyContent) &&
                                    replyMedia.length === 0)
                            }
                        >
                            Reply
                        </Button>
                    </div>
                </div>
            )}
            {isCommunityComment(comment) &&
                comment.replies?.map((reply) => (
                    <Comment
                        communityId={communityId}
                        key={reply.replyId}
                        comment={{
                            ...reply,
                            commentId: comment.commentId,
                        }}
                        onLike={() => onLike(comment.commentId, reply.replyId)}
                        onReply={onReply}
                        onDelete={onDelete}
                        membership={membership}
                        depth={depth + 1}
                        isPosting={isPosting}
                    />
                ))}
            <Dialog
                open={showDeleteConfirmation}
                onOpenChange={setShowDeleteConfirmation}
            >
                <DialogContent>
                    <DialogTitle>Delete comment</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete this comment? This
                        action cannot be undone.
                    </DialogDescription>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() => setShowDeleteConfirmation(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDeletePost}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={showReportConfirmation}
                onOpenChange={setShowReportConfirmation}
            >
                <DialogContent>
                    <DialogTitle>Report comment</DialogTitle>
                    <DialogDescription>
                        Please provide a reason for reporting this comment.
                    </DialogDescription>
                    <Textarea
                        placeholder="Reason for reporting..."
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                    />
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() => setShowReportConfirmation(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmReportPost}
                            disabled={!reportReason.trim()}
                        >
                            Submit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
