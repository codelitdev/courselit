import { Media } from "./media";
import Group from "./group";
import { ProductPriceType, CourseType, ProductAccessType } from "./constants";
import { PaymentPlan } from "./payment-plan";
import Lesson from "./lesson";
import User from "./user";

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
    paymentPlans: PaymentPlan[];
    defaultPaymentPlan?: string;
    createdAt: Date;
    updatedAt: Date;
    leadMagnet?: boolean;
    lessons?: Lesson[];
    user: User;
}
