import { CommunityMedia } from "./community-media";
import { TextEditorContent } from "./text-editor-content";
import { CommunityReaction } from "./community-reaction";
import User from "./user";

export interface CommunityPost {
    user: User;
    communityId: string;
    postId: string;
    title: string;
    content: TextEditorContent;
    category: string;
    media?: CommunityMedia[];
    pinned: boolean;
    commentsCount: number;
    likesCount: number;
    updatedAt: string;
    createdAt: string;
    hasLiked: boolean;
    reactions: CommunityReaction[];
    deleted: boolean;
}
