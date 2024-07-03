import { Constants, Group } from "@courselit/common-models";
import mongoose from "mongoose";
import EmailSchema from "./email";

export interface Course {
    domain: mongoose.Types.ObjectId;
    id: mongoose.Types.ObjectId;
    courseId: string;
    title: string;
    slug: string;
    creatorId: string;
    creatorName: string;
    published: boolean;
    isBlog: boolean;
    isFeatured: boolean;
    lessons: any[];
    description?: string;
    groups: Group[];
    sales: number;
    customers: string[];
    pageId?: string;
}

const CourseSchema = new mongoose.Schema<Course>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        courseId: { type: String, required: true },
        title: { type: String, required: true },
        slug: { type: String, required: true },
        creatorId: { type: String, required: true },
        creatorName: { type: String },
        published: { type: Boolean, required: true, default: false },
        lessons: [String],
        description: String,
        groups: [
            {
                name: { type: String, required: true },
                _id: {
                    type: String,
                    required: true,
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
        customers: [String],
        pageId: { type: String },
    },
    {
        timestamps: true,
    },
);

export default mongoose.models.Domain || mongoose.model("Course", CourseSchema);
