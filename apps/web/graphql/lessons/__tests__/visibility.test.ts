import { Constants } from "@courselit/common-models";
import mongoose from "mongoose";
import DomainModel from "@/models/Domain";
import UserModel from "@/models/User";
import CourseModel from "@/models/Course";
import LessonModel from "@/models/Lesson";
import ActivityModel from "@/models/Activity";
import { getAllLessons, getLessonDetails, markLessonCompleted } from "../logic";
import { responses } from "@/config/strings";

const SUITE_PREFIX = `lesson-visibility-${Date.now()}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

describe("Lesson visibility and progress", () => {
    let testDomain: any;
    let creator: any;
    let student: any;
    let course: any;
    let groupId: string;
    let publishedLessonOne: any;
    let unpublishedLesson: any;
    let publishedLessonTwo: any;
    let studentCtx: any;
    let creatorCtx: any;

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

        groupId = new mongoose.Types.ObjectId().toString();

        course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course"),
            title: "Visibility Course",
            lessons: [],
            creatorId: creator.userId,
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

        student.purchases.push({
            courseId: course.courseId,
            accessibleGroups: [groupId],
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

    it("should hide unpublished lessons from owners in learner lesson details", async () => {
        await expect(
            getLessonDetails(
                unpublishedLesson.lessonId,
                creatorCtx,
                course.courseId,
            ),
        ).rejects.toThrow(responses.item_not_found);
    });

    it("should support forcing published-only lessons even for owner context", async () => {
        const ownerLessons = await getAllLessons(course as any, creatorCtx);
        expect(
            ownerLessons.some(
                (lesson: any) => lesson.lessonId === unpublishedLesson.lessonId,
            ),
        ).toBe(true);

        const forcedLearnerLessons = await getAllLessons(
            course as any,
            creatorCtx,
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
            markLessonCompleted(unpublishedLesson.lessonId, creatorCtx),
        ).rejects.toThrow(responses.item_not_found);
    });
});
