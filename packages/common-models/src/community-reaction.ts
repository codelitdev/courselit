import { Media } from "./media";

export interface CommunityReaction {
    emoji: string;
    count: number;
    hasReacted: boolean;
    reactors: {
        userId: string;
        name?: string;
        avatar: Media;
    }[];
}
