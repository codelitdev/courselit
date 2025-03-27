import { Constants } from "@courselit/common-models";

export interface FeaturedImage {
    file: string;
    thumbnail: string;
}

export interface Entity {
    id: string;
    title: string;
    slug?: string;
    membersCount?: number;
    totalLessons?: number;
    completedLessonsCount?: number;
    featuredImage: FeaturedImage;
    type:
        | typeof Constants.CourseType.COURSE
        | typeof Constants.CourseType.DOWNLOAD;
}

export interface ContentItem {
    entity: Entity;
    entityType: "community" | "course";
}
