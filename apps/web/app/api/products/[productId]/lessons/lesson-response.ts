type LessonDocument = {
    lessonId: string;
    title: string;
    type: string;
    content?: unknown;
    media?: unknown;
    description?: unknown;
    attachments?: unknown;
    downloadable?: boolean;
    courseId: string;
    groupId: string;
    requiresEnrollment: boolean;
    published: boolean;
};

export function serializeLesson(lesson: LessonDocument) {
    return {
        lessonId: lesson.lessonId,
        title: lesson.title,
        type: lesson.type,
        content: lesson.content,
        media: lesson.media,
        description: lesson.description,
        attachments: lesson.attachments,
        downloadable: lesson.downloadable,
        courseId: lesson.courseId,
        groupId: lesson.groupId,
        requiresEnrollment: lesson.requiresEnrollment,
        published: lesson.published,
    };
}

export function toExistingLessonPayload(
    body: Record<string, unknown>,
    courseId: string,
) {
    return {
        ...body,
        courseId,
        content: Object.prototype.hasOwnProperty.call(body, "content")
            ? JSON.stringify(body.content)
            : undefined,
        // A null description means none, rather than the string "null".
        description:
            body.description === undefined || body.description === null
                ? undefined
                : JSON.stringify(body.description),
    };
}
