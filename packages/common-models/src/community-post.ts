import { CommunityMedia } from "./community-media";
import User from "./user";

export interface CommunityPost {
    user: User;
    communityId: string;
    postId: string;
    title: string;
    content: string;
    category: string;
    media?: CommunityMedia[];
    pinned: boolean;
    commentsCount: number;
    likesCount: number;
    updatedAt: string;
    createdAt: string;
    hasLiked: boolean;
    deleted: boolean;
}
