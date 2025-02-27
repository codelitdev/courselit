import Group from "./group";
import Media from "./media";
import { ProductPriceType } from "./constants";

export type ProductPriceType =
    (typeof ProductPriceType)[keyof typeof ProductPriceType];

export interface Course {
    id: string;
    courseId: string;
    title: string;
    description: string;
    creatorName: string;
    slug: string;
    isFeatured: boolean;
    cost: number;
    costType: ProductPriceType;
    creatorId: string;
    updatedAt: Date;
    featuredImage: Media;
    isBlog: boolean;
    tags: string[];
    type: string;
    pageId?: string;
    groups?: Group[];
}
