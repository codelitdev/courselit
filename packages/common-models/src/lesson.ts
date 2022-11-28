import Media from "./media";

export default interface Lesson {
    lessonId: string;
    title: string;
    type: string;
    content: string;
    requiresEnrollment: boolean;
    courseId: string;
    groupId: string;
    downloadable: boolean;
    media?: Partial<Media>;
    prevLesson?: string;
    nextLesson?: string;
}
