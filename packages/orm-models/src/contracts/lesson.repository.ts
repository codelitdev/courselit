import { Repository } from "../core/repository";
import { InternalLesson } from "../models/lesson";
// Note: using InternalLesson as the Entity type for now because common-models might not have the full Lesson type with all fields we need OR strictly they should match.
// Ideally common-models has 'Lesson'. Let's check imports in logic.ts again?
// The model file used: import { LessonType... } from "@courselit/common-models";
// It defined InternalLesson.
// Usually Repository<T> where T is the Domain Entity.
// If common-models doesn't export 'Lesson' interface that matches perfectly, we might need to define one or use InternalLesson (but that has mongoose stuff?).
// InternalLesson in 'src/models/lesson.ts' has mongoose.Types.ObjectId which is NOT domain agnostic.
// We strictly want domain entities.
// Let's assume there is a 'Lesson' in common-models or we define a domain one.
// Check 'libs/common-models' content? Or assume strict mapping.
// Let's check apps/web/graphql/users/logic.ts imports:
// import { Course, UIConstants, User } from "@courselit/common-models";
// It doesn't seemingly import 'Lesson'.
// Actually, 'Course' has 'lessons: any[]' in InternalCourse.
// Let's look at common-models index if possible?
// For now, I will assume a generic 'Lesson' interface exists or I will define a pure one here if needed.
// But wait, 'InternalLesson' implementation has 'id: mongoose.Types.ObjectId'.
// I'll genericize.

import {
    LessonType,
    Media,
    Quiz,
    TextEditorContent,
    ScormContent,
} from "@courselit/common-models";

export interface Lesson {
    id: string; // resolved from _id
    userId?: string; // or creatorId
    domain: string;
    lessonId: string;
    title: string;
    type: LessonType;
    content?: Quiz | TextEditorContent | ScormContent | { value: string };
    media?: Media;
    downloadable: boolean;
    creatorId: string;
    courseId: string;
    requiresEnrollment: boolean;
    published: boolean;
    groupId: string;
    [key: string]: any;
}

export interface LessonRepository extends Repository<Lesson> {
    findByLessonId(lessonId: string, domainId: string): Promise<Lesson | null>;
    findByCourseId(courseId: string, domainId: string): Promise<Lesson[]>;
}
