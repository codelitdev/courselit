import { MongooseRepository } from "./base.repository";
import { LessonRepository, Lesson } from "../../contracts/lesson.repository";
import { InternalLesson } from "../../models/lesson";
import mongoose, { Model } from "mongoose";

export class MongooseLessonRepository
    extends MongooseRepository<Lesson, InternalLesson>
    implements LessonRepository
{
    constructor(model: Model<InternalLesson>) {
        super(model);
    }

    protected toEntity(doc: InternalLesson): Lesson {
        return {
            ...doc,
            id: doc.id ? doc.id.toString() : (doc as any)._id.toString(),
            domain: doc.domain.toString(),
        } as unknown as Lesson;
    }

    async findByLessonId(
        lessonId: string,
        domainId: string,
    ): Promise<Lesson | null> {
        const doc = await this.model
            .findOne({
                lessonId,
                domain: this.castToObjectId(domainId),
            })
            .lean();
        return doc ? this.toEntity(doc as InternalLesson) : null;
    }

    async findByCourseId(
        courseId: string,
        domainId: string,
    ): Promise<Lesson[]> {
        const docs = await this.model
            .find({
                courseId,
                domain: this.castToObjectId(domainId),
            })
            .lean();
        return docs.map((doc) => this.toEntity(doc as InternalLesson));
    }
}
