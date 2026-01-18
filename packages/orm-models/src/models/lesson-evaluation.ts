import mongoose from "mongoose";

export interface InternalLessonEvaluation {
    _id: mongoose.Types.ObjectId;
    domain: mongoose.Types.ObjectId;
    lessonId: string;
    userId: string;
    pass: boolean;
    requiresPassingGrade: boolean;
    score?: number;
    passingGrade?: number;
}

export const LessonEvaluationSchema =
    new mongoose.Schema<InternalLessonEvaluation>({
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        lessonId: { type: String, required: true },
        userId: { type: String, required: true },
        pass: { type: Boolean, required: true },
        requiresPassingGrade: { type: Boolean, required: true },
        score: { type: Number },
        passingGrade: { type: Number },
    });

const LessonEvaluationModel =
    mongoose.models.LessonEvaluation ||
    mongoose.model<InternalLessonEvaluation>(
        "LessonEvaluation",
        LessonEvaluationSchema,
    );

export default LessonEvaluationModel;
