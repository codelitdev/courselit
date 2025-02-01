import { CommunityCommentReply } from "./community-comment-reply";
import { CommunityMedia } from "./community-media";
import User from "./user";

export interface CommunityComment {
    user: User;
    communityId: string;
    postId: string;
    commentId: string;
    content: string;
    media: CommunityMedia[];
    likesCount: number;
    updatedAt: string;
    createdAt: string;
    hasLiked: boolean;
    replies: CommunityCommentReply[];
    deleted: boolean;
}
