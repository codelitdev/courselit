import type { Instructor } from "@courselit/common-models";

interface WithInstructors {
    instructors?: Instructor[];
    groups?: { id: string; instructors?: Instructor[] }[];
}

/**
 * Every instructor that appears on a course: the course's own first, then
 * the section ones, each person once.
 */
export function getPageInstructors(course: WithInstructors): Instructor[] {
    const seen = new Set<string>();
    const result: Instructor[] = [];
    const all = [
        ...(course.instructors ?? []),
        ...(course.groups ?? []).flatMap((group) => group.instructors ?? []),
    ];
    for (const instructor of all) {
        if (!seen.has(instructor.instructorId)) {
            seen.add(instructor.instructorId);
            result.push(instructor);
        }
    }
    return result;
}

/**
 * Who teaches a lesson: the section's instructors when it has any,
 * otherwise the course's.
 */
export function getLessonInstructors(
    course: WithInstructors,
    groupId?: string,
): Instructor[] {
    const group = course.groups?.find((item) => item.id === groupId);
    if (group?.instructors?.length) {
        return group.instructors;
    }
    return course.instructors ?? [];
}

export function joinInstructorNames(instructors: Instructor[]): string {
    return instructors.map((instructor) => instructor.name).join(", ");
}
