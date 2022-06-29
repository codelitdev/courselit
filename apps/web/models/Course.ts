import mongoose from "mongoose";
import constants from "../config/constants";
import { generateUniqueId } from "@courselit/utils";
import type { Group } from "@courselit/common-models";
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
    featuredImage?: string;
    groups: Group[];
    sales: number;
    customers: mongoose.Types.ObjectId[];
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
        featuredImage: String,
        groups: [
            {
                name: { type: String, required: true },
                // order of the group on the UI
                rank: { type: Number, required: true },
                // to not show associated lessons as top members on the UI
                collapsed: { type: Boolean, required: true, default: true },
            },
        ],
        sales: { type: Number, required: true, default: 0.0 },
        customers: [mongoose.Schema.Types.ObjectId],
    },
    {
        timestamps: true,
    }
);

CourseSchema.index({
    title: "text",
});

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
