import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import CourseModel from "@models/Course";
import ProductDiscussionCommentModel from "@models/ProductDiscussionComment";
import ProductDiscussionLikeModel from "@models/ProductDiscussionLike";
import ProductDiscussionReplyModel from "@models/ProductDiscussionReply";
import ProductDiscussionReportModel from "@models/ProductDiscussionReport";
import ProductDiscussionSubscriberModel from "@models/ProductDiscussionSubscriber";
import ProductDiscussionSummaryModel from "@models/ProductDiscussionSummary";
import RateLimitEventModel from "@models/RateLimitEvent";
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
import courseTypes from "../types";
import schema from "../../index";
import {
    COURSE_DISCUSSION_RATE_LIMITS,
    createDiscussionComment,
    createDiscussionReply,
    createDiscussionReport,
    deleteDiscussionComment,
    deleteDiscussionReply,
    listDiscussionReports,
    getDiscussionReportsCount,
    listDiscussionSummaries,
    listDiscussionComments,
    listDiscussionReplies,
    toggleDiscussionLike,
    updateDiscussionReportStatus,
    updateDiscussionComment,
    updateDiscussionReply,
    DiscussionActivityEventType,
} from "../../product-discussions/logic";
import {
    MAX_DISCUSSION_CONTENT_BYTES,
    MAX_DISCUSSION_TEXT_LENGTH,
    validateDiscussionContent,
    validateDiscussionTargetForLearner,
} from "../../product-discussions/helpers";
import { assertRateLimit } from "@/lib/assert-rate-limit";
import { recordActivity } from "@/lib/record-activity";
import { deleteMedia, sealMedia } from "@/services/medialit";
import {
    LessonRepository,
    CourseRepository,
    UserRepository,
    DomainRepository,
    PageRepository,
} from "@courselit/orm-models";

const courseRepo = new CourseRepository(CourseModel);
const domainRepo = new DomainRepository(DomainModel);
const lessonRepo = new LessonRepository(LessonModel);
const pageRepo = new PageRepository(PageModel);
const userRepo = new UserRepository(UserModel);

jest.mock("@/services/medialit", () => ({
    deleteMedia: jest.fn().mockResolvedValue(true),
    sealMedia: jest.fn().mockImplementation((id) =>
        Promise.resolve({
            mediaId: id,
            file: `https://cdn.medialit.clqa.online/medialit-service/p/${id}/main.webp`,
        }),
    ),
}));
jest.mock("@/lib/record-activity", () => ({
    recordActivity: jest.fn(),
}));
// Generate unique ids so schema defaults (generateUniqueId) don't collide on
// unique indexes when multiple discussion docs are created within one test.
jest.mock("nanoid", () => ({
    nanoid: () => Math.random().toString(36).substring(2),
}));
jest.unmock("@courselit/utils");

const recordActivityMock = recordActivity as jest.Mock;

const UPDATE_COURSE_SUITE_PREFIX = `update-course-${Date.now()}`;
const id = (suffix: string) => `${UPDATE_COURSE_SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) =>
    `${suffix}-${UPDATE_COURSE_SUITE_PREFIX}@example.com`;
const GET_COURSE_SUITE_PREFIX = `get-course-${Date.now()}`;
const getCourseId = (suffix: string) => `${GET_COURSE_SUITE_PREFIX}-${suffix}`;
const getCourseEmail = (suffix: string) =>
    `${suffix}-${GET_COURSE_SUITE_PREFIX}@example.com`;

describe("product discussion persistence foundation", () => {
    it("defines the product discussion and rate limit models with required indexes", () => {
        const indexKeys = (model: any) =>
            model.schema.indexes().map(([fields]: any[]) => fields);

        expect(indexKeys(ProductDiscussionCommentModel)).toEqual(
            expect.arrayContaining([
                { domain: 1, commentId: 1 },
                {
                    domain: 1,
                    productId: 1,
                    entityType: 1,
                    entityId: 1,
                    createdAt: -1,
                    commentId: -1,
                },
                {
                    domain: 1,
                    productId: 1,
                    entityType: 1,
                    entityId: 1,
                    userId: 1,
                    deleted: 1,
                },
            ]),
        );
        expect(indexKeys(ProductDiscussionReplyModel)).toEqual(
            expect.arrayContaining([
                { domain: 1, replyId: 1 },
                { domain: 1, commentId: 1, createdAt: 1, replyId: 1 },
                {
                    domain: 1,
                    productId: 1,
                    entityType: 1,
                    entityId: 1,
                    userId: 1,
                    deleted: 1,
                },
            ]),
        );
        expect(indexKeys(ProductDiscussionLikeModel)).toEqual(
            expect.arrayContaining([
                { domain: 1, contentType: 1, contentId: 1, userId: 1 },
                {
                    domain: 1,
                    productId: 1,
                    entityType: 1,
                    entityId: 1,
                    userId: 1,
                },
            ]),
        );
        expect(indexKeys(ProductDiscussionSummaryModel)).toEqual(
            expect.arrayContaining([
                { domain: 1, productId: 1, entityType: 1, entityId: 1 },
                {
                    domain: 1,
                    productId: 1,
                    entityType: 1,
                    lastActivityAt: -1,
                    entityId: 1,
                },
            ]),
        );
        expect(indexKeys(ProductDiscussionSubscriberModel)).toEqual(
            expect.arrayContaining([
                {
                    domain: 1,
                    productId: 1,
                    entityType: 1,
                    entityId: 1,
                    userId: 1,
                },
                {
                    domain: 1,
                    productId: 1,
                    entityType: 1,
                    entityId: 1,
                    subscription: 1,
                    userId: 1,
                },
            ]),
        );
        expect(indexKeys(ProductDiscussionReportModel)).toEqual(
            expect.arrayContaining([
                { domain: 1, contentType: 1, contentId: 1, userId: 1 },
                {
                    domain: 1,
                    productId: 1,
                    entityType: 1,
                    entityId: 1,
                    status: 1,
                    createdAt: -1,
                    reportId: -1,
                },
            ]),
        );
        expect(indexKeys(RateLimitEventModel)).toEqual(
            expect.arrayContaining([
                {
                    domain: 1,
                    userId: 1,
                    scope: 1,
                    action: 1,
                    subjectId: 1,
                    createdAt: -1,
                },
                {
                    domain: 1,
                    userId: 1,
                    scope: 1,
                    subjectId: 1,
                    fingerprint: 1,
                    createdAt: -1,
                },
            ]),
        );
    });

    it("defaults product discussions to disabled", () => {
        const course = new CourseModel({
            domain: "507f191e810c19729de860ea",
            title: "Discussion default",
            slug: "discussion-default",
            cost: 0,
            costType: "free",
            privacy: "unlisted",
            type: "course",
            creatorId: "creator",
        });

        expect(course.discussions).toBe(false);
    });

    it("exposes discussions in the Course GraphQL type and update input", () => {
        const courseFields = courseTypes.courseType.getFields();
        const discussionsField = courseFields.discussions;
        expect(discussionsField).toBeDefined();
        expect(
            discussionsField.resolve?.(
                { discussions: undefined },
                {},
                {},
                {} as any,
            ),
        ).toBe(false);
        expect(
            courseTypes.courseUpdateInput.getFields().discussions,
        ).toBeDefined();
        expect(
            schema.getQueryType()?.getFields().getProductDiscussionComments,
        ).toBeDefined();
        expect(
            schema.getQueryType()?.getFields().getProductDiscussionReports,
        ).toBeDefined();
        expect(
            schema
                .getQueryType()
                ?.getFields()
                .getProductDiscussionReports.args.some(
                    (arg) => arg.name === "page",
                ),
        ).toBe(true);
        expect(
            schema.getQueryType()?.getFields().getProductDiscussionSummaries,
        ).toBeDefined();
        expect(
            schema
                .getQueryType()
                ?.getFields()
                .getProductDiscussionSummaries.args.some(
                    (arg) => arg.name === "preview",
                ),
        ).toBe(true);
        expect(
            schema.getMutationType()?.getFields()
                .createProductDiscussionComment,
        ).toBeDefined();
        expect(
            schema.getMutationType()?.getFields()
                .updateProductDiscussionReportStatus,
        ).toBeDefined();
        expect(
            schema.getMutationType()?.getFields()
                .updateProductDiscussionComment,
        ).toBeDefined();
        expect(
            schema.getMutationType()?.getFields().updateProductDiscussionReply,
        ).toBeDefined();
    });
});

describe("product discussion validation foundation", () => {
    let testDomain: any;
    let learnerUser: any;

    beforeAll(async () => {
        testDomain = await domainRepo.create({
            name: id("discussion-domain"),
            email: email("discussion-domain"),
        });

        learnerUser = await userRepo.create({
            domain: testDomain._id,
            userId: id("discussion-learner"),
            email: email("discussion-learner"),
            name: "Discussion Learner",
            permissions: [constants.permissions.enrollInCourse],
            active: true,
            unsubscribeToken: id("discussion-learner-token"),
            purchases: [
                {
                    courseId: id("discussion-course"),
                    completedLessons: [],
                    accessibleGroups: [id("discussion-group")],
                },
            ],
        });
    });

    beforeEach(async () => {
        await Promise.all([
            CourseModel.deleteMany({ domain: testDomain._id }),
            LessonModel.deleteMany({ domain: testDomain._id }),
            RateLimitEventModel.deleteMany({ domain: testDomain._id }),
        ]);
    });

    afterAll(async () => {
        await Promise.all([
            CourseModel.deleteMany({ domain: testDomain._id }),
            LessonModel.deleteMany({ domain: testDomain._id }),
            RateLimitEventModel.deleteMany({ domain: testDomain._id }),
            UserModel.deleteMany({ domain: testDomain._id }),
            DomainModel.deleteOne({ _id: testDomain._id }),
        ]);
    });

    it("rejects product-level discussion targets in this release", async () => {
        await expect(
            validateDiscussionTargetForLearner({
                ctx: {
                    subdomain: testDomain,
                    user: learnerUser,
                    address: "",
                },
                productId: id("discussion-course"),
                entityType: CommonConstants.ProductDiscussionEntityType.PRODUCT,
                entityId: id("discussion-course"),
            }),
        ).rejects.toThrow(responses.action_not_allowed);
    });

    it("rejects lesson discussion writes when discussions are disabled", async () => {
        await courseRepo.create({
            domain: testDomain._id,
            courseId: id("discussion-course"),
            title: id("discussion-course-title"),
            creatorId: learnerUser.userId,
            groups: [
                {
                    _id: id("discussion-group"),
                    name: "Discussion section",
                    rank: 1,
                    lessonsOrder: [id("discussion-lesson")],
                },
            ],
            lessons: [id("discussion-lesson")],
            type: "course",
            privacy: "public",
            costType: "free",
            cost: 0,
            slug: id("discussion-course-slug"),
            published: true,
            discussions: false,
        });
        await lessonRepo.create({
            domain: testDomain._id,
            lessonId: id("discussion-lesson"),
            title: "Discussion Lesson",
            type: "text",
            creatorId: learnerUser.userId,
            courseId: id("discussion-course"),
            groupId: id("discussion-group"),
            requiresEnrollment: true,
            published: true,
        });

        await expect(
            validateDiscussionTargetForLearner({
                ctx: {
                    subdomain: testDomain,
                    user: learnerUser,
                    address: "",
                },
                productId: id("discussion-course"),
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: id("discussion-lesson"),
            }),
        ).rejects.toThrow(responses.action_not_allowed);
    });

    it("enforces Tiptap discussion content shape and limits", () => {
        expect(() =>
            validateDiscussionContent({
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                        content: [{ type: "text", text: "Looks good" }],
                    },
                ],
            }),
        ).not.toThrow();
        expect(() => validateDiscussionContent({ type: "paragraph" })).toThrow(
            responses.invalid_input,
        );
        expect(() =>
            validateDiscussionContent({
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                        content: [
                            {
                                type: "text",
                                text: "x".repeat(
                                    MAX_DISCUSSION_TEXT_LENGTH + 1,
                                ),
                            },
                        ],
                    },
                ],
            }),
        ).toThrow(responses.invalid_input);
        expect(() =>
            validateDiscussionContent({
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                        attrs: {
                            payload: "x".repeat(
                                MAX_DISCUSSION_CONTENT_BYTES + 1,
                            ),
                        },
                    },
                ],
            }),
        ).toThrow(responses.invalid_input);
    });

    it("records allowed rate limit events and rejects actions over the limit", async () => {
        const input = {
            domain: testDomain._id,
            userId: learnerUser.userId,
            scope: "course_discussion",
            action: "comment:create",
            subjectId: `${id("discussion-course")}:lesson:${id(
                "discussion-lesson",
            )}`,
            window: COURSE_DISCUSSION_RATE_LIMITS.commentsPerMinute.window,
            limit: 1,
        };

        await assertRateLimit(input);
        await expect(assertRateLimit(input)).rejects.toThrow(
            responses.action_not_allowed,
        );

        const events = await RateLimitEventModel.find({
            domain: testDomain._id,
            userId: learnerUser.userId,
            scope: "course_discussion",
            action: "comment:create",
        });
        expect(events).toHaveLength(1);
    });

    it("rejects lesson discussions on unpublished courses for learners but allows for creators/admins", async () => {
        await courseRepo.create({
            domain: testDomain._id,
            courseId: id("discussion-course-unpublished"),
            title: id("discussion-course-unpublished-title"),
            creatorId: id("another-creator"),
            groups: [
                {
                    _id: id("discussion-group-unpublished"),
                    name: "Discussion section",
                    rank: 1,
                    lessonsOrder: [id("discussion-lesson-unpublished")],
                },
            ],
            lessons: [id("discussion-lesson-unpublished")],
            type: "course",
            privacy: "public",
            costType: "free",
            cost: 0,
            slug: id("discussion-course-unpublished-slug"),
            published: false,
            discussions: true,
        });
        await lessonRepo.create({
            domain: testDomain._id,
            lessonId: id("discussion-lesson-unpublished"),
            title: "Discussion Lesson",
            type: "text",
            creatorId: id("another-creator"),
            courseId: id("discussion-course-unpublished"),
            groupId: id("discussion-group-unpublished"),
            requiresEnrollment: true,
            published: true,
        });

        // 1. Learner user (who is not creator/admin) should be blocked:
        await expect(
            validateDiscussionTargetForLearner({
                ctx: {
                    subdomain: testDomain,
                    user: learnerUser,
                    address: "",
                },
                productId: id("discussion-course-unpublished"),
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: id("discussion-lesson-unpublished"),
            }),
        ).rejects.toThrow(responses.item_not_found);

        // 2. Creator (who is owner/creator of the course) should be allowed:
        const creatorUser = await userRepo.create({
            domain: testDomain._id,
            userId: id("another-creator"),
            email: email("another-creator"),
            name: "Another Creator",
            permissions: [constants.permissions.manageCourse],
            active: true,
            unsubscribeToken: id("another-creator-token"),
        });
        const result = await validateDiscussionTargetForLearner({
            ctx: {
                subdomain: testDomain,
                user: creatorUser,
                address: "",
            },
            productId: id("discussion-course-unpublished"),
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: id("discussion-lesson-unpublished"),
        });
        expect(result.product).toBeDefined();
        expect(result.lesson).toBeDefined();
    });
});

describe("product discussion comment and reply logic", () => {
    let testDomain: any;
    let learnerUser: any;
    let secondLearnerUser: any;
    let nonEnrolledUser: any;
    let productAdminUser: any;
    let ctx: any;

    const courseId = id("discussion-api-course");
    const groupId = id("discussion-api-group");
    const lessonId = id("discussion-api-lesson");
    const doc = (text: string) => ({
        type: "doc" as const,
        content: [
            {
                type: "paragraph",
                content: [{ type: "text", text }],
            },
        ],
    });

    beforeAll(async () => {
        testDomain = await domainRepo.create({
            name: id("discussion-api-domain"),
            email: email("discussion-api-domain"),
        });

        learnerUser = await userRepo.create({
            domain: testDomain._id,
            userId: id("discussion-api-learner"),
            email: email("discussion-api-learner"),
            name: "Discussion API Learner",
            permissions: [constants.permissions.enrollInCourse],
            active: true,
            unsubscribeToken: id("discussion-api-token"),
            purchases: [
                {
                    courseId,
                    completedLessons: [],
                    accessibleGroups: [groupId],
                },
            ],
        });
        secondLearnerUser = await userRepo.create({
            domain: testDomain._id,
            userId: id("discussion-api-second-learner"),
            email: email("discussion-api-second-learner"),
            name: "Discussion API Second Learner",
            permissions: [constants.permissions.enrollInCourse],
            active: true,
            unsubscribeToken: id("discussion-api-second-token"),
            purchases: [
                {
                    courseId,
                    completedLessons: [],
                    accessibleGroups: [groupId],
                },
            ],
        });
        nonEnrolledUser = await userRepo.create({
            domain: testDomain._id,
            userId: id("discussion-api-non-enrolled"),
            email: email("discussion-api-non-enrolled"),
            name: "Discussion API Non Enrolled",
            permissions: [constants.permissions.enrollInCourse],
            active: true,
            unsubscribeToken: id("discussion-api-non-enrolled-token"),
            purchases: [],
        });
        productAdminUser = await userRepo.create({
            domain: testDomain._id,
            userId: id("discussion-api-admin"),
            email: email("discussion-api-admin"),
            name: "Discussion API Admin",
            permissions: [constants.permissions.manageAnyCourse],
            active: true,
            unsubscribeToken: id("discussion-api-admin-token"),
            purchases: [],
        });

        await MembershipModel.create([
            {
                domain: testDomain._id,
                membershipId: id("discussion-api-learner-membership"),
                sessionId: id("discussion-api-learner-session"),
                userId: learnerUser.userId,
                paymentPlanId: id("discussion-api-learner-plan"),
                entityId: courseId,
                entityType: CommonConstants.MembershipEntityType.COURSE,
                status: CommonConstants.MembershipStatus.ACTIVE,
            },
            {
                domain: testDomain._id,
                membershipId: id("discussion-api-second-learner-membership"),
                sessionId: id("discussion-api-second-learner-session"),
                userId: secondLearnerUser.userId,
                paymentPlanId: id("discussion-api-second-learner-plan"),
                entityId: courseId,
                entityType: CommonConstants.MembershipEntityType.COURSE,
                status: CommonConstants.MembershipStatus.ACTIVE,
            },
        ]);

        ctx = {
            subdomain: testDomain,
            user: learnerUser,
            address: "",
        };
    });

    beforeEach(async () => {
        await Promise.all([
            CourseModel.deleteMany({ domain: testDomain._id }),
            LessonModel.deleteMany({ domain: testDomain._id }),
            ProductDiscussionCommentModel.deleteMany({
                domain: testDomain._id,
            }),
            ProductDiscussionReplyModel.deleteMany({ domain: testDomain._id }),
            ProductDiscussionLikeModel.deleteMany({ domain: testDomain._id }),
            ProductDiscussionReportModel.deleteMany({ domain: testDomain._id }),
            ProductDiscussionSummaryModel.deleteMany({
                domain: testDomain._id,
            }),
            ProductDiscussionSubscriberModel.deleteMany({
                domain: testDomain._id,
            }),
            RateLimitEventModel.deleteMany({ domain: testDomain._id }),
        ]);
        recordActivityMock.mockClear();

        await courseRepo.create({
            domain: testDomain._id,
            courseId,
            title: id("discussion-api-course-title"),
            creatorId: learnerUser.userId,
            groups: [
                {
                    _id: groupId,
                    name: "Discussion API section",
                    rank: 1,
                    lessonsOrder: [lessonId],
                },
            ],
            lessons: [lessonId],
            type: "course",
            privacy: "public",
            costType: "free",
            cost: 0,
            slug: id("discussion-api-course-slug"),
            published: true,
            discussions: true,
        });
        await lessonRepo.create({
            domain: testDomain._id,
            lessonId,
            title: "Discussion API Lesson",
            type: "text",
            creatorId: learnerUser.userId,
            courseId,
            groupId,
            requiresEnrollment: true,
            published: true,
        });
    });

    afterAll(async () => {
        await Promise.all([
            CourseModel.deleteMany({ domain: testDomain._id }),
            LessonModel.deleteMany({ domain: testDomain._id }),
            ProductDiscussionCommentModel.deleteMany({
                domain: testDomain._id,
            }),
            ProductDiscussionReplyModel.deleteMany({ domain: testDomain._id }),
            ProductDiscussionLikeModel.deleteMany({ domain: testDomain._id }),
            ProductDiscussionReportModel.deleteMany({ domain: testDomain._id }),
            ProductDiscussionSummaryModel.deleteMany({
                domain: testDomain._id,
            }),
            ProductDiscussionSubscriberModel.deleteMany({
                domain: testDomain._id,
            }),
            RateLimitEventModel.deleteMany({ domain: testDomain._id }),
            UserModel.deleteMany({ domain: testDomain._id }),
            DomainModel.deleteOne({ _id: testDomain._id }),
        ]);
    });

    it("creates a top-level comment and maintains summary/subscriber records", async () => {
        const comment = await createDiscussionComment({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            content: doc("First comment"),
        });

        expect(comment.commentId).toBeDefined();
        expect(comment.userId).toBe(learnerUser.userId);
        expect(comment.likesCount).toBe(0);
        expect(comment.deleted).toBe(false);

        const summary = await ProductDiscussionSummaryModel.findOne({
            domain: testDomain._id,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
        });
        expect(summary?.commentsCount).toBe(1);
        expect(summary?.repliesCount).toBe(0);
        expect(summary?.totalCount).toBe(1);
        expect(summary?.activityCountIncludingDeleted).toBe(1);
        expect(summary?.lastCommentId).toBe(comment.commentId);

        const subscriber = await ProductDiscussionSubscriberModel.findOne({
            domain: testDomain._id,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            userId: learnerUser.userId,
        });
        expect(subscriber?.subscription).toBe(true);
        expect(recordActivityMock).toHaveBeenCalledWith(
            expect.objectContaining({
                domain: testDomain._id,
                userId: learnerUser.userId,
                type: CommonConstants.ActivityType
                    .COURSE_DISCUSSION_COMMENT_CREATED,
                entityId: comment.commentId,
                metadata: expect.objectContaining({
                    eventType: DiscussionActivityEventType.COMMENT_CREATED,
                    courseId,
                    entityType:
                        CommonConstants.ProductDiscussionEntityType.LESSON,
                    entityId: lessonId,
                    commentId: comment.commentId,
                    forUserIds: [productAdminUser.userId],
                }),
            }),
        );
    });

    it("rejects guests and non-enrolled users from reading public lesson discussions", async () => {
        await LessonModel.updateOne(
            {
                domain: testDomain._id,
                lessonId,
            },
            {
                $set: {
                    requiresEnrollment: false,
                },
            },
        );

        const comment = await ProductDiscussionCommentModel.create({
            domain: testDomain._id,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            commentId: id("guest-hidden-comment"),
            userId: learnerUser.userId,
            content: doc("Guests should not see this"),
        });
        await ProductDiscussionReplyModel.create({
            domain: testDomain._id,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            commentId: comment.commentId,
            replyId: id("guest-hidden-reply"),
            userId: secondLearnerUser.userId,
            content: doc("Guests should not see this reply"),
        });
        await ProductDiscussionSummaryModel.create({
            domain: testDomain._id,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            commentsCount: 1,
            repliesCount: 1,
            totalCount: 2,
            activityCountIncludingDeleted: 2,
            lastActivityAt: new Date(),
        });

        const guestCtx = {
            subdomain: testDomain,
            user: undefined,
            address: "",
        } as any;

        await expect(
            validateDiscussionTargetForLearner({
                ctx: guestCtx,
                productId: courseId,
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: lessonId,
            }),
        ).rejects.toThrow(responses.request_not_authenticated);
        await expect(
            listDiscussionComments({
                ctx: guestCtx,
                productId: courseId,
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: lessonId,
            }),
        ).rejects.toThrow(responses.request_not_authenticated);
        await expect(
            listDiscussionReplies({
                ctx: guestCtx,
                commentId: comment.commentId,
            }),
        ).rejects.toThrow(responses.request_not_authenticated);
        await expect(
            listDiscussionSummaries({
                ctx: guestCtx,
                productId: courseId,
            }),
        ).rejects.toThrow(responses.request_not_authenticated);

        const nonEnrolledCtx = {
            subdomain: testDomain,
            user: nonEnrolledUser,
            address: "",
        } as any;

        await expect(
            validateDiscussionTargetForLearner({
                ctx: nonEnrolledCtx,
                productId: courseId,
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: lessonId,
            }),
        ).rejects.toThrow(responses.not_enrolled);
        await expect(
            listDiscussionComments({
                ctx: nonEnrolledCtx,
                productId: courseId,
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: lessonId,
            }),
        ).rejects.toThrow(responses.not_enrolled);

        const nonEnrolledSummaries = await listDiscussionSummaries({
            ctx: nonEnrolledCtx,
            productId: courseId,
        });
        expect(nonEnrolledSummaries.items).toEqual([]);
    });

    it("creates replies under the top-level comment and lists comments/replies with cursors", async () => {
        const comment = await createDiscussionComment({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            content: doc("Root"),
        });
        const firstReply = await createDiscussionReply({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            commentId: comment.commentId,
            content: doc("First reply"),
        });
        const secondReply = await createDiscussionReply({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            commentId: comment.commentId,
            parentReplyId: firstReply.replyId,
            content: doc("Second reply"),
        });

        expect(secondReply.commentId).toBe(comment.commentId);
        expect(secondReply.parentReplyId).toBe(firstReply.replyId);

        const comments = await listDiscussionComments({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            limit: 10,
            replyPreviewLimit: 1,
        });
        expect(comments.items).toHaveLength(1);
        expect(comments.items[0].replyCount).toBe(2);
        expect(comments.items[0].replies).toHaveLength(1);
        expect(comments.items[0].replies[0].replyId).toBe(firstReply.replyId);
        expect(comments.items[0].hasMoreReplies).toBe(true);
        expect(comments.items[0].replyNextCursor).toBeDefined();
        expect(comments.hasMore).toBe(false);

        const replies = await listDiscussionReplies({
            ctx,
            commentId: comment.commentId,
            limit: 1,
        });
        expect(replies.items).toHaveLength(1);
        expect(replies.items[0].replyId).toBe(firstReply.replyId);
        expect(replies.hasMore).toBe(true);
        expect(replies.nextCursor).toBeDefined();

        const targetSeededComments = await listDiscussionComments({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            targetContentType:
                CommonConstants.ProductDiscussionContentType.REPLY,
            targetContentId: secondReply.replyId,
            limit: 10,
            replyPreviewLimit: 1,
        });
        expect(targetSeededComments.items[0].commentId).toBe(comment.commentId);
        expect(
            targetSeededComments.items[0].replies.some(
                (reply) => reply.replyId === secondReply.replyId,
            ),
        ).toBe(true);

        const summary = await ProductDiscussionSummaryModel.findOne({
            domain: testDomain._id,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
        });
        expect(summary?.commentsCount).toBe(1);
        expect(summary?.repliesCount).toBe(2);
        expect(summary?.totalCount).toBe(3);
        expect(summary?.activityCountIncludingDeleted).toBe(3);
        expect(summary?.lastReplyId).toBe(secondReply.replyId);
    });

    it("dedupes discussion notification recipients across subscribers and product admins", async () => {
        const comment = await createDiscussionComment({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            content: doc("Notify participants"),
        });
        await ProductDiscussionSubscriberModel.updateOne(
            {
                domain: testDomain._id,
                productId: courseId,
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: lessonId,
                userId: productAdminUser.userId,
            },
            {
                $setOnInsert: {
                    domain: testDomain._id,
                    productId: courseId,
                    entityType:
                        CommonConstants.ProductDiscussionEntityType.LESSON,
                    entityId: lessonId,
                    userId: productAdminUser.userId,
                },
                $set: { subscription: true },
            },
            { upsert: true },
        );
        recordActivityMock.mockClear();

        const reply = await createDiscussionReply({
            ctx: {
                subdomain: testDomain,
                user: secondLearnerUser,
                address: "",
            },
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            commentId: comment.commentId,
            content: doc("Reply notification"),
        });

        const activity = recordActivityMock.mock.calls[0][0];
        expect(activity).toEqual(
            expect.objectContaining({
                userId: secondLearnerUser.userId,
                entityId: reply.replyId,
                metadata: expect.objectContaining({
                    eventType: "reply_created",
                    commentId: comment.commentId,
                    replyId: reply.replyId,
                }),
            }),
        );
        expect(activity.metadata.forUserIds.sort()).toEqual(
            [learnerUser.userId, productAdminUser.userId].sort(),
        );
    });

    it("likes and unlikes comments idempotently", async () => {
        const comment = await createDiscussionComment({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            content: doc("Like me"),
        });

        const liked = await toggleDiscussionLike({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            contentType: CommonConstants.ProductDiscussionContentType.COMMENT,
            contentId: comment.commentId,
            liked: true,
        });
        await toggleDiscussionLike({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            contentType: CommonConstants.ProductDiscussionContentType.COMMENT,
            contentId: comment.commentId,
            liked: true,
        });

        expect(liked.likesCount).toBe(1);
        expect(liked.hasLiked).toBe(true);
        expect(
            await ProductDiscussionLikeModel.countDocuments({
                domain: testDomain._id,
                contentType:
                    CommonConstants.ProductDiscussionContentType.COMMENT,
                contentId: comment.commentId,
            }),
        ).toBe(1);
        expect(
            (
                await ProductDiscussionCommentModel.findOne({
                    domain: testDomain._id,
                    commentId: comment.commentId,
                })
            )?.likesCount,
        ).toBe(1);
        expect(
            await RateLimitEventModel.countDocuments({
                domain: testDomain._id,
                userId: learnerUser.userId,
                scope: "course_discussion",
                action: "like:toggle",
                subjectId: `${courseId}:lesson:${lessonId}`,
            }),
        ).toBe(1);

        const unliked = await toggleDiscussionLike({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            contentType: CommonConstants.ProductDiscussionContentType.COMMENT,
            contentId: comment.commentId,
            liked: false,
        });
        await toggleDiscussionLike({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            contentType: CommonConstants.ProductDiscussionContentType.COMMENT,
            contentId: comment.commentId,
            liked: false,
        });

        expect(unliked.likesCount).toBe(0);
        expect(unliked.hasLiked).toBe(false);
        expect(
            await ProductDiscussionLikeModel.countDocuments({
                domain: testDomain._id,
                contentType:
                    CommonConstants.ProductDiscussionContentType.COMMENT,
                contentId: comment.commentId,
            }),
        ).toBe(0);
        expect(
            await RateLimitEventModel.countDocuments({
                domain: testDomain._id,
                userId: learnerUser.userId,
                scope: "course_discussion",
                action: "like:toggle",
                subjectId: `${courseId}:lesson:${lessonId}`,
            }),
        ).toBe(2);
    });

    it("records one reaction activity when another user newly likes discussion content", async () => {
        const comment = await createDiscussionComment({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            content: doc("React to me"),
        });
        recordActivityMock.mockClear();

        const secondLearnerCtx = {
            subdomain: testDomain,
            user: secondLearnerUser,
            address: "",
        };
        await toggleDiscussionLike({
            ctx: secondLearnerCtx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            contentType: CommonConstants.ProductDiscussionContentType.COMMENT,
            contentId: comment.commentId,
            liked: true,
        });
        await toggleDiscussionLike({
            ctx: secondLearnerCtx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            contentType: CommonConstants.ProductDiscussionContentType.COMMENT,
            contentId: comment.commentId,
            liked: true,
        });
        await toggleDiscussionLike({
            ctx: secondLearnerCtx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            contentType: CommonConstants.ProductDiscussionContentType.COMMENT,
            contentId: comment.commentId,
            liked: false,
        });

        expect(recordActivityMock).toHaveBeenCalledTimes(1);
        expect(recordActivityMock).toHaveBeenCalledWith({
            domain: testDomain._id,
            userId: secondLearnerUser.userId,
            type: CommonConstants.ActivityType.COURSE_DISCUSSION_REACTED,
            entityId: comment.commentId,
            metadata: {
                courseId,
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: lessonId,
                contentType:
                    CommonConstants.ProductDiscussionContentType.COMMENT,
                commentId: comment.commentId,
                forUserIds: [learnerUser.userId],
            },
        });
    });

    it("enforces like toggle rate limits only for state-changing likes", async () => {
        const comment = await createDiscussionComment({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            content: doc("Like limited"),
        });

        await RateLimitEventModel.insertMany(
            Array.from({
                length: COURSE_DISCUSSION_RATE_LIMITS.likesPerMinute.limit,
            }).map((_, index) => ({
                domain: testDomain._id,
                userId: learnerUser.userId,
                scope: "course_discussion",
                action: "like:toggle",
                subjectId: `${courseId}:lesson:${lessonId}`,
                createdAt: new Date(Date.now() - index),
            })),
        );

        await expect(
            toggleDiscussionLike({
                ctx,
                productId: courseId,
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: lessonId,
                contentType:
                    CommonConstants.ProductDiscussionContentType.COMMENT,
                contentId: comment.commentId,
                liked: true,
            }),
        ).rejects.toThrow(responses.action_not_allowed);
    });

    it("enforces the daily comment and reply creation limit per discussion target", async () => {
        await RateLimitEventModel.insertMany(
            Array.from({
                length: COURSE_DISCUSSION_RATE_LIMITS.commentsPerDay.limit,
            }).map((_, index) => ({
                domain: testDomain._id,
                userId: learnerUser.userId,
                scope: "course_discussion",
                action: "comment:create",
                subjectId: `${courseId}:lesson:${lessonId}`,
                createdAt: new Date(Date.now() - 2 * 60 * 1000 - index),
            })),
        );

        await expect(
            createDiscussionComment({
                ctx,
                productId: courseId,
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: lessonId,
                content: doc("Daily limit root"),
            }),
        ).rejects.toThrow(responses.action_not_allowed);

        await RateLimitEventModel.deleteMany({
            domain: testDomain._id,
            action: "comment:create",
        });

        const comment = await createDiscussionComment({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            content: doc("Root before reply limit"),
        });

        await RateLimitEventModel.insertMany(
            Array.from({
                length: COURSE_DISCUSSION_RATE_LIMITS.commentsPerDay.limit,
            }).map((_, index) => ({
                domain: testDomain._id,
                userId: learnerUser.userId,
                scope: "course_discussion",
                action: "reply:create",
                subjectId: `${courseId}:lesson:${lessonId}`,
                createdAt: new Date(Date.now() - 2 * 60 * 1000 - index),
            })),
        );

        await expect(
            createDiscussionReply({
                ctx,
                productId: courseId,
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: lessonId,
                commentId: comment.commentId,
                content: doc("Daily limit reply"),
            }),
        ).rejects.toThrow(responses.action_not_allowed);
    });

    it("rejects duplicate discussion content from the same user in the same target", async () => {
        await createDiscussionComment({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            content: doc("Duplicate content"),
        });

        await expect(
            createDiscussionComment({
                ctx,
                productId: courseId,
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: lessonId,
                content: doc("Duplicate content"),
            }),
        ).rejects.toThrow(responses.action_not_allowed);
    });

    it("marks liked comments/replies and redacts deleted content in learner lists", async () => {
        const comment = await createDiscussionComment({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            content: doc("Liked root"),
        });
        const reply = await createDiscussionReply({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            commentId: comment.commentId,
            content: doc("Liked reply"),
        });

        await toggleDiscussionLike({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            contentType: CommonConstants.ProductDiscussionContentType.COMMENT,
            contentId: comment.commentId,
            liked: true,
        });
        await toggleDiscussionLike({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            contentType: CommonConstants.ProductDiscussionContentType.REPLY,
            contentId: reply.replyId,
            liked: true,
        });

        const likedComments = await listDiscussionComments({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            limit: 10,
            replyPreviewLimit: 2,
        });
        expect(likedComments.items[0].hasLiked).toBe(true);
        expect(likedComments.items[0].replies[0].hasLiked).toBe(true);

        await deleteDiscussionComment({
            ctx,
            commentId: comment.commentId,
        });
        await deleteDiscussionReply({
            ctx,
            replyId: reply.replyId,
        });

        const deletedComments = await listDiscussionComments({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            limit: 10,
            replyPreviewLimit: 2,
        });
        expect(deletedComments.items[0].deleted).toBe(true);
        expect(deletedComments.items[0].content).toBeNull();
        expect(deletedComments.items[0].hasLiked).toBe(true);
        expect(deletedComments.items[0].replies[0].deleted).toBe(true);
        expect(deletedComments.items[0].replies[0].content).toBeNull();

        const deletedReplies = await listDiscussionReplies({
            ctx,
            commentId: comment.commentId,
            limit: 10,
        });
        expect(deletedReplies.items[0].content).toBeNull();
        expect(deletedReplies.items[0].hasLiked).toBe(true);
    });

    it("reports comments and rejects duplicate reports by the same user", async () => {
        const comment = await createDiscussionComment({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            content: doc("Report me"),
        });

        const report = await createDiscussionReport({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            contentType: CommonConstants.ProductDiscussionContentType.COMMENT,
            contentId: comment.commentId,
            reason: "Spam",
        });

        expect(report.status).toBe(
            CommonConstants.ProductDiscussionReportStatus.PENDING,
        );
        expect(report.contentId).toBe(comment.commentId);
        await expect(
            createDiscussionReport({
                ctx,
                productId: courseId,
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: lessonId,
                contentType:
                    CommonConstants.ProductDiscussionContentType.COMMENT,
                contentId: comment.commentId,
                reason: "Still spam",
            }),
        ).rejects.toThrow(responses.invalid_input);
    });

    it("enforces report creation rate limits per discussion target", async () => {
        const comment = await createDiscussionComment({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            content: doc("Report limited"),
        });
        await RateLimitEventModel.insertMany(
            Array.from({
                length: COURSE_DISCUSSION_RATE_LIMITS.reportsPerHour.limit,
            }).map((_, index) => ({
                domain: testDomain._id,
                userId: learnerUser.userId,
                scope: "course_discussion",
                action: "report:create",
                subjectId: `${courseId}:lesson:${lessonId}`,
                createdAt: new Date(Date.now() - index),
            })),
        );

        await expect(
            createDiscussionReport({
                ctx,
                productId: courseId,
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: lessonId,
                contentType:
                    CommonConstants.ProductDiscussionContentType.COMMENT,
                contentId: comment.commentId,
                reason: "Spam",
            }),
        ).rejects.toThrow(responses.action_not_allowed);
    });

    it("soft-deletes own comments/replies and updates visible counts/subscriber state", async () => {
        const comment = await createDiscussionComment({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            content: doc("Delete root"),
        });
        const reply = await createDiscussionReply({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            commentId: comment.commentId,
            content: doc("Delete reply"),
        });

        const deletedComment = await deleteDiscussionComment({
            ctx,
            commentId: comment.commentId,
        });
        expect(deletedComment.deleted).toBe(true);
        expect(deletedComment.deletedBy).toBe(learnerUser.userId);
        expect(deletedComment.deletedByRole).toBe(
            CommonConstants.ProductDiscussionDeletedByRole.AUTHOR,
        );
        expect(
            (
                await ProductDiscussionSubscriberModel.findOne({
                    domain: testDomain._id,
                    productId: courseId,
                    entityType:
                        CommonConstants.ProductDiscussionEntityType.LESSON,
                    entityId: lessonId,
                    userId: learnerUser.userId,
                })
            )?.subscription,
        ).toBe(true);

        const deletedReply = await deleteDiscussionReply({
            ctx,
            replyId: reply.replyId,
        });
        expect(deletedReply.deleted).toBe(true);

        const summary = await ProductDiscussionSummaryModel.findOne({
            domain: testDomain._id,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
        });
        expect(summary?.commentsCount).toBe(0);
        expect(summary?.repliesCount).toBe(0);
        expect(summary?.totalCount).toBe(0);
        expect(summary?.activityCountIncludingDeleted).toBe(2);
        expect(
            (
                await ProductDiscussionSubscriberModel.findOne({
                    domain: testDomain._id,
                    productId: courseId,
                    entityType:
                        CommonConstants.ProductDiscussionEntityType.LESSON,
                    entityId: lessonId,
                    userId: learnerUser.userId,
                })
            )?.subscription,
        ).toBe(false);
    });

    it("lets product admins list/count reports and cycle report status with moderation side effects", async () => {
        const adminCtx = {
            subdomain: testDomain,
            user: productAdminUser,
            address: "",
        };
        const comment = await createDiscussionComment({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            content: doc("Moderate me"),
        });
        const report = await createDiscussionReport({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            contentType: CommonConstants.ProductDiscussionContentType.COMMENT,
            contentId: comment.commentId,
            reason: "Spam",
        });

        const reports = await listDiscussionReports({
            ctx: adminCtx,
            productId: courseId,
            status: CommonConstants.ProductDiscussionReportStatus.PENDING,
            page: 1,
            limit: 10,
        });
        expect(reports.items).toHaveLength(1);
        expect(reports.items[0].reportId).toBe(report.reportId);
        expect(
            (
                await listDiscussionReports({
                    ctx: adminCtx,
                    productId: courseId,
                    status: CommonConstants.ProductDiscussionReportStatus
                        .PENDING,
                    page: 2,
                    limit: 10,
                })
            ).items,
        ).toHaveLength(0);

        // Verify that GraphQL resolved fields on ProductDiscussionReport work properly
        const graphql = require("graphql").graphql;
        const gqlResult: any = await graphql({
            schema,
            source: `
                query GetProductDiscussionReports($productId: String!, $page: Int, $limit: Int) {
                    getProductDiscussionReports(productId: $productId, page: $page, limit: $limit) {
                        items {
                            reportId
                            lessonTitle
                            contentPreview
                            authorName
                            reporterName
                        }
                    }
                }
            `,
            variableValues: { productId: courseId, page: 1, limit: 10 },
            contextValue: adminCtx,
        });

        expect(gqlResult.errors).toBeUndefined();
        const item = gqlResult.data.getProductDiscussionReports.items[0];
        expect(item.reportId).toBe(report.reportId);
        expect(item.lessonTitle).toBe("Discussion API Lesson");
        expect(item.contentPreview).toBe("Moderate me");
        expect(item.authorName).toBe("Discussion API Learner");
        expect(item.reporterName).toBe("Discussion API Learner");

        expect(
            await getDiscussionReportsCount({
                ctx: adminCtx,
                productId: courseId,
                status: CommonConstants.ProductDiscussionReportStatus.PENDING,
            }),
        ).toBe(1);

        const accepted = await updateDiscussionReportStatus({
            ctx: adminCtx,
            productId: courseId,
            reportId: report.reportId,
        });
        expect(accepted.status).toBe(
            CommonConstants.ProductDiscussionReportStatus.ACCEPTED,
        );
        expect(
            (
                await ProductDiscussionCommentModel.findOne({
                    domain: testDomain._id,
                    commentId: comment.commentId,
                })
            )?.deletedByRole,
        ).toBe(CommonConstants.ProductDiscussionDeletedByRole.COURSE_ADMIN);
        expect(
            (
                await ProductDiscussionSummaryModel.findOne({
                    domain: testDomain._id,
                    productId: courseId,
                    entityType:
                        CommonConstants.ProductDiscussionEntityType.LESSON,
                    entityId: lessonId,
                })
            )?.totalCount,
        ).toBe(0);

        const rejected = await updateDiscussionReportStatus({
            ctx: adminCtx,
            productId: courseId,
            reportId: report.reportId,
            rejectionReason: "Not an issue",
        });
        expect(rejected.status).toBe(
            CommonConstants.ProductDiscussionReportStatus.REJECTED,
        );
        expect(rejected.rejectionReason).toBe("Not an issue");
        expect(
            (
                await ProductDiscussionCommentModel.findOne({
                    domain: testDomain._id,
                    commentId: comment.commentId,
                })
            )?.deleted,
        ).toBe(false);
        expect(
            (
                await ProductDiscussionSummaryModel.findOne({
                    domain: testDomain._id,
                    productId: courseId,
                    entityType:
                        CommonConstants.ProductDiscussionEntityType.LESSON,
                    entityId: lessonId,
                })
            )?.totalCount,
        ).toBe(1);

        const pending = await updateDiscussionReportStatus({
            ctx: adminCtx,
            productId: courseId,
            reportId: report.reportId,
        });
        expect(pending.status).toBe(
            CommonConstants.ProductDiscussionReportStatus.PENDING,
        );
        expect(pending.rejectionReason).toBe("");
    });

    it("lets product admins use the course viewer path to report discussion content", async () => {
        const adminCtx = {
            subdomain: testDomain,
            user: productAdminUser,
            address: "",
        };
        const comment = await createDiscussionComment({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            content: doc("Admin can inspect this"),
        });

        await deleteDiscussionComment({
            ctx,
            commentId: comment.commentId,
        });

        const learnerComments = await listDiscussionComments({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            limit: 10,
        });
        expect(
            learnerComments.items.find(
                (item) => item.commentId === comment.commentId,
            )?.content,
        ).toBeNull();

        const adminComments = await listDiscussionComments({
            ctx: adminCtx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            limit: 10,
        });
        expect(
            adminComments.items.find(
                (item) => item.commentId === comment.commentId,
            )?.content,
        ).toBeNull();

        await expect(
            listDiscussionComments({
                ctx: adminCtx,
                productId: courseId,
                entityType: CommonConstants.ProductDiscussionEntityType.PRODUCT,
                entityId: courseId,
                limit: 10,
            }),
        ).rejects.toThrow(responses.action_not_allowed);

        const activeComment = await createDiscussionComment({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            content: doc("Admin can report this"),
        });

        const report = await createDiscussionReport({
            ctx: adminCtx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            contentType: CommonConstants.ProductDiscussionContentType.COMMENT,
            contentId: activeComment.commentId,
            reason: "Needs moderation review",
        });

        expect(report.userId).toBe(productAdminUser.userId);
    });

    it("resolves the user profile name, avatar and iso date string in GraphQL product discussion comments", async () => {
        const comment = await createDiscussionComment({
            ctx,
            productId: courseId,
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: lessonId,
            content: doc("Profile test comment"),
        });

        const graphql = require("graphql").graphql;
        const gqlResult: any = await graphql({
            schema,
            source: `
                query GetProductDiscussionComments($productId: String!, $entityType: ProductDiscussionEntityType!, $entityId: String!) {
                    getProductDiscussionComments(productId: $productId, entityType: $entityType, entityId: $entityId) {
                        items {
                            commentId
                            createdAt
                            user {
                                name
                                avatar {
                                    file
                                }
                            }
                        }
                    }
                }
            `,
            variableValues: {
                productId: courseId,
                entityType: "LESSON",
                entityId: lessonId,
            },
            contextValue: ctx,
        });

        expect(gqlResult.errors).toBeUndefined();
        const item = gqlResult.data.getProductDiscussionComments.items[0];
        expect(item.commentId).toBe(comment.commentId);
        expect(item.user.name).toBe("Discussion API Learner");
        expect(typeof item.createdAt).toBe("string");
        expect(item.createdAt).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
    });

    it("lists summaries after server-side lesson access filtering for learners and all targets for admins", async () => {
        const lockedGroupId = id("discussion-api-locked-group");
        const lockedLessonId = id("discussion-api-locked-lesson");
        await CourseModel.updateOne(
            { domain: testDomain._id, courseId },
            {
                $push: {
                    groups: {
                        _id: lockedGroupId,
                        name: "Locked section",
                        rank: 2,
                        lessonsOrder: [lockedLessonId],
                        drip: { status: true },
                    },
                    lessons: lockedLessonId,
                },
            },
        );
        await lessonRepo.create({
            domain: testDomain._id,
            lessonId: lockedLessonId,
            title: "Locked Discussion API Lesson",
            type: "text",
            creatorId: learnerUser.userId,
            courseId,
            groupId: lockedGroupId,
            requiresEnrollment: true,
            published: true,
        });
        await ProductDiscussionSummaryModel.create([
            {
                domain: testDomain._id,
                productId: courseId,
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: lessonId,
                commentsCount: 1,
                repliesCount: 0,
                totalCount: 1,
                activityCountIncludingDeleted: 1,
                lastActivityAt: new Date("2026-01-02T00:00:00.000Z"),
                lastCommentId: id("visible-comment"),
            },
            {
                domain: testDomain._id,
                productId: courseId,
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: lockedLessonId,
                commentsCount: 1,
                repliesCount: 0,
                totalCount: 1,
                activityCountIncludingDeleted: 1,
                lastActivityAt: new Date("2026-01-03T00:00:00.000Z"),
                lastCommentId: id("locked-comment"),
            },
        ]);

        const learnerSummaries = await listDiscussionSummaries({
            ctx,
            productId: courseId,
            limit: 10,
        });
        expect(learnerSummaries.items.map((item) => item.entityId)).toEqual([
            lessonId,
        ]);

        const adminSummaries = await listDiscussionSummaries({
            ctx: {
                subdomain: testDomain,
                user: productAdminUser,
                address: "",
            },
            productId: courseId,
            limit: 10,
        });
        expect(
            adminSummaries.items.map((item) => item.entityId).sort(),
        ).toEqual([lessonId, lockedLessonId].sort());
    });

    it("lists unpublished discussion targets only for authorized preview managers", async () => {
        await Promise.all([
            CourseModel.updateOne(
                { domain: testDomain._id, courseId },
                { $set: { published: false } },
            ),
            LessonModel.updateOne(
                { domain: testDomain._id, lessonId },
                { $set: { published: false } },
            ),
            ProductDiscussionSummaryModel.create({
                domain: testDomain._id,
                productId: courseId,
                entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
                entityId: lessonId,
                commentsCount: 1,
                repliesCount: 0,
                totalCount: 1,
                activityCountIncludingDeleted: 1,
                lastActivityAt: new Date("2026-01-02T00:00:00.000Z"),
                lastCommentId: id("unpublished-comment"),
            }),
        ]);

        await expect(
            listDiscussionSummaries({
                ctx,
                productId: courseId,
                preview: true,
            }),
        ).rejects.toThrow(responses.item_not_found);

        await expect(
            listDiscussionSummaries({
                ctx: {
                    subdomain: testDomain,
                    user: productAdminUser,
                    address: "",
                },
                productId: courseId,
            }),
        ).rejects.toThrow(responses.item_not_found);

        const previewSummaries = await listDiscussionSummaries({
            ctx: {
                subdomain: testDomain,
                user: productAdminUser,
                address: "",
            },
            productId: courseId,
            preview: true,
        });

        expect(previewSummaries.items.map((item) => item.entityId)).toEqual([
            lessonId,
        ]);
    });
});

describe("updateCourse", () => {
    let testDomain: any;
    let adminUser: any;
    let page: any;

    beforeAll(async () => {
        testDomain = await domainRepo.create({
            name: id("domain"),
            email: email("domain"),
        });

        // Create admin user with course management permissions
        adminUser = await userRepo.create({
            domain: testDomain._id,
            userId: id("admin-user"),
            email: email("admin"),
            name: "Admin User",
            permissions: [constants.permissions.manageAnyCourse],
            active: true,
            unsubscribeToken: id("unsubscribe-admin"),
            purchases: [],
        });

        page = await pageRepo.create({
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

        const course = await courseRepo.create({
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

        const course = await courseRepo.create({
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
        const course = await courseRepo.create({
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
        const course = await courseRepo.create({
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
        const course = await courseRepo.create({
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
        testDomain = await domainRepo.create({
            name: getCourseId("domain"),
            email: getCourseEmail("domain"),
        });

        adminUser = await userRepo.create({
            domain: testDomain._id,
            userId: getCourseId("admin-user"),
            email: getCourseEmail("admin"),
            name: "Admin User",
            permissions: [constants.permissions.manageAnyCourse],
            active: true,
            unsubscribeToken: getCourseId("unsubscribe-admin"),
            purchases: [],
        });

        ownerManager = await userRepo.create({
            domain: testDomain._id,
            userId: getCourseId("owner-manager"),
            email: getCourseEmail("owner-manager"),
            name: "Owner Manager",
            permissions: [constants.permissions.manageCourse],
            active: true,
            unsubscribeToken: getCourseId("unsubscribe-owner-manager"),
            purchases: [],
        });

        ownerWithoutManagePermission = await userRepo.create({
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
        const course = await courseRepo.create({
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
        const course = await courseRepo.create({
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
        const course = await courseRepo.create({
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
        const course = await courseRepo.create({
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
        const course = await courseRepo.create({
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
        testDomain = await domainRepo.create({
            name: helperId("domain"),
            email: `${helperId("domain")}@example.com`,
        });

        adminUser = await userRepo.create({
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
        const courseManageUser = await userRepo.create({
            domain: testDomain._id,
            userId: helperId("dashboard-manage-user"),
            email: `${helperId("dashboard-manage")}@example.com`,
            name: "Dashboard Course Manager",
            permissions: [constants.permissions.manageCourse],
            active: true,
            unsubscribeToken: helperId("unsubscribe-dashboard-manage"),
            purchases: [],
        });

        const ownedCourse = await courseRepo.create({
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

        const otherCourse = await courseRepo.create({
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
        const courseManageUser = await userRepo.create({
            domain: testDomain._id,
            userId: helperId("manage-user-2"),
            email: `${helperId("manage2")}@example.com`,
            name: "Course Manager 2",
            permissions: [constants.permissions.manageCourse],
            active: true,
            unsubscribeToken: helperId("unsubscribe-manage-2"),
            purchases: [],
        });

        const course = await courseRepo.create({
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

        const otherCourse = await courseRepo.create({
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
        const course = await courseRepo.create({
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
        const otherCourse = await courseRepo.create({
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
        await lessonRepo.create({
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
        const course = await courseRepo.create({
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
        const matchingByName = await userRepo.create({
            domain: testDomain._id,
            userId: helperId("matching-name-user"),
            email: `${helperId("matching-name")}@example.com`,
            name: "Student Searchable",
            active: true,
            permissions: [],
            unsubscribeToken: helperId("matching-name-unsubscribe"),
            purchases: [{ courseId: course.courseId, completedLessons: [] }],
        });
        const matchingByEmail = await userRepo.create({
            domain: testDomain._id,
            userId: helperId("matching-email-user"),
            email: `student-${helperId("matching-email")}@example.com`,
            name: "Different Name",
            active: true,
            permissions: [],
            unsubscribeToken: helperId("matching-email-unsubscribe"),
            purchases: [{ courseId: course.courseId, completedLessons: [] }],
        });
        const nonMatchingUser = await userRepo.create({
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

const EDIT_SUITE_PREFIX = `edit-discussion-${Date.now()}`;
const editId = (s: string) => `${EDIT_SUITE_PREFIX}-${s}`;
const editEmail = (s: string) => `${s}-${EDIT_SUITE_PREFIX}@example.com`;
const editDoc = (text: string): any => ({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

describe("updateDiscussionComment / updateDiscussionReply", () => {
    let testDomain: any;
    let authorUser: any;
    let otherUser: any;
    let course: any;
    let lesson: any;
    let authorCtx: any;
    let otherCtx: any;

    beforeAll(async () => {
        testDomain = await domainRepo.create({
            name: editId("domain"),
            email: editEmail("domain"),
        });

        authorUser = await userRepo.create({
            domain: testDomain._id,
            userId: editId("author"),
            email: editEmail("author"),
            name: "Author",
            permissions: [constants.permissions.enrollInCourse],
            active: true,
            unsubscribeToken: editId("author-token"),
            purchases: [
                {
                    courseId: editId("course"),
                    completedLessons: [],
                    accessibleGroups: [editId("group")],
                },
            ],
        });

        otherUser = await userRepo.create({
            domain: testDomain._id,
            userId: editId("other"),
            email: editEmail("other"),
            name: "Other",
            permissions: [constants.permissions.enrollInCourse],
            active: true,
            unsubscribeToken: editId("other-token"),
            purchases: [
                {
                    courseId: editId("course"),
                    completedLessons: [],
                    accessibleGroups: [editId("group")],
                },
            ],
        });

        course = await courseRepo.create({
            domain: testDomain._id,
            courseId: editId("course"),
            title: editId("course-title"),
            creatorId: authorUser.userId,
            groups: [
                {
                    _id: editId("group"),
                    name: "Section",
                    rank: 1,
                    lessonsOrder: [editId("lesson")],
                },
            ],
            lessons: [editId("lesson")],
            type: "course",
            privacy: "public",
            costType: "free",
            cost: 0,
            slug: editId("course-slug"),
            published: true,
            discussions: true,
        });

        lesson = await lessonRepo.create({
            domain: testDomain._id,
            lessonId: editId("lesson"),
            title: "Edit Lesson",
            type: "text",
            creatorId: authorUser.userId,
            courseId: editId("course"),
            groupId: editId("group"),
            published: true,
        });

        await MembershipModel.create([
            {
                domain: testDomain._id,
                membershipId: editId("author-membership"),
                sessionId: editId("author-session"),
                userId: authorUser.userId,
                paymentPlanId: editId("author-plan"),
                entityId: editId("course"),
                entityType: CommonConstants.MembershipEntityType.COURSE,
                status: CommonConstants.MembershipStatus.ACTIVE,
            },
            {
                domain: testDomain._id,
                membershipId: editId("other-membership"),
                sessionId: editId("other-session"),
                userId: otherUser.userId,
                paymentPlanId: editId("other-plan"),
                entityId: editId("course"),
                entityType: CommonConstants.MembershipEntityType.COURSE,
                status: CommonConstants.MembershipStatus.ACTIVE,
            },
        ]);

        authorCtx = { subdomain: testDomain, user: authorUser, address: "" };
        otherCtx = { subdomain: testDomain, user: otherUser, address: "" };
    });

    afterEach(async () => {
        await RateLimitEventModel.deleteMany({ domain: testDomain._id });
    });

    afterAll(async () => {
        await Promise.all([
            ProductDiscussionCommentModel.deleteMany({
                domain: testDomain._id,
            }),
            ProductDiscussionReplyModel.deleteMany({ domain: testDomain._id }),
            RateLimitEventModel.deleteMany({ domain: testDomain._id }),
            CourseModel.deleteMany({ domain: testDomain._id }),
            LessonModel.deleteMany({ domain: testDomain._id }),
            UserModel.deleteMany({ domain: testDomain._id }),
            DomainModel.deleteOne({ _id: testDomain._id }),
        ]);
    });

    it("allows the author to edit their own comment and sets isEdited", async () => {
        const comment = await createDiscussionComment({
            ctx: authorCtx,
            productId: editId("course"),
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: editId("lesson"),
            content: editDoc("original"),
        });

        const updated = await updateDiscussionComment({
            ctx: authorCtx,
            commentId: comment.commentId,
            content: editDoc("updated"),
        });

        expect(updated.isEdited).toBe(true);
        const persisted = await ProductDiscussionCommentModel.findOne({
            commentId: comment.commentId,
        });
        expect(persisted?.isEdited).toBe(true);
    });

    it("rejects edit by a non-author", async () => {
        const comment = await createDiscussionComment({
            ctx: authorCtx,
            productId: editId("course"),
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: editId("lesson"),
            content: editDoc("author content"),
        });

        await expect(
            updateDiscussionComment({
                ctx: otherCtx,
                commentId: comment.commentId,
                content: editDoc("hijacked"),
            }),
        ).rejects.toThrow(responses.item_not_found);
    });

    it("rejects edit of a deleted comment", async () => {
        const comment = await createDiscussionComment({
            ctx: authorCtx,
            productId: editId("course"),
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: editId("lesson"),
            content: editDoc("to be deleted"),
        });

        await deleteDiscussionComment({
            ctx: authorCtx,
            commentId: comment.commentId,
        });

        await expect(
            updateDiscussionComment({
                ctx: authorCtx,
                commentId: comment.commentId,
                content: editDoc("edit after delete"),
            }),
        ).rejects.toThrow(responses.item_not_found);
    });

    it("rejects edit with invalid content", async () => {
        const comment = await createDiscussionComment({
            ctx: authorCtx,
            productId: editId("course"),
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: editId("lesson"),
            content: editDoc("valid"),
        });

        await expect(
            updateDiscussionComment({
                ctx: authorCtx,
                commentId: comment.commentId,
                content: { type: "paragraph" },
            }),
        ).rejects.toThrow(responses.invalid_input);
    });

    it("allows the author to edit their own reply and sets isEdited", async () => {
        const comment = await createDiscussionComment({
            ctx: authorCtx,
            productId: editId("course"),
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: editId("lesson"),
            content: editDoc("comment for reply edit"),
        });

        const reply = await createDiscussionReply({
            ctx: authorCtx,
            productId: editId("course"),
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: editId("lesson"),
            commentId: comment.commentId,
            content: editDoc("original reply"),
        });

        const updated = await updateDiscussionReply({
            ctx: authorCtx,
            replyId: reply.replyId,
            content: editDoc("updated reply"),
        });

        expect(updated.isEdited).toBe(true);
        const persisted = await ProductDiscussionReplyModel.findOne({
            replyId: reply.replyId,
        });
        expect(persisted?.isEdited).toBe(true);
    });

    it("rejects reply edit by a non-author", async () => {
        const comment = await createDiscussionComment({
            ctx: authorCtx,
            productId: editId("course"),
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: editId("lesson"),
            content: editDoc("comment for non-author reply edit"),
        });

        const reply = await createDiscussionReply({
            ctx: authorCtx,
            productId: editId("course"),
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: editId("lesson"),
            commentId: comment.commentId,
            content: editDoc("author reply"),
        });

        await expect(
            updateDiscussionReply({
                ctx: otherCtx,
                replyId: reply.replyId,
                content: editDoc("hijacked reply"),
            }),
        ).rejects.toThrow(responses.item_not_found);
    });

    it("rejects edit of a deleted reply", async () => {
        const comment = await createDiscussionComment({
            ctx: authorCtx,
            productId: editId("course"),
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: editId("lesson"),
            content: editDoc("comment for deleted reply edit"),
        });

        const reply = await createDiscussionReply({
            ctx: authorCtx,
            productId: editId("course"),
            entityType: CommonConstants.ProductDiscussionEntityType.LESSON,
            entityId: editId("lesson"),
            commentId: comment.commentId,
            content: editDoc("reply to delete"),
        });

        await deleteDiscussionReply({
            ctx: authorCtx,
            replyId: reply.replyId,
        });

        await expect(
            updateDiscussionReply({
                ctx: authorCtx,
                replyId: reply.replyId,
                content: editDoc("edit after delete"),
            }),
        ).rejects.toThrow(responses.item_not_found);
    });
});
