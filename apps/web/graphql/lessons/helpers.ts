import { responses } from "../../config/strings";
import constants from "../../config/constants";
import LessonModel, { Lesson } from "../../models/Lesson";
import CourseModel from "../../models/Course";
import { Group } from "@courselit/common-models";
import mongoose from "mongoose";
const { text, audio, video, pdf } = constants;

export const lessonValidator = (lessonData: Lesson) => {
    if (lessonData.type === text && !lessonData.content) {
        throw new Error(responses.content_cannot_be_null);
    }

    if (
        (lessonData.type === audio ||
            lessonData.type === video ||
            lessonData.type === pdf) &&
        !lessonData.mediaId
    ) {
        throw new Error(responses.media_id_cannot_be_null);
    }
};

type GroupLessonItem = Pick<Lesson, "lessonId" | "groupId" | "groupRank">;
export const getGroupedLessons = async (
    courseId: string,
    domainId: mongoose.Types.ObjectId
): Promise<GroupLessonItem[]> => {
    const course = await CourseModel.findOne({
        courseId: courseId,
        domain: domainId,
    });
    const allLessons = await LessonModel.find<GroupLessonItem>(
        {
            lessonId: {
                $in: [...course.lessons],
            },
            domain: domainId,
        },
        {
            lessonId: 1,
            groupRank: 1,
            groupId: 1,
        }
    );
    const lessonsInSequentialOrder = [];
    for (let group of course.groups.sort(
        (a: Group, b: Group) => a.rank - b.rank
    )) {
        lessonsInSequentialOrder.push(
            ...allLessons
                .filter(
                    (lesson: GroupLessonItem) => lesson.groupId === group.id
                )
                .sort(
                    (a: GroupLessonItem, b: GroupLessonItem) =>
                        a.groupRank - b.groupRank
                )
        );
    }
    return lessonsInSequentialOrder;
};

export const getPrevNextCursor = async (
    courseId: string,
    domainId: mongoose.Types.ObjectId,
    lessonId?: string
) => {
    const lessonsInSequentialOrder = await getGroupedLessons(
        courseId,
        domainId
    );
    const indexOfCurrentLesson = lessonId
        ? lessonsInSequentialOrder.findIndex(
              (item) => item.lessonId === lessonId
          )
        : -1;

    return {
        prevLesson:
            indexOfCurrentLesson - 1 < 0
                ? ""
                : lessonsInSequentialOrder[indexOfCurrentLesson - 1].lessonId,
        nextLesson:
            indexOfCurrentLesson + 1 > lessonsInSequentialOrder.length - 1
                ? ""
                : lessonsInSequentialOrder[indexOfCurrentLesson + 1].lessonId,
    };
};
