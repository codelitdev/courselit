import { MongooseRepository } from "./base.repository";
import { LessonEvaluationRepository } from "../../contracts/lesson-evaluation.repository";
import { InternalLessonEvaluation } from "../../models/lesson-evaluation";
import mongoose, { Model } from "mongoose";

export class MongooseLessonEvaluationRepository
    extends MongooseRepository<
        InternalLessonEvaluation,
        InternalLessonEvaluation
    >
    implements LessonEvaluationRepository
{
    constructor(model: Model<InternalLessonEvaluation>) {
        super(model);
    }

    protected toEntity(
        doc: InternalLessonEvaluation,
    ): InternalLessonEvaluation {
        return doc;
    }

    async findByUserAndLesson(
        userId: string,
        lessonId: string,
        domainId: string,
    ): Promise<InternalLessonEvaluation | null> {
        return await this.model
            .findOne({ userId, lessonId, domain: domainId })
            .lean();
    }

    async findByUser(
        userId: string,
        domainId: string,
    ): Promise<InternalLessonEvaluation[]> {
        return await this.model.find({ userId, domain: domainId }).lean();
    }
}
