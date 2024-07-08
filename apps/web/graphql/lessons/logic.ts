/**
 * Business logic for managing lessons
 */
import LessonModel, { Lesson } from "../../models/Lesson";
import { responses } from "../../config/strings";
import {
    checkIfAuthenticated,
    checkOwnershipWithoutModel,
} from "../../lib/graphql";
import CourseModel from "../../models/Course";
import {
    evaluateLessonResult,
    getPrevNextCursor,
    isPartOfDripGroup,
    lessonValidator,
    removeCorrectAnswersProp,
} from "./helpers";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
import { Course } from "../../models/Course";
import { deleteMedia } from "../../services/medialit";
import { recordProgress } from "../users/logic";
import { Progress, Quiz } from "@courselit/common-models";
import LessonEvaluation from "../../models/LessonEvaluation";
import { checkPermission } from "@courselit/utils";
import { recordActivity } from "../../lib/record-activity";

const { permissions, quiz } = constants;

const getLessonOrThrow = async (
    id: string,
    ctx: GQLContext,
): Promise<Lesson> => {
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
                (purchase: Progress) => purchase.courseId === lesson.courseId,
            ))
    ) {
        throw new Error(responses.not_enrolled);
    }

    if (await isPartOfDripGroup(lesson, ctx.subdomain._id)) {
        if (!ctx.user) {
            throw new Error(responses.drip_not_released);
        }

        const userProgress = ctx.user.purchases.find(
            (x) => x.courseId === lesson.courseId,
        );
        if (
            !userProgress ||
            userProgress.accessibleGroups.indexOf(lesson.groupId) === -1
        ) {
            throw new Error(responses.drip_not_released);
        }
    }

    const { prevLesson, nextLesson } = await getPrevNextCursor(
        lesson.courseId,
        ctx.subdomain._id,
        lesson.lessonId,
    );
    lesson.prevLesson = prevLesson;
    lesson.nextLesson = nextLesson;

    if (lesson.type === quiz) {
        return removeCorrectAnswersProp(lesson);
    }

    return lesson;
};

export type LessonWithStringContent = Omit<Lesson, "content"> & {
    content: string;
};

export const createLesson = async (
    lessonData: LessonWithStringContent,
    ctx: GQLContext,
) => {
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
        if (course.isBlog) throw new Error(responses.cannot_add_to_blogs); // TODO: refactor this

        const lesson = await LessonModel.create({
            domain: ctx.subdomain._id,
            title: lessonData.title,
            type: lessonData.type,
            content: JSON.parse(lessonData.content),
            media: lessonData.media,
            downloadable: lessonData.downloadable,
            creatorId: ctx.user._id, // TODO: refactor this
            courseId: course.courseId,
            groupId: lessonData.groupId,
            requiresEnrollment: lessonData.requiresEnrollment,
        });

        course.lessons.push(lesson.lessonId);
        const group = course.groups.find(
            (group) => group._id === lessonData.groupId,
        );
        group.lessonsOrder.push(lesson.lessonId);
        await (course as any).save();

        return lesson;
    } catch (err: any) {
        throw new Error(err.message);
    }
};

export const updateLesson = async (
    lessonData: Pick<
        LessonWithStringContent,
        | "title"
        | "content"
        | "media"
        | "downloadable"
        | "requiresEnrollment"
        | "type"
    > & { id: string; lessonId: string },
    ctx: GQLContext,
) => {
    let lesson = await getLessonOrThrow(lessonData.id, ctx);
    lessonData.lessonId = lessonData.id;
    delete lessonData.id;

    lessonData.type = lesson.type;
    lessonValidator(lessonData);

    for (const key of Object.keys(lessonData)) {
        if (key === "content") {
            lesson.content = JSON.parse(lessonData.content);
        } else {
            lesson[key] = lessonData[key];
        }
    }

    lesson = await (lesson as any).save();
    return lesson;
};

export const deleteLesson = async (id: string, ctx: GQLContext) => {
    const lesson = await getLessonOrThrow(id, ctx);

    try {
        // remove from the parent Course's lessons array
        let course: Course | null = await CourseModel.findOne({
            domain: ctx.subdomain._id,
        }).elemMatch("lessons", { $eq: lesson.lessonId });
        if (!course) {
            return false;
        }

        course.lessons.splice(course.lessons.indexOf(lesson.lessonId), 1);
        await (course as any).save();

        if (lesson.media?.mediaId) {
            await deleteMedia(lesson.media.mediaId);
        }

        await LessonModel.deleteOne({
            _id: lesson._id,
            domain: ctx.subdomain._id,
        });
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
        },
    );

    return lessons;
};

// TODO: refactor this as it might not be deleting the media
export const deleteAllLessons = async (courseId: string, ctx: GQLContext) => {
    const allLessonsWithMedia = await LessonModel.find(
        {
            courseId,
            domain: ctx.subdomain._id,
            mediaId: { $ne: null },
        },
        {
            mediaId: 1,
        },
    );
    for (let media of allLessonsWithMedia) {
        await deleteMedia(media.mediaId);
    }
    await LessonModel.deleteMany({
        courseId,
        domain: ctx.subdomain._id,
    });
};

export const markLessonCompleted = async (
    lessonId: string,
    ctx: GQLContext,
) => {
    checkIfAuthenticated(ctx);

    const lesson = await LessonModel.findOne<Lesson>({ lessonId });
    if (!lesson) {
        throw new Error(responses.item_not_found);
    }

    const enrolledItemIndex = ctx.user.purchases.findIndex(
        (progress: Progress) => progress.courseId === lesson.courseId,
    );

    if (enrolledItemIndex === -1) {
        throw new Error(responses.not_enrolled);
    }

    if (await isPartOfDripGroup(lesson, ctx.subdomain._id)) {
        const groupIsNotInAccessibleGroups =
            ctx.user.purchases
                .find((x) => x.courseId === lesson.courseId)
                .accessibleGroups.indexOf(lesson.groupId) === -1;
        if (groupIsNotInAccessibleGroups) {
            throw new Error(responses.drip_not_released);
        }
    }

    if (lesson.type === quiz) {
        const lessonEvaluations = await LessonEvaluation.countDocuments({
            pass: true,
            lessonId: lesson.lessonId,
            userId: ctx.user.userId,
            domain: ctx.subdomain._id,
        });
        if (lessonEvaluations === 0) {
            throw new Error(responses.need_to_pass);
        }
    }

    await recordProgress({
        lessonId,
        courseId: lesson.courseId,
        user: ctx.user,
    });

    await recordActivity({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        type: "lesson_completed",
        entityId: lesson.lessonId,
        metadata: {
            courseId: lesson.courseId,
        },
    });

    return true;
};

export const evaluateLesson = async (
    lessonId: string,
    answers: { answers: number[][] },
    ctx: GQLContext,
) => {
    const lesson = await LessonModel.findOne<Lesson>({ lessonId });
    if (!lesson) {
        throw new Error(responses.item_not_found);
    }

    const enrolledItemIndex = ctx.user.purchases.findIndex(
        (progress: Progress) => progress.courseId === lesson.courseId,
    );

    if (enrolledItemIndex === -1) {
        throw new Error(responses.not_enrolled);
    }

    if (lesson.type !== quiz) {
        throw new Error(responses.cannot_be_evaluated);
    }

    if (!answers.answers || !answers.answers.length) {
        throw new Error(responses.answers_missing);
    }

    const { pass, score } = evaluateLessonResult(
        lesson.content as Quiz,
        answers.answers,
    );

    await LessonEvaluation.create({
        domain: ctx.subdomain._id,
        lessonId: lesson.lessonId,
        userId: ctx.user.userId,
        pass,
        score,
        requiresPassingGrade: (lesson.content as Quiz).requiresPassingGrade,
        passingGrade: (lesson.content as Quiz).passingGrade,
    });

    return {
        pass,
        score,
        requiresPassingGrade: (lesson.content as Quiz).requiresPassingGrade,
        passingGrade: (lesson.content as Quiz).passingGrade,
    };
};
