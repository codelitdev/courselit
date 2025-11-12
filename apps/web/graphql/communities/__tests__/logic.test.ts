/**
 * @jest-environment node
 */

import { getCommentsCount } from "../logic";
import CommunityModel from "@models/Community";
import CommunityPostModel from "@models/CommunityPost";
import CommunityCommentModel from "@models/CommunityComment";
import MembershipModel from "@models/Membership";
import PaymentPlanModel from "@models/PaymentPlan";
import PageModel from "@models/Page";
import DomainModel from "@models/Domain";
import UserModel from "@models/User";
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
            const comment = await CommunityCommentModel.create({
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
