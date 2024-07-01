import mongoose from "mongoose";
import constants from "../config/constants";
import { generateUniqueId } from "@courselit/utils";
import { Constants, type Group, type Media } from "@courselit/common-models";
import MediaSchema from "./Media";
import EmailSchema from "./Email";
const {
    course,
    download,
    blog,
    unlisted,
    open,
    costFree,
    costPaid,
    costEmail,
} = constants;

export interface Course {
    domain: mongoose.Types.ObjectId;
    id: mongoose.Types.ObjectId;
    courseId: string;
    title: string;
    slug: string;
    cost: number;
    costType: typeof costFree | typeof costPaid | typeof costEmail;
    privacy: typeof unlisted | typeof open;
    type: typeof course | typeof download | typeof blog;
    creatorId: string;
    creatorName: string;
    published: boolean;
    isBlog: boolean;
    isFeatured: boolean;
    tags: string[];
    lessons: any[];
    description?: string;
    featuredImage?: Media;
    groups: Group[];
    sales: number;
    customers: string[];
    pageId?: string;
}

const CourseSchema = new mongoose.Schema<Course>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        courseId: { type: String, required: true, default: generateUniqueId },
        title: { type: String, required: true },
        slug: { type: String, required: true },
        cost: { type: Number, required: true },
        costType: {
            type: String,
            required: true,
            enum: [costFree, costEmail, costPaid],
        },
        privacy: {
            type: String,
            required: true,
            enum: [unlisted, open],
        },
        type: {
            type: String,
            required: true,
            enum: [course, download, blog],
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
    },
    {
        timestamps: true,
    },
);

CourseSchema.index({
    title: "text",
});

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
