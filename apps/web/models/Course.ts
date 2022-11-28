import mongoose from "mongoose";
import constants from "../config/constants";
import { generateUniqueId } from "@courselit/utils";
import type { Group, Media } from "@courselit/common-models";
import MediaSchema from "./Media";
const { course, download, blog, unlisted, open } = constants;

export interface Course {
    domain: mongoose.Types.ObjectId;
    id: mongoose.Types.ObjectId;
    courseId: string;
    title: string;
    slug: string;
    cost: number;
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
            },
        ],
        sales: { type: Number, required: true, default: 0.0 },
        customers: [String],
        pageId: { type: String },
    },
    {
        timestamps: true,
    }
);

CourseSchema.index({
    title: "text",
});

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
