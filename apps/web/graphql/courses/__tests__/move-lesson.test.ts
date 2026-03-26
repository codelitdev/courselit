import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import CourseModel from "@models/Course";
import LessonModel from "@models/Lesson";
import constants from "@/config/constants";
import { responses } from "@/config/strings";
import { moveLesson } from "../logic";

const SUITE_PREFIX = `move-lesson-${Date.now()}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

describe("moveLesson", () => {
    let testDomain: any;
    let adminUser: any;
    let ownerWithManageCourse: any;
    let otherUserWithManageCourse: any;

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: id("domain"),
            email: email("domain"),
        });

        adminUser = await UserModel.create({
            domain: testDomain._id,
            userId: id("admin-user"),
            email: email("admin"),
            name: "Admin User",
            permissions: [constants.permissions.manageAnyCourse],
            active: true,
            unsubscribeToken: id("unsubscribe-admin"),
            purchases: [],
        });

        ownerWithManageCourse = await UserModel.create({
            domain: testDomain._id,
            userId: id("owner-manage-course"),
            email: email("owner-manage-course"),
            name: "Owner With ManageCourse",
            permissions: [constants.permissions.manageCourse],
            active: true,
            unsubscribeToken: id("unsubscribe-owner-manage-course"),
            purchases: [],
        });

        otherUserWithManageCourse = await UserModel.create({
            domain: testDomain._id,
            userId: id("other-manage-course"),
            email: email("other-manage-course"),
            name: "Other User With ManageCourse",
            permissions: [constants.permissions.manageCourse],
            active: true,
            unsubscribeToken: id("unsubscribe-other-manage-course"),
            purchases: [],
        });
    });

    beforeEach(async () => {
        await CourseModel.deleteMany({ domain: testDomain._id });
        await LessonModel.deleteMany({ domain: testDomain._id });
    });

    afterAll(async () => {
        await CourseModel.deleteMany({ domain: testDomain._id });
        await LessonModel.deleteMany({ domain: testDomain._id });
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    it("reorders lessons within the same group", async () => {
        const groupId = id("group-1");
        const lesson1 = id("lesson-1");
        const lesson2 = id("lesson-2");
        const lesson3 = id("lesson-3");
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-same-group"),
            title: id("course-title-same-group"),
            creatorId: ownerWithManageCourse.userId,
            groups: [
                {
                    _id: groupId,
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [lesson1, lesson2, lesson3],
                },
            ],
            lessons: [lesson1, lesson2, lesson3],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug-same-group"),
        });

        await LessonModel.insertMany([
            {
                domain: testDomain._id,
                lessonId: lesson1,
                title: "Lesson 1",
                type: "text",
                content: {},
                creatorId: ownerWithManageCourse.userId,
                courseId: course.courseId,
                groupId,
            },
            {
                domain: testDomain._id,
                lessonId: lesson2,
                title: "Lesson 2",
                type: "text",
                content: {},
                creatorId: ownerWithManageCourse.userId,
                courseId: course.courseId,
                groupId,
            },
            {
                domain: testDomain._id,
                lessonId: lesson3,
                title: "Lesson 3",
                type: "text",
                content: {},
                creatorId: ownerWithManageCourse.userId,
                courseId: course.courseId,
                groupId,
            },
        ]);

        await moveLesson({
            courseId: course.courseId,
            lessonId: lesson1,
            destinationGroupId: groupId,
            destinationIndex: 2,
            ctx: {
                subdomain: testDomain,
                user: ownerWithManageCourse,
                address: "",
            },
        });

        const updatedCourse = await CourseModel.findOne({
            domain: testDomain._id,
            courseId: course.courseId,
        }).lean();

        expect(updatedCourse?.groups?.[0]?.lessonsOrder).toEqual([
            lesson2,
            lesson3,
            lesson1,
        ]);
    });

    it("moves lessons across groups and updates lesson.groupId", async () => {
        const groupId1 = id("group-1");
        const groupId2 = id("group-2");
        const lesson1 = id("lesson-1");
        const lesson2 = id("lesson-2");
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-cross-group"),
            title: id("course-title-cross-group"),
            creatorId: ownerWithManageCourse.userId,
            groups: [
                {
                    _id: groupId1,
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [lesson1, lesson2],
                },
                {
                    _id: groupId2,
                    name: "Group 2",
                    rank: 2000,
                    collapsed: true,
                    lessonsOrder: [],
                },
            ],
            lessons: [lesson1, lesson2],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug-cross-group"),
        });

        await LessonModel.insertMany([
            {
                domain: testDomain._id,
                lessonId: lesson1,
                title: "Lesson 1",
                type: "text",
                content: {},
                creatorId: ownerWithManageCourse.userId,
                courseId: course.courseId,
                groupId: groupId1,
            },
            {
                domain: testDomain._id,
                lessonId: lesson2,
                title: "Lesson 2",
                type: "text",
                content: {},
                creatorId: ownerWithManageCourse.userId,
                courseId: course.courseId,
                groupId: groupId1,
            },
        ]);

        await moveLesson({
            courseId: course.courseId,
            lessonId: lesson2,
            destinationGroupId: groupId2,
            destinationIndex: 0,
            ctx: {
                subdomain: testDomain,
                user: ownerWithManageCourse,
                address: "",
            },
        });

        const updatedCourse = await CourseModel.findOne({
            domain: testDomain._id,
            courseId: course.courseId,
        }).lean();
        expect(updatedCourse?.groups?.[0]?.lessonsOrder).toEqual([lesson1]);
        expect(updatedCourse?.groups?.[1]?.lessonsOrder).toEqual([lesson2]);

        const updatedLesson = await LessonModel.findOne({
            domain: testDomain._id,
            lessonId: lesson2,
        }).lean();
        expect(updatedLesson?.groupId).toBe(groupId2);
    });

    it("rejects move when lesson id is not part of course.lessons", async () => {
        const groupId = id("group-1");
        const lessonId = id("lesson-not-listed");
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-invalid-membership"),
            title: id("course-title-invalid-membership"),
            creatorId: ownerWithManageCourse.userId,
            groups: [
                {
                    _id: groupId,
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [lessonId],
                },
            ],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug-invalid-membership"),
        });

        await LessonModel.create({
            domain: testDomain._id,
            lessonId,
            title: "Lesson 1",
            type: "text",
            content: {},
            creatorId: ownerWithManageCourse.userId,
            courseId: course.courseId,
            groupId,
        });

        await expect(
            moveLesson({
                courseId: course.courseId,
                lessonId,
                destinationGroupId: groupId,
                destinationIndex: 0,
                ctx: {
                    subdomain: testDomain,
                    user: ownerWithManageCourse,
                    address: "",
                },
            }),
        ).rejects.toThrow(responses.invalid_input);
    });

    it("rejects unknown destination groups", async () => {
        const groupId = id("group-1");
        const unknownGroup = id("group-unknown");
        const lessonId = id("lesson-1");
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-unknown-group"),
            title: id("course-title-unknown-group"),
            creatorId: ownerWithManageCourse.userId,
            groups: [
                {
                    _id: groupId,
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [lessonId],
                },
            ],
            lessons: [lessonId],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug-unknown-group"),
        });

        await LessonModel.create({
            domain: testDomain._id,
            lessonId,
            title: "Lesson 1",
            type: "text",
            content: {},
            creatorId: ownerWithManageCourse.userId,
            courseId: course.courseId,
            groupId,
        });

        await expect(
            moveLesson({
                courseId: course.courseId,
                lessonId,
                destinationGroupId: unknownGroup,
                destinationIndex: 0,
                ctx: {
                    subdomain: testDomain,
                    user: ownerWithManageCourse,
                    address: "",
                },
            }),
        ).rejects.toThrow(responses.invalid_input);
    });

    it("rejects unknown lesson ids", async () => {
        const groupId = id("group-1");
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-unknown-lesson"),
            title: id("course-title-unknown-lesson"),
            creatorId: ownerWithManageCourse.userId,
            groups: [
                {
                    _id: groupId,
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [],
                },
            ],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug-unknown-lesson"),
        });

        await expect(
            moveLesson({
                courseId: course.courseId,
                lessonId: id("missing-lesson"),
                destinationGroupId: groupId,
                destinationIndex: 0,
                ctx: {
                    subdomain: testDomain,
                    user: ownerWithManageCourse,
                    address: "",
                },
            }),
        ).rejects.toThrow(responses.item_not_found);
    });

    it("rejects unknown courses", async () => {
        const lessonId = id("lesson-for-missing-course");

        await LessonModel.create({
            domain: testDomain._id,
            lessonId,
            title: "Lesson 1",
            type: "text",
            content: {},
            creatorId: ownerWithManageCourse.userId,
            courseId: id("different-course"),
            groupId: id("group-1"),
        });

        await expect(
            moveLesson({
                courseId: id("missing-course"),
                lessonId,
                destinationGroupId: id("group-1"),
                destinationIndex: 0,
                ctx: {
                    subdomain: testDomain,
                    user: ownerWithManageCourse,
                    address: "",
                },
            }),
        ).rejects.toThrow(responses.item_not_found);
    });

    it("normalizes duplicate ordering entries by keeping one destination entry", async () => {
        const groupId1 = id("group-1");
        const groupId2 = id("group-2");
        const lessonId = id("lesson-1");
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-duplicate-order"),
            title: id("course-title-duplicate-order"),
            creatorId: ownerWithManageCourse.userId,
            groups: [
                {
                    _id: groupId1,
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [lessonId],
                },
                {
                    _id: groupId2,
                    name: "Group 2",
                    rank: 2000,
                    collapsed: true,
                    lessonsOrder: [lessonId],
                },
            ],
            lessons: [lessonId],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug-duplicate-order"),
        });

        await LessonModel.create({
            domain: testDomain._id,
            lessonId,
            title: "Lesson 1",
            type: "text",
            content: {},
            creatorId: ownerWithManageCourse.userId,
            courseId: course.courseId,
            groupId: groupId1,
        });

        await moveLesson({
            courseId: course.courseId,
            lessonId,
            destinationGroupId: groupId2,
            destinationIndex: 0,
            ctx: {
                subdomain: testDomain,
                user: adminUser,
                address: "",
            },
        });

        const updatedCourse = await CourseModel.findOne({
            domain: testDomain._id,
            courseId: course.courseId,
        }).lean();
        expect(updatedCourse?.groups?.[0]?.lessonsOrder).toEqual([]);
        expect(updatedCourse?.groups?.[1]?.lessonsOrder).toEqual([lessonId]);
    });

    it("rejects non-owner users without manageAnyCourse permission", async () => {
        const groupId = id("group-1");
        const lessonId = id("lesson-1");
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-non-owner"),
            title: id("course-title-non-owner"),
            creatorId: ownerWithManageCourse.userId,
            groups: [
                {
                    _id: groupId,
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [lessonId],
                },
            ],
            lessons: [lessonId],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug-non-owner"),
        });

        await LessonModel.create({
            domain: testDomain._id,
            lessonId,
            title: "Lesson 1",
            type: "text",
            content: {},
            creatorId: ownerWithManageCourse.userId,
            courseId: course.courseId,
            groupId,
        });

        await expect(
            moveLesson({
                courseId: course.courseId,
                lessonId,
                destinationGroupId: groupId,
                destinationIndex: 0,
                ctx: {
                    subdomain: testDomain,
                    user: otherUserWithManageCourse,
                    address: "",
                },
            }),
        ).rejects.toThrow(responses.item_not_found);
    });
});
