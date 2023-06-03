import mongoose from "mongoose";

export interface LessonEvaluation {
    domain: mongoose.Types.ObjectId;
    lessonId: string;
    userId: string;
    pass: boolean;
    requiresPassingGrade: boolean;
    score?: number;
    passingGrade?: number;
}

const LessonEvaluationSchema = new mongoose.Schema<LessonEvaluation>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    lessonId: { type: String, required: true },
    userId: { type: String, required: true },
    pass: { type: Boolean, required: true },
    requiresPassingGrade: { type: Boolean, required: true },
    score: { type: Number },
    passingGrade: { type: Number },
});

export default mongoose.models.LessonEvaluation ||
    mongoose.model("LessonEvaluation", LessonEvaluationSchema);
