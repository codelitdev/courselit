import Media from "./media";

export default interface Lesson {
    lessonId: string;
    title: string;
    type: string;
    content: string;
    media: Media;
    requiresEnrollment: boolean;
    courseId: string;
    groupId: string;
    downloadable: boolean;
    prevLesson?: string;
    nextLesson?: string;
}
