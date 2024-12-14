import User from "./user";

export interface CommunityCommentReply {
    replyId: string;
    user: User;
    content: string;
    media: {
        type: string;
        title: string;
        url: string;
    }[];
    parentReplyId: string;
    createdAt: string;
    updatedAt: string;
    likesCount: number;
    hasLiked: boolean;
    deleted: boolean;
}
