import { Media } from "./media";
import Group from "./group";
import { ProductPriceType, CourseType, ProductAccessType } from "./constants";
import Lesson from "./lesson";
import User from "./user";
import { PaymentPlan } from "./payment-plan";

export type ProductPriceType =
    (typeof ProductPriceType)[keyof typeof ProductPriceType];

export type CourseType = (typeof CourseType)[keyof typeof CourseType];
export type ProductAccessType =
    (typeof ProductAccessType)[keyof typeof ProductAccessType];

export interface Course {
    courseId: string;
    title: string;
    description?: string;
    creatorName: string;
    slug: string;
    isFeatured: boolean;
    cost: number;
    costType: ProductPriceType;
    creatorId: string;
    featuredImage: Media;
    isBlog: boolean;
    tags: string[];
    type: CourseType;
    pageId?: string;
    groups?: Group[];
    defaultPaymentPlan?: string;
    createdAt: Date;
    updatedAt: Date;
    leadMagnet?: boolean;
    lessons?: Lesson[];
    user: User;
    paymentPlans?: PaymentPlan[];
}
