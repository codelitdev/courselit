import Group from "./group";
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
    costType: string;
    creatorId: string;
    updatedAt: Date;
    featuredImage: Media;
    isBlog: boolean;
    tags: string[];
    type: string;
    pageId?: string;
    groups?: Group[];
}
