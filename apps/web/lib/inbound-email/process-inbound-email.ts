import { postComment } from "@/graphql/communities/logic";
import { createDiscussionReply } from "@/graphql/product-discussions/logic";
import { assertRateLimit } from "@/lib/assert-rate-limit";
import DomainModel from "@models/Domain";
import InboundEmailReceiptModel from "@models/InboundEmailReceipt";
import EmailReplyTokenModel from "@models/EmailReplyToken";
import UserModel from "@models/User";
import { normalizeTextEditorContent } from "@courselit/utils";
import { responses } from "@/config/strings";
import { randomUUID } from "crypto";
import { InboundEmailError } from "./errors";
import { extractReplyText } from "./extract-reply-text";
import type { InboundEmailProcessingInput } from "./types";
import { Constants } from "@courselit/common-models";

const INBOUND_EMAIL_RATE_LIMITS = {
    repliesPerMinute: { window: 60 * 1000, limit: 5 },
    repliesPerDay: { window: 24 * 60 * 60 * 1000, limit: 50 },
} as const;

const REPLY_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;
const INBOUND_EMAIL_RECEIPT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const INBOUND_EMAIL_PROCESSING_LEASE_MS = 5 * 60 * 1000; // 5 minutes
const TERMINAL_REPLY_ERRORS = new Set([
    responses.action_not_allowed,
    responses.drip_not_released,
    responses.invalid_input,
    responses.item_not_found,
    responses.not_enrolled,
    responses.request_not_authenticated,
]);

export type InboundEmailProcessingResult =
    | { ok: true }
    | {
          ok: false;
          reason:
              | "reply_by_email_disabled"
              | "no_reply_address"
              | "invalid_token"
              | "sender_mismatch"
              | "empty_reply"
              | "creation_failed"
              | "processing_in_progress";
          retryable?: boolean;
      };

type ReceiptClaim =
    | { status: "claimed"; processingId: string }
    | { status: "duplicate" }
    | { status: "in_progress" };

function getInboundEmailDomain() {
    const configured = process.env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase();
    if (!configured) {
        return undefined;
    }

    const domain = configured.endsWith(".")
        ? configured.slice(0, -1)
        : configured;
    const labels = domain.split(".");
    const valid =
        domain.length <= 253 &&
        labels.length >= 2 &&
        labels.every(
            (label) =>
                label.length >= 1 &&
                label.length <= 63 &&
                /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
        );

    return valid ? domain : undefined;
}

function findReplyToken(to: string[], inboundDomain: string) {
    for (const recipient of to) {
        const address = recipient.trim();
        const separator = address.lastIndexOf("@");
        if (separator <= 0 || separator === address.length - 1) {
            continue;
        }

        const localPart = address.slice(0, separator);
        const domain = address.slice(separator + 1).toLowerCase();
        if (
            !localPart.toLowerCase().startsWith("reply+") ||
            domain !== inboundDomain
        ) {
            continue;
        }

        const token = localPart.slice("reply+".length);
        if (REPLY_TOKEN_PATTERN.test(token)) {
            return token;
        }
    }

    return undefined;
}

async function assertInboundEmailRateLimit({
    domain,
    userId,
}: {
    domain: Parameters<typeof assertRateLimit>[0]["domain"];
    userId: string;
}) {
    const common = {
        domain,
        userId,
        scope: "inbound_email",
        action: "reply:create",
        subjectId: "reply-by-email",
    };

    await assertRateLimit({
        ...common,
        window: INBOUND_EMAIL_RATE_LIMITS.repliesPerDay.window,
        limit: INBOUND_EMAIL_RATE_LIMITS.repliesPerDay.limit,
        record: false,
    });
    await assertRateLimit({
        ...common,
        window: INBOUND_EMAIL_RATE_LIMITS.repliesPerMinute.window,
        limit: INBOUND_EMAIL_RATE_LIMITS.repliesPerMinute.limit,
    });
}

function isDuplicateKeyError(error: unknown) {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
    );
}

function isTerminalReplyError(error: unknown) {
    return error instanceof Error && TERMINAL_REPLY_ERRORS.has(error.message);
}

async function claimInboundEmailReceipt({
    provider,
    messageId,
    domain,
    userId,
}: {
    provider: InboundEmailProcessingInput["provider"];
    messageId: string;
    domain: Parameters<typeof assertRateLimit>[0]["domain"];
    userId: string;
}): Promise<ReceiptClaim> {
    const now = new Date();
    const processingId = randomUUID();
    const expiresAt = new Date(now.getTime() + INBOUND_EMAIL_RECEIPT_TTL_MS);
    const processingExpiresAt = new Date(
        now.getTime() + INBOUND_EMAIL_PROCESSING_LEASE_MS,
    );

    try {
        await InboundEmailReceiptModel.create({
            domain,
            userId,
            provider,
            messageId,
            status: Constants.InboundEmailReceiptStatus.PROCESSING,
            processingId,
            processingExpiresAt,
            expiresAt,
        });
        return { status: "claimed", processingId };
    } catch (caught) {
        if (!isDuplicateKeyError(caught)) {
            throw new InboundEmailError(
                "transient",
                "Unable to claim inbound email receipt",
            );
        }
    }

    const existing = await InboundEmailReceiptModel.findOne({
        provider,
        messageId,
    }).lean();
    if (!existing) {
        throw new InboundEmailError(
            "transient",
            "Inbound email receipt could not be read",
        );
    }
    if (existing.status === Constants.InboundEmailReceiptStatus.ACCEPTED) {
        return { status: "duplicate" };
    }
    if (
        existing.processingExpiresAt &&
        existing.processingExpiresAt.getTime() > now.getTime()
    ) {
        return { status: "in_progress" };
    }

    const reclaimed = await InboundEmailReceiptModel.updateOne(
        {
            _id: existing._id,
            status: Constants.InboundEmailReceiptStatus.PROCESSING,
            $or: [
                { processingExpiresAt: { $lte: now } },
                { processingExpiresAt: { $exists: false } },
            ],
        },
        {
            $set: {
                domain,
                userId,
                processingId,
                processingExpiresAt,
                expiresAt,
            },
        },
    );
    return reclaimed.modifiedCount === 1
        ? { status: "claimed", processingId }
        : { status: "in_progress" };
}

async function releaseInboundEmailReceipt(
    provider: InboundEmailProcessingInput["provider"],
    messageId: string,
    processingId: string,
) {
    await InboundEmailReceiptModel.deleteOne({
        provider,
        messageId,
        status: Constants.InboundEmailReceiptStatus.PROCESSING,
        processingId,
    });
}

async function acceptInboundEmailReceipt(
    provider: InboundEmailProcessingInput["provider"],
    messageId: string,
    processingId: string,
) {
    const accepted = await InboundEmailReceiptModel.updateOne(
        {
            provider,
            messageId,
            status: Constants.InboundEmailReceiptStatus.PROCESSING,
            processingId,
        },
        {
            $set: { status: "accepted" },
            $unset: { processingId: "", processingExpiresAt: "" },
        },
    );
    if (accepted.modifiedCount !== 1) {
        throw new InboundEmailError(
            "transient",
            "Unable to accept inbound email receipt",
        );
    }
}

export async function processInboundEmail({
    provider,
    email,
}: InboundEmailProcessingInput): Promise<InboundEmailProcessingResult> {
    const inboundDomain = getInboundEmailDomain();
    if (!inboundDomain) {
        return { ok: false, reason: "reply_by_email_disabled" };
    }

    const token = findReplyToken(email.to, inboundDomain);
    if (!token) {
        return { ok: false, reason: "no_reply_address" };
    }

    const replyToken = await EmailReplyTokenModel.findOne({
        token,
        expiresAt: { $gt: new Date() },
    }).lean();
    if (!replyToken) {
        return { ok: false, reason: "invalid_token" };
    }

    const [domain, user] = await Promise.all([
        DomainModel.findOne({ _id: replyToken.domain, deleted: false }),
        UserModel.findOne({
            domain: replyToken.domain,
            userId: replyToken.userId,
            active: true,
        }),
    ]);
    if (!domain || !user) {
        return { ok: false, reason: "invalid_token" };
    }

    if (email.from.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
        return { ok: false, reason: "sender_mismatch" };
    }

    const replyText = await extractReplyText(email);
    if (!replyText) {
        return { ok: false, reason: "empty_reply" };
    }

    let processingId: string | undefined;
    if (email.messageId) {
        const receipt = await claimInboundEmailReceipt({
            provider,
            messageId: email.messageId,
            domain: domain._id,
            userId: user.userId,
        });
        if (receipt.status === "duplicate") {
            return { ok: true };
        }
        if (receipt.status === "in_progress") {
            return {
                ok: false,
                reason: "processing_in_progress",
                retryable: true,
            };
        }
        processingId = receipt.processingId;
    }

    try {
        await assertInboundEmailRateLimit({
            domain: domain._id,
            userId: user.userId,
        });

        const ctx = {
            user,
            subdomain: domain,
            address: "",
        };
        if (
            replyToken.kind === Constants.EmailReplyTokenKind.COMMUNITY &&
            replyToken.community
        ) {
            await postComment({
                ctx,
                communityId: replyToken.community.communityId,
                postId: replyToken.community.postId,
                content: replyText,
                parentCommentId: replyToken.community.parentCommentId,
                parentReplyId: replyToken.community.parentReplyId,
            });
        } else if (
            replyToken.kind === Constants.EmailReplyTokenKind.PRODUCT &&
            replyToken.product
        ) {
            await createDiscussionReply({
                ctx,
                productId: replyToken.product.productId,
                entityType: replyToken.product.entityType,
                entityId: replyToken.product.entityId,
                commentId: replyToken.product.commentId,
                parentReplyId: replyToken.product.parentReplyId,
                content: normalizeTextEditorContent(replyText),
            });
        } else {
            if (processingId && email.messageId) {
                await releaseInboundEmailReceipt(
                    provider,
                    email.messageId,
                    processingId,
                );
            }
            return { ok: false, reason: "invalid_token" };
        }
    } catch (caught) {
        if (processingId && email.messageId) {
            await releaseInboundEmailReceipt(
                provider,
                email.messageId,
                processingId,
            );
        }
        if (isTerminalReplyError(caught)) {
            return { ok: false, reason: "creation_failed" };
        }

        return { ok: false, reason: "creation_failed", retryable: true };
    }

    if (processingId && email.messageId) {
        await acceptInboundEmailReceipt(
            provider,
            email.messageId,
            processingId,
        );
    }

    return { ok: true };
}
