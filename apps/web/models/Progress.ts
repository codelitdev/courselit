import mongoose from "mongoose";

export interface Progress {
    courseId: string;
    completedLessons: string[];
    downloaded: boolean;
}

const ProgressSchema = new mongoose.Schema<Progress>(
    {
        courseId: { type: String, required: true },
        completedLessons: { type: [String] },
        downloaded: { type: Boolean },
    },
    {
        timestamps: true,
    },
);

export default ProgressSchema;
