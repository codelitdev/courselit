import { Constants } from "@courselit/common-models";
import DomainModel from "@/models/Domain";
import UserModel from "@/models/User";
import CourseModel from "@/models/Course";
import LessonModel from "@/models/Lesson";
import ActivityModel from "@/models/Activity";
import {
    createLesson,
    evaluateLesson,
    getAllLessons,
    getLessonDetails,
    markLessonCompleted,
} from "../logic";
import { responses } from "@/config/strings";
import { sealMedia } from "@/services/medialit";

jest.mock("@/services/medialit", () => ({
    deleteMedia: jest.fn(),
    sealMedia: jest.fn(),
}));

const SUITE_PREFIX = `lesson-visibility-${Date.now()}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

describe("Lesson visibility and progress", () => {
    let testDomain: any;
    let creator: any;
    let student: any;
    let manageAnyAdmin: any;
    let ownerManager: any;
    let otherManager: any;
    let course: any;
    let quizCourse: any;
    let groupId: string;
    let quizGroupId: string;
    let quizDripGroupId: string;
    let publishedLessonOne: any;
    let unpublishedLesson: any;
    let publishedLessonTwo: any;
    let unpublishedQuizLesson: any;
    let dripQuizLesson: any;
    let studentCtx: any;
    let creatorCtx: any;
    let manageAnyAdminCtx: any;
    let ownerManagerCtx: any;
    let otherManagerCtx: any;

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: id("domain"),
            email: email("domain"),
            features: [],
        });

        creator = await UserModel.create({
            domain: testDomain._id,
            userId: id("creator"),
            email: email("creator"),
            name: "Creator",
            active: true,
            permissions: [],
            unsubscribeToken: id("unsubscribe-creator"),
            purchases: [],
        });

        student = await UserModel.create({
            domain: testDomain._id,
            userId: id("student"),
            email: email("student"),
            name: "Student",
            active: true,
            permissions: [],
            unsubscribeToken: id("unsubscribe-student"),
            purchases: [],
        });

        manageAnyAdmin = await UserModel.create({
            domain: testDomain._id,
            userId: id("manage-any-admin"),
            email: email("manage-any-admin"),
            name: "Manage Any Admin",
            active: true,
            permissions: ["course:manage_any"],
            unsubscribeToken: id("unsubscribe-manage-any-admin"),
            purchases: [],
        });

        ownerManager = await UserModel.create({
            domain: testDomain._id,
            userId: id("owner-manager"),
            email: email("owner-manager"),
            name: "Owner Manager",
            active: true,
            permissions: ["course:manage"],
            unsubscribeToken: id("unsubscribe-owner-manager"),
            purchases: [],
        });

        otherManager = await UserModel.create({
            domain: testDomain._id,
            userId: id("other-manager"),
            email: email("other-manager"),
            name: "Other Manager",
            active: true,
            permissions: ["course:manage"],
            unsubscribeToken: id("unsubscribe-other-manager"),
            purchases: [],
        });

        groupId = id("group-1");
        quizGroupId = id("quiz-group");
        quizDripGroupId = id("quiz-drip-group");

        course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course"),
            title: "Visibility Course",
            lessons: [],
            creatorId: ownerManager.userId,
            cost: 0,
            privacy: "public",
            type: "course",
            costType: "free",
            slug: id("course-slug"),
            published: true,
            groups: [
                {
                    _id: groupId,
                    name: "Group 1",
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

        quizCourse = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("quiz-course"),
            title: "Quiz Visibility Course",
            lessons: [],
            creatorId: ownerManager.userId,
            cost: 0,
            privacy: "public",
            type: "course",
            costType: "free",
            slug: id("quiz-course-slug"),
            published: true,
            groups: [
                {
                    _id: quizGroupId,
                    name: "Quiz Group",
                    lessonsOrder: [],
                    rank: 1,
                    collapsed: true,
                    drip: {
                        status: false,
                        type: "relative-date",
                    },
                },
                {
                    _id: quizDripGroupId,
                    name: "Quiz Drip Group",
                    lessonsOrder: [],
                    rank: 2,
                    collapsed: true,
                    drip: {
                        status: true,
                        type: "relative-date",
                    },
                },
            ],
        });

        publishedLessonOne = await LessonModel.create({
            domain: testDomain._id,
            courseId: course.courseId,
            lessonId: id("published-1"),
            title: "Published 1",
            type: Constants.LessonType.TEXT,
            published: true,
            requiresEnrollment: false,
            content: {
                type: "doc",
                content: [],
            },
            creatorId: creator.userId,
            groupId,
        });

        unpublishedLesson = await LessonModel.create({
            domain: testDomain._id,
            courseId: course.courseId,
            lessonId: id("unpublished"),
            title: "Unpublished",
            type: Constants.LessonType.TEXT,
            published: false,
            requiresEnrollment: false,
            content: {
                type: "doc",
                content: [],
            },
            creatorId: creator.userId,
            groupId,
        });

        publishedLessonTwo = await LessonModel.create({
            domain: testDomain._id,
            courseId: course.courseId,
            lessonId: id("published-2"),
            title: "Published 2",
            type: Constants.LessonType.TEXT,
            published: true,
            requiresEnrollment: false,
            content: {
                type: "doc",
                content: [],
            },
            creatorId: creator.userId,
            groupId,
        });

        const quizContent = {
            questions: [
                {
                    text: "Question 1",
                    options: [
                        { text: "Correct", correctAnswer: true },
                        { text: "Incorrect", correctAnswer: false },
                    ],
                },
            ],
            requiresPassingGrade: true,
            passingGrade: 70,
        };

        unpublishedQuizLesson = await LessonModel.create({
            domain: testDomain._id,
            courseId: quizCourse.courseId,
            lessonId: id("unpublished-quiz"),
            title: "Unpublished Quiz",
            type: Constants.LessonType.QUIZ,
            published: false,
            requiresEnrollment: true,
            content: quizContent,
            creatorId: creator.userId,
            groupId: quizGroupId,
        });

        dripQuizLesson = await LessonModel.create({
            domain: testDomain._id,
            courseId: quizCourse.courseId,
            lessonId: id("drip-quiz"),
            title: "Drip Quiz",
            type: Constants.LessonType.QUIZ,
            published: true,
            requiresEnrollment: true,
            content: quizContent,
            creatorId: creator.userId,
            groupId: quizDripGroupId,
        });

        course.lessons = [
            publishedLessonOne.lessonId,
            unpublishedLesson.lessonId,
            publishedLessonTwo.lessonId,
        ];
        course.groups[0].lessonsOrder = [
            publishedLessonOne.lessonId,
            unpublishedLesson.lessonId,
            publishedLessonTwo.lessonId,
        ];
        await course.save();

        quizCourse.lessons = [
            unpublishedQuizLesson.lessonId,
            dripQuizLesson.lessonId,
        ];
        quizCourse.groups[0].lessonsOrder = [unpublishedQuizLesson.lessonId];
        quizCourse.groups[1].lessonsOrder = [dripQuizLesson.lessonId];
        await quizCourse.save();

        student.purchases.push({
            courseId: course.courseId,
            accessibleGroups: [groupId],
            completedLessons: [],
        });
        student.purchases.push({
            courseId: quizCourse.courseId,
            accessibleGroups: [quizGroupId],
            completedLessons: [],
        });
        student.markModified("purchases");
        await student.save();

        studentCtx = {
            user: student,
            subdomain: testDomain,
        } as any;

        creatorCtx = {
            user: creator,
            subdomain: testDomain,
        } as any;

        manageAnyAdminCtx = {
            user: manageAnyAdmin,
            subdomain: testDomain,
        } as any;

        ownerManagerCtx = {
            user: ownerManager,
            subdomain: testDomain,
        } as any;

        otherManagerCtx = {
            user: otherManager,
            subdomain: testDomain,
        } as any;
    });

    afterAll(async () => {
        await ActivityModel.deleteMany({ domain: testDomain._id });
        await LessonModel.deleteMany({ domain: testDomain._id });
        await CourseModel.deleteMany({ domain: testDomain._id });
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    beforeEach(async () => {
        const freshStudent = await UserModel.findById(student._id);
        const purchase = freshStudent?.purchases.find(
            (item: any) => item.courseId === course.courseId,
        );
        if (!purchase) {
            throw new Error("Purchase not found");
        }
        purchase.completedLessons = [];
        freshStudent!.markModified("purchases");
        await freshStudent!.save();
        studentCtx.user = freshStudent;

        await ActivityModel.deleteMany({
            domain: testDomain._id,
            userId: student.userId,
            entityId: course.courseId,
            type: Constants.ActivityType.COURSE_COMPLETED,
        });
    });

    it("should skip unpublished lessons in next/prev navigation for learners", async () => {
        const lesson = await getLessonDetails(
            publishedLessonOne.lessonId,
            studentCtx,
            course.courseId,
        );

        expect(lesson.prevLesson).toBe("");
        expect(lesson.nextLesson).toBe(publishedLessonTwo.lessonId);
    });

    it("should hide unpublished lessons from learners", async () => {
        await expect(
            getLessonDetails(
                unpublishedLesson.lessonId,
                studentCtx,
                course.courseId,
            ),
        ).rejects.toThrow(responses.item_not_found);
    });

    it("seals media before saving media-backed lessons on create", async () => {
        const tempMediaId = id("temp-video-media");
        (sealMedia as jest.Mock).mockResolvedValueOnce({
            mediaId: tempMediaId,
            originalFileName: "intro.mp4",
            mimeType: "video/mp4",
            size: 1234,
            access: "private",
            file: "https://media.example.com/temp-video.mp4",
            thumbnail: "https://media.example.com/thumb.jpg",
        });

        const lesson = await createLesson(
            {
                title: "Video lesson",
                type: Constants.LessonType.VIDEO,
                content: JSON.stringify({}),
                media: {
                    mediaId: tempMediaId,
                    originalFileName: "intro.mp4",
                    mimeType: "video/mp4",
                    size: 1234,
                    access: "private",
                    file: "https://media.example.com/temp-video.mp4",
                    thumbnail: "https://media.example.com/thumb.jpg",
                },
                downloadable: false,
                courseId: course.courseId,
                groupId,
                requiresEnrollment: true,
                published: false,
            } as any,
            {
                user: {
                    ...creator.toObject(),
                    permissions: ["course:manage"],
                },
                subdomain: testDomain,
            } as any,
        );

        expect(sealMedia).toHaveBeenCalledWith(tempMediaId);
        expect(lesson.media?.mediaId).toBe(tempMediaId);
        expect(lesson.media?.file).toBeUndefined();

        const savedLesson = (await LessonModel.findOne({
            lessonId: lesson.lessonId,
            domain: testDomain._id,
        }).lean()) as any;
        expect(savedLesson?.media?.mediaId).toBe(tempMediaId);
        expect(savedLesson?.media?.file).toBeUndefined();
    });

    it("rejects creating a lesson when the groupId does not exist in the course", async () => {
        await expect(
            createLesson(
                {
                    title: "Orphan lesson",
                    type: Constants.LessonType.TEXT,
                    content: JSON.stringify({ type: "doc", content: [] }),
                    courseId: course.courseId,
                    groupId: "nonexistent-section",
                    requiresEnrollment: false,
                    published: false,
                } as any,
                {
                    user: {
                        ...creator.toObject(),
                        permissions: ["course:manage"],
                    },
                    subdomain: testDomain,
                } as any,
            ),
        ).rejects.toThrow(responses.group_not_found);
    });

    it("does not allow owner course managers to read unpublished lessons outside preview mode", async () => {
        await expect(
            getLessonDetails(
                unpublishedLesson.lessonId,
                ownerManagerCtx,
                course.courseId,
            ),
        ).rejects.toThrow(responses.item_not_found);
    });

    it("allows owner course managers to read unpublished lessons in preview mode", async () => {
        const lesson = await getLessonDetails(
            unpublishedLesson.lessonId,
            ownerManagerCtx,
            course.courseId,
            true,
        );

        expect(lesson.lessonId).toBe(unpublishedLesson.lessonId);
        expect(lesson.prevLesson).toBe(publishedLessonOne.lessonId);
        expect(lesson.nextLesson).toBe(publishedLessonTwo.lessonId);
    });

    it("allows manage-any course admins to read unpublished lessons in preview mode", async () => {
        const lesson = await getLessonDetails(
            unpublishedLesson.lessonId,
            manageAnyAdminCtx,
            course.courseId,
            true,
        );

        expect(lesson.lessonId).toBe(unpublishedLesson.lessonId);
    });

    it("does not let manage-any course admins bypass enrollment outside preview mode", async () => {
        await expect(
            getLessonDetails(
                dripQuizLesson.lessonId,
                manageAnyAdminCtx,
                quizCourse.courseId,
            ),
        ).rejects.toThrow(responses.not_enrolled);
    });

    it("allows manage-any course admins to read enrollment-gated lessons without enrollment in preview mode", async () => {
        const lesson = await getLessonDetails(
            dripQuizLesson.lessonId,
            manageAnyAdminCtx,
            quizCourse.courseId,
            true,
        );

        expect(lesson.lessonId).toBe(dripQuizLesson.lessonId);
        expect(manageAnyAdmin.purchases).toEqual([]);
    });

    it("does not let non-manager users bypass enrollment with preview mode", async () => {
        await expect(
            getLessonDetails(
                dripQuizLesson.lessonId,
                creatorCtx,
                quizCourse.courseId,
                true,
            ),
        ).rejects.toThrow(responses.not_enrolled);
    });

    it("does not let non-manager users bypass drip access with preview mode", async () => {
        await expect(
            getLessonDetails(
                dripQuizLesson.lessonId,
                studentCtx,
                quizCourse.courseId,
                true,
            ),
        ).rejects.toThrow(responses.drip_not_released);
    });

    it("allows owner course managers to read enrollment-gated lessons without enrollment in preview mode", async () => {
        const lesson = await getLessonDetails(
            dripQuizLesson.lessonId,
            ownerManagerCtx,
            quizCourse.courseId,
            true,
        );

        expect(lesson.lessonId).toBe(dripQuizLesson.lessonId);
        expect(ownerManager.purchases).toEqual([]);
    });

    it("does not let non-owner course managers bypass enrollment", async () => {
        await expect(
            getLessonDetails(
                dripQuizLesson.lessonId,
                otherManagerCtx,
                quizCourse.courseId,
                true,
            ),
        ).rejects.toThrow(responses.not_enrolled);
    });

    it("does not let regular users bypass drip access", async () => {
        await expect(
            getLessonDetails(
                dripQuizLesson.lessonId,
                studentCtx,
                quizCourse.courseId,
            ),
        ).rejects.toThrow(responses.drip_not_released);
    });

    it("should support forcing published-only lessons even for owner context", async () => {
        const ownerLessons = await getAllLessons(
            course as any,
            ownerManagerCtx,
        );
        expect(
            ownerLessons.some(
                (lesson: any) => lesson.lessonId === unpublishedLesson.lessonId,
            ),
        ).toBe(true);

        const forcedLearnerLessons = await getAllLessons(
            course as any,
            ownerManagerCtx,
            true,
        );
        expect(
            forcedLearnerLessons.some(
                (lesson: any) => lesson.lessonId === unpublishedLesson.lessonId,
            ),
        ).toBe(false);
    });

    it("should allow course completion when all published lessons are completed", async () => {
        await markLessonCompleted(publishedLessonOne.lessonId, studentCtx);
        await markLessonCompleted(publishedLessonTwo.lessonId, studentCtx);

        const completionActivity = await ActivityModel.findOne({
            domain: testDomain._id,
            userId: student.userId,
            entityId: course.courseId,
            type: Constants.ActivityType.COURSE_COMPLETED,
        });

        expect(completionActivity).toBeTruthy();
    });

    it("should not allow completing unpublished lessons for owners", async () => {
        await expect(
            markLessonCompleted(unpublishedLesson.lessonId, ownerManagerCtx),
        ).rejects.toThrow(responses.item_not_found);
    });

    it("should not allow evaluating unpublished quiz lessons", async () => {
        await expect(
            evaluateLesson(
                unpublishedQuizLesson.lessonId,
                { answers: [[0]] },
                studentCtx,
            ),
        ).rejects.toThrow(responses.item_not_found);
    });

    it("should not allow evaluating drip-locked quiz lessons", async () => {
        await expect(
            evaluateLesson(
                dripQuizLesson.lessonId,
                { answers: [[0]] },
                studentCtx,
            ),
        ).rejects.toThrow(responses.drip_not_released);
    });
});
