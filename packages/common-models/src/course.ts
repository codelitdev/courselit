import Media from "./media";

export default interface Course {
    id: string;
    courseId: string;
    title: string;
    description: string;
    creatorName: string;
    slug: string;
    isFeatured: boolean;
    cost: number;
    creatorId: string;
    updatedAt: Date;
    featuredImage: Media;
    isBlog: boolean;
    tags: string[];
}
