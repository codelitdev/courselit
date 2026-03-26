import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import CourseModel from "@models/Course";
import constants from "@/config/constants";
import { responses } from "@/config/strings";
import { reorderGroups } from "../logic";

const SUITE_PREFIX = `reorder-groups-${Date.now()}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

describe("reorderGroups", () => {
    let testDomain: any;
    let adminUser: any;
    let ownerWithManageCourse: any;
    let ownerWithoutManageCourse: any;
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

        ownerWithoutManageCourse = await UserModel.create({
            domain: testDomain._id,
            userId: id("owner-without-manage-course"),
            email: email("owner-without-manage-course"),
            name: "Owner Without ManageCourse",
            permissions: [],
            active: true,
            unsubscribeToken: id("unsubscribe-owner-without-manage-course"),
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
    });

    afterAll(async () => {
        await CourseModel.deleteMany({ domain: testDomain._id });
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    it("reorders groups atomically and rewrites sparse ranks", async () => {
        const groupId1 = id("group-1");
        const groupId2 = id("group-2");
        const groupId3 = id("group-3");
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course"),
            title: id("course-title"),
            creatorId: adminUser.userId,
            groups: [
                {
                    _id: groupId1,
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [],
                },
                {
                    _id: groupId2,
                    name: "Group 2",
                    rank: 2000,
                    collapsed: true,
                    lessonsOrder: [],
                },
                {
                    _id: groupId3,
                    name: "Group 3",
                    rank: 3000,
                    collapsed: true,
                    lessonsOrder: [],
                },
            ],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug"),
        });

        const reorderedCourse = await reorderGroups({
            courseId: course.courseId,
            groupIds: [groupId3, groupId1, groupId2],
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

        const rankById = new Map(
            (updatedCourse?.groups ?? []).map((group: any) => [
                group._id.toString(),
                group.rank,
            ]),
        );

        expect(rankById.get(groupId3)).toBe(1000);
        expect(rankById.get(groupId1)).toBe(2000);
        expect(rankById.get(groupId2)).toBe(3000);
        expect(
            (updatedCourse?.groups ?? []).map((group: any) =>
                group._id.toString(),
            ),
        ).toEqual([groupId3, groupId1, groupId2]);
        expect(
            (reorderedCourse.groups ?? []).map((group: any) => group.id),
        ).toEqual([groupId3, groupId1, groupId2]);
    });

    it("rejects duplicate group ids", async () => {
        const groupId1 = id("group-dupe-1");
        const groupId2 = id("group-dupe-2");
        const groupId3 = id("group-dupe-3");
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-dupe"),
            title: id("course-title-dupe"),
            creatorId: adminUser.userId,
            groups: [
                {
                    _id: groupId1,
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [],
                },
                {
                    _id: groupId2,
                    name: "Group 2",
                    rank: 2000,
                    collapsed: true,
                    lessonsOrder: [],
                },
                {
                    _id: groupId3,
                    name: "Group 3",
                    rank: 3000,
                    collapsed: true,
                    lessonsOrder: [],
                },
            ],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug-dupe"),
        });

        await expect(
            reorderGroups({
                courseId: course.courseId,
                groupIds: [groupId1, groupId1, groupId2],
                ctx: {
                    subdomain: testDomain,
                    user: adminUser,
                    address: "",
                },
            }),
        ).rejects.toThrow(responses.invalid_input);
    });

    it("rejects permutations that do not include all groups", async () => {
        const groupId1 = id("group-count-1");
        const groupId2 = id("group-count-2");
        const groupId3 = id("group-count-3");
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-count"),
            title: id("course-title-count"),
            creatorId: adminUser.userId,
            groups: [
                {
                    _id: groupId1,
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [],
                },
                {
                    _id: groupId2,
                    name: "Group 2",
                    rank: 2000,
                    collapsed: true,
                    lessonsOrder: [],
                },
                {
                    _id: groupId3,
                    name: "Group 3",
                    rank: 3000,
                    collapsed: true,
                    lessonsOrder: [],
                },
            ],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug-count"),
        });

        await expect(
            reorderGroups({
                courseId: course.courseId,
                groupIds: [groupId1, groupId2],
                ctx: {
                    subdomain: testDomain,
                    user: adminUser,
                    address: "",
                },
            }),
        ).rejects.toThrow(responses.invalid_input);
    });

    it("rejects unknown group ids", async () => {
        const groupId1 = id("group-unknown-1");
        const groupId2 = id("group-unknown-2");
        const groupId3 = id("group-unknown-3");
        const unknownGroupId = id("group-unknown-missing");
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-unknown"),
            title: id("course-title-unknown"),
            creatorId: adminUser.userId,
            groups: [
                {
                    _id: groupId1,
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [],
                },
                {
                    _id: groupId2,
                    name: "Group 2",
                    rank: 2000,
                    collapsed: true,
                    lessonsOrder: [],
                },
                {
                    _id: groupId3,
                    name: "Group 3",
                    rank: 3000,
                    collapsed: true,
                    lessonsOrder: [],
                },
            ],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug-unknown"),
        });

        await expect(
            reorderGroups({
                courseId: course.courseId,
                groupIds: [groupId1, unknownGroupId, groupId2],
                ctx: {
                    subdomain: testDomain,
                    user: adminUser,
                    address: "",
                },
            }),
        ).rejects.toThrow(responses.invalid_input);
    });

    it("allows owners with manageCourse and rejects owners without permissions", async () => {
        const groupId1 = id("group-owner-1");
        const groupId2 = id("group-owner-2");
        const ownerCourse = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-owner"),
            title: id("course-title-owner"),
            creatorId: ownerWithManageCourse.userId,
            groups: [
                {
                    _id: groupId1,
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [],
                },
                {
                    _id: groupId2,
                    name: "Group 2",
                    rank: 2000,
                    collapsed: true,
                    lessonsOrder: [],
                },
            ],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug-owner"),
        });

        await expect(
            reorderGroups({
                courseId: ownerCourse.courseId,
                groupIds: [groupId2, groupId1],
                ctx: {
                    subdomain: testDomain,
                    user: ownerWithManageCourse,
                    address: "",
                },
            }),
        ).resolves.toBeTruthy();

        const ownerNoPermissionCourse = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-owner-no-permission"),
            title: id("course-title-owner-no-permission"),
            creatorId: ownerWithoutManageCourse.userId,
            groups: [
                {
                    _id: id("group-owner-no-permission-1"),
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [],
                },
                {
                    _id: id("group-owner-no-permission-2"),
                    name: "Group 2",
                    rank: 2000,
                    collapsed: true,
                    lessonsOrder: [],
                },
            ],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug-owner-no-permission"),
        });

        await expect(
            reorderGroups({
                courseId: ownerNoPermissionCourse.courseId,
                groupIds: ownerNoPermissionCourse.groups.map((group: any) =>
                    group.id.toString(),
                ),
                ctx: {
                    subdomain: testDomain,
                    user: ownerWithoutManageCourse,
                    address: "",
                },
            }),
        ).rejects.toThrow(responses.action_not_allowed);
    });

    it("rejects non-owner users with manageCourse", async () => {
        const groupId1 = id("group-non-owner-1");
        const groupId2 = id("group-non-owner-2");
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-non-owner"),
            title: id("course-title-non-owner"),
            creatorId: adminUser.userId,
            groups: [
                {
                    _id: groupId1,
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [],
                },
                {
                    _id: groupId2,
                    name: "Group 2",
                    rank: 2000,
                    collapsed: true,
                    lessonsOrder: [],
                },
            ],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug-non-owner"),
        });

        await expect(
            reorderGroups({
                courseId: course.courseId,
                groupIds: [groupId2, groupId1],
                ctx: {
                    subdomain: testDomain,
                    user: otherUserWithManageCourse,
                    address: "",
                },
            }),
        ).rejects.toThrow(responses.item_not_found);
    });
});
