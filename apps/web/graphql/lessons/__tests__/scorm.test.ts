import { markLessonCompleted } from "../logic";
import LessonModel from "@courselit/orm-models/dao/lesson";
import UserModel from "@courselit/orm-models/dao/user";
import CourseModel from "@courselit/orm-models/dao/course";
import DomainModel from "@courselit/orm-models/dao/domain";
import { Constants } from "@courselit/common-models";

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
        testDomain = await DomainModel.createOne({
            name: id("domain"),
            email: email("domain"),
            features: [],
        });

        // Create User
        user = await UserModel.createUser({
            domain: testDomain._id,
            userId: id("user"),
            email: email("user"),
            name: "Test User",
            active: true,
            permissions: [],
            unsubscribeToken: id("unsubscribe-user"),
            purchases: [],
        });

        const groupId = id("group");

        // Create Course
        course = await CourseModel.createOne({
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
        scormLesson = await LessonModel.createOne({
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
        await CourseModel.saveOne(course);

        // Enroll user
        user.purchases.push({
            courseId: course.courseId,
            accessibleGroups: [groupId], // User needs access to the group too!
            completedLessons: [],
            scormData: {
                lessons: {},
            },
        });
        await UserModel.saveOne(user as any);

        mockCtx = {
            user: user,
            subdomain: testDomain,
        } as any;
    });

    afterAll(async () => {
        await UserModel.removeMany({ domain: testDomain._id });
        await LessonModel.removeMany({ domain: testDomain._id });
        await CourseModel.removeMany({ domain: testDomain._id });
        await DomainModel.removeOne({ _id: testDomain._id });
    });

    beforeEach(async () => {
        // Reset user progress for the lesson
        const u = await UserModel.getById(user._id);
        const purchase = ensureScormData(
            u!.purchases.find((p: any) => p.courseId === course.courseId),
        );
        if (!purchase) throw new Error("Purchase not found");

        purchase.completedLessons = [];
        purchase.scormData.lessons = {}; // Clear lessons

        await UserModel.saveOne(u as any);
        mockCtx.user = u; // update context user
    });

    const ensureScormData = (purchase: any) => {
        if (!purchase) return null;
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
        const u = await UserModel.getById(user._id);
        const purchase = ensureScormData(
            u!.purchases.find((p: any) => p.courseId === course.courseId),
        );
        if (!purchase) throw new Error("Purchase not found");

        purchase.scormData.lessons[scormLesson.lessonId] = {
            cmi: {
                core: {
                    lesson_status: "incomplete",
                },
            },
        };
        await UserModel.saveOne(u as any);
        mockCtx.user = u;

        await expect(
            markLessonCompleted(scormLesson.lessonId, mockCtx),
        ).rejects.toThrow("Please complete the SCORM content first");
    });

    it("should succeed if SCORM 1.2 status is completed", async () => {
        // Update user with completed status
        const u = await UserModel.getById(user._id);
        const purchase = ensureScormData(
            u!.purchases.find((p: any) => p.courseId === course.courseId),
        );
        if (!purchase) throw new Error("Purchase not found");

        purchase.scormData.lessons[scormLesson.lessonId] = {
            cmi: {
                core: {
                    lesson_status: "completed",
                },
            },
        };
        await UserModel.saveOne(u as any);
        mockCtx.user = u;

        const result = await markLessonCompleted(scormLesson.lessonId, mockCtx);
        expect(result).toBe(true);

        // Verify it was marked as completed in progress
        const updatedUser = await UserModel.getById(user._id);
        const p = updatedUser!.purchases.find(
            (p: any) => p.courseId === course.courseId,
        );
        expect(p?.completedLessons).toContain(scormLesson.lessonId);
    });

    it("should succeed if SCORM 2004 completion_status is completed", async () => {
        const u = await UserModel.getById(user._id);
        const purchase = ensureScormData(
            u!.purchases.find((p: any) => p.courseId === course.courseId),
        );
        if (!purchase) throw new Error("Purchase not found");

        purchase.scormData.lessons[scormLesson.lessonId] = {
            cmi: {
                completion_status: "completed",
            },
        };
        await UserModel.saveOne(u as any);
        mockCtx.user = u;

        const result = await markLessonCompleted(scormLesson.lessonId, mockCtx);
        expect(result).toBe(true);
    });

    it("should succeed via fallback if interaction data exists", async () => {
        const u = await UserModel.getById(user._id);
        const purchase = ensureScormData(
            u!.purchases.find((p: any) => p.courseId === course.courseId),
        );
        if (!purchase) throw new Error("Purchase not found");

        purchase.scormData.lessons[scormLesson.lessonId] = {
            cmi: {
                core: {
                    lesson_status: "incomplete",
                    exit: "suspend", // Has exit data
                },
            },
        };
        await UserModel.saveOne(u as any);
        mockCtx.user = u;

        const result = await markLessonCompleted(scormLesson.lessonId, mockCtx);
        expect(result).toBe(true);
    });
});
