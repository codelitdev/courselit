import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";
import constants from "../config/constants";
const { text, video, audio, pdf, quiz } = constants;

export interface Lesson {
    id: mongoose.Types.ObjectId;
    domain: mongoose.Types.ObjectId;
    lessonId: string;
    title: string;
    type: typeof text | typeof video | typeof audio | typeof pdf | typeof quiz;
    content?: string;
    mediaId?: string;
    downloadable: boolean;
    creatorId: mongoose.Types.ObjectId;
    courseId: mongoose.Types.ObjectId;
    requiresEnrollment: boolean;
    groupId: mongoose.Types.ObjectId;
    groupRank: number;
}

const LessonSchema = new mongoose.Schema<Lesson>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    lessonId: { type: String, required: true, default: generateUniqueId },
    title: { type: String, required: true },
    type: {
        type: String,
        required: true,
        enum: [text, video, audio, pdf, quiz],
    },
    content: String,
    mediaId: String,
    downloadable: { type: Boolean, default: false },
    creatorId: mongoose.Schema.Types.ObjectId,
    courseId: mongoose.Schema.Types.ObjectId,
    requiresEnrollment: { type: Boolean, default: false },
    groupId: { type: mongoose.Schema.Types.ObjectId, required: true },
    // order of the lesson in the group it is associated to
    groupRank: { type: Number, required: true },
});

export default mongoose.models.Lesson || mongoose.model("Lesson", LessonSchema);
