/**
 * @jest-environment node
 */

import mongoose from "mongoose";
import EmailReplyTokenModel from "../../../domain/model/email-reply-token";
import {
    EMAIL_REPLY_TOKEN_TTL_MS,
    buildReplyToAddress,
    isReplyByEmailEnabled,
    mintReplyToken,
} from "../email-reply-token";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("email reply tokens", () => {
    const domainId = new mongoose.Types.ObjectId();

    beforeAll(async () => {
        await EmailReplyTokenModel.syncIndexes();
    });

    beforeEach(async () => {
        delete process.env.INBOUND_EMAIL_DOMAIN;
        await EmailReplyTokenModel.deleteMany({});
    });

    afterAll(async () => {
        delete process.env.INBOUND_EMAIL_DOMAIN;
        await EmailReplyTokenModel.deleteMany({});
    });

    it("mints one reusable community token for concurrent requests at the same thread position", async () => {
        const context = {
            community: {
                communityId: "community-1",
                postId: "post-1",
                parentCommentId: "comment-1",
                parentReplyId: "reply-1",
            },
        };

        const tokens = await Promise.all(
            Array.from({ length: 5 }, () =>
                mintReplyToken({
                    domainId,
                    userId: "user-1",
                    context,
                }),
            ),
        );

        expect(new Set(tokens).size).toBe(1);
        expect(tokens[0]).toMatch(/^[A-Za-z0-9_-]{27}$/);

        const records = await EmailReplyTokenModel.find({}).lean();
        expect(records).toHaveLength(1);
        expect(records[0]).toEqual(
            expect.objectContaining({
                domain: domainId,
                token: tokens[0],
                userId: "user-1",
                kind: "community",
                community: expect.objectContaining(context.community),
            }),
        );
        expect(records[0].product).toBeUndefined();
        expect(records[0].contextKey).toEqual(expect.any(String));
        expect(records[0].contextKey).not.toContain("community-1");
        expect(records[0].expiresAt.getTime()).toBeGreaterThanOrEqual(
            Date.now() + EMAIL_REPLY_TOKEN_TTL_MS - 5_000,
        );
    });

    it("slides expiry by 30 days without replacing an existing token", async () => {
        const context = {
            community: {
                communityId: "community-1",
                postId: "post-1",
            },
        };
        const originalToken = await mintReplyToken({
            domainId,
            userId: "user-1",
            context,
        });
        const staleExpiry = new Date(Date.now() - DAY_MS);
        await EmailReplyTokenModel.updateOne(
            { token: originalToken },
            { $set: { expiresAt: staleExpiry } },
        );

        const reusedToken = await mintReplyToken({
            domainId,
            userId: "user-1",
            context,
        });
        const record = await EmailReplyTokenModel.findOne({
            token: originalToken,
        }).lean();

        expect(reusedToken).toBe(originalToken);
        expect(record?.expiresAt.getTime()).toBeGreaterThan(
            staleExpiry.getTime(),
        );
        expect(record?.expiresAt.getTime()).toBeGreaterThanOrEqual(
            Date.now() + 30 * DAY_MS - 5_000,
        );
    });

    it("stores product coordinates and mints a different token for a different thread position", async () => {
        const firstToken = await mintReplyToken({
            domainId,
            userId: "user-1",
            context: {
                product: {
                    productId: "product-1",
                    entityType: "lesson",
                    entityId: "lesson-1",
                    commentId: "comment-1",
                },
            },
        });
        const secondToken = await mintReplyToken({
            domainId,
            userId: "user-1",
            context: {
                product: {
                    productId: "product-1",
                    entityType: "lesson",
                    entityId: "lesson-1",
                    commentId: "comment-1",
                    parentReplyId: "reply-1",
                },
            },
        });

        expect(secondToken).not.toBe(firstToken);
        const record = await EmailReplyTokenModel.findOne({
            token: secondToken,
        }).lean();
        expect(record).toEqual(
            expect.objectContaining({
                kind: "product",
                product: expect.objectContaining({
                    productId: "product-1",
                    entityType: "lesson",
                    entityId: "lesson-1",
                    commentId: "comment-1",
                    parentReplyId: "reply-1",
                }),
            }),
        );
        expect(record?.community).toBeUndefined();
    });

    it.each([
        {},
        {
            community: { communityId: "community-1", postId: "post-1" },
            product: {
                productId: "product-1",
                entityType: "lesson",
                entityId: "lesson-1",
                commentId: "comment-1",
            },
        },
    ])("rejects an ambiguous reply context", async (context) => {
        await expect(
            mintReplyToken({
                domainId,
                userId: "user-1",
                context: context as any,
            }),
        ).rejects.toThrow("exactly one reply context");

        expect(await EmailReplyTokenModel.countDocuments()).toBe(0);
    });

    it("enables reply-by-email only when a domain is configured", () => {
        expect(isReplyByEmailEnabled()).toBe(false);

        process.env.INBOUND_EMAIL_DOMAIN = "replies.example.com";
        expect(isReplyByEmailEnabled()).toBe(true);
    });

    it("builds a normalized, local-part-safe Reply-To address", () => {
        process.env.INBOUND_EMAIL_DOMAIN = " Replies.Example.COM. ";

        expect(buildReplyToAddress("a".repeat(27))).toBe(
            `reply+${"a".repeat(27)}@replies.example.com`,
        );
    });

    it.each([
        "replies.example.com\r\nBcc: attacker@example.com",
        "https://replies.example.com",
        "reply@replies.example.com",
        "-replies.example.com",
        "replies..example.com",
    ])("rejects an unsafe inbound email domain: %s", (domain) => {
        process.env.INBOUND_EMAIL_DOMAIN = domain;

        expect(() => buildReplyToAddress("a".repeat(27))).toThrow(
            "INBOUND_EMAIL_DOMAIN",
        );
    });

    it("rejects a token that is unsafe for an email local-part", () => {
        process.env.INBOUND_EMAIL_DOMAIN = "replies.example.com";

        expect(() =>
            buildReplyToAddress("token\r\nBcc: attacker@example.com"),
        ).toThrow("reply token");
    });
});
