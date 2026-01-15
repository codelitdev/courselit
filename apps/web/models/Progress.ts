import { Progress } from "@courselit/common-models";
import mongoose from "mongoose";

const ProgressSchema = new mongoose.Schema<Progress>(
    {
        courseId: { type: String, required: true },
        completedLessons: { type: [String] },
        downloaded: { type: Boolean },
        accessibleGroups: { type: [String] },
        scormData: {
            lessons: { type: mongoose.Schema.Types.Mixed },
        },
    },
    {
        timestamps: true,
    },
);

export default ProgressSchema;
