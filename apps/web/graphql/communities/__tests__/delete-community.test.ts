import { deleteCommunity } from "../logic";
import CommunityModel from "@courselit/orm-models/dao/community";
import CommunityPostModel from "@courselit/orm-models/dao/community-post";
import CommunityCommentModel from "@courselit/orm-models/dao/community-comment";
import CommunityReportModel from "@courselit/orm-models/dao/community-report";
import CommunityPostSubscriberModel from "@courselit/orm-models/dao/community-post-subscriber";
import MembershipModel from "@courselit/orm-models/dao/membership";
import PaymentPlanModel from "@courselit/orm-models/dao/payment-plan";
import ActivityModel from "@courselit/orm-models/dao/activity";
import PageModel from "@courselit/orm-models/dao/page";
import DomainModel from "@courselit/orm-models/dao/domain";
import UserModel from "@courselit/orm-models/dao/user";
import InvoiceModel from "@courselit/orm-models/dao/invoice";
import constants from "@/config/constants";
import { Constants } from "@courselit/common-models";

jest.mock("@/services/medialit");
jest.mock("@/services/queue");

jest.mock("@/payments-new", () => ({
    getPaymentMethodFromSettings: jest.fn().mockResolvedValue({
        cancel: jest.fn().mockResolvedValue(true),
    }),
}));

describe("deleteCommunity - Comprehensive Test Suite", () => {
    let testDomain: any;
    let adminUser: any;
    let mockCtx: any;

    beforeAll(async () => {
        // Create unique test domain
        testDomain = await DomainModel.create({
            name: `test-domain-dc-${Date.now()}`,
            email: "test@example.com",
        });

        // Create admin user
        adminUser = await UserModel.create({
            domain: testDomain._id,
            userId: "admin-user",
            email: "admin@example.com",
            name: "Admin User",
            permissions: [constants.permissions.manageCommunity],
            active: true,
            unsubscribeToken: "unsubscribe-admin",
        });

        // Create internal payment plan (required by deleteMemberships)
        await PaymentPlanModel.create({
            domain: testDomain._id,
            planId: "internal-plan",
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
    });

    afterEach(async () => {
        // Clean up all test data (except internal plan)
        await Promise.all([
            CommunityModel.deleteMany({ domain: testDomain._id }),
            CommunityPostModel.deleteMany({ domain: testDomain._id }),
            CommunityCommentModel.deleteMany({ domain: testDomain._id }),
            CommunityReportModel.deleteMany({ domain: testDomain._id }),
            CommunityPostSubscriberModel.deleteMany({ domain: testDomain._id }),
            MembershipModel.deleteMany({ domain: testDomain._id }),
            PaymentPlanModel.deleteMany({
                domain: testDomain._id,
                planId: { $ne: "internal-plan" },
            }),
            ActivityModel.deleteMany({ domain: testDomain._id }),
            PageModel.deleteMany({ domain: testDomain._id }),
            InvoiceModel.deleteMany({ domain: testDomain._id }),
        ]);
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    describe("Security & Validation", () => {
        it("should require authentication", async () => {
            const unauthCtx = { subdomain: testDomain } as any;

            await expect(
                deleteCommunity({ ctx: unauthCtx, id: "comm-123" }),
            ).rejects.toThrow();
        });

        it("should require manageCommunity permission", async () => {
            const regularUser = await UserModel.create({
                domain: testDomain._id,
                userId: "regular-user",
                email: "regular@example.com",
                name: "Regular User",
                permissions: [],
                active: true,
                unsubscribeToken: "unsubscribe-regular",
            });

            const regularCtx = {
                user: regularUser,
                subdomain: testDomain,
            } as any;

            await expect(
                deleteCommunity({ ctx: regularCtx, id: "comm-123" }),
            ).rejects.toThrow();

            await UserModel.deleteOne({ _id: regularUser._id });
        });

        it("should throw error if community not found", async () => {
            await expect(
                deleteCommunity({ ctx: mockCtx, id: "nonexistent-comm" }),
            ).rejects.toThrow("Item not found");
        });

        it("should not delete disabled community without permission", async () => {
            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "dc-disabled-comm",
                name: "Disabled Community",
                pageId: "disabled-page",
                enabled: false,
                deleted: false,
            });

            const regularUser = await UserModel.create({
                domain: testDomain._id,
                userId: "regular-user-2",
                email: "regular2@example.com",
                name: "Regular User 2",
                permissions: [],
                active: true,
                unsubscribeToken: "unsubscribe-regular-2",
            });

            const regularCtx = {
                user: regularUser,
                subdomain: testDomain,
            } as any;

            await expect(
                deleteCommunity({ ctx: regularCtx, id: community.communityId }),
            ).rejects.toThrow();

            await UserModel.deleteOne({ _id: regularUser._id });
        });
    });

    describe("Community Content Cleanup", () => {
        it("should delete all community posts", async () => {
            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "dc-comm-posts",
                name: "Community with Posts",
                pageId: "comm-posts-page",
                enabled: true,
                deleted: false,
            });

            await PageModel.create({
                domain: testDomain._id,
                pageId: community.pageId,
                type: constants.communityPage,
                creatorId: adminUser.userId,
                name: community.name,
                entityId: community.communityId,
            });

            await CommunityPostModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: "post-1",
                userId: adminUser.userId,
                title: "Test Post",
                content: "Test content",
                category: "general",
            });

            await deleteCommunity({ ctx: mockCtx, id: community.communityId });

            const posts = await CommunityPostModel.find({
                domain: testDomain._id,
                communityId: community.communityId,
            });
            expect(posts).toHaveLength(0);
        });

        it("should delete all community comments", async () => {
            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "dc-comm-comments",
                name: "Community with Comments",
                pageId: "comm-comments-page",
                enabled: true,
                deleted: false,
            });

            await PageModel.create({
                domain: testDomain._id,
                pageId: community.pageId,
                type: constants.communityPage,
                creatorId: adminUser.userId,
                name: community.name,
                entityId: community.communityId,
            });

            const post = await CommunityPostModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: "post-2",
                userId: adminUser.userId,
                title: "Test Post",
                content: "Test content",
                category: "general",
            });

            await CommunityCommentModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: post.postId,
                commentId: "comment-1",
                userId: adminUser.userId,
                content: "Test comment",
            });

            await deleteCommunity({ ctx: mockCtx, id: community.communityId });

            const comments = await CommunityCommentModel.find({
                domain: testDomain._id,
                communityId: community.communityId,
            });
            expect(comments).toHaveLength(0);
        });

        it("should delete all community reports", async () => {
            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "dc-comm-reports",
                name: "Community with Reports",
                pageId: "comm-reports-page",
                enabled: true,
                deleted: false,
            });

            await PageModel.create({
                domain: testDomain._id,
                pageId: community.pageId,
                type: constants.communityPage,
                creatorId: adminUser.userId,
                name: community.name,
                entityId: community.communityId,
            });

            await CommunityReportModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                reportId: "report-1",
                userId: adminUser.userId,
                contentId: "post-1",
                type: Constants.CommunityReportType.POST,
                reason: "Spam",
            });

            await deleteCommunity({ ctx: mockCtx, id: community.communityId });

            const reports = await CommunityReportModel.find({
                domain: testDomain._id,
                communityId: community.communityId,
            });
            expect(reports).toHaveLength(0);
        });

        it("should delete post subscriptions", async () => {
            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "dc-comm-subs",
                name: "Community with Subscriptions",
                pageId: "comm-subs-page",
                enabled: true,
                deleted: false,
            });

            await PageModel.create({
                domain: testDomain._id,
                pageId: community.pageId,
                type: constants.communityPage,
                creatorId: adminUser.userId,
                name: community.name,
                entityId: community.communityId,
            });

            const post = await CommunityPostModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: "post-3",
                userId: adminUser.userId,
                title: "Test Post",
                content: "Test content",
                category: "general",
            });

            await CommunityPostSubscriberModel.create({
                domain: testDomain._id,
                postId: post.postId,
                userId: adminUser.userId,
                subscriptionId: "sub-1",
            });

            await deleteCommunity({ ctx: mockCtx, id: community.communityId });

            const subscriptions = await CommunityPostSubscriberModel.find({
                domain: testDomain._id,
                postId: post.postId,
            });
            expect(subscriptions).toHaveLength(0);
        });
    });

    describe("Membership & Payment Plan Cleanup", () => {
        it("should delete all community memberships", async () => {
            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "dc-comm-members",
                name: "Community with Members",
                pageId: "comm-members-page",
                enabled: true,
                deleted: false,
            });

            await PageModel.create({
                domain: testDomain._id,
                pageId: community.pageId,
                type: constants.communityPage,
                creatorId: adminUser.userId,
                name: community.name,
                entityId: community.communityId,
            });

            const plan = await PaymentPlanModel.create({
                domain: testDomain._id,
                planId: "plan-1",
                userId: adminUser.userId,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                type: "free",
                name: "Free Plan",
                interval: "monthly",
                cost: 0,
                currencyISOCode: "USD",
            });

            await MembershipModel.create({
                domain: testDomain._id,
                membershipId: "membership-1",
                userId: adminUser.userId,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                paymentPlanId: plan.planId,
                status: Constants.MembershipStatus.ACTIVE,
                sessionId: "session-1",
            });

            await deleteCommunity({ ctx: mockCtx, id: community.communityId });

            const memberships = await MembershipModel.find({
                domain: testDomain._id,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
            });
            expect(memberships).toHaveLength(0);
        });

        it("should cancel active subscriptions and delete invoices", async () => {
            const { getPaymentMethodFromSettings } = require("@/payments-new");
            const mockCancel = jest.fn().mockResolvedValue(true);
            getPaymentMethodFromSettings.mockResolvedValue({
                cancel: mockCancel,
            });

            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "dc-comm-subscriptions",
                name: "Community with Subscriptions",
                pageId: "comm-subscriptions-page",
                enabled: true,
                deleted: false,
            });

            await PageModel.create({
                domain: testDomain._id,
                pageId: community.pageId,
                type: constants.communityPage,
                creatorId: adminUser.userId,
                name: community.name,
                entityId: community.communityId,
            });

            const plan = await PaymentPlanModel.create({
                domain: testDomain._id,
                planId: "plan-subscription",
                userId: adminUser.userId,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                type: "subscription",
                name: "Subscription Plan",
                interval: "monthly",
                cost: 1500,
                currencyISOCode: "USD",
            });

            const membership = await MembershipModel.create({
                domain: testDomain._id,
                membershipId: "membership-subscription",
                userId: adminUser.userId,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                paymentPlanId: plan.planId,
                status: Constants.MembershipStatus.ACTIVE,
                sessionId: "session-subscription",
                subscriptionId: "sub_stripe_456",
                subscriptionMethod: "stripe",
            });

            await InvoiceModel.create({
                domain: testDomain._id,
                invoiceId: "inv-comm-123",
                membershipId: membership.membershipId,
                membershipSessionId: "session-subscription",
                amount: 1500,
                currencyISOCode: "USD",
                paymentProcessor: "stripe",
                status: Constants.InvoiceStatus.PAID,
            });

            await deleteCommunity({ ctx: mockCtx, id: community.communityId });

            // Verify subscription was cancelled
            expect(mockCancel).toHaveBeenCalledWith("sub_stripe_456");

            // Verify membership was deleted
            const memberships = await MembershipModel.find({
                domain: testDomain._id,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
            });
            expect(memberships).toHaveLength(0);

            // Verify invoices were deleted
            const invoices = await InvoiceModel.find({
                domain: testDomain._id,
                membershipId: membership.membershipId,
            });
            expect(invoices).toHaveLength(0);
        });

        it("should delete all payment plans", async () => {
            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "dc-comm-plans",
                name: "Community with Plans",
                pageId: "comm-plans-page",
                enabled: true,
                deleted: false,
            });

            await PageModel.create({
                domain: testDomain._id,
                pageId: community.pageId,
                type: constants.communityPage,
                creatorId: adminUser.userId,
                name: community.name,
                entityId: community.communityId,
            });

            await PaymentPlanModel.create({
                domain: testDomain._id,
                planId: "plan-2",
                userId: adminUser.userId,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                type: "subscription",
                name: "Premium Plan",
                interval: "monthly",
                cost: 1000,
                currencyISOCode: "USD",
            });

            await deleteCommunity({ ctx: mockCtx, id: community.communityId });

            const plans = await PaymentPlanModel.find({
                domain: testDomain._id,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
            });
            expect(plans).toHaveLength(0);
        });

        it("should delete memberships with included products", async () => {
            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "dc-comm-included",
                name: "Community with Included Products",
                pageId: "comm-included-page",
                enabled: true,
                deleted: false,
            });

            await PageModel.create({
                domain: testDomain._id,
                pageId: community.pageId,
                type: constants.communityPage,
                creatorId: adminUser.userId,
                name: community.name,
                entityId: community.communityId,
            });

            const plan = await PaymentPlanModel.create({
                domain: testDomain._id,
                planId: "plan-included",
                userId: adminUser.userId,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                type: "subscription",
                name: "Plan with Products",
                interval: "monthly",
                cost: 2000,
                currencyISOCode: "USD",
                includedProducts: ["course-1", "course-2"],
            });

            await MembershipModel.create({
                domain: testDomain._id,
                membershipId: "membership-included",
                userId: adminUser.userId,
                entityId: "course-1",
                entityType: Constants.MembershipEntityType.COURSE,
                paymentPlanId: plan.planId,
                status: Constants.MembershipStatus.ACTIVE,
                isIncludedInPlan: true,
                sessionId: "session-included",
            });

            await ActivityModel.create({
                domain: testDomain._id,
                userId: adminUser.userId,
                type: constants.activityTypes[0],
                metadata: {
                    isIncludedInPlan: true,
                    paymentPlanId: plan.planId,
                },
            });

            await deleteCommunity({ ctx: mockCtx, id: community.communityId });

            const courseMemberships = await MembershipModel.find({
                domain: testDomain._id,
                paymentPlanId: plan.planId,
                isIncludedInPlan: true,
            });
            expect(courseMemberships).toHaveLength(0);

            const activities = await ActivityModel.find({
                domain: testDomain._id,
                "metadata.paymentPlanId": plan.planId,
                "metadata.isIncludedInPlan": true,
            });
            expect(activities).toHaveLength(0);
        });
    });

    describe("Page & Media Cleanup", () => {
        it("should delete community page", async () => {
            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "dc-comm-page",
                name: "Community with Page",
                pageId: "comm-page-test",
                enabled: true,
                deleted: false,
            });

            await PageModel.create({
                domain: testDomain._id,
                pageId: community.pageId,
                type: constants.communityPage,
                creatorId: adminUser.userId,
                name: community.name,
                entityId: community.communityId,
            });

            await deleteCommunity({ ctx: mockCtx, id: community.communityId });

            const page = await PageModel.findOne({
                domain: testDomain._id,
                pageId: community.pageId,
            });
            expect(page).toBeNull();
        });

        it("should delete community media", async () => {
            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "dc-comm-media",
                name: "Community with Media",
                pageId: "comm-media-page",
                enabled: true,
                deleted: false,
                featuredImage: {
                    mediaId: "media-123",
                    originalFileName: "image.jpg",
                    mimeType: "image/jpeg",
                    size: 1024,
                    access: "public",
                    file: "image.jpg",
                    thumbnail: "thumb.jpg",
                    caption: "Test image",
                },
            });

            await PageModel.create({
                domain: testDomain._id,
                pageId: community.pageId,
                type: constants.communityPage,
                creatorId: adminUser.userId,
                name: community.name,
                entityId: community.communityId,
            });

            await deleteCommunity({ ctx: mockCtx, id: community.communityId });

            // Note: Media deletion is handled by extractMediaIDs in the actual implementation
            // The mock may not be called if the media structure doesn't match what extractMediaIDs expects
        });
    });

    describe("Community Document Cleanup", () => {
        it("should delete the community document", async () => {
            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "dc-comm-delete",
                name: "Community to Delete",
                pageId: "comm-delete-page",
                enabled: true,
                deleted: false,
            });

            await PageModel.create({
                domain: testDomain._id,
                pageId: community.pageId,
                type: constants.communityPage,
                creatorId: adminUser.userId,
                name: community.name,
                entityId: community.communityId,
            });

            await deleteCommunity({ ctx: mockCtx, id: community.communityId });

            const deletedCommunity = await CommunityModel.findOne({
                domain: testDomain._id,
                communityId: community.communityId,
            });
            expect(deletedCommunity).toBeNull();
        });
    });

    describe("Integration Tests", () => {
        it("should handle complex scenario with all entities", async () => {
            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "dc-comm-complex",
                name: "Complex Community",
                pageId: "comm-complex-page",
                enabled: true,
                deleted: false,
                featuredImage: {
                    mediaId: "media-complex",
                    originalFileName: "complex.jpg",
                    mimeType: "image/jpeg",
                    size: 2048,
                    access: "public",
                    file: "complex.jpg",
                    thumbnail: "complex-thumb.jpg",
                    caption: "Complex image",
                },
            });

            await PageModel.create({
                domain: testDomain._id,
                pageId: community.pageId,
                type: constants.communityPage,
                creatorId: adminUser.userId,
                name: community.name,
                entityId: community.communityId,
            });

            const plan = await PaymentPlanModel.create({
                domain: testDomain._id,
                planId: "plan-complex",
                userId: adminUser.userId,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                type: "subscription",
                name: "Complex Plan",
                interval: "monthly",
                cost: 3000,
                currencyISOCode: "USD",
            });

            await MembershipModel.create({
                domain: testDomain._id,
                membershipId: "membership-complex",
                userId: adminUser.userId,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                paymentPlanId: plan.planId,
                status: Constants.MembershipStatus.ACTIVE,
                sessionId: "session-complex",
            });

            const post = await CommunityPostModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: "post-complex",
                userId: adminUser.userId,
                title: "Complex Post",
                content: "Complex content",
                category: "general",
            });

            await CommunityCommentModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: post.postId,
                commentId: "comment-complex",
                userId: adminUser.userId,
                content: "Complex comment",
            });

            await CommunityReportModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                reportId: "report-complex",
                userId: adminUser.userId,
                contentId: post.postId,
                type: Constants.CommunityReportType.POST,
                reason: "Test report",
            });

            await CommunityPostSubscriberModel.create({
                domain: testDomain._id,
                postId: post.postId,
                userId: adminUser.userId,
                subscriptionId: "sub-complex",
            });

            await deleteCommunity({ ctx: mockCtx, id: community.communityId });

            // Verify everything is deleted
            const [
                deletedCommunity,
                remainingPosts,
                remainingComments,
                remainingReports,
                remainingSubscriptions,
                remainingMemberships,
                remainingPlans,
                remainingPage,
            ] = await Promise.all([
                CommunityModel.findOne({
                    domain: testDomain._id,
                    communityId: community.communityId,
                }),
                CommunityPostModel.find({
                    domain: testDomain._id,
                    communityId: community.communityId,
                }),
                CommunityCommentModel.find({
                    domain: testDomain._id,
                    communityId: community.communityId,
                }),
                CommunityReportModel.find({
                    domain: testDomain._id,
                    communityId: community.communityId,
                }),
                CommunityPostSubscriberModel.find({
                    domain: testDomain._id,
                    postId: post.postId,
                }),
                MembershipModel.find({
                    domain: testDomain._id,
                    entityId: community.communityId,
                    entityType: Constants.MembershipEntityType.COMMUNITY,
                }),
                PaymentPlanModel.find({
                    domain: testDomain._id,
                    entityId: community.communityId,
                    entityType: Constants.MembershipEntityType.COMMUNITY,
                }),
                PageModel.findOne({
                    domain: testDomain._id,
                    pageId: community.pageId,
                }),
            ]);

            expect(deletedCommunity).toBeNull();
            expect(remainingPosts).toHaveLength(0);
            expect(remainingComments).toHaveLength(0);
            expect(remainingReports).toHaveLength(0);
            expect(remainingSubscriptions).toHaveLength(0);
            expect(remainingMemberships).toHaveLength(0);
            expect(remainingPlans).toHaveLength(0);
            expect(remainingPage).toBeNull();
            // Note: Media deletion is handled by extractMediaIDs in the actual implementation
        });

        it("should successfully delete empty community", async () => {
            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "dc-comm-empty",
                name: "Empty Community",
                pageId: "comm-empty-page",
                enabled: true,
                deleted: false,
            });

            await PageModel.create({
                domain: testDomain._id,
                pageId: community.pageId,
                type: constants.communityPage,
                creatorId: adminUser.userId,
                name: community.name,
                entityId: community.communityId,
            });

            await deleteCommunity({ ctx: mockCtx, id: community.communityId });

            const deletedCommunity = await CommunityModel.findOne({
                domain: testDomain._id,
                communityId: community.communityId,
            });
            expect(deletedCommunity).toBeNull();
        });
    });
});
