import { CommunityMedia } from "./community-media";
import { TextEditorContent } from "./text-editor-content";
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
    deleted: boolean;
    lessonId?: string | null;
}
