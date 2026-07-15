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
    togglePostReaction,
    toggleCommentReaction,
    toggleCommentReplyReaction,
    getReactionsForEntity,
    deleteCommunityPost,
    deleteCommunityPosts,
    deleteComment,
} from "../logic";
import CommunityModel from "@models/Community";
import CommunityPostModel from "@models/CommunityPost";
import CommunityCommentModel from "@models/CommunityComment";
import CommunityReactionModel from "@models/CommunityReaction";
import CommunityReportModel from "@models/CommunityReport";
import MembershipModel from "@models/Membership";
import PaymentPlanModel from "@models/PaymentPlan";
import PageModel from "@models/Page";
import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import constants from "@/config/constants";
import {
    COMMUNITY_HEART_EMOJI,
    Constants,
    TextEditorContent,
} from "@courselit/common-models";

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
                        reactions: {},
                        deleted: false,
                    },
                    {
                        replyId: "reply-2",
                        userId: regularUser.userId,
                        content: "Second reply",
                        reactions: {},
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
                        reactions: {},
                        deleted: false,
                    },
                    {
                        replyId: "reply-1-2",
                        userId: regularUser.userId,
                        content: "Another reply to first",
                        reactions: {},
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
                        reactions: {},
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
                        reactions: {},
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
        await CommunityReactionModel.deleteMany({ domain: testDomain._id });
        await CommunityCommentModel.deleteMany({ domain: testDomain._id });
        await CommunityPostModel.deleteMany({ domain: testDomain._id });
        await MembershipModel.deleteMany({
            domain: testDomain._id,
            entityType: Constants.MembershipEntityType.COMMUNITY,
        });
    });

    afterAll(async () => {
        await CommunityReactionModel.deleteMany({ domain: testDomain._id });
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
                deleted: false,
                updatedAt: new Date("2026-02-01T00:00:00.000Z"),
            },
        ]);

        await togglePostReaction({
            ctx: mockCtx,
            communityId: communityTwo.communityId,
            postId: "feed-post-2",
            emoji: COMMUNITY_HEART_EMOJI,
        });

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
            reactions: {},
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

describe("Community Logic - Reactions", () => {
    let testDomain: any;
    let adminUser: any;
    let regularUser: any;
    let community: any;
    let post: any;
    let adminCtx: any;
    let regularCtx: any;

    beforeAll(async () => {
        const suffix = `rxn-${Date.now()}`;
        testDomain = await DomainModel.create({
            name: `test-domain-${suffix}`,
            email: `rxn-${suffix}@example.com`,
        });

        adminUser = await UserModel.create({
            domain: testDomain._id,
            userId: `admin-${suffix}`,
            email: `admin-${suffix}@example.com`,
            name: "Admin User",
            permissions: [constants.permissions.manageCommunity],
            active: true,
            unsubscribeToken: `unsub-admin-${suffix}`,
        });

        regularUser = await UserModel.create({
            domain: testDomain._id,
            userId: `regular-${suffix}`,
            email: `regular-${suffix}@example.com`,
            name: "Regular User",
            permissions: [],
            active: true,
            unsubscribeToken: `unsub-regular-${suffix}`,
        });

        await PaymentPlanModel.create({
            domain: testDomain._id,
            planId: `plan-${suffix}`,
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

        await PageModel.create({
            domain: testDomain._id,
            pageId: `page-${suffix}`,
            type: constants.communityPage,
            name: "Community Page",
            entityId: `comm-${suffix}`,
            layout: [],
            creatorId: adminUser.userId,
        });

        community = await CommunityModel.create({
            domain: testDomain._id,
            communityId: `comm-${suffix}`,
            name: "Reactions Community",
            pageId: `page-${suffix}`,
            slug: `comm-${suffix}`,
            enabled: true,
            categories: ["General"],
            autoAcceptMembers: true,
        });

        await MembershipModel.create([
            {
                domain: testDomain._id,
                membershipId: `mem-admin-${suffix}`,
                userId: adminUser.userId,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                paymentPlanId: `plan-${suffix}`,
                sessionId: `session-admin-${suffix}`,
                status: Constants.MembershipStatus.ACTIVE,
                role: Constants.MembershipRole.MODERATE,
            },
            {
                domain: testDomain._id,
                membershipId: `mem-regular-${suffix}`,
                userId: regularUser.userId,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                paymentPlanId: `plan-${suffix}`,
                sessionId: `session-regular-${suffix}`,
                status: Constants.MembershipStatus.ACTIVE,
                role: Constants.MembershipRole.POST,
            },
        ]);

        post = await CommunityPostModel.create({
            domain: testDomain._id,
            userId: adminUser.userId,
            communityId: community.communityId,
            postId: `post-${suffix}`,
            title: "Reaction post",
            content: doc("React to me"),
            category: "General",
            reactions: {},
            deleted: false,
        });

        adminCtx = { user: adminUser, subdomain: testDomain } as any;
        regularCtx = { user: regularUser, subdomain: testDomain } as any;
    });

    afterAll(async () => {
        await CommunityReactionModel.deleteMany({ domain: testDomain._id });
        await CommunityPostModel.deleteMany({ domain: testDomain._id });
        await CommunityCommentModel.deleteMany({ domain: testDomain._id });
        await MembershipModel.deleteMany({ domain: testDomain._id });
        await CommunityModel.deleteMany({ domain: testDomain._id });
        await PageModel.deleteMany({ domain: testDomain._id });
        await PaymentPlanModel.deleteMany({ domain: testDomain._id });
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteMany({ _id: testDomain._id });
    });

    it("toggles a post reaction and reports hasReacted / count", async () => {
        const reacted = await togglePostReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: post.postId,
            emoji: "👍",
        });

        expect(reacted.likesCount).toBe(0);
        expect(reacted.hasLiked).toBe(false);

        const reactions = await getReactionsForEntity({
            entity: reacted,
            ctx: regularCtx,
        });
        const thumbs = reactions.find((r) => r.emoji === "👍");
        expect(thumbs).toMatchObject({
            emoji: "👍",
            count: 1,
            hasReacted: true,
        });
        expect(thumbs?.reactors.map((r) => r.userId)).toContain(
            regularUser.userId,
        );

        const unreacted = await togglePostReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: post.postId,
            emoji: "👍",
        });
        const after = await getReactionsForEntity({
            entity: unreacted,
            ctx: regularCtx,
        });
        expect(after.find((r) => r.emoji === "👍")).toBeUndefined();
    });

    it("derives likesCount/hasLiked from the heart reaction", async () => {
        const liked = await togglePostReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: post.postId,
            emoji: COMMUNITY_HEART_EMOJI,
        });

        expect(liked.hasLiked).toBe(true);
        expect(liked.likesCount).toBe(1);

        const reactions = await getReactionsForEntity({
            entity: liked,
            ctx: regularCtx,
        });
        const heart = reactions.find((r) => r.emoji === COMMUNITY_HEART_EMOJI);
        expect(heart?.count).toBe(1);
        expect(heart?.hasReacted).toBe(true);

        await togglePostReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: post.postId,
            emoji: COMMUNITY_HEART_EMOJI,
        });
    });

    it("allows multiple different emojis from the same user", async () => {
        await togglePostReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: post.postId,
            emoji: COMMUNITY_HEART_EMOJI,
        });
        await togglePostReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: post.postId,
            emoji: "🎉",
        });

        const rows = await CommunityReactionModel.find({
            domain: testDomain._id,
            entityType: Constants.CommunityReactionEntityType.POST,
            entityId: post.postId,
            userId: regularUser.userId,
        }).lean();
        const emojis = rows.map((r) => r.emoji).sort();
        expect(emojis).toEqual(["🎉", COMMUNITY_HEART_EMOJI].sort());

        // cleanup
        await togglePostReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: post.postId,
            emoji: COMMUNITY_HEART_EMOJI,
        });
        await togglePostReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: post.postId,
            emoji: "🎉",
        });
    });

    it("rejects disallowed emojis", async () => {
        await expect(
            togglePostReaction({
                ctx: regularCtx,
                communityId: community.communityId,
                postId: post.postId,
                emoji: "🚀",
            }),
        ).rejects.toThrow("Invalid input");
    });

    it("toggles comment and reply reactions", async () => {
        const comment = await CommunityCommentModel.create({
            domain: testDomain._id,
            communityId: community.communityId,
            postId: post.postId,
            commentId: `comment-rxn-${Date.now()}`,
            userId: adminUser.userId,
            content: "Comment body",
            replies: [
                {
                    replyId: `reply-rxn-${Date.now()}`,
                    userId: adminUser.userId,
                    content: "Reply body",
                    deleted: false,
                },
            ],
        });

        const afterComment = await toggleCommentReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: post.postId,
            commentId: comment.commentId,
            emoji: "😄",
        });
        expect(afterComment.likesCount).toBe(0);
        const commentReactions = await getReactionsForEntity({
            entity: afterComment,
            ctx: regularCtx,
        });
        expect(commentReactions.find((r) => r.emoji === "😄")?.count).toBe(1);

        const replyId = comment.replies[0].replyId;
        const afterReply = await toggleCommentReplyReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: post.postId,
            commentId: comment.commentId,
            replyId,
            emoji: COMMUNITY_HEART_EMOJI,
        });
        const reply = afterReply.replies.find(
            (r: any) => r.replyId === replyId,
        );
        expect(reply?.likesCount).toBe(1);
        expect(reply?.hasLiked).toBe(true);

        const replyReactions = await getReactionsForEntity({
            entity: reply,
            ctx: regularCtx,
        });
        expect(
            replyReactions.find((r) => r.emoji === COMMUNITY_HEART_EMOJI)
                ?.hasReacted,
        ).toBe(true);

        // Critical: reply reactions live in the collection and survive re-format
        const dbRows = await CommunityReactionModel.find({
            domain: testDomain._id,
            entityType: Constants.CommunityReactionEntityType.REPLY,
            entityId: replyId,
        }).lean();
        expect(dbRows.map((r) => r.userId)).toContain(regularUser.userId);
        expect(dbRows.map((r) => r.emoji)).toContain(COMMUNITY_HEART_EMOJI);

        // Toggle off and confirm row is gone
        await toggleCommentReplyReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: post.postId,
            commentId: comment.commentId,
            replyId,
            emoji: COMMUNITY_HEART_EMOJI,
        });
        const afterOff = await CommunityReactionModel.find({
            domain: testDomain._id,
            entityType: Constants.CommunityReactionEntityType.REPLY,
            entityId: replyId,
            emoji: COMMUNITY_HEART_EMOJI,
        });
        expect(afterOff).toHaveLength(0);
    });

    it("rejects unauthenticated reaction toggles", async () => {
        const unauthCtx = { user: null, subdomain: testDomain } as any;
        await expect(
            togglePostReaction({
                ctx: unauthCtx,
                communityId: community.communityId,
                postId: post.postId,
                emoji: "👍",
            }),
        ).rejects.toThrow();
    });

    it("rejects reaction when user is not a community member", async () => {
        const outsider = await UserModel.create({
            domain: testDomain._id,
            userId: `outsider-${Date.now()}`,
            email: `outsider-${Date.now()}@example.com`,
            name: "Outsider",
            permissions: [],
            active: true,
            unsubscribeToken: `unsub-out-${Date.now()}`,
        });
        const outsiderCtx = { user: outsider, subdomain: testDomain } as any;

        await expect(
            togglePostReaction({
                ctx: outsiderCtx,
                communityId: community.communityId,
                postId: post.postId,
                emoji: "👍",
            }),
        ).rejects.toThrow();
    });

    it("rejects comment reaction when membership is COMMENT-ineligible", async () => {
        // Create a user with no membership at all for comment path
        const stranger = await UserModel.create({
            domain: testDomain._id,
            userId: `stranger-${Date.now()}`,
            email: `stranger-${Date.now()}@example.com`,
            name: "Stranger",
            permissions: [],
            active: true,
            unsubscribeToken: `unsub-str-${Date.now()}`,
        });
        const strangerCtx = { user: stranger, subdomain: testDomain } as any;

        const comment = await CommunityCommentModel.create({
            domain: testDomain._id,
            communityId: community.communityId,
            postId: post.postId,
            commentId: `comment-auth-${Date.now()}`,
            userId: adminUser.userId,
            content: "Auth check",
            replies: [],
        });

        await expect(
            toggleCommentReaction({
                ctx: strangerCtx,
                communityId: community.communityId,
                postId: post.postId,
                commentId: comment.commentId,
                emoji: "👍",
            }),
        ).rejects.toThrow();
    });

    it("rejects reaction on missing post / comment / reply", async () => {
        await expect(
            togglePostReaction({
                ctx: regularCtx,
                communityId: community.communityId,
                postId: "does-not-exist",
                emoji: "👍",
            }),
        ).rejects.toThrow();

        await expect(
            toggleCommentReaction({
                ctx: regularCtx,
                communityId: community.communityId,
                postId: post.postId,
                commentId: "missing-comment",
                emoji: "👍",
            }),
        ).rejects.toThrow();

        const comment = await CommunityCommentModel.create({
            domain: testDomain._id,
            communityId: community.communityId,
            postId: post.postId,
            commentId: `comment-missing-reply-${Date.now()}`,
            userId: adminUser.userId,
            content: "Has no reply",
            replies: [],
        });

        await expect(
            toggleCommentReplyReaction({
                ctx: regularCtx,
                communityId: community.communityId,
                postId: post.postId,
                commentId: comment.commentId,
                replyId: "missing-reply",
                emoji: "👍",
            }),
        ).rejects.toThrow();
    });

    it("deletes reaction rows when a post is deleted", async () => {
        const doomedPost = await CommunityPostModel.create({
            domain: testDomain._id,
            userId: adminUser.userId,
            communityId: community.communityId,
            postId: `post-doom-${Date.now()}`,
            title: "Doomed",
            content: doc("bye"),
            category: "General",
            deleted: false,
        });

        await togglePostReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: doomedPost.postId,
            emoji: "👍",
        });

        const comment = await CommunityCommentModel.create({
            domain: testDomain._id,
            communityId: community.communityId,
            postId: doomedPost.postId,
            commentId: `comment-doom-${Date.now()}`,
            userId: adminUser.userId,
            content: "on doomed post",
            replies: [
                {
                    replyId: `reply-doom-${Date.now()}`,
                    userId: adminUser.userId,
                    content: "reply",
                    deleted: false,
                },
            ],
        });

        await toggleCommentReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: doomedPost.postId,
            commentId: comment.commentId,
            emoji: "😄",
        });
        await toggleCommentReplyReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: doomedPost.postId,
            commentId: comment.commentId,
            replyId: comment.replies[0].replyId,
            emoji: COMMUNITY_HEART_EMOJI,
        });

        const before = await CommunityReactionModel.countDocuments({
            domain: testDomain._id,
            postId: doomedPost.postId,
        });
        expect(before).toBeGreaterThanOrEqual(3);

        await deleteCommunityPost({
            ctx: adminCtx,
            communityId: community.communityId,
            postId: doomedPost.postId,
        });

        const after = await CommunityReactionModel.countDocuments({
            domain: testDomain._id,
            postId: doomedPost.postId,
        });
        expect(after).toBe(0);
    });

    it("purges reaction rows when a leaf comment is hard-deleted", async () => {
        const leaf = await CommunityCommentModel.create({
            domain: testDomain._id,
            communityId: community.communityId,
            postId: post.postId,
            commentId: `comment-leaf-${Date.now()}`,
            userId: adminUser.userId,
            content: "Leaf comment",
            replies: [],
        });

        await toggleCommentReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: post.postId,
            commentId: leaf.commentId,
            emoji: "👍",
        });

        expect(
            await CommunityReactionModel.countDocuments({
                domain: testDomain._id,
                entityType: Constants.CommunityReactionEntityType.COMMENT,
                entityId: leaf.commentId,
            }),
        ).toBe(1);

        await deleteComment({
            ctx: adminCtx,
            communityId: community.communityId,
            postId: post.postId,
            commentId: leaf.commentId,
        });

        expect(
            await CommunityReactionModel.countDocuments({
                domain: testDomain._id,
                entityType: Constants.CommunityReactionEntityType.COMMENT,
                entityId: leaf.commentId,
            }),
        ).toBe(0);
    });

    it("purges reaction rows when a leaf reply is hard-deleted", async () => {
        const replyId = `reply-leaf-${Date.now()}`;
        const parent = await CommunityCommentModel.create({
            domain: testDomain._id,
            communityId: community.communityId,
            postId: post.postId,
            commentId: `comment-parent-${Date.now()}`,
            userId: adminUser.userId,
            content: "Parent",
            replies: [
                {
                    replyId,
                    userId: adminUser.userId,
                    content: "Leaf reply",
                    deleted: false,
                },
            ],
        });

        await toggleCommentReplyReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: post.postId,
            commentId: parent.commentId,
            replyId,
            emoji: "🎉",
        });

        expect(
            await CommunityReactionModel.countDocuments({
                domain: testDomain._id,
                entityType: Constants.CommunityReactionEntityType.REPLY,
                entityId: replyId,
            }),
        ).toBe(1);

        await deleteComment({
            ctx: adminCtx,
            communityId: community.communityId,
            postId: post.postId,
            commentId: parent.commentId,
            replyId,
        });

        expect(
            await CommunityReactionModel.countDocuments({
                domain: testDomain._id,
                entityType: Constants.CommunityReactionEntityType.REPLY,
                entityId: replyId,
            }),
        ).toBe(0);
    });

    it("keeps reaction rows when a comment is soft-deleted", async () => {
        const replyId = `reply-soft-${Date.now()}`;
        const soft = await CommunityCommentModel.create({
            domain: testDomain._id,
            communityId: community.communityId,
            postId: post.postId,
            commentId: `comment-soft-${Date.now()}`,
            userId: adminUser.userId,
            content: "Soft delete me",
            replies: [
                {
                    replyId,
                    userId: adminUser.userId,
                    content: "child",
                    deleted: false,
                },
            ],
        });

        await toggleCommentReaction({
            ctx: regularCtx,
            communityId: community.communityId,
            postId: post.postId,
            commentId: soft.commentId,
            emoji: "😢",
        });

        await deleteComment({
            ctx: adminCtx,
            communityId: community.communityId,
            postId: post.postId,
            commentId: soft.commentId,
        });

        // Soft-deleted: document remains, reactions retained
        const stillThere = await CommunityCommentModel.findOne({
            commentId: soft.commentId,
        });
        expect(stillThere?.deleted).toBe(true);
        expect(
            await CommunityReactionModel.countDocuments({
                domain: testDomain._id,
                entityType: Constants.CommunityReactionEntityType.COMMENT,
                entityId: soft.commentId,
            }),
        ).toBe(1);
    });

    it("deletes reaction rows when community posts are bulk-deleted", async () => {
        const bulkCommunityId = `comm-bulk-${Date.now()}`;
        await CommunityModel.create({
            domain: testDomain._id,
            communityId: bulkCommunityId,
            name: "Bulk delete community",
            pageId: `page-bulk-${Date.now()}`,
            slug: `slug-bulk-${Date.now()}`,
            enabled: true,
            categories: ["General"],
            autoAcceptMembers: true,
        });
        await MembershipModel.create({
            domain: testDomain._id,
            membershipId: `mem-bulk-${Date.now()}`,
            userId: regularUser.userId,
            entityId: bulkCommunityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            paymentPlanId: `plan-bulk`,
            sessionId: `session-bulk`,
            status: Constants.MembershipStatus.ACTIVE,
            role: Constants.MembershipRole.POST,
        });

        const bulkPost = await CommunityPostModel.create({
            domain: testDomain._id,
            userId: adminUser.userId,
            communityId: bulkCommunityId,
            postId: `post-bulk-${Date.now()}`,
            title: "Bulk doomed",
            content: doc("bulk"),
            category: "General",
            deleted: false,
        });

        await togglePostReaction({
            ctx: regularCtx,
            communityId: bulkCommunityId,
            postId: bulkPost.postId,
            emoji: "🎉",
        });

        expect(
            await CommunityReactionModel.countDocuments({
                domain: testDomain._id,
                postId: bulkPost.postId,
            }),
        ).toBe(1);

        await deleteCommunityPosts(adminCtx, "community", bulkCommunityId);

        expect(
            await CommunityReactionModel.countDocuments({
                domain: testDomain._id,
                communityId: bulkCommunityId,
            }),
        ).toBe(0);
    });
});
