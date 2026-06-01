/**
 * @jest-environment node
 */

import {
    getCommentsCount,
    getComments,
    getCommunities,
    getCommunitiesCount,
    getCommunity,
    getFeed,
    getFeedCount,
    getMember,
    getMembers,
    getMembersCount,
    getCommunityReports,
    getCommunityReportsCount,
    getPost,
    getPosts,
    getPostsCount,
    addCategory,
    postComment,
    updateCommunity,
    deleteCategory,
    deleteComment,
    reportCommunityContent,
    togglePostLike,
    toggleCommentLike,
    toggleCommentReplyLike,
    togglePinned,
    updateCommunityReportStatus,
    updateMemberRole,
    updateMemberStatus,
} from "../logic";
import {
    archivePaymentPlan,
    changeDefaultPlan,
    createPlan,
    getPlansForEntity,
    updatePlan,
} from "../../paymentplans/logic";
import CommunityModel from "@models/Community";
import CommunityPostModel from "@models/CommunityPost";
import CommunityCommentModel from "@models/CommunityComment";
import MembershipModel from "@models/Membership";
import PaymentPlanModel from "@models/PaymentPlan";
import PageModel from "@models/Page";
import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import CourseModel from "@models/Course";
import LessonModel from "@models/Lesson";
import CommunityReportModel from "@models/CommunityReport";
import constants from "@/config/constants";
import { Constants } from "@courselit/common-models";

jest.mock("@/services/queue");

// Ensure generateUniqueId is not mocked
jest.unmock("@courselit/utils");

describe("Community Logic - Comment Count Tests", () => {
    let testDomain: any;
    let adminUser: any;
    let regularUser: any;
    let community: any;
    let post: any;
    let mockCtx: any;

    beforeAll(async () => {
        // Create unique test domain
        testDomain = await DomainModel.create({
            name: `test-domain-logic-${Date.now()}`,
            email: "test@example.com",
        });

        // Create admin user
        adminUser = await UserModel.create({
            domain: testDomain._id,
            userId: "admin-user-logic",
            email: "admin@example.com",
            name: "Admin User",
            permissions: [constants.permissions.manageCommunity],
            active: true,
            unsubscribeToken: "unsubscribe-admin-logic",
        });

        // Create regular user
        regularUser = await UserModel.create({
            domain: testDomain._id,
            userId: "regular-user-logic",
            email: "regular@example.com",
            name: "Regular User",
            permissions: [],
            active: true,
            unsubscribeToken: "unsubscribe-regular-logic",
        });

        // Create internal payment plan (required for membership)
        await PaymentPlanModel.create({
            domain: testDomain._id,
            planId: "internal-plan-logic",
            userId: adminUser.userId,
            entityId: "internal",
            entityType: Constants.MembershipEntityType.COURSE,
            type: "free",
            name: constants.internalPaymentPlanName,
            internal: true,
            interval: "monthly",
            cost: 0,
            currencyISOCode: "USD",
        });

        mockCtx = {
            user: adminUser,
            subdomain: testDomain,
        } as any;

        // Create community manually
        community = await CommunityModel.create({
            domain: testDomain._id,
            communityId: "test-comm-logic",
            name: "Test Community Logic",
            pageId: "test-page-logic",
            slug: "test-page-logic",
            enabled: true,
            deleted: false,
            categories: ["General"],
        });

        // Create page for community
        await PageModel.create({
            domain: testDomain._id,
            pageId: community.pageId,
            type: constants.communityPage,
            creatorId: adminUser.userId,
            name: community.name,
            entityId: community.communityId,
        });

        // Create free payment plan for the community
        await PaymentPlanModel.create({
            domain: testDomain._id,
            planId: "free-plan-logic",
            userId: adminUser.userId,
            entityId: community.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            type: Constants.PaymentPlanType.FREE,
            name: "Free Community Plan",
            interval: "monthly",
            cost: 0,
            currencyISOCode: "USD",
        });

        // Create memberships manually for both users
        await MembershipModel.create({
            domain: testDomain._id,
            membershipId: "admin-membership-logic",
            userId: adminUser.userId,
            entityId: community.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            paymentPlanId: "internal-plan-logic",
            sessionId: "admin-session",
            status: Constants.MembershipStatus.ACTIVE,
            role: Constants.MembershipRole.MODERATE,
        });

        await MembershipModel.create({
            domain: testDomain._id,
            membershipId: "regular-membership-logic",
            userId: regularUser.userId,
            entityId: community.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            paymentPlanId: "free-plan-logic",
            sessionId: "regular-session",
            status: Constants.MembershipStatus.ACTIVE,
            role: Constants.MembershipRole.POST,
        });

        // Create a test post
        post = await CommunityPostModel.create({
            domain: testDomain._id,
            communityId: community.communityId,
            postId: "test-post-logic",
            userId: adminUser.userId,
            title: "Test Post for Comment Count",
            content: "Testing comment counts",
            category: "General",
        });
    });

    afterEach(async () => {
        // Clean up comments after each test
        await CommunityCommentModel.deleteMany({
            domain: testDomain._id,
            communityId: community.communityId,
        });
    });

    afterAll(async () => {
        // Clean up all test data
        await Promise.all([
            CommunityModel.deleteMany({ domain: testDomain._id }),
            CommunityPostModel.deleteMany({ domain: testDomain._id }),
            CommunityCommentModel.deleteMany({ domain: testDomain._id }),
            MembershipModel.deleteMany({ domain: testDomain._id }),
            PaymentPlanModel.deleteMany({ domain: testDomain._id }),
            PageModel.deleteMany({ domain: testDomain._id }),
            UserModel.deleteMany({ domain: testDomain._id }),
            DomainModel.deleteOne({ _id: testDomain._id }),
        ]);
    });

    describe("getCommentsCount", () => {
        it("should return 0 for a post with no comments", async () => {
            const count = await getCommentsCount(post, mockCtx);
            expect(count).toBe(0);
        });

        it("should count top-level comments correctly", async () => {
            // Add 3 top-level comments
            await CommunityCommentModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: post.postId,
                commentId: "comment-1",
                userId: regularUser.userId,
                content: "First comment",
            });

            await CommunityCommentModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: post.postId,
                commentId: "comment-2",
                userId: adminUser.userId,
                content: "Second comment",
            });

            await CommunityCommentModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: post.postId,
                commentId: "comment-3",
                userId: regularUser.userId,
                content: "Third comment",
            });

            const count = await getCommentsCount(post, mockCtx);
            expect(count).toBe(3);
        });

        it("should include replies in the comment count", async () => {
            // Create a comment with replies
            await CommunityCommentModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: post.postId,
                commentId: "comment-with-replies",
                userId: regularUser.userId,
                content: "Parent comment",
                replies: [
                    {
                        replyId: "reply-1",
                        userId: adminUser.userId,
                        content: "First reply",
                        likes: [],
                        deleted: false,
                    },
                    {
                        replyId: "reply-2",
                        userId: regularUser.userId,
                        content: "Second reply",
                        likes: [],
                        deleted: false,
                    },
                ],
            });

            const count = await getCommentsCount(post, mockCtx);
            // Should be 1 (comment) + 2 (replies) = 3
            expect(count).toBe(3);
        });

        it("should count multiple comments with multiple replies", async () => {
            // First comment with 2 replies
            await CommunityCommentModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: post.postId,
                commentId: "comment-multi-1",
                userId: regularUser.userId,
                content: "First parent comment",
                replies: [
                    {
                        replyId: "reply-1-1",
                        userId: adminUser.userId,
                        content: "Reply to first",
                        likes: [],
                        deleted: false,
                    },
                    {
                        replyId: "reply-1-2",
                        userId: regularUser.userId,
                        content: "Another reply to first",
                        likes: [],
                        deleted: false,
                    },
                ],
            });

            // Second comment with 1 reply
            await CommunityCommentModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: post.postId,
                commentId: "comment-multi-2",
                userId: adminUser.userId,
                content: "Second parent comment",
                replies: [
                    {
                        replyId: "reply-2-1",
                        userId: regularUser.userId,
                        content: "Reply to second",
                        likes: [],
                        deleted: false,
                    },
                ],
            });

            // Third comment with no replies
            await CommunityCommentModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: post.postId,
                commentId: "comment-multi-3",
                userId: regularUser.userId,
                content: "Third comment, no replies",
            });

            const count = await getCommentsCount(post, mockCtx);
            // Should be: (1 + 2) + (1 + 1) + 1 = 6
            expect(count).toBe(6);
        });

        it("should exclude deleted comments from count", async () => {
            // Create a deleted comment
            await CommunityCommentModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: post.postId,
                commentId: "comment-deleted",
                userId: regularUser.userId,
                content: "Deleted comment",
                deleted: true,
            });

            // Create a non-deleted comment
            await CommunityCommentModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: post.postId,
                commentId: "comment-active",
                userId: adminUser.userId,
                content: "Active comment",
                deleted: false,
            });

            const count = await getCommentsCount(post, mockCtx);
            // Should only count the non-deleted comment
            expect(count).toBe(1);
        });

        it("should count non-deleted replies even when parent comment is deleted", async () => {
            // Create a deleted comment with non-deleted replies
            await CommunityCommentModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: post.postId,
                commentId: "comment-deleted-with-replies",
                userId: regularUser.userId,
                content: "Deleted parent",
                deleted: true,
                replies: [
                    {
                        replyId: "reply-active",
                        userId: adminUser.userId,
                        content: "Active reply",
                        likes: [],
                        deleted: false,
                    },
                ],
            });

            const count = await getCommentsCount(post, mockCtx);
            // Deleted parent comment is not counted, but active reply is counted
            expect(count).toBe(1);
        });
    });
});

describe("Community Logic - Feed Tests", () => {
    let testDomain: any;
    let adminUser: any;
    let regularUser: any;
    let communityOne: any;
    let communityTwo: any;
    let mockCtx: any;

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: `test-domain-feed-${Date.now()}`,
            email: "feed@example.com",
        });

        adminUser = await UserModel.create({
            domain: testDomain._id,
            userId: "admin-user-feed",
            email: "admin-feed@example.com",
            name: "Admin Feed User",
            permissions: [constants.permissions.manageCommunity],
            active: true,
            unsubscribeToken: "unsubscribe-admin-feed",
        });

        regularUser = await UserModel.create({
            domain: testDomain._id,
            userId: "regular-user-feed",
            email: "regular-feed@example.com",
            name: "Regular Feed User",
            permissions: [],
            active: true,
            unsubscribeToken: "unsubscribe-regular-feed",
        });

        communityOne = await CommunityModel.create({
            domain: testDomain._id,
            communityId: "community-feed-1",
            name: "Community Feed One",
            pageId: "community-feed-one",
            slug: "community-feed-one",
            enabled: true,
            deleted: false,
        });

        communityTwo = await CommunityModel.create({
            domain: testDomain._id,
            communityId: "community-feed-2",
            name: "Community Feed Two",
            pageId: "community-feed-two",
            slug: "community-feed-two",
            enabled: true,
            deleted: false,
        });

        mockCtx = {
            user: regularUser,
            subdomain: testDomain,
        } as any;
    });

    afterEach(async () => {
        await CommunityCommentModel.deleteMany({ domain: testDomain._id });
        await CommunityPostModel.deleteMany({ domain: testDomain._id });
        await CommunityReportModel.deleteMany({ domain: testDomain._id });
        await MembershipModel.deleteMany({
            domain: testDomain._id,
            entityType: Constants.MembershipEntityType.COMMUNITY,
        });
        await CourseModel.deleteMany({ domain: testDomain._id });
    });

    afterAll(async () => {
        await CommunityCommentModel.deleteMany({ domain: testDomain._id });
        await CommunityPostModel.deleteMany({ domain: testDomain._id });
        await CommunityReportModel.deleteMany({ domain: testDomain._id });
        await MembershipModel.deleteMany({ domain: testDomain._id });
        await CourseModel.deleteMany({ domain: testDomain._id });
        await CommunityModel.deleteMany({ domain: testDomain._id });
        await PageModel.deleteMany({ domain: testDomain._id });
        await PaymentPlanModel.deleteMany({ domain: testDomain._id });
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteMany({ _id: testDomain._id });
    });

    it("returns paginated posts from all active community memberships", async () => {
        await MembershipModel.create([
            {
                domain: testDomain._id,
                membershipId: "feed-membership-1",
                userId: regularUser.userId,
                entityId: communityOne.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                paymentPlanId: "feed-plan-1",
                sessionId: "feed-session-1",
                status: Constants.MembershipStatus.ACTIVE,
                role: Constants.MembershipRole.POST,
            },
            {
                domain: testDomain._id,
                membershipId: "feed-membership-2",
                userId: regularUser.userId,
                entityId: communityTwo.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                paymentPlanId: "feed-plan-2",
                sessionId: "feed-session-2",
                status: Constants.MembershipStatus.ACTIVE,
                role: Constants.MembershipRole.POST,
            },
        ]);

        await CommunityPostModel.create([
            {
                domain: testDomain._id,
                userId: adminUser.userId,
                communityId: communityOne.communityId,
                postId: "feed-post-1",
                title: "Older post",
                content: "Older content",
                category: "General",
                likes: [],
                deleted: false,
                updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            },
            {
                domain: testDomain._id,
                userId: adminUser.userId,
                communityId: communityTwo.communityId,
                postId: "feed-post-2",
                title: "Newest post",
                content: "Newest content",
                category: "General",
                likes: [regularUser.userId],
                deleted: false,
                updatedAt: new Date("2026-02-01T00:00:00.000Z"),
            },
        ]);

        const feed = await getFeed({ ctx: mockCtx, page: 1, limit: 1 });
        const count = await getFeedCount({ ctx: mockCtx });

        expect(count).toBe(2);
        expect(feed).toHaveLength(1);
        expect(feed[0]).toMatchObject({
            postId: "feed-post-2",
            hasLiked: true,
            community: {
                id: communityTwo.communityId,
                title: communityTwo.name,
            },
        });
    });

    it("does not include posts from inactive memberships", async () => {
        await MembershipModel.create({
            domain: testDomain._id,
            membershipId: "feed-membership-pending",
            userId: regularUser.userId,
            entityId: communityOne.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            paymentPlanId: "feed-plan-pending",
            sessionId: "feed-session-pending",
            status: Constants.MembershipStatus.PENDING,
            role: Constants.MembershipRole.POST,
        });

        await CommunityPostModel.create({
            domain: testDomain._id,
            userId: adminUser.userId,
            communityId: communityOne.communityId,
            postId: "feed-post-pending",
            title: "Pending membership post",
            content: "Should not appear",
            category: "General",
            likes: [],
            deleted: false,
        });

        const feed = await getFeed({ ctx: mockCtx, page: 1, limit: 10 });
        const count = await getFeedCount({ ctx: mockCtx });

        expect(feed).toEqual([]);
        expect(count).toBe(0);
    });

    it("excludes course discussion communities from the generic feed", async () => {
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: "feed-course-discussion-course",
            title: "Feed Course Discussion Course",
            creatorId: adminUser.userId,
            pageId: "feed-course-discussion-page",
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: "feed-course-discussion-course",
            discussions: true,
        });

        const courseCommunity = await CommunityModel.create({
            domain: testDomain._id,
            communityId: "course-community-feed",
            name: "Course Discussion Feed",
            pageId: "course-community-feed-page",
            slug: "course-community-feed",
            enabled: true,
            deleted: false,
            courseId: course.courseId,
        });

        await MembershipModel.create([
            {
                domain: testDomain._id,
                membershipId: "feed-standalone-membership",
                userId: regularUser.userId,
                entityId: communityOne.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                paymentPlanId: "feed-plan-standalone",
                sessionId: "feed-session-standalone",
                status: Constants.MembershipStatus.ACTIVE,
                role: Constants.MembershipRole.POST,
            },
            {
                domain: testDomain._id,
                membershipId: "feed-course-membership",
                userId: regularUser.userId,
                entityId: courseCommunity.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                paymentPlanId: "feed-plan-course",
                sessionId: "feed-session-course",
                status: Constants.MembershipStatus.ACTIVE,
                role: Constants.MembershipRole.POST,
            },
        ]);

        await CommunityPostModel.create([
            {
                domain: testDomain._id,
                userId: adminUser.userId,
                communityId: communityOne.communityId,
                postId: "feed-standalone-post",
                title: "Standalone post",
                content: "Visible content",
                category: "General",
                likes: [],
                deleted: false,
            },
            {
                domain: testDomain._id,
                userId: adminUser.userId,
                communityId: courseCommunity.communityId,
                postId: "feed-course-post",
                title: "Course discussion post",
                content: "Should not appear",
                category: "General",
                lessonId: "feed-lesson",
                courseId: course.courseId,
                likes: [],
                deleted: false,
            },
        ]);

        const feed = await getFeed({ ctx: mockCtx, page: 1, limit: 10 });
        const count = await getFeedCount({ ctx: mockCtx });

        expect(count).toBe(1);
        expect(feed.map((item) => item.postId)).toEqual([
            "feed-standalone-post",
        ]);
    });

    it("rejects direct learner access to course discussion posts through community routes", async () => {
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: "direct-course-discussion-course",
            title: "Direct Course Discussion Course",
            creatorId: adminUser.userId,
            pageId: "direct-course-discussion-page",
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: "direct-course-discussion-course",
            discussions: true,
        });

        const courseCommunity = await CommunityModel.create({
            domain: testDomain._id,
            communityId: "course-community-direct",
            name: "Course Discussion Direct",
            pageId: "course-community-direct-page",
            slug: "course-community-direct",
            enabled: true,
            deleted: false,
            categories: ["General"],
            courseId: course.courseId,
        });

        await MembershipModel.create({
            domain: testDomain._id,
            membershipId: "direct-course-membership",
            userId: regularUser.userId,
            entityId: courseCommunity.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            paymentPlanId: "direct-plan-course",
            sessionId: "direct-session-course",
            status: Constants.MembershipStatus.ACTIVE,
            role: Constants.MembershipRole.POST,
        });

        await CommunityPostModel.create({
            domain: testDomain._id,
            userId: adminUser.userId,
            communityId: courseCommunity.communityId,
            postId: "direct-course-post",
            title: "Course discussion post",
            content: "Should not be reachable",
            category: "General",
            lessonId: "direct-lesson",
            courseId: course.courseId,
            likes: [],
            deleted: false,
        });

        await expect(
            getPost({
                ctx: mockCtx,
                communityId: courseCommunity.communityId,
                postId: "direct-course-post",
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
        await expect(
            getPosts({
                ctx: mockCtx,
                communityId: courseCommunity.communityId,
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
        await expect(
            getPostsCount({
                ctx: mockCtx,
                communityId: courseCommunity.communityId,
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
        await expect(
            postComment({
                ctx: mockCtx,
                communityId: courseCommunity.communityId,
                postId: "direct-course-post",
                content: "Generic route should fail",
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
    });

    it("allows course managers to read and comment on lesson-linked posts through community moderation routes", async () => {
        const courseManager = await UserModel.create({
            domain: testDomain._id,
            userId: "course-discussion-manager-user",
            email: "course-discussion-manager@example.com",
            name: "Course Discussion Manager",
            permissions: [constants.permissions.manageCourse],
            active: true,
            unsubscribeToken: "course-discussion-manager-unsub",
        });
        const managerCtx = {
            user: courseManager,
            subdomain: testDomain,
        } as any;

        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: "manager-course-discussion-course",
            title: "Manager Course Discussion Course",
            creatorId: courseManager.userId,
            pageId: "manager-course-discussion-page",
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: "manager-course-discussion-course",
            discussions: true,
        });

        const courseCommunity = await CommunityModel.create({
            domain: testDomain._id,
            communityId: "course-community-manager-routes",
            name: "Course Discussion Manager Routes",
            pageId: "course-community-manager-page",
            slug: "course-community-manager",
            enabled: true,
            deleted: false,
            categories: ["General"],
            courseId: course.courseId,
        });

        const post = await CommunityPostModel.create({
            domain: testDomain._id,
            userId: adminUser.userId,
            communityId: courseCommunity.communityId,
            postId: "manager-course-post",
            title: "Course discussion post",
            content: "Reachable to course managers",
            category: "General",
            lessonId: "manager-lesson",
            courseId: course.courseId,
            likes: [],
            deleted: false,
        });

        const loadedPost = await getPost({
            ctx: managerCtx,
            communityId: courseCommunity.communityId,
            postId: post.postId,
        });
        const comment = await postComment({
            ctx: managerCtx,
            communityId: courseCommunity.communityId,
            postId: post.postId,
            content: "Moderator comment",
        });
        const comments = await getComments({
            ctx: managerCtx,
            communityId: courseCommunity.communityId,
            postId: post.postId,
        });

        expect(loadedPost?.postId).toBe(post.postId);
        expect(comment.content).toBe("Moderator comment");
        expect(comments.map((item) => item.commentId)).toContain(
            comment.commentId,
        );
    });

    it("rejects generic moderation changes for lesson-linked discussion posts and course-linked memberships", async () => {
        const moderatorUser = await UserModel.create({
            domain: testDomain._id,
            userId: "course-moderator-user",
            email: "course-moderator@example.com",
            name: "Course Moderator",
            permissions: [],
            active: true,
            unsubscribeToken: "course-moderator-unsub",
        });
        const moderatorCtx = {
            user: moderatorUser,
            subdomain: testDomain,
        } as any;

        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: "moderation-course-discussion-course",
            title: "Moderation Course Discussion Course",
            creatorId: adminUser.userId,
            pageId: "moderation-course-discussion-page",
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: "moderation-course-discussion-course",
            discussions: true,
        });

        const courseCommunity = await CommunityModel.create({
            domain: testDomain._id,
            communityId: "course-community-moderation",
            name: "Course Discussion Moderation",
            pageId: "course-community-moderation-page",
            slug: "course-community-moderation",
            enabled: true,
            deleted: false,
            categories: ["General"],
            courseId: course.courseId,
        });

        await MembershipModel.create([
            {
                domain: testDomain._id,
                membershipId: "direct-moderator-membership",
                userId: moderatorUser.userId,
                entityId: courseCommunity.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                paymentPlanId: "moderator-plan",
                sessionId: "moderator-session",
                status: Constants.MembershipStatus.ACTIVE,
                role: Constants.MembershipRole.MODERATE,
            },
            {
                domain: testDomain._id,
                membershipId: "direct-auto-membership",
                userId: regularUser.userId,
                entityId: courseCommunity.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                paymentPlanId: "auto-plan",
                sessionId: "auto-session",
                status: Constants.MembershipStatus.ACTIVE,
                role: Constants.MembershipRole.POST,
            },
        ]);

        await CommunityPostModel.create({
            domain: testDomain._id,
            userId: regularUser.userId,
            communityId: courseCommunity.communityId,
            postId: "moderation-course-post",
            title: "Course discussion post",
            content: "Should not be moderated generically",
            category: "General",
            lessonId: "moderation-lesson",
            courseId: course.courseId,
            likes: [],
            deleted: false,
        });

        await expect(
            togglePinned({
                ctx: moderatorCtx,
                communityId: courseCommunity.communityId,
                postId: "moderation-course-post",
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
        await expect(
            updateCommunity({
                ctx: moderatorCtx,
                id: courseCommunity.communityId,
                name: "Renamed Course Discussion Community",
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
        await expect(
            updateMemberStatus({
                ctx: moderatorCtx,
                communityId: courseCommunity.communityId,
                userId: regularUser.userId,
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
        await expect(
            updateMemberRole({
                ctx: moderatorCtx,
                communityId: courseCommunity.communityId,
                userId: regularUser.userId,
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
    });

    it("rejects course-linked comment interactions when the learner no longer has lesson access", async () => {
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: "interaction-course-discussion-course",
            title: "Interaction Course Discussion Course",
            creatorId: adminUser.userId,
            pageId: "interaction-course-discussion-page",
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: "interaction-course-discussion-course",
            discussions: true,
        });

        const courseCommunity = await CommunityModel.create({
            domain: testDomain._id,
            communityId: "course-community-interactions",
            name: "Course Discussion Interactions",
            pageId: "course-community-interactions-page",
            slug: "course-community-interactions",
            enabled: true,
            deleted: false,
            categories: ["General"],
            courseId: course.courseId,
        });

        await MembershipModel.create({
            domain: testDomain._id,
            membershipId: "interaction-course-membership",
            userId: regularUser.userId,
            entityId: courseCommunity.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            paymentPlanId: "interaction-plan-course",
            sessionId: "interaction-session-course",
            status: Constants.MembershipStatus.ACTIVE,
            role: Constants.MembershipRole.COMMENT,
        });

        await CommunityPostModel.create({
            domain: testDomain._id,
            userId: adminUser.userId,
            communityId: courseCommunity.communityId,
            postId: "interaction-course-post",
            title: "Course discussion post",
            content: "Should require current lesson access",
            category: "General",
            lessonId: "interaction-lesson",
            courseId: course.courseId,
            likes: [],
            deleted: false,
        });

        await CommunityCommentModel.create({
            domain: testDomain._id,
            userId: adminUser.userId,
            communityId: courseCommunity.communityId,
            postId: "interaction-course-post",
            commentId: "interaction-comment",
            content: "Comment from another user",
            likes: [],
            replies: [
                {
                    replyId: "interaction-reply",
                    userId: adminUser.userId,
                    content: "Reply from another user",
                    likes: [],
                    deleted: false,
                },
            ],
        });

        await expect(
            toggleCommentLike({
                ctx: mockCtx,
                communityId: courseCommunity.communityId,
                postId: "interaction-course-post",
                commentId: "interaction-comment",
            }),
        ).rejects.toThrow();
        await expect(
            toggleCommentReplyLike({
                ctx: mockCtx,
                communityId: courseCommunity.communityId,
                postId: "interaction-course-post",
                commentId: "interaction-comment",
                replyId: "interaction-reply",
            }),
        ).rejects.toThrow();
        await expect(
            deleteComment({
                ctx: mockCtx,
                communityId: courseCommunity.communityId,
                postId: "interaction-course-post",
                commentId: "interaction-comment",
            }),
        ).rejects.toThrow();
        await expect(
            reportCommunityContent({
                ctx: mockCtx,
                communityId: courseCommunity.communityId,
                contentId: "interaction-comment",
                type: Constants.CommunityReportType.COMMENT,
                reason: "No current lesson access",
            }),
        ).rejects.toThrow();
    });

    it("allows linked post likes when the learner has current lesson access", async () => {
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: "post-like-course-discussion-course",
            title: "Post Like Course Discussion Course",
            creatorId: adminUser.userId,
            pageId: "post-like-course-discussion-page",
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: "post-like-course-discussion-course",
            discussions: true,
        });
        const courseCommunity = await CommunityModel.create({
            domain: testDomain._id,
            communityId: "course-community-post-like",
            name: "Course Discussion Post Likes",
            pageId: "course-community-post-like-page",
            slug: "course-community-post-like",
            enabled: true,
            deleted: false,
            categories: ["General"],
            courseId: course.courseId,
        });
        await MembershipModel.create({
            domain: testDomain._id,
            membershipId: "post-like-course-membership",
            userId: regularUser.userId,
            entityId: course.courseId,
            entityType: Constants.MembershipEntityType.COURSE,
            paymentPlanId: "post-like-plan-course",
            sessionId: "post-like-session-course",
            status: Constants.MembershipStatus.ACTIVE,
        });
        await LessonModel.create({
            domain: testDomain._id,
            lessonId: "post-like-lesson",
            title: "Post Like Lesson",
            type: constants.text,
            creatorId: adminUser.userId,
            courseId: course.courseId,
            groupId: "post-like-group",
            published: true,
        });
        const post = await CommunityPostModel.create({
            domain: testDomain._id,
            userId: adminUser.userId,
            communityId: courseCommunity.communityId,
            postId: "post-like-course-post",
            title: "Course discussion post to like",
            content: "",
            category: "General",
            lessonId: "post-like-lesson",
            likes: [],
            deleted: false,
        });

        const likedPost = await togglePostLike({
            ctx: {
                ...mockCtx,
                user: {
                    ...regularUser.toObject(),
                    purchases: [
                        {
                            courseId: course.courseId,
                            completedLessons: [],
                            accessibleGroups: [],
                        },
                    ],
                },
            },
            communityId: courseCommunity.communityId,
            postId: post.postId,
        });

        expect(likedPost.hasLiked).toBe(true);

        const unenrolledUser = await UserModel.create({
            domain: testDomain._id,
            userId: "unenrolled-user-feed",
            email: "unenrolled@example.com",
            name: "Unenrolled User",
            permissions: [],
            active: true,
            unsubscribeToken: "unsubscribe-unenrolled-feed",
        });

        await expect(
            togglePostLike({
                ctx: {
                    ...mockCtx,
                    user: unenrolledUser,
                },
                communityId: courseCommunity.communityId,
                postId: post.postId,
            }),
        ).rejects.toThrow();
    });

    it("allows effective course moderators to manage reports without stored community membership", async () => {
        const courseAdmin = await UserModel.create({
            domain: testDomain._id,
            userId: "effective-course-report-admin",
            email: "effective-course-report-admin@example.com",
            name: "Effective Course Report Admin",
            permissions: [constants.permissions.manageAnyCourse],
            active: true,
            unsubscribeToken: "effective-course-report-admin-unsub",
        });
        const courseAdminCtx = {
            user: courseAdmin,
            subdomain: testDomain,
        } as any;

        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: "report-course-discussion-course",
            title: "Report Course Discussion Course",
            creatorId: adminUser.userId,
            pageId: "report-course-discussion-page",
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: "report-course-discussion-course",
            discussions: true,
        });

        const courseCommunity = await CommunityModel.create({
            domain: testDomain._id,
            communityId: "course-community-reports",
            name: "Course Discussion Reports",
            pageId: "course-community-reports-page",
            slug: "course-community-reports",
            enabled: true,
            deleted: false,
            categories: ["General"],
            courseId: course.courseId,
        });

        await CommunityPostModel.create({
            domain: testDomain._id,
            userId: regularUser.userId,
            communityId: courseCommunity.communityId,
            postId: "reported-course-post",
            title: "Reported post",
            content: "Reported content",
            category: "General",
            lessonId: "report-lesson",
            courseId: course.courseId,
            likes: [],
            deleted: false,
        });

        const report = await CommunityReportModel.create({
            domain: testDomain._id,
            communityId: courseCommunity.communityId,
            reportId: "course-report",
            userId: regularUser.userId,
            contentId: "reported-course-post",
            type: Constants.CommunityReportType.POST,
            reason: "Needs review",
        });

        const reports = await getCommunityReports({
            ctx: courseAdminCtx,
            communityId: courseCommunity.communityId,
        });
        const count = await getCommunityReportsCount({
            ctx: courseAdminCtx,
            communityId: courseCommunity.communityId,
        });
        const updatedReport = await updateCommunityReportStatus({
            ctx: courseAdminCtx,
            communityId: courseCommunity.communityId,
            reportId: report.reportId,
        });

        expect(reports).toHaveLength(1);
        expect(count).toBe(1);
        expect(updatedReport.status).toBe(
            Constants.CommunityReportStatus.ACCEPTED,
        );
    });

    it("rejects member list access for course-linked communities", async () => {
        const courseAdmin = await UserModel.create({
            domain: testDomain._id,
            userId: "linked-members-course-admin",
            email: "linked-members-course-admin@example.com",
            name: "Linked Members Course Admin",
            permissions: [constants.permissions.manageAnyCourse],
            active: true,
            unsubscribeToken: "linked-members-course-admin-unsub",
        });
        const courseAdminCtx = {
            user: courseAdmin,
            subdomain: testDomain,
        } as any;
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: "linked-members-course",
            title: "Linked Members Course",
            creatorId: adminUser.userId,
            pageId: "linked-members-course-page",
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: "linked-members-course",
            discussions: true,
        });
        const courseCommunity = await CommunityModel.create({
            domain: testDomain._id,
            communityId: "linked-members-community",
            name: "Linked Members Community",
            pageId: "linked-members-community-page",
            slug: "linked-members-community",
            enabled: true,
            deleted: false,
            categories: ["General"],
            courseId: course.courseId,
        });

        await expect(
            getMembers({
                ctx: courseAdminCtx,
                communityId: courseCommunity.communityId,
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
        await expect(
            getMembersCount({
                ctx: courseAdminCtx,
                communityId: courseCommunity.communityId,
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
    });

    it("allows only effective course moderators to fetch linked communities directly", async () => {
        const courseAdmin = await UserModel.create({
            domain: testDomain._id,
            userId: "effective-course-community-admin",
            email: "effective-course-community-admin@example.com",
            name: "Effective Course Community Admin",
            permissions: [constants.permissions.manageAnyCourse],
            active: true,
            unsubscribeToken: "effective-course-community-admin-unsub",
        });
        const explicitCommunityModerator = await UserModel.create({
            domain: testDomain._id,
            userId: "explicit-linked-community-moderator",
            email: "explicit-linked-community-moderator@example.com",
            name: "Explicit Linked Community Moderator",
            permissions: [],
            active: true,
            unsubscribeToken: "explicit-linked-community-moderator-unsub",
        });
        const courseAdminCtx = {
            user: courseAdmin,
            subdomain: testDomain,
        } as any;

        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: "direct-fetch-course-discussion-course",
            title: "Direct Fetch Course Discussion Course",
            creatorId: adminUser.userId,
            pageId: "direct-fetch-course-discussion-page",
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: "direct-fetch-course-discussion-course",
            discussions: true,
        });

        const courseCommunity = await CommunityModel.create({
            domain: testDomain._id,
            communityId: "course-community-direct-fetch",
            name: "Course Discussion Direct Fetch",
            pageId: "course-community-direct-fetch-page",
            slug: "course-community-direct-fetch",
            enabled: true,
            deleted: false,
            categories: ["General"],
            courseId: course.courseId,
        });

        await MembershipModel.create({
            domain: testDomain._id,
            membershipId: "direct-fetch-auto-membership",
            userId: regularUser.userId,
            entityId: courseCommunity.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            paymentPlanId: "direct-fetch-plan",
            sessionId: "direct-fetch-session",
            status: Constants.MembershipStatus.ACTIVE,
            role: Constants.MembershipRole.COMMENT,
        });

        await MembershipModel.create({
            domain: testDomain._id,
            membershipId: "direct-fetch-explicit-moderator-membership",
            userId: explicitCommunityModerator.userId,
            entityId: courseCommunity.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            paymentPlanId: "direct-fetch-explicit-moderator-plan",
            sessionId: "direct-fetch-explicit-moderator-session",
            status: Constants.MembershipStatus.ACTIVE,
            role: Constants.MembershipRole.MODERATE,
        });

        const communityForAdmin = await getCommunity({
            ctx: courseAdminCtx,
            id: courseCommunity.communityId,
        });
        const communityForLearner = await getCommunity({
            ctx: {
                ...mockCtx,
                user: regularUser,
            },
            id: courseCommunity.communityId,
        });
        const communityForExplicitModerator = await getCommunity({
            ctx: {
                ...mockCtx,
                user: explicitCommunityModerator,
            },
            id: courseCommunity.communityId,
        });

        expect(communityForAdmin?.communityId).toBe(
            courseCommunity.communityId,
        );
        expect(communityForAdmin?.courseId).toBe(course.courseId);
        expect(communityForLearner).toBeNull();
        expect(communityForExplicitModerator).toBeNull();
        await expect(
            getMember({
                ctx: {
                    ...mockCtx,
                    user: regularUser,
                },
                communityId: courseCommunity.communityId,
            }),
        ).resolves.toBeNull();
        await expect(
            getCommunityReports({
                ctx: {
                    ...mockCtx,
                    user: explicitCommunityModerator,
                },
                communityId: courseCommunity.communityId,
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
    });

    it("allows effective course moderators to review linked discussion posts and comments", async () => {
        const courseAdmin = await UserModel.create({
            domain: testDomain._id,
            userId: "effective-course-review-admin",
            email: "effective-course-review-admin@example.com",
            name: "Effective Course Review Admin",
            permissions: [constants.permissions.manageAnyCourse],
            active: true,
            unsubscribeToken: "effective-course-review-admin-unsub",
        });
        const courseAdminCtx = {
            user: courseAdmin,
            subdomain: testDomain,
        } as any;

        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: "review-course-discussion-course",
            title: "Review Course Discussion Course",
            creatorId: adminUser.userId,
            pageId: "review-course-discussion-page",
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: "review-course-discussion-course",
            discussions: true,
        });

        const courseCommunity = await CommunityModel.create({
            domain: testDomain._id,
            communityId: "course-community-review",
            name: "Course Discussion Review",
            pageId: "course-community-review-page",
            slug: "course-community-review",
            enabled: true,
            deleted: false,
            categories: ["General"],
            courseId: course.courseId,
        });

        const post = await CommunityPostModel.create({
            domain: testDomain._id,
            userId: regularUser.userId,
            communityId: courseCommunity.communityId,
            postId: "review-course-post",
            title: "Course discussion post",
            content: "Reviewable content",
            category: "General",
            lessonId: "review-lesson",
            courseId: course.courseId,
            likes: [],
            deleted: false,
        });

        await CommunityCommentModel.create({
            domain: testDomain._id,
            communityId: courseCommunity.communityId,
            postId: post.postId,
            commentId: "review-course-comment",
            userId: regularUser.userId,
            content: "Reviewable comment",
            likes: [],
            replies: [],
            deleted: false,
        });

        await expect(
            getPost({
                ctx: courseAdminCtx,
                communityId: courseCommunity.communityId,
                postId: post.postId,
            }),
        ).resolves.toMatchObject({
            postId: post.postId,
            communityId: courseCommunity.communityId,
        });
        await expect(
            getComments({
                ctx: courseAdminCtx,
                communityId: courseCommunity.communityId,
                postId: post.postId,
            }),
        ).resolves.toHaveLength(1);
    });

    it("rejects course-linked community categories and payment plan changes", async () => {
        const courseAdmin = await UserModel.create({
            domain: testDomain._id,
            userId: "effective-course-settings-admin",
            email: "effective-course-settings-admin@example.com",
            name: "Effective Course Settings Admin",
            permissions: [constants.permissions.manageAnyCourse],
            active: true,
            unsubscribeToken: "effective-course-settings-admin-unsub",
        });
        const courseAdminCtx = {
            user: courseAdmin,
            subdomain: testDomain,
        } as any;

        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: "settings-course-discussion-course",
            title: "Settings Course Discussion Course",
            creatorId: adminUser.userId,
            pageId: "settings-course-discussion-page",
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: "settings-course-discussion-course",
            discussions: true,
        });

        const courseCommunity = await CommunityModel.create({
            domain: testDomain._id,
            communityId: "course-community-settings",
            name: "Course Discussion Settings",
            pageId: "course-community-settings-page",
            slug: "course-community-settings",
            enabled: true,
            deleted: false,
            categories: ["General"],
            courseId: course.courseId,
        });

        const plan = await PaymentPlanModel.create({
            domain: testDomain._id,
            planId: "course-community-settings-plan",
            userId: adminUser.userId,
            entityId: courseCommunity.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            type: Constants.PaymentPlanType.FREE,
            name: "Course Discussion Plan",
            interval: "monthly",
            cost: 0,
            currencyISOCode: "USD",
        });

        await expect(
            addCategory({
                ctx: courseAdminCtx,
                id: courseCommunity.communityId,
                category: "Announcements",
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
        await expect(
            deleteCategory({
                ctx: courseAdminCtx,
                id: courseCommunity.communityId,
                category: "General",
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
        await expect(
            getPlansForEntity({
                ctx: courseAdminCtx,
                entityId: courseCommunity.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
        await expect(
            createPlan({
                ctx: courseAdminCtx,
                entityId: courseCommunity.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                name: "Another Plan",
                type: Constants.PaymentPlanType.FREE,
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
        await expect(
            updatePlan({
                ctx: courseAdminCtx,
                planId: plan.planId,
                name: "Updated Plan",
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
        await expect(
            archivePaymentPlan({
                ctx: courseAdminCtx,
                planId: plan.planId,
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
        await expect(
            changeDefaultPlan({
                ctx: courseAdminCtx,
                planId: plan.planId,
                entityId: courseCommunity.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
    });
});

describe("Community Logic - Enabled Communities Count Tests", () => {
    let testDomain: any;
    let adminUser: any;
    let mockCtx: any;

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: `test-domain-enabled-count-${Date.now()}`,
            email: "enabled-count@example.com",
        });

        adminUser = await UserModel.create({
            domain: testDomain._id,
            userId: "enabled-count-admin",
            email: "enabled-count-admin@example.com",
            name: "Enabled Count Admin",
            permissions: [constants.permissions.manageCommunity],
            active: true,
            unsubscribeToken: "enabled-count-unsub",
        });

        mockCtx = {
            user: adminUser,
            subdomain: testDomain,
        } as any;
    });

    afterEach(async () => {
        await CommunityModel.deleteMany({ domain: testDomain._id });
    });

    afterAll(async () => {
        await CommunityModel.deleteMany({ domain: testDomain._id });
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteMany({ _id: testDomain._id });
    });

    it("counts only enabled and non-deleted communities for the domain", async () => {
        await CommunityModel.create([
            {
                domain: testDomain._id,
                communityId: "enabled-community-1",
                name: "Enabled Community",
                pageId: "enabled-community-1",
                slug: "enabled-community-1",
                enabled: true,
                deleted: false,
            },
            {
                domain: testDomain._id,
                communityId: "disabled-community-1",
                name: "Disabled Community",
                pageId: "disabled-community-1",
                slug: "disabled-community-1",
                enabled: false,
                deleted: false,
            },
            {
                domain: testDomain._id,
                communityId: "deleted-community-1",
                name: "Deleted Community",
                pageId: "deleted-community-1",
                slug: "deleted-community-1",
                enabled: true,
                deleted: true,
            },
        ]);

        const count = await getCommunitiesCount({
            ctx: mockCtx,
            publicOnly: true,
        });

        expect(count).toBe(1);
    });

    it("returns only enabled communities for public requests even for admins", async () => {
        await CommunityModel.create([
            {
                domain: testDomain._id,
                communityId: "public-enabled-community",
                name: "Public Enabled Community",
                pageId: "public-enabled-community",
                slug: "public-enabled-community",
                enabled: true,
                deleted: false,
            },
            {
                domain: testDomain._id,
                communityId: "public-disabled-community",
                name: "Public Disabled Community",
                pageId: "public-disabled-community",
                slug: "public-disabled-community",
                enabled: false,
                deleted: false,
            },
        ]);

        const communities = await Promise.all(
            await getCommunities({
                ctx: mockCtx,
                page: 1,
                limit: 10,
                publicOnly: true,
            }),
        );
        const count = await getCommunitiesCount({
            ctx: mockCtx,
            publicOnly: true,
        });

        expect(communities.map((community) => community.communityId)).toEqual([
            "public-enabled-community",
        ]);
        expect(count).toBe(1);
    });

    it("still returns disabled communities for admins outside public requests", async () => {
        await CommunityModel.create([
            {
                domain: testDomain._id,
                communityId: "admin-enabled-community",
                name: "Admin Enabled Community",
                pageId: "admin-enabled-community",
                slug: "admin-enabled-community",
                enabled: true,
                deleted: false,
            },
            {
                domain: testDomain._id,
                communityId: "admin-disabled-community",
                name: "Admin Disabled Community",
                pageId: "admin-disabled-community",
                slug: "admin-disabled-community",
                enabled: false,
                deleted: false,
            },
        ]);

        const communities = await Promise.all(
            await getCommunities({
                ctx: mockCtx,
                page: 1,
                limit: 10,
            }),
        );
        const count = await getCommunitiesCount({
            ctx: mockCtx,
        });

        expect(communities).toHaveLength(2);
        expect(
            communities.map((community) => community.communityId).sort(),
        ).toEqual(["admin-disabled-community", "admin-enabled-community"]);
        expect(count).toBe(2);
    });
});
