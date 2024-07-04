import { LessonType } from "./lesson-type";
import type Media from "./media";
import type { Quiz } from "./quiz";
import type { TextEditorContent } from "./text-editor-content";

export default interface Lesson {
    lessonId: string;
    title: string;
    type: LessonType;
    content: Quiz | TextEditorContent | { value: string };
    requiresEnrollment: boolean;
    courseId: string;
    groupId: string;
    downloadable: boolean;
    media?: Partial<Media>;
    prevLesson?: string;
    nextLesson?: string;
}
