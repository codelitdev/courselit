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

interface LessonCursors {
    prevLesson: string;
    nextLesson: string;
}

export const getPrevNextCursor = async (
    courseId: string,
    domainId: mongoose.Types.ObjectId,
    lessonId?: string
): Promise<LessonCursors> => {
    const course = await CourseModel.findOne({
        courseId: courseId,
        domain: domainId,
    });
    const allLessons = await LessonModel.find(
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
                .filter((lesson: Lesson) => lesson.groupId === group.id)
                .sort((a: Lesson, b: Lesson) => a.groupRank - b.groupRank)
        );
    }

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
