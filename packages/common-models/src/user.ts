import { Constants, Media } from ".";
import { Progress } from "./progress";

export default interface User {
    userId: string;
    domain?: string;
    email: string;
    active: boolean;
    name?: string;
    purchases: Progress[];
    bio?: string;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
    subscribedToUpdates: boolean;
    lead: (typeof Constants.leads)[number];
    tags?: string[];
    avatar: Media;
    invited?: boolean;
    content?: {
        entityType: (typeof Constants.MembershipEntityType)[keyof typeof Constants.MembershipEntityType];
        entity: {
            id: string;
            title?: string;
            slug?: string;
            type?: string;
            totalLessons?: number;
            completedLessonsCount?: number;
            featuredImage?: Media;
            certificateId?: string;
        };
    }[];
}
