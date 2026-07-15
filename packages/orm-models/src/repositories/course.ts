import mongoose, { type Model } from "mongoose";
import { BaseRepository } from "./base";
import { CourseSchema, type InternalCourse } from "../models/course";

export class CourseRepository extends BaseRepository<InternalCourse> {
    constructor(model?: Model<InternalCourse>) {
        super(
            model ??
                ((mongoose.models.Course ||
                    mongoose.model(
                        "Course",
                        CourseSchema,
                    )) as Model<InternalCourse>),
        );
    }

    async findBySlug(
        domain: mongoose.Types.ObjectId,
        slug: string,
    ): Promise<InternalCourse | null> {
        return this.findOne({ domain, slug });
    }

    async findByCourseId(
        domain: mongoose.Types.ObjectId,
        courseId: string,
    ): Promise<InternalCourse | null> {
        return this.findOne({ domain, courseId });
    }

    async findPublishedByDomain(
        domain: mongoose.Types.ObjectId,
    ): Promise<InternalCourse[]> {
        return this.find({ domain, published: true });
    }
}
