/**
 * Business logic for managing lessons
 */
import mongoose from "mongoose";
import LessonModel, { Lesson } from "../../models/Lesson";
import { responses } from "../../config/strings";
import {
    checkIfAuthenticated,
    checkPermission,
    checkOwnershipWithoutModel,
} from "../../lib/graphql";
import CourseModel from "../../models/Course";
import { getPrevNextCursor, lessonValidator } from "./helpers";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
import { Course } from "../../models/Course";
import { deleteMedia } from "../../services/medialit";
import { Progress } from "../../models/Progress";
import { Group } from "@courselit/common-models";

const { permissions } = constants;

const getLessonOrThrow = async (id: string, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    const lesson = await LessonModel.findOne({
        lessonId: id,
        domain: ctx.subdomain._id,
    });

    if (!lesson) {
        throw new Error(responses.item_not_found);
    }

    if (!checkPermission(ctx.user.permissions, [permissions.manageAnyCourse])) {
        if (!checkOwnershipWithoutModel(lesson, ctx)) {
            throw new Error(responses.item_not_found);
        } else {
            if (
                !checkPermission(ctx.user.permissions, [
                    permissions.manageCourse,
                ])
            ) {
                throw new Error(responses.action_not_allowed);
            }
        }
    }

    return lesson;
};

export const getLesson = async (id: string, ctx: GQLContext) => {
    return await getLessonOrThrow(id, ctx);
};

export const getLessonDetails = async (id: string, ctx: GQLContext) => {
    const lesson = await LessonModel.findOne({
        lessonId: id,
        domain: ctx.subdomain._id,
    });

    if (!lesson) {
        throw new Error(responses.item_not_found);
    }

    if (
        lesson.requiresEnrollment &&
        (!ctx.user ||
            !ctx.user.purchases.some(
                (purchase: Progress) => purchase.courseId === lesson.courseId
            ))
    ) {
        throw new Error(responses.not_enrolled);
    }

    const { prevLesson, nextLesson } = await getPrevNextCursor(
        lesson.courseId,
        ctx.subdomain._id,
        lesson.lessonId
    );
    lesson.prevLesson = prevLesson;
    lesson.nextLesson = nextLesson;

    return lesson;
};

export const createLesson = async (lessonData: Lesson, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageCourse])) {
        throw new Error(responses.action_not_allowed);
    }

    lessonValidator(lessonData);

    try {
        const course: Course | null = await CourseModel.findOne({
            courseId: lessonData.courseId,
            domain: ctx.subdomain._id,
        });
        if (!course) throw new Error(responses.item_not_found);
        if (course.isBlog) throw new Error(responses.cannot_add_to_blogs);

        const lesson = await LessonModel.create({
            domain: ctx.subdomain._id,
            title: lessonData.title,
            type: lessonData.type,
            content: lessonData.content,
            mediaId: lessonData.mediaId,
            downloadable: lessonData.downloadable,
            creatorId: ctx.user._id,
            courseId: course.courseId,
            groupId: lessonData.groupId,
            groupRank: -1,
            requiresEnrollment: lessonData.requiresEnrollment,
        });

        course.lessons.push(lesson.lessonId);
        await (course as any).save();

        return lesson;
    } catch (err: any) {
        throw new Error(err.message);
    }
};

export const updateLesson = async (lessonData: any, ctx: GQLContext) => {
    // TODO: work out a better way to save things
    let lesson = await getLessonOrThrow(lessonData.id, ctx);

    lessonValidator(lessonData);

    for (const key of Object.keys(lessonData)) {
        lesson[key] = lessonData[key];
    }

    lesson = await lesson.save();
    return lesson;
};

export const deleteLesson = async (id: string, ctx: GQLContext) => {
    const lesson = await getLessonOrThrow(id, ctx);

    try {
        // remove from the parent Course's lessons array
        let course: Course | null = await CourseModel.findOne({
            domain: ctx.subdomain._id,
        }).elemMatch("lessons", { $eq: lesson.id });
        if (!course) {
            return null;
        }

        if (~course.lessons.indexOf(lesson.id)) {
            course.lessons.splice(course.lessons.indexOf(lesson.id), 1);
        }
        await (course as any).save();

        if (lesson.mediaId) {
            await deleteMedia(lesson.mediaId);
        }

        await lesson.remove();
        return true;
    } catch (err: any) {
        throw new Error(err.message);
    }
};

export const getAllLessons = async (course: Course, ctx: GQLContext) => {
    const lessons = await LessonModel.find(
        {
            lessonId: {
                $in: [...course.lessons],
            },
            domain: ctx.subdomain._id,
        },
        {
            id: 1,
            lessonId: 1,
            type: 1,
            title: 1,
            requiresEnrollment: 1,
            courseId: 1,
            groupId: 1,
            groupRank: 1,
        }
    );

    return lessons;
};

export const deleteAllLessons = async (courseId: string, ctx: GQLContext) => {
    const allLessonsWithMedia = await LessonModel.find(
        {
            courseId,
            domain: ctx.subdomain._id,
            mediaId: { $ne: null },
        },
        {
            mediaId: 1,
        }
    );
    for (let media of allLessonsWithMedia) {
        await deleteMedia(media.mediaId);
    }
    await LessonModel.deleteMany({
        courseId,
        domain: ctx.subdomain._id,
    });
};
