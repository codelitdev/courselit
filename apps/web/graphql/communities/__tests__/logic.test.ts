/**
 * @jest-environment node
 */

import {
    getCommentsCount,
    getCommunities,
    getCommunitiesCount,
    getFeed,
    getFeedCount,
    getCommunityReports,
    reportCommunityContent,
} from "../logic";
import CommunityModel from "@models/Community";
import CommunityPostModel from "@models/CommunityPost";
import CommunityCommentModel from "@models/CommunityComment";
import CommunityReportModel from "@models/CommunityReport";
import MembershipModel from "@models/Membership";
import PaymentPlanModel from "@models/PaymentPlan";
import PageModel from "@models/Page";
import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import constants from "@/config/constants";
import { Constants, TextEditorContent } from "@courselit/common-models";

jest.mock("@/services/queue");

// Ensure generateUniqueId is not mocked
jest.unmock("@courselit/utils");

const doc = (text: string): TextEditorContent => ({
    type: "doc",
    content: [
        {
            type: "paragraph",
            content: [{ type: "text", text }],
        },
        {
            type: "paragraph",
        },
    ],
});

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
        await CommunityReportModel.deleteMany({
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
            CommunityReportModel.deleteMany({ domain: testDomain._id }),
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

    describe("getCommunityReports", () => {
        it("returns a string preview for reported rich-text posts", async () => {
            const richTextPost = await CommunityPostModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: "reported-rich-text-post",
                userId: adminUser.userId,
                title: "Reported Rich Text Post",
                content: doc("This is good man"),
                category: "General",
            });

            await reportCommunityContent({
                ctx: {
                    user: regularUser,
                    subdomain: testDomain,
                } as any,
                communityId: community.communityId,
                contentId: richTextPost.postId,
                type: Constants.CommunityReportType.POST,
                reason: "Needs review",
            });

            const reports = await Promise.all(
                await getCommunityReports({
                    ctx: mockCtx,
                    communityId: community.communityId,
                    page: 1,
                    limit: 10,
                }),
            );

            expect(reports).toHaveLength(1);
            expect(reports[0].content.content).toBe("This is good man");
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
        await MembershipModel.deleteMany({
            domain: testDomain._id,
            entityType: Constants.MembershipEntityType.COMMUNITY,
        });
    });

    afterAll(async () => {
        await CommunityCommentModel.deleteMany({ domain: testDomain._id });
        await CommunityPostModel.deleteMany({ domain: testDomain._id });
        await MembershipModel.deleteMany({ domain: testDomain._id });
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
