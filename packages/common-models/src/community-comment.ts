import { CommunityCommentReply } from "./community-comment-reply";
import { CommunityMedia } from "./community-media";
import { TextEditorContent } from "./text-editor-content";
import User from "./user";

export interface CommunityComment {
    user: User;
    communityId: string;
    postId: string;
    commentId: string;
    content: TextEditorContent | string;
    media: CommunityMedia[];
    likesCount: number;
    updatedAt: string;
    createdAt: string;
    hasLiked: boolean;
    replies: CommunityCommentReply[];
    deleted: boolean;
}
