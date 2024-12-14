import { useContext, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, MessageSquare, MoreVertical } from "lucide-react";
import {
    CommunityComment,
    CommunityCommentReply,
} from "@courselit/common-models";
import { formattedLocaleDate } from "@ui-lib/utils";
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
import { isCommunityComment } from "./utils";
import { DELETED_COMMENT_PLACEHOLDER } from "@ui-config/strings";

interface CommentProps {
    comment: CommunityComment | (CommunityCommentReply & { commentId: string });
    onLike: (commentId: string, replyId?: string) => void;
    onReply: (
        commentId: string,
        content: string,
        parentReplyId?: string,
    ) => void;
    onDelete: (comment: CommunityComment | CommunityCommentReply) => void;
    depth?: number;
}

export function Comment({
    comment,
    onLike,
    onReply,
    onDelete,
    depth = 0,
}: CommentProps) {
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState("");
    const [commentToDelete, setCommentToDelete] = useState<
        CommunityComment | CommunityCommentReply | null
    >(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const { profile } = useContext(ProfileContext);
    const address = useContext(AddressContext);

    const handleDeletePost = (
        comment: CommunityComment | CommunityCommentReply,
    ) => {
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

    return (
        <div className={`space-y-2 ${depth > 0 ? "ml-6" : ""}`}>
            <div className="flex items-start gap-2">
                <Avatar className="h-8 w-8">
                    <AvatarImage
                        src={comment.user.avatar.thumbnail}
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
                                {profile?.userId === comment.user.userId && (
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleDeletePost(comment)
                                        }
                                    >
                                        Delete
                                    </DropdownMenuItem>
                                )}
                                {profile?.userId !== comment.user.userId && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            /* handle report */
                                        }}
                                    >
                                        Report
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <p className="text-sm mt-1">
                        {comment.deleted ? (
                            <span className="italic text-gray-500">
                                {DELETED_COMMENT_PLACEHOLDER}
                            </span>
                        ) : (
                            comment.content
                        )}
                    </p>
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
            {isReplying && (
                <div className="mt-2 space-y-2 p-1">
                    <Textarea
                        placeholder="Write a reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsReplying(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                if (replyContent.trim()) {
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
                                }
                            }}
                        >
                            Reply
                        </Button>
                    </div>
                </div>
            )}
            {isCommunityComment(comment) &&
                comment.replies?.map((reply) => (
                    <Comment
                        key={reply.replyId}
                        comment={{
                            ...reply,
                            commentId: comment.commentId,
                        }}
                        onLike={() => onLike(comment.commentId, reply.replyId)}
                        onReply={onReply}
                        onDelete={onDelete}
                        depth={depth + 1}
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
        </div>
    );
}
