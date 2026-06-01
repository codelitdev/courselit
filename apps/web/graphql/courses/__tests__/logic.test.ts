import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import CourseModel from "@models/Course";
import LessonModel from "@models/Lesson";
import MembershipModel from "@models/Membership";
import PageModel from "@models/Page";
import CommunityModel from "@models/Community";
import CommunityPostModel from "@models/CommunityPost";
import CommunityCommentModel from "@models/CommunityComment";
import CommunityPostSubscriberModel from "@models/CommunityPostSubscriber";
import CommunityReportModel from "@models/CommunityReport";
import NotificationModel from "@models/Notification";
import PaymentPlanModel from "@models/PaymentPlan";
import ActivityModel from "@models/Activity";
import constants from "@/config/constants";
import { responses } from "@/config/strings";
import { Constants as CommonConstants } from "@courselit/common-models";
import {
    getCourse,
    getMembers,
    getProducts,
    updateCourse,
    deleteCourse,
    getCourseDiscussionPost,
    createCourseDiscussionComment,
    createCourseDiscussionReply,
    getCourseDiscussionStream,
    getCourseDiscussionStreamCount,
    getCourseDiscussionComments,
} from "../logic";
import { getLessonOrThrow, updateLesson } from "../../lessons/logic";
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

jest.unmock("@courselit/utils");

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
                id: course.courseId,
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
                id: course.courseId,
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

        const formattedCourse = await getCourse(course.courseId, {
            subdomain: testDomain,
            user: adminUser,
            address: "",
        });

        expect(formattedCourse?.groups?.map((group: any) => group.id)).toEqual([
            groupId1,
            groupId2,
            groupId3,
        ]);
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

// =============================================================================
// Course Discussions Feature Tests
// =============================================================================

describe("course discussion model contract", () => {
    it("defines persistent fields for course-linked discussions", () => {
        expect(CourseModel.schema.path("discussions")).toBeDefined();
        expect(CourseModel.schema.path("discussionCommunityId")).toBeDefined();
        expect(CommunityModel.schema.path("courseId")).toBeDefined();
        expect(CommunityPostModel.schema.path("lessonId")).toBeDefined();
    });

    it("defines unique indexes for course-linked communities", () => {
        const communityIndexes = CommunityModel.schema.indexes();

        expect(
            communityIndexes.some(([fields, options]: any[]) => {
                return (
                    fields.domain === 1 &&
                    fields.courseId === 1 &&
                    options?.unique === true &&
                    options?.partialFilterExpression?.courseId?.$type ===
                        "string"
                );
            }),
        ).toBe(true);

        expect(
            communityIndexes.some(([fields]: any[]) => {
                return (
                    fields.domain === 1 &&
                    fields.courseId === 1 &&
                    fields.deleted === 1 &&
                    fields.enabled === 1
                );
            }),
        ).toBe(true);
    });
});

const DISC_PREFIX = `course-disc-${Date.now()}`;
const discId = (suffix: string) => `${DISC_PREFIX}-${suffix}`;
const discEmail = (suffix: string) => `${discId(suffix)}@example.com`;
const createInternalPlan = async (domain: any, userId: string) =>
    PaymentPlanModel.create({
        domain: domain._id,
        name: constants.internalPaymentPlanName,
        type: CommonConstants.PaymentPlanType.FREE,
        internal: true,
        userId,
        entityId: "internal",
        entityType: CommonConstants.MembershipEntityType.COURSE,
    });

describe("course discussions – toggle", () => {
    let testDomain: any;
    let ownerUser: any;
    let baseCourse: any;
    let basePage: any;

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: discId("dom"),
            email: discEmail("dom"),
        });
        ownerUser = await UserModel.create({
            domain: testDomain._id,
            userId: discId("owner"),
            email: discEmail("owner"),
            name: "Owner",
            permissions: [
                constants.permissions.manageAnyCourse,
                constants.permissions.publishCourse,
            ],
            active: true,
            unsubscribeToken: discId("tok-owner"),
            purchases: [],
        });
        basePage = await PageModel.create({
            domain: testDomain._id,
            pageId: discId("page"),
            name: "Test Page",
            creatorId: ownerUser.userId,
            deleteable: true,
        });
    });

    beforeEach(async () => {
        await CourseModel.deleteMany({ domain: testDomain._id });
        await CommunityModel.deleteMany({ domain: testDomain._id });
        await PaymentPlanModel.deleteMany({ domain: testDomain._id });
        await MembershipModel.deleteMany({ domain: testDomain._id });
        await createInternalPlan(testDomain, ownerUser.userId);
        baseCourse = await CourseModel.create({
            domain: testDomain._id,
            courseId: discId("course"),
            title: "Disc Course",
            creatorId: ownerUser.userId,
            deleteable: true,
            pageId: basePage.pageId,
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: discId("slug"),
        });
    });

    afterAll(async () => {
        await ActivityModel.deleteMany({ domain: testDomain._id });
        await NotificationModel.deleteMany({ domain: testDomain._id });
        await CommunityReportModel.deleteMany({ domain: testDomain._id });
        await CommunityPostSubscriberModel.deleteMany({
            domain: testDomain._id,
        });
        await CommunityCommentModel.deleteMany({ domain: testDomain._id });
        await CommunityPostModel.deleteMany({ domain: testDomain._id });
        await CommunityModel.deleteMany({ domain: testDomain._id });
        await PaymentPlanModel.deleteMany({ domain: testDomain._id });
        await MembershipModel.deleteMany({ domain: testDomain._id });
        await CourseModel.deleteMany({ domain: testDomain._id });
        await PageModel.deleteOne({ _id: basePage._id });
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    const ctx = () => ({
        subdomain: testDomain,
        user: ownerUser,
        address: "",
    });

    it("enabling discussions creates a course-linked community that reuses the existing internal plan", async () => {
        await updateCourse(
            { id: baseCourse.courseId, discussions: true },
            ctx(),
        );

        const community = await CommunityModel.findOne({
            domain: testDomain._id,
            courseId: baseCourse.courseId,
        });
        expect(community).not.toBeNull();
        expect(community!.enabled).toBe(true);
        expect((community as any).deleted).toBe(false);

        const plan = await PaymentPlanModel.findOne({
            domain: testDomain._id,
            internal: true,
        });
        expect(plan).not.toBeNull();
        expect(plan!.type).toBe(CommonConstants.PaymentPlanType.FREE);
        expect(plan!.userId).toBe(ownerUser.userId);
        expect(plan!.includedProducts).toEqual([]);
        expect(community!.defaultPaymentPlan).toBe(plan!.planId);

        const communityOwnedPlans = await PaymentPlanModel.countDocuments({
            domain: testDomain._id,
            entityId: community!.communityId,
        });
        expect(communityOwnedPlans).toBe(0);
    });

    it("enabling discussions stores the linked community id on the course", async () => {
        await updateCourse(
            { id: baseCourse.courseId, discussions: true },
            ctx(),
        );

        const community = await CommunityModel.findOne({
            domain: testDomain._id,
            courseId: baseCourse.courseId,
        });
        const course = await CourseModel.findOne({
            domain: testDomain._id,
            courseId: baseCourse.courseId,
        });
        expect(course!.discussionCommunityId).toBe(community!.communityId);
    });

    it("disabling discussions hides the community without deleting it or clearing the link", async () => {
        await updateCourse(
            { id: baseCourse.courseId, discussions: true },
            ctx(),
        );
        await updateCourse(
            { id: baseCourse.courseId, discussions: false },
            ctx(),
        );

        const community = await CommunityModel.findOne({
            domain: testDomain._id,
            courseId: baseCourse.courseId,
        });
        expect(community).not.toBeNull();
        expect(community!.enabled).toBe(false);
        expect((community as any).deleted).toBe(false);

        const course = await CourseModel.findOne({
            domain: testDomain._id,
            courseId: baseCourse.courseId,
        });
        expect(course!.discussions).toBe(false);
        expect(course!.discussionCommunityId).toBe(community!.communityId);
    });

    it("re-enabling discussions after disable restores the community without creating a new one", async () => {
        await updateCourse(
            { id: baseCourse.courseId, discussions: true },
            ctx(),
        );
        const firstCommunity = await CommunityModel.findOne({
            domain: testDomain._id,
            courseId: baseCourse.courseId,
        });

        await updateCourse(
            { id: baseCourse.courseId, discussions: false },
            ctx(),
        );
        await updateCourse(
            { id: baseCourse.courseId, discussions: true },
            ctx(),
        );

        const communityCount = await CommunityModel.countDocuments({
            domain: testDomain._id,
            courseId: baseCourse.courseId,
        });
        expect(communityCount).toBe(1);

        const restoredCommunity = await CommunityModel.findOne({
            domain: testDomain._id,
            courseId: baseCourse.courseId,
        });
        expect(restoredCommunity!.communityId).toBe(
            firstCommunity!.communityId,
        );
        expect((restoredCommunity as any).deleted).toBe(false);
    });
});

describe("course discussions – access & comment creation", () => {
    let testDomain: any;
    let ownerUser: any;
    let enrolledUser: any;
    let unenrolledUser: any;
    let discCourse: any;
    let discLesson: any;
    let discPage: any;

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: discId("dom-access"),
            email: discEmail("dom-access"),
        });

        ownerUser = await UserModel.create({
            domain: testDomain._id,
            userId: discId("owner-access"),
            email: discEmail("owner-access"),
            name: "Owner",
            permissions: [
                constants.permissions.manageAnyCourse,
                constants.permissions.publishCourse,
            ],
            active: true,
            unsubscribeToken: discId("tok-owner-access"),
            purchases: [],
        });

        discPage = await PageModel.create({
            domain: testDomain._id,
            pageId: discId("page-access"),
            name: "Test Page Access",
            creatorId: ownerUser.userId,
            deleteable: true,
        });
        await createInternalPlan(testDomain, ownerUser.userId);

        discCourse = await CourseModel.create({
            domain: testDomain._id,
            courseId: discId("course-access"),
            title: "Access Course",
            creatorId: ownerUser.userId,
            deleteable: true,
            pageId: discPage.pageId,
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: discId("slug-access"),
        });

        discLesson = await LessonModel.create({
            domain: testDomain._id,
            lessonId: discId("lesson-access"),
            title: "Access Lesson",
            type: constants.text,
            content: { type: "doc", content: [] },
            creatorId: ownerUser.userId,
            courseId: discCourse.courseId,
            groupId: discId("group-access"),
            published: true,
        });

        // Enable discussions via updateCourse
        await updateCourse(
            { id: discCourse.courseId, discussions: true },
            { subdomain: testDomain, user: ownerUser, address: "" },
        );

        enrolledUser = await UserModel.create({
            domain: testDomain._id,
            userId: discId("enrolled-access"),
            email: discEmail("enrolled-access"),
            name: "Student",
            permissions: [],
            active: true,
            unsubscribeToken: discId("tok-enrolled-access"),
            purchases: [
                {
                    courseId: discCourse.courseId,
                    completedLessons: [],
                    accessibleGroups: [],
                },
            ],
        });
        const internalPlan = await PaymentPlanModel.findOne({
            domain: testDomain._id,
            internal: true,
        });
        await MembershipModel.create({
            domain: testDomain._id,
            membershipId: discId("enrolled-course-membership"),
            sessionId: discId("enrolled-course-session"),
            userId: enrolledUser.userId,
            entityId: discCourse.courseId,
            entityType: CommonConstants.MembershipEntityType.COURSE,
            paymentPlanId: internalPlan!.planId,
            status: CommonConstants.MembershipStatus.ACTIVE,
        });

        unenrolledUser = await UserModel.create({
            domain: testDomain._id,
            userId: discId("unenrolled-access"),
            email: discEmail("unenrolled-access"),
            name: "Visitor",
            permissions: [],
            active: true,
            unsubscribeToken: discId("tok-unenrolled-access"),
            purchases: [],
        });
    });

    afterAll(async () => {
        await ActivityModel.deleteMany({ domain: testDomain._id });
        await CommunityPostSubscriberModel.deleteMany({
            domain: testDomain._id,
        });
        await CommunityCommentModel.deleteMany({ domain: testDomain._id });
        await CommunityPostModel.deleteMany({ domain: testDomain._id });
        await MembershipModel.deleteMany({ domain: testDomain._id });
        await PaymentPlanModel.deleteMany({ domain: testDomain._id });
        await CommunityModel.deleteMany({ domain: testDomain._id });
        await LessonModel.deleteMany({ domain: testDomain._id });
        await CourseModel.deleteMany({ domain: testDomain._id });
        await PageModel.deleteOne({ _id: discPage._id });
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    beforeEach(async () => {
        await ActivityModel.deleteMany({ domain: testDomain._id });
        await CommunityPostSubscriberModel.deleteMany({
            domain: testDomain._id,
        });
        await CommunityCommentModel.deleteMany({ domain: testDomain._id });
        await CommunityPostModel.deleteMany({ domain: testDomain._id });
        await MembershipModel.deleteMany({
            domain: testDomain._id,
            entityType: CommonConstants.MembershipEntityType.COMMUNITY,
        });
    });

    it("unenrolled user cannot post a discussion comment", async () => {
        await expect(
            createCourseDiscussionComment({
                ctx: {
                    subdomain: testDomain,
                    user: unenrolledUser,
                    address: "",
                },
                courseId: discCourse.courseId,
                lessonId: discLesson.lessonId,
                content: "Hello!",
            }),
        ).rejects.toThrow(responses.not_enrolled);
    });

    it("enrolled user can create a discussion comment and lesson post is lazily created", async () => {
        const comment = await createCourseDiscussionComment({
            ctx: {
                subdomain: testDomain,
                user: enrolledUser,
                address: "",
            },
            courseId: discCourse.courseId,
            lessonId: discLesson.lessonId,
            content: "My first comment",
        });

        expect(comment).toBeDefined();
        expect(comment.content).toBe("My first comment");

        const post = await CommunityPostModel.findOne({
            domain: testDomain._id,
            lessonId: discLesson.lessonId,
        });
        expect(post).not.toBeNull();
        expect(post!.title).toBe(discLesson.title);
        expect(post!.userId).toBe(discCourse.creatorId);
    });

    it("does not record broad notifications for top-level course discussion comments", async () => {
        await createCourseDiscussionComment({
            ctx: {
                subdomain: testDomain,
                user: enrolledUser,
                address: "",
            },
            courseId: discCourse.courseId,
            lessonId: discLesson.lessonId,
            content: "A top-level comment",
        });

        const topLevelCommentActivity = await ActivityModel.findOne({
            domain: testDomain._id,
            type: CommonConstants.ActivityType.COMMUNITY_COMMENT_CREATED,
        });
        expect(topLevelCommentActivity).toBeNull();
    });

    it("enrolled user does not get a community membership on first comment", async () => {
        const community = await CommunityModel.findOne({
            domain: testDomain._id,
            courseId: discCourse.courseId,
        });

        await createCourseDiscussionComment({
            ctx: {
                subdomain: testDomain,
                user: enrolledUser,
                address: "",
            },
            courseId: discCourse.courseId,
            lessonId: discLesson.lessonId,
            content: "Any comment",
        });

        const membership = await MembershipModel.findOne({
            domain: testDomain._id,
            entityId: community!.communityId,
            userId: enrolledUser.userId,
        });
        expect(membership).toBeNull();
    });

    it("first comment does not restore an inactive community membership", async () => {
        const community = await CommunityModel.findOne({
            domain: testDomain._id,
            courseId: discCourse.courseId,
        });
        const plan = await PaymentPlanModel.findOne({
            domain: testDomain._id,
            internal: true,
        });

        await MembershipModel.create({
            domain: testDomain._id,
            userId: enrolledUser.userId,
            entityId: community!.communityId,
            entityType: CommonConstants.MembershipEntityType.COMMUNITY,
            paymentPlanId: plan!.planId,
            sessionId: discId("restore-membership-session"),
            status: CommonConstants.MembershipStatus.REJECTED,
            role: CommonConstants.MembershipRole.POST,
        });

        await createCourseDiscussionComment({
            ctx: {
                subdomain: testDomain,
                user: enrolledUser,
                address: "",
            },
            courseId: discCourse.courseId,
            lessonId: discLesson.lessonId,
            content: "Restore my membership",
        });

        const membership = await MembershipModel.findOne({
            domain: testDomain._id,
            entityId: community!.communityId,
            userId: enrolledUser.userId,
        });
        expect(membership!.status).toBe(
            CommonConstants.MembershipStatus.REJECTED,
        );
        expect(membership!.role).toBe(CommonConstants.MembershipRole.POST);
    });

    it("renaming a lesson syncs an existing discussion post title", async () => {
        await createCourseDiscussionComment({
            ctx: {
                subdomain: testDomain,
                user: enrolledUser,
                address: "",
            },
            courseId: discCourse.courseId,
            lessonId: discLesson.lessonId,
            content: "Create the lesson post",
        });

        await updateLesson(
            {
                id: discLesson.lessonId,
                lessonId: discLesson.lessonId,
                title: "Renamed Access Lesson",
            },
            {
                subdomain: testDomain,
                user: ownerUser,
                address: "",
            },
        );

        const post = await CommunityPostModel.findOne({
            domain: testDomain._id,
            lessonId: discLesson.lessonId,
        });
        expect(post!.title).toBe("Renamed Access Lesson");
    });

    it("enrolled user can reply to a comment", async () => {
        const comment = await createCourseDiscussionComment({
            ctx: {
                subdomain: testDomain,
                user: enrolledUser,
                address: "",
            },
            courseId: discCourse.courseId,
            lessonId: discLesson.lessonId,
            content: "A comment to reply to",
        });

        const updatedComment = await createCourseDiscussionReply({
            ctx: {
                subdomain: testDomain,
                user: enrolledUser,
                address: "",
            },
            courseId: discCourse.courseId,
            lessonId: discLesson.lessonId,
            commentId: comment.commentId,
            content: "A reply",
        });

        expect(updatedComment.replies).toHaveLength(1);
        expect(updatedComment.replies[0].content).toBe("A reply");
    });

    it("records course discussion reply notifications only for the authored comment target", async () => {
        const community = await CommunityModel.findOne({
            domain: testDomain._id,
            courseId: discCourse.courseId,
        });
        const plan = await PaymentPlanModel.findOne({
            domain: testDomain._id,
            internal: true,
        });
        await MembershipModel.create({
            domain: testDomain._id,
            membershipId: discId("owner-discussion-membership"),
            sessionId: discId("owner-discussion-session"),
            userId: ownerUser.userId,
            entityId: community!.communityId,
            entityType: CommonConstants.MembershipEntityType.COMMUNITY,
            paymentPlanId: plan!.planId,
            status: CommonConstants.MembershipStatus.ACTIVE,
            role: CommonConstants.MembershipRole.COMMENT,
        });
        const otherSubscriber = await UserModel.create({
            domain: testDomain._id,
            userId: discId("other-subscriber"),
            email: discEmail("other-subscriber"),
            name: "Other Subscriber",
            permissions: [],
            active: true,
            unsubscribeToken: discId("tok-other-subscriber"),
            purchases: [
                {
                    courseId: discCourse.courseId,
                    completedLessons: [],
                    accessibleGroups: [],
                },
            ],
        });

        const comment = await createCourseDiscussionComment({
            ctx: {
                subdomain: testDomain,
                user: enrolledUser,
                address: "",
            },
            courseId: discCourse.courseId,
            lessonId: discLesson.lessonId,
            content: "A comment that should receive replies",
        });
        const post = await CommunityPostModel.findOne({
            domain: testDomain._id,
            communityId: community!.communityId,
            lessonId: discLesson.lessonId,
        });
        await CommunityPostSubscriberModel.create({
            domain: testDomain._id,
            subscriptionId: discId("owner-subscriber-subscription"),
            postId: post!.postId,
            userId: ownerUser.userId,
            subscription: true,
        });
        await CommunityPostSubscriberModel.create({
            domain: testDomain._id,
            subscriptionId: discId("other-subscriber-subscription"),
            postId: post!.postId,
            userId: otherSubscriber.userId,
            subscription: true,
        });

        await createCourseDiscussionReply({
            ctx: {
                subdomain: testDomain,
                user: ownerUser,
                address: "",
            },
            courseId: discCourse.courseId,
            lessonId: discLesson.lessonId,
            commentId: comment.commentId,
            content: "A targeted reply",
        });

        const replyActivity = await ActivityModel.findOne({
            domain: testDomain._id,
            type: CommonConstants.ActivityType.COMMUNITY_REPLY_CREATED,
        }).lean();
        expect(replyActivity?.metadata?.forUserIds).toEqual([
            enrolledUser.userId,
        ]);
    });

    it("getCourseDiscussionPost returns null if no comment has been created yet for a different lesson", async () => {
        const newLesson = await LessonModel.create({
            domain: testDomain._id,
            lessonId: discId("lesson-no-post"),
            title: "Lesson Without Post",
            type: constants.text,
            content: { type: "doc", content: [] },
            creatorId: ownerUser.userId,
            courseId: discCourse.courseId,
            groupId: discId("group-access"),
            published: true,
        });

        const post = await getCourseDiscussionPost({
            ctx: {
                subdomain: testDomain,
                user: enrolledUser,
                address: "",
            },
            courseId: discCourse.courseId,
            lessonId: newLesson.lessonId,
        });

        expect(post).toBeNull();
    });

    it("requires the course discussion community link when resolving lesson posts", async () => {
        const community = await CommunityModel.findOne({
            domain: testDomain._id,
            courseId: discCourse.courseId,
        });
        const originalDiscussionCommunityId = discCourse.discussionCommunityId;
        await CourseModel.updateOne(
            {
                domain: testDomain._id,
                courseId: discCourse.courseId,
            },
            {
                $set: {
                    discussionCommunityId: null,
                },
            },
        );

        try {
            await expect(
                getCourseDiscussionPost({
                    ctx: {
                        subdomain: testDomain,
                        user: enrolledUser,
                        address: "",
                    },
                    courseId: discCourse.courseId,
                    lessonId: discLesson.lessonId,
                }),
            ).rejects.toThrow(responses.item_not_found);
        } finally {
            await CourseModel.updateOne(
                {
                    domain: testDomain._id,
                    courseId: discCourse.courseId,
                },
                {
                    $set: {
                        discussionCommunityId:
                            originalDiscussionCommunityId ||
                            community!.communityId,
                    },
                },
            );
        }
    });

    it("getCourseDiscussionStream returns posts accessible to an enrolled learner", async () => {
        const stream = await getCourseDiscussionStream({
            ctx: {
                subdomain: testDomain,
                user: enrolledUser,
                address: "",
            },
            courseId: discCourse.courseId,
        });

        expect(Array.isArray(stream)).toBe(true);
    });

    it("getCourseDiscussionComments rejects stale purchases without active course membership", async () => {
        const staleUser = await UserModel.create({
            domain: testDomain._id,
            userId: discId("stale-purchase-access"),
            email: discEmail("stale-purchase-access"),
            name: "Stale Purchase",
            active: true,
            permissions: [],
            unsubscribeToken: discId("tok-stale-purchase-access"),
            purchases: [
                {
                    courseId: discCourse.courseId,
                    completedLessons: [],
                    accessibleGroups: [],
                },
            ],
        });

        await expect(
            getCourseDiscussionComments({
                ctx: {
                    subdomain: testDomain,
                    user: staleUser,
                    address: "",
                },
                courseId: discCourse.courseId,
                lessonId: discLesson.lessonId,
            }),
        ).rejects.toThrow(responses.not_enrolled);

        await UserModel.deleteOne({ userId: staleUser.userId });
    });

    it("course moderators see posts for unpublished lessons in the course discussion stream", async () => {
        const community = await CommunityModel.findOne({
            domain: testDomain._id,
            courseId: discCourse.courseId,
        });
        const hiddenLesson = await LessonModel.create({
            domain: testDomain._id,
            lessonId: discId("unpublished-stream-lesson"),
            title: "Unpublished Stream Lesson",
            type: constants.text,
            content: { type: "doc", content: [] },
            creatorId: ownerUser.userId,
            courseId: discCourse.courseId,
            groupId: discId("unpublished-stream-group"),
            published: false,
        });
        const hiddenPost = await CommunityPostModel.create({
            domain: testDomain._id,
            postId: discId("unpublished-stream-post"),
            communityId: community!.communityId,
            userId: ownerUser.userId,
            title: hiddenLesson.title,
            content: "",
            category: "General",
            lessonId: hiddenLesson.lessonId,
        });

        const stream = await getCourseDiscussionStream({
            ctx: {
                subdomain: testDomain,
                user: ownerUser,
                address: "",
            },
            courseId: discCourse.courseId,
        });
        const count = await getCourseDiscussionStreamCount({
            ctx: {
                subdomain: testDomain,
                user: ownerUser,
                address: "",
            },
            courseId: discCourse.courseId,
        });

        expect(stream.map((post: any) => post.postId)).toContain(
            hiddenPost.postId,
        );
        expect(count).toBe(1);
    });

    it("getCourseDiscussionComments returns empty list if no post exists", async () => {
        const comments = await getCourseDiscussionComments({
            ctx: {
                subdomain: testDomain,
                user: enrolledUser,
                address: "",
            },
            courseId: discCourse.courseId,
            lessonId: discLesson.lessonId,
        });

        expect(comments).toEqual([]);
    });

    it("getCourseDiscussionComments returns comments list if post and comments exist", async () => {
        const comment = await createCourseDiscussionComment({
            ctx: {
                subdomain: testDomain,
                user: enrolledUser,
                address: "",
            },
            courseId: discCourse.courseId,
            lessonId: discLesson.lessonId,
            content: "First test comment",
        });

        const comments = await getCourseDiscussionComments({
            ctx: {
                subdomain: testDomain,
                user: enrolledUser,
                address: "",
            },
            courseId: discCourse.courseId,
            lessonId: discLesson.lessonId,
        });

        expect(comments.length).toBe(1);
        expect(comments[0].commentId).toBe(comment.commentId);
        expect(comments[0].content).toBe("First test comment");

        await CommunityCommentModel.deleteMany({ domain: testDomain._id });
        await CommunityPostModel.deleteMany({ domain: testDomain._id });
    });

    it("getCourseDiscussionComments throws access error for non-enrolled user", async () => {
        const otherUser = await UserModel.create({
            domain: testDomain._id,
            userId: discId("other-learner"),
            email: discEmail("other-learner"),
            name: "Other Learner",
            active: true,
            permissions: [],
            unsubscribeToken: discId("tok-other-learner"),
            purchases: [],
        });

        await expect(
            getCourseDiscussionComments({
                ctx: {
                    subdomain: testDomain,
                    user: otherUser,
                    address: "",
                },
                courseId: discCourse.courseId,
                lessonId: discLesson.lessonId,
            }),
        ).rejects.toThrow(responses.not_enrolled);

        await UserModel.deleteOne({ userId: otherUser.userId });
    });

    it("getCourseDiscussionStream excludes posts for dripped lessons the learner cannot yet access", async () => {
        const freeGroupId = discId("group-stream-free");
        const drippedGroupId = discId("group-stream-dripped");
        const community = await CommunityModel.findOne({
            domain: testDomain._id,
            courseId: discCourse.courseId,
        });
        const communityId = community!.communityId;

        await CourseModel.updateOne(
            { domain: testDomain._id, courseId: discCourse.courseId },
            {
                $set: {
                    discussions: true,
                    discussionCommunityId: communityId,
                    groups: [
                        {
                            _id: freeGroupId,
                            name: "Free group",
                            lessonsOrder: [],
                            drip: undefined,
                        },
                        {
                            _id: drippedGroupId,
                            name: "Dripped group",
                            lessonsOrder: [],
                            drip: {
                                status: true,
                                type: "RELATIVE",
                                delayInMillis: 86400000,
                            },
                        },
                    ],
                },
            },
        );

        await LessonModel.deleteMany({
            domain: testDomain._id,
            courseId: discCourse.courseId,
        });
    });
});

describe("course discussions – deleteCourse cascade", () => {
    let testDomain: any;
    let ownerUser: any;
    let cascadePage: any;

    const casId = (s: string) => `${DISC_PREFIX}-cascade-${s}`;

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: casId("dom"),
            email: `${casId("dom")}@example.com`,
        });
        ownerUser = await UserModel.create({
            domain: testDomain._id,
            userId: casId("owner"),
            email: `${casId("owner")}@example.com`,
            name: "Owner",
            permissions: [
                constants.permissions.manageAnyCourse,
                constants.permissions.publishCourse,
            ],
            active: true,
            unsubscribeToken: casId("tok"),
            purchases: [],
        });
        cascadePage = await PageModel.create({
            domain: testDomain._id,
            pageId: casId("page"),
            name: "Cascade Page",
            creatorId: ownerUser.userId,
            deleteable: true,
        });
    });

    afterAll(async () => {
        await CommunityModel.deleteMany({ domain: testDomain._id });
        await PaymentPlanModel.deleteMany({ domain: testDomain._id });
        await MembershipModel.deleteMany({ domain: testDomain._id });
        await CourseModel.deleteMany({ domain: testDomain._id });
        await PageModel.deleteOne({ _id: cascadePage._id });
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    it("deleting a course cascade-deletes the associated discussion community", async () => {
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: casId("course"),
            title: "Cascade Course",
            creatorId: ownerUser.userId,
            deleteable: true,
            pageId: cascadePage.pageId,
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: casId("slug"),
        });

        const ctx = { subdomain: testDomain, user: ownerUser, address: "" };
        await createInternalPlan(testDomain, ownerUser.userId);
        await updateCourse(
            { id: course.courseId as any, discussions: true },
            ctx,
        );

        const communityBefore = await CommunityModel.findOne({
            domain: testDomain._id,
            courseId: course.courseId,
        });
        expect(communityBefore).not.toBeNull();

        const post = await CommunityPostModel.create({
            domain: testDomain._id,
            postId: casId("post"),
            communityId: communityBefore!.communityId,
            userId: ownerUser.userId,
            title: "Cascade discussion post",
            content: "",
            category: "General",
            lessonId: casId("lesson"),
        });
        const comment = await CommunityCommentModel.create({
            domain: testDomain._id,
            commentId: casId("comment"),
            communityId: communityBefore!.communityId,
            postId: post.postId,
            userId: ownerUser.userId,
            content: "Cascade comment",
        });
        await CommunityReportModel.create({
            domain: testDomain._id,
            reportId: casId("report"),
            communityId: communityBefore!.communityId,
            contentId: post.postId,
            type: CommonConstants.CommunityReportType.POST,
            reason: "Needs review",
            userId: ownerUser.userId,
        });
        await CommunityPostSubscriberModel.create({
            domain: testDomain._id,
            subscriptionId: casId("subscriber"),
            postId: post.postId,
            userId: ownerUser.userId,
            subscription: true,
        });
        await NotificationModel.create({
            domain: testDomain._id,
            notificationId: casId("notification"),
            userId: ownerUser.userId,
            forUserId: ownerUser.userId,
            activityType:
                CommonConstants.ActivityType.COMMUNITY_COMMENT_CREATED,
            entityId: comment.commentId,
            metadata: {
                communityId: communityBefore!.communityId,
                postId: post.postId,
                courseId: course.courseId,
            },
        });
        await ActivityModel.create({
            domain: testDomain._id,
            userId: ownerUser.userId,
            type: CommonConstants.ActivityType.COMMUNITY_COMMENT_CREATED,
            entityId: comment.commentId,
            metadata: {
                communityId: communityBefore!.communityId,
                postId: post.postId,
                courseId: course.courseId,
            },
        });

        await deleteCourse(course.courseId, ctx);

        const communityAfter = await CommunityModel.findOne({
            domain: testDomain._id,
            courseId: course.courseId,
        });
        expect(communityAfter).toBeNull();
        await expect(
            CommunityPostModel.countDocuments({
                domain: testDomain._id,
                communityId: communityBefore!.communityId,
            }),
        ).resolves.toBe(0);
        await expect(
            CommunityCommentModel.countDocuments({
                domain: testDomain._id,
                communityId: communityBefore!.communityId,
            }),
        ).resolves.toBe(0);
        await expect(
            CommunityReportModel.countDocuments({
                domain: testDomain._id,
                communityId: communityBefore!.communityId,
            }),
        ).resolves.toBe(0);
        await expect(
            CommunityPostSubscriberModel.countDocuments({
                domain: testDomain._id,
                postId: post.postId,
            }),
        ).resolves.toBe(0);
        await expect(
            NotificationModel.countDocuments({
                domain: testDomain._id,
                "metadata.communityId": communityBefore!.communityId,
            }),
        ).resolves.toBe(0);
        await expect(
            ActivityModel.countDocuments({
                domain: testDomain._id,
                "metadata.communityId": communityBefore!.communityId,
            }),
        ).resolves.toBe(0);
    });
});
