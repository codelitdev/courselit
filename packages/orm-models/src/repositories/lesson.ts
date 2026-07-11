import mongoose, { type Model } from "mongoose";
import { BaseRepository } from "./base";
import { LessonSchema, type InternalLesson } from "../models/lesson";

export class LessonRepository extends BaseRepository<InternalLesson> {
    constructor(model?: Model<InternalLesson>) {
        super(
            model ??
                ((mongoose.models.Lesson ||
                    mongoose.model(
                        "Lesson",
                        LessonSchema,
                    )) as Model<InternalLesson>),
        );
    }

    async findByLessonIdAndDomain(
        domain: mongoose.Types.ObjectId,
        lessonId: string,
    ): Promise<InternalLesson | null> {
        return this.findOne({ domain, lessonId });
    }

    async findByCourseId(
        domain: mongoose.Types.ObjectId,
        courseId: string,
    ): Promise<InternalLesson[]> {
        return this.find({ domain, courseId });
    }
}
