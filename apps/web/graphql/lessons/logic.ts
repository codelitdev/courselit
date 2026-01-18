import { repositories, Criteria } from "@courselit/orm-models";
import { responses } from "../../config/strings";
import {
    checkIfAuthenticated,
    checkOwnershipWithoutModel,
} from "../../lib/graphql";
import {
    evaluateLessonResult,
    getPrevNextCursor,
    isPartOfDripGroup,
    lessonValidator,
    removeCorrectAnswersProp,
} from "./helpers";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
import { deleteMedia } from "../../services/medialit";
import { recordProgress } from "../users/logic";
import {
    Constants,
    Progress,
    Quiz,
    User,
    Lesson,
    Course,
} from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { recordActivity } from "../../lib/record-activity";
import { InternalCourse } from "@courselit/common-logic";
import { error } from "@/services/logger";
import getDeletedMediaIds, {
    extractMediaIDs,
} from "@/lib/get-deleted-media-ids";
import { InternalCertificate as Certificate } from "@courselit/orm-models/dist/models/certificate";

const { permissions, quiz, scorm } = constants;

const getLessonOrThrow = async (
    id: string,
    ctx: GQLContext,
): Promise<Lesson> => {
    checkIfAuthenticated(ctx);

    const cb = Criteria.create<Lesson>();
    cb.where("lessonId", "eq", id);
    cb.where("domain" as keyof Lesson, "eq", ctx.subdomain._id);

    const lesson = await repositories.lesson.findOne(cb);

    if (!lesson) {
        throw new Error(responses.item_not_found);
    }

    if (!checkPermission(ctx.user.permissions, [permissions.manageAnyCourse])) {
        if (!checkOwnershipWithoutModel(lesson as any, ctx)) {
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

export const getLessonDetails = async (
    id: string,
    ctx: GQLContext,
    courseId?: string,
) => {
    const cb = Criteria.create<Lesson>();
    cb.where("lessonId", "eq", id);
    cb.where("domain" as keyof Lesson, "eq", ctx.subdomain._id);
    if (courseId) {
        cb.where("courseId", "eq", courseId);
    }
    const lesson = (await repositories.lesson.findOne(cb)) as any;

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
        const course = (await repositories.course.findByCourseId(
            lessonData.courseId,
            ctx.subdomain.id,
        )) as any;
        if (!course) throw new Error(responses.item_not_found);
        if (course.isBlog) throw new Error(responses.cannot_add_to_blogs);

        const lesson = await repositories.lesson.create({
            domain: ctx.subdomain.id,
            title: lessonData.title,
            type: lessonData.type,
            content: JSON.parse(lessonData.content),
            media: lessonData.media,
            downloadable: lessonData.downloadable,
            creatorId: ctx.user.userId,
            courseId: course.courseId,
            groupId: lessonData.groupId,
            requiresEnrollment: lessonData.requiresEnrollment,
        } as any);

        course.lessons.push(lesson.lessonId);
        const group = course.groups?.find(
            (group: any) =>
                ((group as any)._id?.toString() ?? "") === lessonData.groupId,
        );
        group?.lessonsOrder.push(lesson.lessonId);
        await repositories.course.update(
            course.id.toString(),
            course as unknown as Course,
        );

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
    let lesson = (await getLessonOrThrow(lessonData.id, ctx)) as any;
    lessonData.lessonId = lessonData.id;
    const updateId = (lesson as any).id;
    delete (lessonData as any).id;

    lessonData.type = lesson.type;
    const contentMediaIdsMarkedForDeletion: string[] = [];
    if (Object.prototype.hasOwnProperty.call(lessonData, "content")) {
        const nextContent = (lessonData.content ?? "") as string;
        contentMediaIdsMarkedForDeletion.push(
            ...getDeletedMediaIds(
                JSON.stringify(lesson.content || ""),
                nextContent,
            ),
        );
    }

    lessonValidator(lessonData);

    const updates: any = {};
    for (const key of Object.keys(lessonData)) {
        if (key === "content") {
            updates.content = JSON.parse(lessonData.content);
        } else {
            updates[key] = (lessonData as any)[key];
        }
    }
    for (const mediaId of contentMediaIdsMarkedForDeletion) {
        await deleteMedia(mediaId);
    }

    const updatedLesson = await repositories.lesson.update(updateId, updates);
    return updatedLesson;
};

export const deleteLesson = async (id: string, ctx: GQLContext) => {
    const lesson = (await getLessonOrThrow(id, ctx)) as any;

    try {
        // remove from the parent Course's lessons array
        const courseCb = Criteria.create<Course>();
        courseCb.where("domain" as keyof Course, "eq", ctx.subdomain._id);
        courseCb.where("lessons" as any, "eq", lesson.lessonId);
        const course = (await repositories.course.findOne(courseCb)) as any;

        if (!course) {
            return false;
        }

        course.lessons.splice(course.lessons.indexOf(lesson.lessonId), 1);
        await repositories.course.update(
            course.id.toString(),
            course as unknown as Course,
        );

        if (lesson.media?.mediaId) {
            await deleteMedia(lesson.media.mediaId);
        }

        if (lesson.content) {
            const extractedMediaIds = extractMediaIDs(
                JSON.stringify(lesson.content),
            );
            for (const mediaId of Array.from(extractedMediaIds)) {
                await deleteMedia(mediaId);
            }
        }

        const evaluationCb = Criteria.create<any>();
        evaluationCb.where("domain", "eq", ctx.subdomain._id);
        evaluationCb.where("lessonId", "eq", lesson.lessonId);
        await repositories.lessonEvaluation.deleteMany(evaluationCb);

        const activityCb = Criteria.create<any>();
        activityCb.where("domain", "eq", ctx.subdomain._id);
        activityCb.where("entityId", "eq", lesson.lessonId);
        await repositories.activity.deleteMany(activityCb);

        const lessonCb = Criteria.create<Lesson>();
        lessonCb.where("lessonId", "eq", lesson.lessonId);
        lessonCb.where("domain" as keyof Lesson, "eq", ctx.subdomain._id);
        await repositories.lesson.deleteMany(lessonCb);

        return true;
    } catch (err: any) {
        throw new Error(err.message);
    }
};

export const getAllLessons = async (
    course: InternalCourse,
    ctx: GQLContext,
) => {
    const cb = Criteria.create<Lesson>();
    cb.where("courseId", "eq", course.courseId);
    cb.where("domain" as keyof Lesson, "eq", ctx.subdomain._id);

    // findMany doesn't support projection yet, but we can return all and let GQL handle it
    const lessons = await repositories.lesson.findMany(cb);

    return lessons;
};

export const deleteAllLessons = async (courseId: string, ctx: GQLContext) => {
    const cb = Criteria.create<Lesson>();
    cb.where("domain" as keyof Lesson, "eq", ctx.subdomain._id);
    cb.where("courseId", "eq", courseId);

    const allLessons = await repositories.lesson.findMany(cb);
    for (const lesson of allLessons) {
        await deleteLesson(lesson.lessonId, ctx);
    }
};

export const markLessonCompleted = async (
    lessonId: string,
    ctx: GQLContext,
) => {
    checkIfAuthenticated(ctx);

    const lessonCb = Criteria.create<Lesson>();
    lessonCb.where("lessonId", "eq", lessonId);
    const lesson = await repositories.lesson.findOne(lessonCb);

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
            ctx.user.purchases[enrolledItemIndex].accessibleGroups.indexOf(
                lesson.groupId,
            ) === -1;
        if (groupIsNotInAccessibleGroups) {
            throw new Error(responses.drip_not_released);
        }
    }

    if (lesson.type === quiz) {
        const evaluationCb = Criteria.create<any>();
        evaluationCb.where("pass", "eq", true);
        evaluationCb.where("lessonId", "eq", lesson.lessonId);
        evaluationCb.where("userId", "eq", ctx.user.userId);
        evaluationCb.where("domain", "eq", ctx.subdomain._id);

        const lessonEvaluations =
            await repositories.lessonEvaluation.count(evaluationCb);
        if (lessonEvaluations === 0) {
            throw new Error(responses.need_to_pass);
        }
    }

    // Check SCORM completion status
    if (lesson.type === scorm) {
        const freshUser = await repositories.user.findById(ctx.user.id);
        const purchase = freshUser?.purchases?.[enrolledItemIndex];
        const lessonData = (purchase as any)?.scormData?.lessons?.[lessonId];

        let isCompleted = false;

        if (lessonData?.cmi) {
            // SCORM 1.2
            const status12 = lessonData.cmi.core?.lesson_status;
            // SCORM 2004
            const completion2004 = lessonData.cmi.completion_status;
            const success2004 = lessonData.cmi.success_status;

            isCompleted =
                status12 === "completed" ||
                status12 === "passed" ||
                completion2004 === "completed" ||
                success2004 === "passed";

            // Fallback: Allow completion if user has interacted (saved data exists)
            if (!isCompleted) {
                const hasData =
                    !!lessonData.cmi.suspend_data ||
                    !!lessonData.cmi.core?.session_time ||
                    !!lessonData.cmi.core?.exit;
                if (hasData) {
                    isCompleted = true;
                }
            }
        }

        if (!isCompleted) {
            throw new Error("Please complete the SCORM content first");
        }
    }

    await recordProgress({
        lessonId,
        courseId: lesson.courseId,
        user: ctx.user as unknown as User,
    });

    await recordActivity({
        domain: ctx.subdomain.id,
        userId: ctx.user.userId,
        type: Constants.ActivityType.LESSON_COMPLETED,
        entityId: lesson.lessonId,
        metadata: {
            courseId: lesson.courseId,
        },
    });

    await checkAndRecordCourseCompletion(lesson.courseId, ctx);

    return true;
};

const checkAndRecordCourseCompletion = async (
    courseId: string,
    ctx: GQLContext,
) => {
    const cb = Criteria.create<Course>();
    cb.where("courseId", "eq", courseId);
    const course = await repositories.course.findOne(cb);

    if (!course) {
        throw new Error(responses.item_not_found);
    }

    const isCourseCompleted = course.lessons.every((lessonId) => {
        const progress = ctx.user.purchases.find(
            (progress: Progress) => progress.courseId === course.courseId,
        );
        if (!progress) {
            return false;
        }
        return progress.completedLessons.includes(lessonId);
    });

    if (!isCourseCompleted) {
        return false;
    }

    await recordActivity({
        domain: ctx.subdomain.id,
        userId: ctx.user.userId,
        type: Constants.ActivityType.COURSE_COMPLETED,
        entityId: courseId,
    });

    if (course.certificate) {
        await issueCertificate(course as any, ctx);
    }

    return true;
};

const issueCertificate = async (
    course: InternalCourse,
    ctx: GQLContext,
): Promise<void> => {
    const cb = Criteria.create<Certificate>();
    cb.where("domain" as keyof Certificate, "eq", ctx.subdomain._id);
    cb.where("courseId", "eq", course.courseId);
    cb.where("userId", "eq", ctx.user.userId);

    const existingCertificate = await repositories.certificate.findOne(cb);
    if (existingCertificate) {
        return;
    }

    const certificate = await repositories.certificate.create({
        domain: ctx.subdomain.id,
        courseId: course.courseId,
        userId: ctx.user.userId,
    } as any);

    const enrolledItemIndex = ctx.user.purchases.findIndex(
        (progress: Progress) => progress.courseId === course.courseId,
    );

    if (enrolledItemIndex === -1) {
        error(
            `Error in issuing certificate due to course not found in user's purchases`,
            {
                courseId: course.courseId,
                userId: ctx.user.userId,
            },
        );
        return;
    }

    ctx.user.purchases[enrolledItemIndex].certificateId =
        certificate.certificateId;

    const userUpdates = {
        purchases: ctx.user.purchases,
    };
    await repositories.user.update(ctx.user.id, userUpdates);

    await recordActivity({
        domain: ctx.subdomain.id,
        userId: ctx.user.userId,
        type: Constants.ActivityType.CERTIFICATE_ISSUED,
        entityId: course.courseId,
    });
};

export const evaluateLesson = async (
    lessonId: string,
    answers: { answers: number[][] },
    ctx: GQLContext,
) => {
    const cb = Criteria.create<Lesson>();
    cb.where("lessonId", "eq", lessonId);
    const lesson = await repositories.lesson.findOne(cb);
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

    await repositories.lessonEvaluation.create({
        domain: ctx.subdomain.id,
        lessonId: lesson.lessonId,
        userId: ctx.user.userId,
        pass,
        score,
        requiresPassingGrade: (lesson.content as Quiz).requiresPassingGrade,
        passingGrade: (lesson.content as Quiz).passingGrade,
    } as any);

    return {
        pass,
        score,
        requiresPassingGrade: (lesson.content as Quiz).requiresPassingGrade,
        passingGrade: (lesson.content as Quiz).passingGrade,
    };
};
