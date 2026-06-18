import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import CourseModel from "@models/Course";
import ActivityModel from "@models/Activity";
import LessonModel from "@models/Lesson";
import MembershipModel from "@models/Membership";
import PageModel from "@models/Page";
import constants from "@/config/constants";
import { responses } from "@/config/strings";
import { Constants as CommonConstants } from "@courselit/common-models";
import {
    getCourse,
    getCoursesAsAdmin,
    getMembers,
    getProducts,
    updateCourse,
} from "../logic";
import { getActivities } from "../../activities/logic";
import { getLessonOrThrow } from "../../lessons/logic";
import { deleteMedia, sealMedia } from "@/services/medialit";

jest.mock("@/services/medialit", () => ({
    deleteMedia: jest.fn().mockResolvedValue(true),
    sealMedia: jest.fn().mockImplementation((id) =>
        Promise.resolve({
            mediaId: id,
            file: `https://cdn.medialit.clqa.online/medialit-service/p/${id}/main.webp`,
        }),
    ),
}));

const UPDATE_COURSE_SUITE_PREFIX = `update-course-${Date.now()}`;
const id = (suffix: string) => `${UPDATE_COURSE_SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) =>
    `${suffix}-${UPDATE_COURSE_SUITE_PREFIX}@example.com`;
const GET_COURSE_SUITE_PREFIX = `get-course-${Date.now()}`;
const getCourseId = (suffix: string) => `${GET_COURSE_SUITE_PREFIX}-${suffix}`;
const getCourseEmail = (suffix: string) =>
    `${suffix}-${GET_COURSE_SUITE_PREFIX}@example.com`;

describe("updateCourse", () => {
    let testDomain: any;
    let adminUser: any;
    let page: any;

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: id("domain"),
            email: email("domain"),
        });

        // Create admin user with course management permissions
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

        page = await PageModel.create({
            domain: testDomain._id,
            pageId: "test-page-perm",
            name: "Test Page",
            creatorId: adminUser.userId,
            deleteable: true,
        });
    });

    beforeEach(async () => {
        await CourseModel.deleteMany({ domain: testDomain._id });
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await PageModel.deleteOne({ _id: page._id });
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    it("Spot all the mediaIds to be deleted correctly", async () => {
        const initialDescription = {
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [{ type: "text", text: "Multi file" }],
                },
                {
                    type: "image",
                    attrs: {
                        src: "https://cdn.medialit.clqa.online/medialit-service/i/qv9GyJgdvkIdKpRRGBHH1MQFf7qqPzcPzO2XER_K/main.webp",
                        alt: "thumb (1).webp",
                        title: "thumb (1).webp",
                        width: null,
                        height: null,
                    },
                },
                {
                    type: "image",
                    attrs: {
                        src: "https://cdn.medialit.clqa.online/medialit-service/i/w3caqs2p1NtqO7p95vnScR6EEWLoxTf1gsJQPWTG/main.webp",
                        alt: "favicon.webp",
                        title: "favicon.webp",
                        width: null,
                        height: null,
                    },
                },
                { type: "paragraph" },
            ],
        };

        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-unique"),
            title: id("course-title"),
            creatorId: adminUser.userId,
            deleteable: true,
            pageId: page.pageId,
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: "test-course-perm",
            description: JSON.stringify(initialDescription),
        });

        const updatedDescription = {
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [{ type: "text", text: "Multi file" }],
                },
                {
                    type: "image",
                    attrs: {
                        src: "https://cdn.medialit.clqa.online/medialit-service/i/qv9GyJgdvkIdKpRRGBHH1MQFf7qqPzcPzO2XER_K/main.webp",
                        alt: "thumb (1).webp",
                        title: "thumb (1).webp",
                        width: null,
                        height: null,
                    },
                },
                { type: "paragraph" },
            ],
        };

        await updateCourse(
            {
                description: JSON.stringify(updatedDescription),
                id: course.courseId as any,
            },
            {
                subdomain: testDomain,
                user: adminUser,
                address: "",
            },
        );

        expect(deleteMedia).toHaveBeenCalledWith(
            "w3caqs2p1NtqO7p95vnScR6EEWLoxTf1gsJQPWTG",
        );
    });

    it("Replace all temp media with sealed one", async () => {
        const descriptionWithTempMedia = {
            type: "doc",
            content: [
                {
                    type: "image",
                    attrs: {
                        src: "https://cdn.medialit.clqa.online/medialit-service/i/8U1v2-_1oh9kC-iA1JtD5lQ1m0Y8L1M8AWm_9hH7/main.webp",
                        alt: "favicon.webp",
                        title: "favicon.webp",
                        width: null,
                        height: null,
                    },
                },
                { type: "paragraph" },
            ],
        };

        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-unique-2"),
            title: id("course-title-2"),
            creatorId: adminUser.userId,
            deleteable: true,
            pageId: page.pageId,
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: "test-course-perm",
            description: JSON.stringify({
                type: "doc",
                content: [{ type: "paragraph" }],
            }),
        });

        const updatedCourse = await updateCourse(
            {
                description: JSON.stringify(descriptionWithTempMedia),
                id: course.courseId as any,
            },
            {
                subdomain: testDomain,
                user: adminUser,
                address: "",
            },
        );

        const expectedDescription = {
            type: "doc",
            content: [
                {
                    type: "image",
                    attrs: {
                        src: "https://cdn.medialit.clqa.online/medialit-service/p/8U1v2-_1oh9kC-iA1JtD5lQ1m0Y8L1M8AWm_9hH7/main.webp",
                        alt: "favicon.webp",
                        title: "favicon.webp",
                        width: null,
                        height: null,
                    },
                },
                { type: "paragraph" },
            ],
        };

        expect(sealMedia).toHaveBeenCalledWith(
            "8U1v2-_1oh9kC-iA1JtD5lQ1m0Y8L1M8AWm_9hH7",
        );
        expect(updatedCourse.description).toEqual(
            JSON.stringify(expectedDescription),
        );
    });

    it("updates one property on an incomplete draft blog", async () => {
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("draft-blog"),
            title: id("draft-blog-title"),
            creatorId: adminUser.userId,
            deleteable: true,
            lessons: [],
            type: "blog",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("draft-blog-slug"),
            published: false,
        });

        const updatedCourse = await updateCourse(
            {
                id: course.courseId as any,
                title: id("draft-blog-title-updated"),
            },
            {
                subdomain: testDomain,
                user: adminUser,
                address: "",
            },
        );

        expect(updatedCourse.title).toBe(id("draft-blog-title-updated"));
        expect(updatedCourse.description).toBeUndefined();
    });

    it("updates a draft blog description with serialized Tiptap content", async () => {
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("draft-blog-description"),
            title: id("draft-blog-description-title"),
            creatorId: adminUser.userId,
            deleteable: true,
            lessons: [],
            type: "blog",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("draft-blog-description-slug"),
            published: false,
        });
        const description = JSON.stringify({
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [
                        {
                            type: "text",
                            text: "Updated course description.",
                        },
                    ],
                },
            ],
        });

        const updatedCourse = await updateCourse(
            {
                id: course.courseId as any,
                title: id("draft-blog-description-title-updated"),
                description,
            },
            {
                subdomain: testDomain,
                user: adminUser,
                address: "",
            },
        );

        expect(updatedCourse.title).toBe(
            id("draft-blog-description-title-updated"),
        );
        expect(updatedCourse.description).toBe(description);
    });

    it("validates the overall state when publishing an incomplete blog", async () => {
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("publish-incomplete-blog"),
            title: id("publish-incomplete-blog-title"),
            creatorId: adminUser.userId,
            deleteable: true,
            lessons: [],
            type: "blog",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("publish-incomplete-blog-slug"),
            published: false,
        });
        const publishingAdmin = adminUser.toObject();
        publishingAdmin.permissions = [
            constants.permissions.manageAnyCourse,
            constants.permissions.publishCourse,
        ];

        await expect(
            updateCourse(
                {
                    id: course.courseId as any,
                    published: true,
                },
                {
                    subdomain: testDomain,
                    user: publishingAdmin,
                    address: "",
                },
            ),
        ).rejects.toThrow(responses.blog_description_empty);
    });
});

describe("getCourse", () => {
    let testDomain: any;
    let adminUser: any;
    let ownerManager: any;
    let ownerWithoutManagePermission: any;

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: getCourseId("domain"),
            email: getCourseEmail("domain"),
        });

        adminUser = await UserModel.create({
            domain: testDomain._id,
            userId: getCourseId("admin-user"),
            email: getCourseEmail("admin"),
            name: "Admin User",
            permissions: [constants.permissions.manageAnyCourse],
            active: true,
            unsubscribeToken: getCourseId("unsubscribe-admin"),
            purchases: [],
        });

        ownerManager = await UserModel.create({
            domain: testDomain._id,
            userId: getCourseId("owner-manager"),
            email: getCourseEmail("owner-manager"),
            name: "Owner Manager",
            permissions: [constants.permissions.manageCourse],
            active: true,
            unsubscribeToken: getCourseId("unsubscribe-owner-manager"),
            purchases: [],
        });

        ownerWithoutManagePermission = await UserModel.create({
            domain: testDomain._id,
            userId: getCourseId("owner-without-manage"),
            email: getCourseEmail("owner-without-manage"),
            name: "Owner Without Manage",
            permissions: [],
            active: true,
            unsubscribeToken: getCourseId("unsubscribe-owner-without-manage"),
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

    it("returns groups sorted by rank", async () => {
        const groupId1 = getCourseId("group-1");
        const groupId2 = getCourseId("group-2");
        const groupId3 = getCourseId("group-3");
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: getCourseId("course"),
            title: getCourseId("course-title"),
            creatorId: adminUser.userId,
            groups: [
                {
                    _id: groupId2,
                    name: "Group 2",
                    rank: 2000,
                    collapsed: true,
                    lessonsOrder: [],
                },
                {
                    _id: groupId1,
                    name: "Group 1",
                    rank: 1000,
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
            slug: getCourseId("course-slug"),
        });

        const formattedCourse = await getCourse(
            course.courseId,
            {
                subdomain: testDomain,
                user: adminUser,
                address: "",
            },
            false,
            true,
        );

        expect(formattedCourse?.groups?.map((group: any) => group.id)).toEqual([
            groupId1,
            groupId2,
            groupId3,
        ]);
    });

    it("does not allow course managers to preview unpublished courses without preview mode", async () => {
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: getCourseId("unpublished-course-no-preview"),
            title: getCourseId("unpublished-course-no-preview-title"),
            creatorId: ownerManager.userId,
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: getCourseId("unpublished-course-no-preview-slug"),
            published: false,
        });

        const formattedCourse = await getCourse(course.courseId, {
            subdomain: testDomain,
            user: ownerManager,
            address: "",
        });

        expect(formattedCourse).toBeNull();
    });

    it("allows course managers to preview unpublished courses in preview mode", async () => {
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: getCourseId("unpublished-course"),
            title: getCourseId("unpublished-course-title"),
            creatorId: ownerManager.userId,
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: getCourseId("unpublished-course-slug"),
            published: false,
        });

        const formattedCourse = await getCourse(
            course.courseId,
            {
                subdomain: testDomain,
                user: ownerManager,
                address: "",
            },
            false,
            true,
        );

        expect(formattedCourse?.courseId).toBe(course.courseId);
        expect((formattedCourse as any)?.isPreview).toBe(true);
    });

    it("returns non-preview course responses for managers outside preview mode", async () => {
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: getCourseId("published-manager-course"),
            title: getCourseId("published-manager-course-title"),
            creatorId: ownerManager.userId,
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: getCourseId("published-manager-course-slug"),
            published: true,
        });

        const formattedCourse = await getCourse(course.courseId, {
            subdomain: testDomain,
            user: ownerManager,
            address: "",
        });

        expect(formattedCourse?.courseId).toBe(course.courseId);
        expect((formattedCourse as any)?.isPreview).toBe(false);
    });

    it("does not allow course owners without manage permission to preview unpublished courses", async () => {
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: getCourseId("unpublished-owner-course"),
            title: getCourseId("unpublished-owner-course-title"),
            creatorId: ownerWithoutManagePermission.userId,
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: getCourseId("unpublished-owner-course-slug"),
            published: false,
        });

        const formattedCourse = await getCourse(
            course.courseId,
            {
                subdomain: testDomain,
                user: ownerWithoutManagePermission,
                address: "",
            },
            false,
            true,
        );

        expect(formattedCourse).toBeNull();
    });
});

describe("public API product read helpers", () => {
    let testDomain: any;
    let adminUser: any;

    const helperId = (suffix: string) =>
        `public-api-read-${Date.now()}-${suffix}`;

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: helperId("domain"),
            email: `${helperId("domain")}@example.com`,
        });

        adminUser = await UserModel.create({
            domain: testDomain._id,
            userId: helperId("admin-user"),
            email: `${helperId("admin")}@example.com`,
            name: "Admin User",
            permissions: [constants.permissions.manageAnyCourse],
            active: true,
            unsubscribeToken: helperId("unsubscribe-admin"),
            purchases: [],
        });
    });

    beforeEach(async () => {
        await CourseModel.deleteMany({ domain: testDomain._id });
        await LessonModel.deleteMany({ domain: testDomain._id });
        await MembershipModel.deleteMany({ domain: testDomain._id });
    });

    afterAll(async () => {
        await MembershipModel.deleteMany({ domain: testDomain._id });
        await LessonModel.deleteMany({ domain: testDomain._id });
        await CourseModel.deleteMany({ domain: testDomain._id });
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    it("passes public API list filters through the existing product query helper", async () => {
        const paginatedFind = jest
            .spyOn(CourseModel as any, "paginatedFind")
            .mockResolvedValueOnce([]);

        await getProducts({
            ctx: {
                subdomain: testDomain,
                user: adminUser,
                address: "",
            },
            page: 2,
            limit: 25,
            filterBy: [constants.course],
            published: false,
            searchText: "robotics",
        });

        expect(paginatedFind).toHaveBeenCalledWith(
            {
                domain: testDomain._id,
                type: { $in: [constants.course] },
                published: false,
                $text: { $search: "robotics" },
            },
            {
                page: 2,
                limit: 25,
                sort: -1,
            },
        );

        paginatedFind.mockRestore();
    });

    it("returns owned dashboard products for course:manage users", async () => {
        const courseManageUser = await UserModel.create({
            domain: testDomain._id,
            userId: helperId("dashboard-manage-user"),
            email: `${helperId("dashboard-manage")}@example.com`,
            name: "Dashboard Course Manager",
            permissions: [constants.permissions.manageCourse],
            active: true,
            unsubscribeToken: helperId("unsubscribe-dashboard-manage"),
            purchases: [],
        });

        const ownedCourse = await CourseModel.create({
            domain: testDomain._id,
            courseId: helperId("dashboard-owned-course"),
            title: "Dashboard Owned Course",
            creatorId: courseManageUser.userId,
            groups: [],
            lessons: [],
            type: constants.course,
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: helperId("dashboard-owned-course-slug"),
        });

        const otherCourse = await CourseModel.create({
            domain: testDomain._id,
            courseId: helperId("dashboard-other-course"),
            title: "Dashboard Other Course",
            creatorId: adminUser.userId,
            groups: [],
            lessons: [],
            type: constants.course,
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: helperId("dashboard-other-course-slug"),
        });

        const products = await Promise.all(
            await getCoursesAsAdmin({
                offset: 1,
                context: {
                    subdomain: testDomain,
                    user: courseManageUser,
                    address: "",
                },
            }),
        );

        expect(products.map((product) => product.courseId)).toContain(
            ownedCourse.courseId,
        );
        expect(products.map((product) => product.courseId)).not.toContain(
            otherCourse.courseId,
        );
    });

    it("restricts overview metrics to owned products for course:manage users", async () => {
        const courseManageUser = await UserModel.create({
            domain: testDomain._id,
            userId: helperId("manage-user-2"),
            email: `${helperId("manage2")}@example.com`,
            name: "Course Manager 2",
            permissions: [constants.permissions.manageCourse],
            active: true,
            unsubscribeToken: helperId("unsubscribe-manage-2"),
            purchases: [],
        });

        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: helperId("owned-course"),
            title: "Owned Course",
            creatorId: courseManageUser.userId,
            groups: [],
            lessons: [],
            type: constants.course,
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: helperId("owned-course-slug"),
        });

        const otherCourse = await CourseModel.create({
            domain: testDomain._id,
            courseId: helperId("other-course"),
            title: "Other Course",
            creatorId: "another-user-id",
            groups: [],
            lessons: [],
            type: constants.course,
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: helperId("other-course-slug"),
        });

        const ctx = {
            subdomain: testDomain,
            user: courseManageUser,
            address: "",
        };

        await expect(
            getActivities({
                ctx,
                type: CommonConstants.ActivityType.PURCHASED,
                duration: "lifetime",
                entityId: course.courseId,
            }),
        ).resolves.toBeDefined();

        await expect(
            getActivities({
                ctx,
                type: CommonConstants.ActivityType.PURCHASED,
                duration: "lifetime",
                entityId: otherCourse.courseId,
            }),
        ).rejects.toThrow(responses.action_not_allowed);

        await ActivityModel.create([
            {
                domain: testDomain._id,
                type: CommonConstants.ActivityType.PURCHASED,
                entityId: course.courseId,
                createdAt: new Date(),
                metadata: { cost: 100 },
                userId: courseManageUser.userId,
            },
            {
                domain: testDomain._id,
                type: CommonConstants.ActivityType.PURCHASED,
                entityId: otherCourse.courseId,
                createdAt: new Date(),
                metadata: { cost: 50 },
                userId: courseManageUser.userId,
            },
            {
                domain: testDomain._id,
                type: CommonConstants.ActivityType.PURCHASED,
                entityId: course.courseId,
                createdAt: new Date(),
                metadata: { cost: 35 },
                userId: courseManageUser.userId,
            },
        ]);

        const aggregated = await getActivities({
            ctx,
            type: CommonConstants.ActivityType.PURCHASED,
            duration: "lifetime",
        });

        expect(aggregated.count).toBe(135);
    });

    it("rejects course-scoped lesson reads when the lesson belongs to another product", async () => {
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: helperId("course"),
            title: "Course",
            creatorId: adminUser.userId,
            groups: [],
            lessons: [],
            type: constants.course,
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: helperId("course-slug"),
        });
        const otherCourse = await CourseModel.create({
            domain: testDomain._id,
            courseId: helperId("other-course"),
            title: "Other Course",
            creatorId: adminUser.userId,
            groups: [],
            lessons: [],
            type: constants.course,
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: helperId("other-course-slug"),
        });
        const lessonId = helperId("other-course-lesson");
        await LessonModel.create({
            domain: testDomain._id,
            lessonId,
            title: "Other Course Lesson",
            type: constants.text,
            creatorId: adminUser.userId,
            courseId: otherCourse.courseId,
            groupId: helperId("other-group"),
            published: false,
        });

        await expect(
            getLessonOrThrow(
                lessonId,
                {
                    subdomain: testDomain,
                    user: adminUser,
                    address: "",
                },
                { courseId: course.courseId },
            ),
        ).rejects.toThrow(responses.item_not_found);
    });

    it("filters product members by user name or email inside GraphQL logic", async () => {
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: helperId("member-course"),
            title: "Course",
            creatorId: adminUser.userId,
            groups: [],
            lessons: [],
            type: constants.course,
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: helperId("member-course-slug"),
        });
        const matchingByName = await UserModel.create({
            domain: testDomain._id,
            userId: helperId("matching-name-user"),
            email: `${helperId("matching-name")}@example.com`,
            name: "Student Searchable",
            active: true,
            permissions: [],
            unsubscribeToken: helperId("matching-name-unsubscribe"),
            purchases: [{ courseId: course.courseId, completedLessons: [] }],
        });
        const matchingByEmail = await UserModel.create({
            domain: testDomain._id,
            userId: helperId("matching-email-user"),
            email: `student-${helperId("matching-email")}@example.com`,
            name: "Different Name",
            active: true,
            permissions: [],
            unsubscribeToken: helperId("matching-email-unsubscribe"),
            purchases: [{ courseId: course.courseId, completedLessons: [] }],
        });
        const nonMatchingUser = await UserModel.create({
            domain: testDomain._id,
            userId: helperId("non-matching-user"),
            email: `${helperId("other")}@example.com`,
            name: "Other Person",
            active: true,
            permissions: [],
            unsubscribeToken: helperId("other-unsubscribe"),
            purchases: [{ courseId: course.courseId, completedLessons: [] }],
        });

        await MembershipModel.create([
            {
                domain: testDomain._id,
                membershipId: helperId("membership-name"),
                sessionId: helperId("session-name"),
                userId: matchingByName.userId,
                paymentPlanId: helperId("plan-name"),
                entityId: course.courseId,
                entityType: CommonConstants.MembershipEntityType.COURSE,
                status: CommonConstants.MembershipStatus.ACTIVE,
            },
            {
                domain: testDomain._id,
                membershipId: helperId("membership-email"),
                sessionId: helperId("session-email"),
                userId: matchingByEmail.userId,
                paymentPlanId: helperId("plan-email"),
                entityId: course.courseId,
                entityType: CommonConstants.MembershipEntityType.COURSE,
                status: CommonConstants.MembershipStatus.ACTIVE,
            },
            {
                domain: testDomain._id,
                membershipId: helperId("membership-other"),
                sessionId: helperId("session-other"),
                userId: nonMatchingUser.userId,
                paymentPlanId: helperId("plan-other"),
                entityId: course.courseId,
                entityType: CommonConstants.MembershipEntityType.COURSE,
                status: CommonConstants.MembershipStatus.ACTIVE,
            },
        ]);

        const members = await getMembers({
            courseId: course.courseId,
            searchText: "student",
            limit: 10,
            ctx: {
                subdomain: testDomain,
                user: adminUser,
                address: "",
            },
        });

        expect(members.map((member) => member.userId).sort()).toEqual(
            [matchingByEmail.userId, matchingByName.userId].sort(),
        );
    });
});
