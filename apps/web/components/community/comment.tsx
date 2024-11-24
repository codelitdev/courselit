import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, MessageSquare } from "lucide-react";

interface CommentProps {
    comment: Comment;
    onLike: (commentId: number) => void;
    onReply: (commentId: number, content: string) => void;
    depth?: number;
}

export function Comment({ comment, onLike, onReply, depth = 0 }: CommentProps) {
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState("");

    const handleReply = () => {
        if (replyContent.trim()) {
            onReply(comment.id, replyContent);
            setReplyContent("");
            setIsReplying(false);
        }
    };

    return (
        <div className={`space-y-2 ${depth > 0 ? "ml-6" : ""}`}>
            <div className="flex items-start gap-2">
                <Avatar className="h-8 w-8">
                    <AvatarImage
                        src={comment.avatar}
                        alt={`${comment.author}'s avatar`}
                    />
                    <AvatarFallback>
                        {comment.author
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">{comment.author}</span>
                        <span className="text-sm text-muted-foreground">
                            {comment.time}
                        </span>
                    </div>
                    <p className="text-sm mt-1">{comment.content}</p>
                    <div className="flex items-center gap-4 mt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`text-muted-foreground ${comment.hasLiked ? "bg-accent" : ""}`}
                            onClick={() => onLike(comment.id)}
                        >
                            <ThumbsUp className="h-4 w-4 mr-2" />
                            {comment.likes}
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
                <div className="mt-2 space-y-2">
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
                        <Button size="sm" onClick={handleReply}>
                            Reply
                        </Button>
                    </div>
                </div>
            )}
            {comment.replies.map((reply) => (
                <Comment
                    key={reply.id}
                    comment={reply}
                    onLike={onLike}
                    onReply={onReply}
                    depth={depth + 1}
                />
            ))}
        </div>
    );
}
