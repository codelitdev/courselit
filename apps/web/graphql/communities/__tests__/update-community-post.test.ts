/**
 * @jest-environment node
 */

import { createCommunityPost, updateCommunityPost } from "../logic";
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

jest.mock("nanoid", () => ({
    nanoid: () => Math.random().toString(36).substring(7),
}));
jest.unmock("@courselit/utils");

const SUITE_PREFIX = `ucp-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

describe("updateCommunityPost", () => {
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
        // Create a fresh post before each test so it's isolated
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
                updateCommunityPost({
                    communityId: community.communityId,
                    postId: existingPost.postId,
                    title: "Updated Title",
                    ctx: unauthCtx,
                }),
            ).rejects.toThrow();
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
                updateCommunityPost({
                    communityId: community.communityId,
                    postId: existingPost.postId,
                    title: "Updated Title",
                    ctx: noMemberCtx,
                }),
            ).rejects.toThrow("You do not have rights to perform this action");

            await UserModel.deleteOne({ _id: noMemberUser._id });
        });

        it("should throw action_not_allowed for another member attempting to edit", async () => {
            await expect(
                updateCommunityPost({
                    communityId: community.communityId,
                    postId: existingPost.postId,
                    title: "Updated Title",
                    ctx: otherMemberCtx,
                }),
            ).rejects.toThrow("You do not have rights to perform this action");
        });

        it("should throw invalid_category for a category not in the community", async () => {
            await expect(
                updateCommunityPost({
                    communityId: community.communityId,
                    postId: existingPost.postId,
                    category: "Nonexistent Category",
                    ctx: regularCtx,
                }),
            ).rejects.toThrow("Invalid category");
        });

        it("should throw item_not_found if the post is deleted", async () => {
            await CommunityPostModel.updateOne(
                { postId: existingPost.postId },
                { $set: { deleted: true } },
            );

            await expect(
                updateCommunityPost({
                    communityId: community.communityId,
                    postId: existingPost.postId,
                    title: "Updated",
                    ctx: regularCtx,
                }),
            ).rejects.toThrow("Item not found");
        });
    });

    describe("Successful Post Updates", () => {
        it("should update title, content, and category for the owner", async () => {
            const result = await updateCommunityPost({
                communityId: community.communityId,
                postId: existingPost.postId,
                title: "Updated Title",
                content: "Updated Content",
                category: "Announcements",
                ctx: regularCtx,
            });

            expect(result.title).toBe("Updated Title");
            expect(result.content).toBe("Updated Content");
            expect(result.category).toBe("Announcements");

            const dbPost = await CommunityPostModel.findOne({
                postId: existingPost.postId,
            });
            expect(dbPost!.title).toBe("Updated Title");
            expect(dbPost!.content).toBe("Updated Content");
            expect(dbPost!.category).toBe("Announcements");
        });

        it("should leave fields unchanged if not provided", async () => {
            const result = await updateCommunityPost({
                communityId: community.communityId,
                postId: existingPost.postId,
                title: "Only Title Changed",
                ctx: regularCtx,
            });

            expect(result.title).toBe("Only Title Changed");
            expect(result.content).toBe("Original Content");
            expect(result.category).toBe("General");

            // media undefined means do not touch media
            const dbPost = await CommunityPostModel.findOne({
                postId: existingPost.postId,
            });
            expect(dbPost!.media).toEqual([]);
        });
    });

    describe("Media Handling", () => {
        it("should call deleteMedia for removed media and sealMedia for newly added media", async () => {
            const medialit = require("@/services/medialit");
            medialit.sealMedia.mockResolvedValue({
                mediaId: "new-media",
                originalFileName: "new.jpg",
                file: "new.jpg",
                thumbnail: "new-thumb.jpg",
                mimeType: "image/jpeg",
                size: 1024,
                access: "public",
            });
            medialit.deleteMedia.mockResolvedValue(true);

            // First, update the post to have some initial media manually
            await CommunityPostModel.updateOne(
                { postId: existingPost.postId },
                {
                    $set: {
                        media: [
                            {
                                type: "image",
                                title: "old-pic",
                                url: "",
                                media: {
                                    mediaId: "old-media-1",
                                    originalFileName: "p.jpg",
                                    mimeType: "image/jpeg",
                                    size: 10,
                                    access: "public",
                                    file: "p.jpg",
                                    thumbnail: "p.jpg",
                                } as any,
                            },
                            {
                                type: "video",
                                title: "kept-vid",
                                url: "",
                                media: {
                                    mediaId: "old-media-2",
                                    originalFileName: "v.mp4",
                                    mimeType: "video/mp4",
                                    size: 10,
                                    access: "public",
                                    file: "v.mp4",
                                    thumbnail: "v.jpg",
                                } as any,
                            },
                        ],
                    },
                },
            );

            // Now perform update which removes old-media-1 and adds new-media
            await updateCommunityPost({
                communityId: community.communityId,
                postId: existingPost.postId,
                title: "Updated Media",
                media: [
                    {
                        type: "video",
                        title: "kept-vid",
                        url: "",
                        media: {
                            mediaId: "old-media-2",
                            originalFileName: "v.mp4",
                            mimeType: "video/mp4",
                            size: 10,
                            access: "public",
                            file: "v.mp4",
                            thumbnail: "v.jpg",
                        } as any,
                    },
                    {
                        type: "image",
                        title: "new-pic",
                        url: "",
                        media: {
                            mediaId: "new-media",
                            originalFileName: "n.jpg",
                            mimeType: "image/jpeg",
                            size: 10,
                            access: "public",
                            file: "n.jpg",
                            thumbnail: "n.jpg",
                        } as any,
                    },
                ],
                ctx: regularCtx,
            });

            // old-media-1 should be deleted
            expect(medialit.deleteMedia).toHaveBeenCalledWith("old-media-1");
            expect(medialit.deleteMedia).not.toHaveBeenCalledWith(
                "old-media-2",
            );

            // new-media should be sealed
            expect(medialit.sealMedia).toHaveBeenCalledWith("new-media");
            expect(medialit.sealMedia).not.toHaveBeenCalledWith("old-media-2");
        });

        it("should clear all media when providing an empty array", async () => {
            const medialit = require("@/services/medialit");

            // First, update the post to have some initial media manually
            await CommunityPostModel.updateOne(
                { postId: existingPost.postId },
                {
                    $set: {
                        media: [
                            {
                                type: "image",
                                title: "old-pic",
                                url: "",
                                media: {
                                    mediaId: "old-media-1",
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

            await updateCommunityPost({
                communityId: community.communityId,
                postId: existingPost.postId,
                media: [], // Empty array = clear media
                ctx: regularCtx,
            });

            expect(medialit.deleteMedia).toHaveBeenCalledWith("old-media-1");

            const dbPost = await CommunityPostModel.findOne({
                postId: existingPost.postId,
            });
            expect(dbPost!.media.length).toBe(0);
        });
    });
});
