import { Group } from "@courselit/common-models";
import { ProductWithAdminProps } from "@/hooks/use-product";

export type LessonSummary = NonNullable<
    ProductWithAdminProps["lessons"]
>[number];

export type LessonMap = Record<string, LessonSummary[]>;

export const sortLessonsForSection = (
    lessons: LessonSummary[],
    section: Group,
): LessonSummary[] => {
    return [...lessons]
        .filter((lesson) => lesson.groupId === section.id)
        .sort(
            (a, b) =>
                (section.lessonsOrder ?? []).indexOf(a.lessonId) -
                (section.lessonsOrder ?? []).indexOf(b.lessonId),
        );
};

export const buildLessonMap = (
    sections: Group[],
    lessons: LessonSummary[],
): LessonMap => {
    return sections.reduce((acc, section) => {
        acc[section.id] = sortLessonsForSection(lessons, section);
        return acc;
    }, {} as LessonMap);
};

export const applyLessonMove = ({
    current,
    lessonId,
    sourceSectionId,
    destinationSectionId,
    destinationIndex,
}: {
    current: LessonMap;
    lessonId: string;
    sourceSectionId: string;
    destinationSectionId: string;
    destinationIndex: number;
}): LessonMap => {
    const sourceLessons = [...(current[sourceSectionId] ?? [])];
    const destinationLessons =
        sourceSectionId === destinationSectionId
            ? sourceLessons
            : [...(current[destinationSectionId] ?? [])];

    const sourceIndex = sourceLessons.findIndex(
        (lesson) => lesson.lessonId === lessonId,
    );
    if (sourceIndex === -1) {
        return current;
    }

    const [movedLesson] = sourceLessons.splice(sourceIndex, 1);
    if (!movedLesson) {
        return current;
    }

    const updatedLesson = {
        ...movedLesson,
        groupId: destinationSectionId,
    };

    const safeDestinationIndex = Math.min(
        Math.max(destinationIndex, 0),
        destinationLessons.length,
    );
    destinationLessons.splice(safeDestinationIndex, 0, updatedLesson);

    return {
        ...current,
        [sourceSectionId]: sourceLessons,
        [destinationSectionId]: destinationLessons,
    };
};
