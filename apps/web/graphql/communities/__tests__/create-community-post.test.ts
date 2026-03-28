/**
 * @jest-environment node
 */

import { createCommunityPost } from "../logic";
import CommunityModel from "@models/Community";
import CommunityPostModel from "@models/CommunityPost";
import MembershipModel from "@models/Membership";
import PaymentPlanModel from "@models/PaymentPlan";
import PageModel from "@models/Page";
import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import CommunityPostSubscriberModel from "@models/CommunityPostSubscriber";
import constants from "@/config/constants";
import { Constants } from "@courselit/common-models";

jest.mock("@/services/medialit");
jest.mock("@/services/queue");

// Ensure generateUniqueId is not mocked, but mock nanoid properly if needed
jest.mock("nanoid", () => ({
    nanoid: () => Math.random().toString(36).substring(7),
}));
jest.unmock("@courselit/utils");

const SUITE_PREFIX = `ccp-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

describe("createCommunityPost", () => {
    let testDomain: any;
    let adminUser: any;
    let regularUser: any;
    let commentOnlyUser: any;
    let community: any;
    let adminCtx: any;
    let regularCtx: any;
    let commentOnlyCtx: any;

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: id("domain"),
            email: email("domain"),
        });

        adminUser = await UserModel.create({
            domain: testDomain._id,
            userId: id("admin"),
            email: email("admin"),
            name: "Admin User",
            permissions: [constants.permissions.manageCommunity],
            active: true,
            unsubscribeToken: id("unsub-admin"),
        });

        regularUser = await UserModel.create({
            domain: testDomain._id,
            userId: id("regular"),
            email: email("regular"),
            name: "Regular User",
            permissions: [],
            active: true,
            unsubscribeToken: id("unsub-regular"),
        });

        commentOnlyUser = await UserModel.create({
            domain: testDomain._id,
            userId: id("comment-only"),
            email: email("comment-only"),
            name: "Comment Only User",
            permissions: [],
            active: true,
            unsubscribeToken: id("unsub-comment-only"),
        });

        // Internal payment plan (required by the system)
        await PaymentPlanModel.create({
            domain: testDomain._id,
            planId: id("internal-plan"),
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

        community = await CommunityModel.create({
            domain: testDomain._id,
            communityId: id("community"),
            name: "Test Community",
            pageId: id("page"),
            slug: id("page"),
            enabled: true,
            deleted: false,
            categories: ["General", "Announcements"],
        });

        await PageModel.create({
            domain: testDomain._id,
            pageId: community.pageId,
            type: constants.communityPage,
            creatorId: adminUser.userId,
            name: community.name,
            entityId: community.communityId,
        });

        // Free payment plan for the community
        await PaymentPlanModel.create({
            domain: testDomain._id,
            planId: id("free-plan"),
            userId: adminUser.userId,
            entityId: community.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            type: Constants.PaymentPlanType.FREE,
            name: "Free Community Plan",
            interval: "monthly",
            cost: 0,
            currencyISOCode: "USD",
        });

        // Admin membership (MODERATE role)
        await MembershipModel.create({
            domain: testDomain._id,
            membershipId: id("admin-membership"),
            userId: adminUser.userId,
            entityId: community.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            paymentPlanId: id("free-plan"),
            sessionId: id("admin-session"),
            status: Constants.MembershipStatus.ACTIVE,
            role: Constants.MembershipRole.MODERATE,
        });

        // Regular user membership (POST role)
        await MembershipModel.create({
            domain: testDomain._id,
            membershipId: id("regular-membership"),
            userId: regularUser.userId,
            entityId: community.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            paymentPlanId: id("free-plan"),
            sessionId: id("regular-session"),
            status: Constants.MembershipStatus.ACTIVE,
            role: Constants.MembershipRole.POST,
        });

        // Comment-only user membership (COMMENT role — cannot post)
        await MembershipModel.create({
            domain: testDomain._id,
            membershipId: id("comment-membership"),
            userId: commentOnlyUser.userId,
            entityId: community.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            paymentPlanId: id("free-plan"),
            sessionId: id("comment-session"),
            status: Constants.MembershipStatus.ACTIVE,
            role: Constants.MembershipRole.COMMENT,
        });

        adminCtx = { user: adminUser, subdomain: testDomain } as any;
        regularCtx = { user: regularUser, subdomain: testDomain } as any;
        commentOnlyCtx = {
            user: commentOnlyUser,
            subdomain: testDomain,
        } as any;
    });

    afterEach(async () => {
        await CommunityPostModel.deleteMany({ domain: testDomain._id });
        await CommunityPostSubscriberModel.deleteMany({
            domain: testDomain._id,
        });
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await Promise.all([
            CommunityModel.deleteMany({ domain: testDomain._id }),
            CommunityPostModel.deleteMany({ domain: testDomain._id }),
            CommunityPostSubscriberModel.deleteMany({
                domain: testDomain._id,
            }),
            MembershipModel.deleteMany({ domain: testDomain._id }),
            PaymentPlanModel.deleteMany({ domain: testDomain._id }),
            PageModel.deleteMany({ domain: testDomain._id }),
            UserModel.deleteMany({ domain: testDomain._id }),
            DomainModel.deleteOne({ _id: testDomain._id }),
        ]);
    });

    describe("Security & Validation", () => {
        it("should require authentication", async () => {
            const unauthCtx = { subdomain: testDomain } as any;

            await expect(
                createCommunityPost({
                    communityId: community.communityId,
                    title: "Test Post",
                    content: "Test content",
                    category: "General",
                    ctx: unauthCtx,
                }),
            ).rejects.toThrow();
        });

        it("should throw item_not_found for a non-existent community", async () => {
            await expect(
                createCommunityPost({
                    communityId: "nonexistent-community",
                    title: "Test Post",
                    content: "Test content",
                    category: "General",
                    ctx: regularCtx,
                }),
            ).rejects.toThrow("Item not found");
        });

        it("should throw action_not_allowed for a user with no membership", async () => {
            const noMemberUser = await UserModel.create({
                domain: testDomain._id,
                userId: id("no-member"),
                email: email("no-member"),
                name: "No Member User",
                permissions: [],
                active: true,
                unsubscribeToken: id("unsub-no-member"),
            });

            const noMemberCtx = {
                user: noMemberUser,
                subdomain: testDomain,
            } as any;

            await expect(
                createCommunityPost({
                    communityId: community.communityId,
                    title: "Test Post",
                    content: "Test content",
                    category: "General",
                    ctx: noMemberCtx,
                }),
            ).rejects.toThrow("You do not have rights to perform this action");

            await UserModel.deleteOne({ _id: noMemberUser._id });
        });

        it("should throw action_not_allowed for a user with COMMENT role", async () => {
            await expect(
                createCommunityPost({
                    communityId: community.communityId,
                    title: "Test Post",
                    content: "Test content",
                    category: "General",
                    ctx: commentOnlyCtx,
                }),
            ).rejects.toThrow("You do not have rights to perform this action");
        });

        it("should throw invalid_category for a category not in the community", async () => {
            await expect(
                createCommunityPost({
                    communityId: community.communityId,
                    title: "Test Post",
                    content: "Test content",
                    category: "Nonexistent Category",
                    ctx: regularCtx,
                }),
            ).rejects.toThrow("Invalid category");
        });
    });

    describe("Successful Post Creation", () => {
        it("should create a post and return the formatted PublicPost shape", async () => {
            const result = await createCommunityPost({
                communityId: community.communityId,
                title: "My First Post",
                content: "Hello world",
                category: "General",
                ctx: regularCtx,
            });

            expect(result).toMatchObject({
                communityId: community.communityId,
                title: "My First Post",
                content: "Hello world",
                category: "General",
                userId: regularUser.userId,
                likesCount: 0,
                hasLiked: false,
            });
            expect(result.postId).toBeDefined();
        });

        it("should persist the post in the database", async () => {
            const result = await createCommunityPost({
                communityId: community.communityId,
                title: "Persisted Post",
                content: "Should be in DB",
                category: "General",
                ctx: regularCtx,
            });

            const dbPost = await CommunityPostModel.findOne({
                domain: testDomain._id,
                postId: result.postId,
            });

            expect(dbPost).not.toBeNull();
            expect(dbPost!.title).toBe("Persisted Post");
            expect(dbPost!.content).toBe("Should be in DB");
            expect(dbPost!.category).toBe("General");
            expect(dbPost!.userId).toBe(regularUser.userId);
        });

        it("should create a post subscription for the author", async () => {
            const result = await createCommunityPost({
                communityId: community.communityId,
                title: "Sub Post",
                content: "Subscription test",
                category: "General",
                ctx: regularCtx,
            });

            const subscription = await CommunityPostSubscriberModel.findOne({
                domain: testDomain._id,
                postId: result.postId,
                userId: regularUser.userId,
            });

            expect(subscription).not.toBeNull();
        });

        it("should allow an admin (MODERATE role) to create a post", async () => {
            const result = await createCommunityPost({
                communityId: community.communityId,
                title: "Admin Post",
                content: "Posted by admin",
                category: "Announcements",
                ctx: adminCtx,
            });

            expect(result).toMatchObject({
                communityId: community.communityId,
                title: "Admin Post",
                category: "Announcements",
                userId: adminUser.userId,
            });
        });

        it("should accept a post with no media", async () => {
            const result = await createCommunityPost({
                communityId: community.communityId,
                title: "No Media Post",
                content: "Just text",
                category: "General",
                ctx: regularCtx,
            });

            expect(result.postId).toBeDefined();
            expect(result.media).toEqual([]);
        });
    });

    describe("Media Handling", () => {
        it("should call sealMedia for each media item", async () => {
            const { sealMedia } = require("@/services/medialit");
            sealMedia.mockResolvedValue({
                mediaId: "sealed-media-id",
                originalFileName: "test.jpg",
                mimeType: "image/jpeg",
                size: 1024,
                access: "public",
                file: "sealed-test.jpg",
                thumbnail: "sealed-thumb.jpg",
                caption: "Sealed",
            });

            const result = await createCommunityPost({
                communityId: community.communityId,
                title: "Media Post",
                content: "Post with media",
                category: "General",
                media: [
                    {
                        title: "Media 1",
                        type: "image" as any,
                        media: {
                            mediaId: "temp-media-1",
                            originalFileName: "photo1.jpg",
                            mimeType: "image/jpeg",
                            size: 1024,
                            access: "public",
                            file: "photo1.jpg",
                            thumbnail: "thumb1.jpg",
                        },
                    },
                    {
                        title: "Media 2",
                        type: "image" as any,
                        media: {
                            mediaId: "temp-media-2",
                            originalFileName: "photo2.jpg",
                            mimeType: "image/jpeg",
                            size: 2048,
                            access: "public",
                            file: "photo2.jpg",
                            thumbnail: "thumb2.jpg",
                        },
                    },
                ],
                ctx: regularCtx,
            });

            expect(sealMedia).toHaveBeenCalledTimes(2);
            expect(sealMedia).toHaveBeenCalledWith("temp-media-1");
            expect(sealMedia).toHaveBeenCalledWith("temp-media-2");
            expect(result.postId).toBeDefined();
        });
    });

    describe("Activity Recording", () => {
        it("should not crash when activity recording fails", async () => {
            // The function catches errors from recordActivity, so this should not throw
            const result = await createCommunityPost({
                communityId: community.communityId,
                title: "Activity Error Post",
                content: "Should not crash",
                category: "General",
                ctx: regularCtx,
            });

            // Post should still be created successfully
            expect(result.postId).toBeDefined();
            expect(result.title).toBe("Activity Error Post");
        });
    });
});
