import { Constants } from "@courselit/common-models";

// Lesson types arrive both lowercase (as stored) and uppercase (as GraphQL
// enum values), so compare case-insensitively.
const isLessonTypeIn = (types: readonly string[], type?: string | null) =>
    Boolean(type && types.includes(type.toLowerCase()));

export function lessonTypeSupportsDescription(type?: string | null): boolean {
    return isLessonTypeIn(Constants.LessonTypesWithDescription, type);
}

export function lessonTypeSupportsAttachments(type?: string | null): boolean {
    return isLessonTypeIn(Constants.LessonTypesWithAttachments, type);
}
