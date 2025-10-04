import mongoose from "mongoose";
import { generateUniqueId } from "@courselit/utils";
import {
    Constants,
    Course,
    type ProductAccessType,
    type Group,
} from "@courselit/common-models";
import { MediaSchema } from "./media";
import { EmailSchema } from "./email";

export interface InternalCourse extends Omit<Course, "paymentPlans"> {
    domain: mongoose.Types.ObjectId;
    id: mongoose.Types.ObjectId;
    privacy: ProductAccessType;
    published: boolean;
    isFeatured: boolean;
    tags: string[];
    lessons: any[];
    sales: number;
    customers: string[];
    certificate?: boolean;
}

export const CourseSchema = new mongoose.Schema<InternalCourse>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        courseId: { type: String, required: true, default: generateUniqueId },
        title: { type: String, required: true },
        slug: { type: String, required: true },
        cost: { type: Number, required: true },
        costType: {
            type: String,
            required: true,
            enum: ["free", "email", "paid"],
        },
        privacy: {
            type: String,
            required: true,
            enum: Object.values(Constants.ProductAccessType),
        },
        type: {
            type: String,
            required: true,
            enum: Object.values(Constants.CourseType),
        },
        creatorId: { type: String, required: true },
        creatorName: { type: String },
        published: { type: Boolean, required: true, default: false },
        tags: [{ type: String }],
        lessons: [String],
        description: String,
        featuredImage: MediaSchema,
        groups: [
            {
                name: { type: String, required: true },
                _id: {
                    type: String,
                    required: true,
                    default: generateUniqueId,
                },
                rank: { type: Number, required: true },
                collapsed: { type: Boolean, required: true, default: true },
                lessonsOrder: { type: [String] },
                drip: new mongoose.Schema<Group["drip"]>({
                    type: {
                        type: String,
                        required: true,
                        enum: Constants.dripType,
                    },
                    status: { type: Boolean, required: true, default: false },
                    delayInMillis: { type: Number },
                    dateInUTC: { type: Number },
                    email: EmailSchema,
                }),
            },
        ],
        sales: { type: Number, required: true, default: 0.0 },
        customers: [String],
        pageId: { type: String },
        // paymentPlans: [String],
        defaultPaymentPlan: { type: String },
        leadMagnet: { type: Boolean, required: true, default: false },
        certificate: Boolean,
    },
    {
        timestamps: true,
    },
);

CourseSchema.index({
    title: "text",
});

CourseSchema.index({ domain: 1, title: 1 }, { unique: true });

CourseSchema.statics.paginatedFind = async function (
    filter,
    options: {
        page?: number;
        limit?: number;
        sort?: number;
    },
) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const sort = options.sort || -1;
    const skip = (page - 1) * limit;

    const docs = await this.find(filter)
        .sort({ createdAt: sort })
        .lean()
        .skip(skip)
        .limit(limit)
        .exec();
    return docs;
};
