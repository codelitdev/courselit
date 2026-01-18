import { Repository } from "../core/repository";
import { InternalLessonEvaluation } from "../models/lesson-evaluation";

export interface LessonEvaluationRepository
    extends Repository<InternalLessonEvaluation> {
    findByUserAndLesson(
        userId: string,
        lessonId: string,
        domainId: string,
    ): Promise<InternalLessonEvaluation | null>;
    findByUser(
        userId: string,
        domainId: string,
    ): Promise<InternalLessonEvaluation[]>;
}
