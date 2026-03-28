/**
 * @jest-environment node
 */

import { createCommunityPost, deleteCommunityPost } from "../logic";
import CommunityModel from "@models/Community";
import CommunityPostModel from "@models/CommunityPost";
import CommunityCommentModel from "@models/CommunityComment";
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

jest.mock("nanoid", () => ({
    nanoid: () => Math.random().toString(36).substring(7),
}));
jest.unmock("@courselit/utils");

const SUITE_PREFIX = `dcp-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

describe("deleteCommunityPost", () => {
    let testDomain: any;
    let adminUser: any;
    let regularUser: any;
    let otherMemberUser: any;
    let community: any;
    let adminCtx: any;
    let regularCtx: any;
    let otherMemberCtx: any;

    let existingPost: any;

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

        otherMemberUser = await UserModel.create({
            domain: testDomain._id,
            userId: id("other"),
            email: email("other"),
            name: "Other User",
            permissions: [],
            active: true,
            unsubscribeToken: id("unsub-other"),
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

        // Other member membership (POST role)
        await MembershipModel.create({
            domain: testDomain._id,
            membershipId: id("other-membership"),
            userId: otherMemberUser.userId,
            entityId: community.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            paymentPlanId: id("free-plan"),
            sessionId: id("other-session"),
            status: Constants.MembershipStatus.ACTIVE,
            role: Constants.MembershipRole.POST,
        });

        adminCtx = { user: adminUser, subdomain: testDomain } as any;
        regularCtx = { user: regularUser, subdomain: testDomain } as any;
        otherMemberCtx = {
            user: otherMemberUser,
            subdomain: testDomain,
        } as any;
    });

    beforeEach(async () => {
        existingPost = await createCommunityPost({
            communityId: community.communityId,
            title: "Original Title",
            content: "Original Content",
            category: "General",
            ctx: regularCtx, // regularUser is the author
        });
    });

    afterEach(async () => {
        await CommunityPostModel.deleteMany({ domain: testDomain._id });
        await CommunityCommentModel.deleteMany({ domain: testDomain._id });
        await CommunityPostSubscriberModel.deleteMany({
            domain: testDomain._id,
        });
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await Promise.all([
            CommunityModel.deleteMany({ domain: testDomain._id }),
            CommunityPostModel.deleteMany({ domain: testDomain._id }),
            CommunityCommentModel.deleteMany({ domain: testDomain._id }),
            CommunityPostSubscriberModel.deleteMany({ domain: testDomain._id }),
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
                deleteCommunityPost({
                    communityId: community.communityId,
                    postId: existingPost.postId,
                    ctx: unauthCtx,
                }),
            ).rejects.toThrow();
        });

        it("should throw action_not_allowed if missing membership", async () => {
            const noMemberUser = await UserModel.create({
                domain: testDomain._id,
                userId: id("no-member-del"),
                email: email("no-member-del"),
                name: "No Member User",
                permissions: [],
                active: true,
                unsubscribeToken: id("unsub-no-member-del"),
            });

            const noMemberCtx = {
                user: noMemberUser,
                subdomain: testDomain,
            } as any;

            await expect(
                deleteCommunityPost({
                    communityId: community.communityId,
                    postId: existingPost.postId,
                    ctx: noMemberCtx,
                }),
            ).rejects.toThrow("Item not found");

            await UserModel.deleteOne({ _id: noMemberUser._id });
        });

        it("should throw item_not_found if a regular member tries to delete someone else's post", async () => {
            await expect(
                deleteCommunityPost({
                    communityId: community.communityId,
                    postId: existingPost.postId,
                    ctx: otherMemberCtx, // they are a member, but didn't write it
                }),
            ).rejects.toThrow("Item not found");
        });
    });

    describe("Successful Deletion", () => {
        it("should allow the author to delete their own post", async () => {
            await deleteCommunityPost({
                communityId: community.communityId,
                postId: existingPost.postId,
                ctx: regularCtx,
            });

            const dbPost = await CommunityPostModel.findOne({
                postId: existingPost.postId,
            });
            expect(dbPost).toBeNull();
        });

        it("should allow an admin (moderator) to delete someone else's post", async () => {
            await deleteCommunityPost({
                communityId: community.communityId,
                postId: existingPost.postId,
                ctx: adminCtx,
            });

            const dbPost = await CommunityPostModel.findOne({
                postId: existingPost.postId,
            });
            expect(dbPost).toBeNull();
        });

        it("should delete associated comments", async () => {
            await CommunityCommentModel.create({
                domain: testDomain._id,
                communityId: community.communityId,
                postId: existingPost.postId,
                commentId: "comment1",
                userId: regularUser.userId,
                content: "comment content",
            });

            await deleteCommunityPost({
                communityId: community.communityId,
                postId: existingPost.postId,
                ctx: regularCtx,
            });

            const dbComments = await CommunityCommentModel.find({
                postId: existingPost.postId,
            });
            expect(dbComments.length).toBe(0);
        });
    });

    describe("Media Handling", () => {
        it("should delete media but not fail if media deletion throws", async () => {
            const medialit = require("@/services/medialit");

            // Mock deleteMedia to simulate a transient storage failure
            medialit.deleteMedia.mockRejectedValue(new Error("Storage error"));

            // Manually add media to the post
            await CommunityPostModel.updateOne(
                { postId: existingPost.postId },
                {
                    $set: {
                        media: [
                            {
                                type: "image",
                                title: "pic",
                                url: "",
                                media: {
                                    mediaId: "media-to-delete",
                                    originalFileName: "p.jpg",
                                    mimeType: "image/jpeg",
                                    size: 10,
                                    access: "public",
                                    file: "p.jpg",
                                    thumbnail: "p.jpg",
                                } as any,
                            },
                        ],
                    },
                },
            );

            // Should not throw, even though deleteMedia rejected
            await deleteCommunityPost({
                communityId: community.communityId,
                postId: existingPost.postId,
                ctx: regularCtx,
            });

            expect(medialit.deleteMedia).toHaveBeenCalledWith(
                "media-to-delete",
            );

            // Post should be deleted regardless of deleteMedia failure
            const dbPost = await CommunityPostModel.findOne({
                postId: existingPost.postId,
            });
            expect(dbPost).toBeNull();
        });

        it("should successfully call deleteMedia if no error occurs", async () => {
            const medialit = require("@/services/medialit");
            medialit.deleteMedia.mockResolvedValue(true);

            await CommunityPostModel.updateOne(
                { postId: existingPost.postId },
                {
                    $set: {
                        media: [
                            {
                                type: "image",
                                title: "pic",
                                url: "",
                                media: {
                                    mediaId: "media-success",
                                    originalFileName: "p.jpg",
                                    mimeType: "image/jpeg",
                                    size: 10,
                                    access: "public",
                                    file: "p.jpg",
                                    thumbnail: "p.jpg",
                                } as any,
                            },
                        ],
                    },
                },
            );

            await deleteCommunityPost({
                communityId: community.communityId,
                postId: existingPost.postId,
                ctx: regularCtx,
            });

            expect(medialit.deleteMedia).toHaveBeenCalledWith("media-success");

            const dbPost = await CommunityPostModel.findOne({
                postId: existingPost.postId,
            });
            expect(dbPost).toBeNull();
        });
    });
});
