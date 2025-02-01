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
}

export interface ContentItem {
    entity: Entity;
    entityType: "community" | "course";
}
