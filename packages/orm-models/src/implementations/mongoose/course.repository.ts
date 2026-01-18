import { MongooseRepository } from "./base.repository";
import { CourseRepository } from "../../contracts/course.repository";
import { Course } from "@courselit/common-models";
import { InternalCourse } from "../../models/course";
import mongoose, { Model } from "mongoose";

export class MongooseCourseRepository
    extends MongooseRepository<Course, InternalCourse>
    implements CourseRepository
{
    constructor(model: Model<InternalCourse>) {
        super(model);
    }

    protected toEntity(doc: InternalCourse): Course {
        return {
            ...doc,
            id: doc._id.toString(),
            domain: doc.domain.toString(),
            // Ensure lessons are properly handled if array of strings or objects?
            // In InternalCourse, lessons: any[] -> in schema String[].
            // We'll trust the doc structure for now, but ensure id/domain are strings.
        } as unknown as Course;
    }

    async findByCourseId(
        courseId: string,
        domainId: string,
    ): Promise<Course | null> {
        const doc = await this.model
            .findOne({
                courseId,
                domain: this.castToObjectId(domainId),
            })
            .lean();
        return doc ? this.toEntity(doc as InternalCourse) : null;
    }

    async findBySlug(slug: string, domainId: string): Promise<Course | null> {
        const doc = await this.model
            .findOne({
                slug,
                domain: this.castToObjectId(domainId),
            })
            .lean();
        return doc ? this.toEntity(doc as InternalCourse) : null;
    }
}
