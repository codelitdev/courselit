import { markLessonCompleted } from "../logic";
import LessonModel from "@courselit/orm-models/dao/lesson";
import UserModel from "@courselit/orm-models/dao/user";
import CourseModel from "@courselit/orm-models/dao/course";
import DomainModel from "@courselit/orm-models/dao/domain";
import { Constants } from "@courselit/common-models";
import mongoose from "mongoose";

const SUITE_PREFIX = `scorm-tests-${Date.now()}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

describe("SCORM Logic Integration", () => {
    let testDomain: any;
    let user: any;
    let course: any;
    let scormLesson: any;
    let mockCtx: any;

    beforeAll(async () => {
        // Create Domain
        testDomain = await DomainModel.create({
            name: id("domain"),
            email: email("domain"),
            features: [],
        });

        // Create User
        user = await UserModel.create({
            domain: testDomain._id,
            userId: id("user"),
            email: email("user"),
            name: "Test User",
            active: true,
            permissions: [],
            unsubscribeToken: id("unsubscribe-user"),
            purchases: [],
        });

        const groupId = new mongoose.Types.ObjectId().toString();

        // Create Course
        course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course"),
            title: "SCORM Course",
            lessons: [],
            creatorId: user.userId,
            cost: 0,
            privacy: "public",
            type: "course",
            costType: "free",
            slug: id("course-slug"),
            published: true,
            groups: [
                {
                    _id: groupId,
                    name: "Default Group",
                    lessonsOrder: [],
                    rank: 1,
                    collapsed: true,
                    drip: {
                        status: false,
                        type: "relative-date",
                    },
                },
            ],
        });

        // Create SCORM Lesson
        scormLesson = await LessonModel.create({
            domain: testDomain._id,
            courseId: course.courseId,
            lessonId: id("lesson-scorm"),
            title: "SCORM Lesson",
            type: Constants.LessonType.SCORM,
            requiresEnrollment: true,
            content: {
                launchUrl: "index.html",
                version: "1.2",
            },
            creatorId: user.userId,
            groupId: groupId,
        });

        // Add lesson to course
        course.lessons.push(scormLesson.lessonId);
        await course.save();

        // Enroll user
        user.purchases.push({
            courseId: course.courseId,
            accessibleGroups: [groupId], // User needs access to the group too!
            completedLessons: [],
            scormData: {
                lessons: {},
            },
        });
        user.markModified("purchases");
        await user.save();

        mockCtx = {
            user: user,
            subdomain: testDomain,
        } as any;
    });

    afterAll(async () => {
        await UserModel.deleteMany({ domain: testDomain._id });
        await LessonModel.deleteMany({ domain: testDomain._id });
        await CourseModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    beforeEach(async () => {
        // Reset user progress for the lesson
        const u = await UserModel.findById(user._id);
        const purchase = u!.purchases.find(
            (p: any) => p.courseId === course.courseId,
        );
        if (!purchase) throw new Error("Purchase not found");

        purchase.completedLessons = [];
        ensureScormData(purchase);
        purchase.scormData.lessons = {}; // Clear lessons

        u!.markModified("purchases");
        await u!.save();
        mockCtx.user = u; // update context user
    });

    const ensureScormData = (purchase: any) => {
        if (!purchase.scormData) purchase.scormData = {};
        if (!purchase.scormData.lessons) purchase.scormData.lessons = {};
        return purchase;
    };

    it("should fail validation if no SCORM data exists", async () => {
        await expect(
            markLessonCompleted(scormLesson.lessonId, mockCtx),
        ).rejects.toThrow("Please complete the SCORM content first");
    });

    it("should fail if SCORM 1.2 status is incomplete", async () => {
        // Update user with incomplete status
        const u = await UserModel.findById(user._id);
        const purchase = u!.purchases.find(
            (p: any) => p.courseId === course.courseId,
        );
        ensureScormData(purchase);

        purchase.scormData.lessons[scormLesson.lessonId] = {
            cmi: {
                core: {
                    lesson_status: "incomplete",
                },
            },
        };
        u!.markModified("purchases");
        await u!.save();
        mockCtx.user = u;

        await expect(
            markLessonCompleted(scormLesson.lessonId, mockCtx),
        ).rejects.toThrow("Please complete the SCORM content first");
    });

    it("should succeed if SCORM 1.2 status is completed", async () => {
        // Update user with completed status
        const u = await UserModel.findById(user._id);
        const purchase = u!.purchases.find(
            (p: any) => p.courseId === course.courseId,
        );
        ensureScormData(purchase);

        purchase.scormData.lessons[scormLesson.lessonId] = {
            cmi: {
                core: {
                    lesson_status: "completed",
                },
            },
        };
        u!.markModified("purchases");
        await u!.save();
        mockCtx.user = u;

        const result = await markLessonCompleted(scormLesson.lessonId, mockCtx);
        expect(result).toBe(true);

        // Verify it was marked as completed in progress
        const updatedUser = await UserModel.findById(user._id);
        const p = updatedUser!.purchases.find(
            (p: any) => p.courseId === course.courseId,
        );
        expect(p?.completedLessons).toContain(scormLesson.lessonId);
    });

    it("should succeed if SCORM 2004 completion_status is completed", async () => {
        const u = await UserModel.findById(user._id);
        const purchase = u!.purchases.find(
            (p: any) => p.courseId === course.courseId,
        );
        ensureScormData(purchase);

        purchase.scormData.lessons[scormLesson.lessonId] = {
            cmi: {
                completion_status: "completed",
            },
        };
        u!.markModified("purchases");
        await u!.save();
        mockCtx.user = u;

        const result = await markLessonCompleted(scormLesson.lessonId, mockCtx);
        expect(result).toBe(true);
    });

    it("should succeed via fallback if interaction data exists", async () => {
        const u = await UserModel.findById(user._id);
        const purchase = u!.purchases.find(
            (p: any) => p.courseId === course.courseId,
        );
        ensureScormData(purchase);

        purchase.scormData.lessons[scormLesson.lessonId] = {
            cmi: {
                core: {
                    lesson_status: "incomplete",
                    exit: "suspend", // Has exit data
                },
            },
        };
        u!.markModified("purchases");
        await u!.save();
        mockCtx.user = u;

        const result = await markLessonCompleted(scormLesson.lessonId, mockCtx);
        expect(result).toBe(true);
    });
});
