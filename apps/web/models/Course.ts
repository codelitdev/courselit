import mongoose from "mongoose";
import constants from "../config/constants";
import { generateUniqueId } from "@courselit/utils";
import type { Group } from "@courselit/common-models";

export interface Course {
    domain: mongoose.Types.ObjectId;
    id: mongoose.Types.ObjectId;
    courseId: string;
    title: string;
    slug: string;
    cost: number;
    privacy: typeof constants.unlisted | typeof constants.open;
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
            enum: [constants.unlisted, constants.open],
        },
        creatorId: { type: String, required: true },
        creatorName: { type: String },
        published: { type: Boolean, required: true, default: false },
        isBlog: { type: Boolean, required: true, default: false },
        isFeatured: { type: Boolean, required: true, default: false },
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
    },
    {
        timestamps: true,
    }
);

CourseSchema.index({
    title: "text",
});

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
