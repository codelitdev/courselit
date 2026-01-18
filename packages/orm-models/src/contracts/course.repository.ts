import { Repository } from "../core/repository";
import { Course } from "@courselit/common-models";

export interface CourseRepository extends Repository<Course> {
    findByCourseId(courseId: string, domainId: string): Promise<Course | null>;
    findBySlug(slug: string, domainId: string): Promise<Course | null>;
    // Add other specific query methods as needed
}
