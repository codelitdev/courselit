import mongoose from "mongoose";

export interface Progress {
    courseId: string;
    completedLessons: string[];
}

const ProgressSchema = new mongoose.Schema<Progress>(
    {
        courseId: { type: String, required: true },
        completedLessons: { type: [String] },
    },
    {
        timestamps: true,
    }
);

export default ProgressSchema;
