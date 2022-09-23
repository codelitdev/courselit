import { Media } from "@courselit/common-models";

export default interface Lesson {
    id: string;
    title: string;
    type: string;
    content: string;
    media: Media;
    requiresEnrollment: boolean;
    courseId: string;
    groupId: string;
    downloadable: boolean;
}
