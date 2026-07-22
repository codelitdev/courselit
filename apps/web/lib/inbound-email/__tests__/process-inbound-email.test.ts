/**
 * @jest-environment node
 */

import {
    Constants,
    type ProductDiscussionEntityType,
} from "@courselit/common-models";
import { normalizeTextEditorContent } from "@courselit/utils";
import { processInboundEmail } from "@/lib/inbound-email/process-inbound-email";
import CommunityModel from "@models/Community";
import CommunityCommentModel from "@models/CommunityComment";
import CommunityPostModel from "@models/CommunityPost";
import CommunityPostSubscriberModel from "@models/CommunityPostSubscriber";
import DomainModel from "@models/Domain";
import InboundEmailReceiptModel from "@models/InboundEmailReceipt";
import EmailReplyTokenModel from "@models/EmailReplyToken";
import MembershipModel from "@models/Membership";
import RateLimitEventModel from "@models/RateLimitEvent";
import UserModel from "@models/User";
import { createDiscussionReply } from "@/graphql/product-discussions/logic";

jest.mock("@/services/queue");
jest.mock("@/graphql/product-discussions/logic", () => ({
    createDiscussionReply: jest.fn(),
}));

const replyToken = "test-inbound-reply-token";

describe("processInboundEmail", () => {
    let domain: any;
    let user: any;
    let community: any;
    let post: any;
    const originalInboundDomain = process.env.INBOUND_EMAIL_DOMAIN;

    beforeEach(async () => {
        process.env.INBOUND_EMAIL_DOMAIN = "replies.example.com";
        jest.clearAllMocks();

        domain = await DomainModel.create({
            name: "inbound-email-test",
            email: "owner@example.com",
        });
        user = await UserModel.create({
            domain: domain._id,
            userId: "inbound-member",
            email: "member@example.com",
            name: "Inbound Member",
            active: true,
            permissions: [],
        });
        community = await CommunityModel.create({
            domain: domain._id,
            communityId: "inbound-community",
            name: "Inbound Community",
            pageId: "inbound-community-page",
            slug: "inbound-community",
            enabled: true,
            deleted: false,
            categories: ["General"],
        });
        post = await CommunityPostModel.create({
            domain: domain._id,
            userId: "another-member",
            communityId: community.communityId,
            postId: "inbound-post",
            title: "Inbound post",
            content: "Post content",
            category: "General",
        });
        await MembershipModel.create({
            domain: domain._id,
            membershipId: "inbound-membership",
            userId: user.userId,
            entityId: community.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            paymentPlanId: "inbound-plan",
            sessionId: "inbound-session",
            status: Constants.MembershipStatus.ACTIVE,
            role: Constants.MembershipRole.MODERATE,
        });
    });

    afterEach(async () => {
        await Promise.all([
            EmailReplyTokenModel.deleteMany({}),
            InboundEmailReceiptModel.deleteMany({}),
            CommunityCommentModel.deleteMany({}),
            CommunityPostModel.deleteMany({}),
            CommunityPostSubscriberModel.deleteMany({}),
            MembershipModel.deleteMany({}),
            RateLimitEventModel.deleteMany({}),
            CommunityModel.deleteMany({}),
            UserModel.deleteMany({}),
            DomainModel.deleteMany({}),
        ]);
        if (originalInboundDomain === undefined) {
            delete process.env.INBOUND_EMAIL_DOMAIN;
        } else {
            process.env.INBOUND_EMAIL_DOMAIN = originalInboundDomain;
        }
    });

    async function createCommunityToken(
        expiresAt = new Date(Date.now() + 60000),
    ) {
        await EmailReplyTokenModel.create({
            domain: domain._id,
            token: replyToken,
            userId: user.userId,
            kind: "community",
            community: {
                communityId: community.communityId,
                postId: post.postId,
            },
            contextKey: `community:${replyToken}:${expiresAt.getTime()}`,
            expiresAt,
        });
    }

    function email(overrides: Record<string, unknown> = {}) {
        return {
            from: user.email,
            to: [`reply+${replyToken}@replies.example.com`],
            textBody: "Reply from email",
            messageId: "inbound-message-id",
            ...overrides,
        };
    }

    function processEmail(input: ReturnType<typeof email>) {
        return processInboundEmail({ provider: "postmark", email: input });
    }

    it("creates a top-level community comment through the existing mutation logic", async () => {
        await createCommunityToken();

        await expect(processEmail(email())).resolves.toEqual({ ok: true });
        await expect(
            CommunityCommentModel.findOne({
                domain: domain._id,
                communityId: community.communityId,
                postId: post.postId,
                userId: user.userId,
            }).lean(),
        ).resolves.toMatchObject({ content: "Reply from email" });
    });

    it("rejects expired reply tokens", async () => {
        await createCommunityToken(new Date(Date.now() - 1));

        await expect(processEmail(email())).resolves.toEqual({
            ok: false,
            reason: "invalid_token",
        });
    });

    it("rejects a sender that does not match the recipient's address", async () => {
        await createCommunityToken();

        await expect(
            processEmail(email({ from: "forwarder@example.com" })),
        ).resolves.toEqual({ ok: false, reason: "sender_mismatch" });
    });

    it("rejects empty reply text after quote stripping", async () => {
        await createCommunityToken();

        await expect(
            processEmail(
                email({
                    textBody:
                        "On yesterday, someone wrote:\n> Earlier discussion",
                }),
            ),
        ).resolves.toEqual({ ok: false, reason: "empty_reply" });
    });

    it("does not bypass the community membership permission", async () => {
        await createCommunityToken();
        await MembershipModel.deleteMany({
            domain: domain._id,
            userId: user.userId,
        });

        await expect(processEmail(email())).resolves.toEqual({
            ok: false,
            reason: "creation_failed",
        });
        await expect(CommunityCommentModel.countDocuments({})).resolves.toBe(0);
    });

    it("marks transient rate-limit failures retryable", async () => {
        await createCommunityToken();
        const countDocuments = jest
            .spyOn(RateLimitEventModel, "countDocuments")
            .mockRejectedValueOnce(new Error("database unavailable"));

        await expect(processEmail(email())).resolves.toEqual({
            ok: false,
            reason: "creation_failed",
            retryable: true,
        });
        expect(countDocuments).toHaveBeenCalled();
        countDocuments.mockRestore();
    });

    it("creates a product-discussion reply with normalized rich text", async () => {
        await EmailReplyTokenModel.create({
            domain: domain._id,
            token: replyToken,
            userId: user.userId,
            kind: "product",
            product: {
                productId: "course-id",
                entityType: Constants.ProductDiscussionEntityType.LESSON,
                entityId: "lesson-id",
                commentId: "comment-id",
                parentReplyId: "parent-reply-id",
            },
            contextKey: "product:inbound-token",
            expiresAt: new Date(Date.now() + 60000),
        });

        await expect(
            processEmail(email({ textBody: "First line\nSecond line" })),
        ).resolves.toEqual({ ok: true });
        expect(createDiscussionReply).toHaveBeenCalledWith({
            ctx: expect.objectContaining({
                user: expect.objectContaining({ userId: user.userId }),
                subdomain: expect.objectContaining({ _id: domain._id }),
                address: "",
            }),
            productId: "course-id",
            entityType: Constants.ProductDiscussionEntityType
                .LESSON as ProductDiscussionEntityType,
            entityId: "lesson-id",
            commentId: "comment-id",
            parentReplyId: "parent-reply-id",
            content: normalizeTextEditorContent("First line\nSecond line"),
        });
    });

    it("acknowledges a duplicated provider message without creating another reply", async () => {
        await createCommunityToken();

        await expect(processEmail(email())).resolves.toEqual({ ok: true });
        await expect(processEmail(email())).resolves.toEqual({ ok: true });
        await expect(
            CommunityCommentModel.countDocuments({
                domain: domain._id,
                communityId: community.communityId,
                postId: post.postId,
            }),
        ).resolves.toBe(1);
        await expect(
            InboundEmailReceiptModel.findOne({
                provider: "postmark",
                messageId: "inbound-message-id",
            }).lean(),
        ).resolves.toMatchObject({ status: "accepted" });
    });
});
