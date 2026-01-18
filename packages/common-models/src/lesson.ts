import { Media } from "./media";
import { LessonType } from "./lesson-type";
import type { Quiz } from "./quiz";
import type { TextEditorContent } from "./text-editor-content";
import type { ScormContent } from "./scorm-content";

export default interface Lesson {
    id: string;
    domain: string;
    creatorId: string;
    published: boolean;
    lessonId: string;
    title: string;
    type: LessonType;
    content?: Quiz | TextEditorContent | ScormContent | { value: string };
    requiresEnrollment: boolean;
    courseId: string;
    groupId: string;
    downloadable: boolean;
    media?: Media;
    prevLesson?: string;
    nextLesson?: string;
}
