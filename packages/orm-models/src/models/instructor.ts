import { Instructor, InstructorLink, Media } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";
import { MediaSchema } from "./media";

export interface InternalInstructor
    extends Omit<Instructor, "avatar" | "links" | "userId"> {
    domain: mongoose.Types.ObjectId;
    avatar?: Media;
    links: InstructorLink[];
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export const InstructorSchema = new mongoose.Schema<InternalInstructor>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        instructorId: {
            type: String,
            required: true,
            default: generateUniqueId,
        },
        name: { type: String, required: true },
        bio: { type: String },
        avatar: MediaSchema,
        links: [
            new mongoose.Schema(
                {
                    label: { type: String, required: true },
                    url: { type: String, required: true },
                },
                { _id: false },
            ),
        ],
        userId: { type: String },
    },
    {
        timestamps: true,
    },
);

InstructorSchema.index({ domain: 1, instructorId: 1 }, { unique: true });
