import { Constants } from "@courselit/common-models";
import type {
    EmailReplyTokenKind,
    ReplyByEmailContext,
} from "@courselit/common-models";
import { createHash, randomBytes } from "node:crypto";
import type { Types } from "mongoose";
import EmailReplyTokenModel from "../../domain/model/email-reply-token";

export const EMAIL_REPLY_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface MintReplyTokenOptions {
    domainId: string | Types.ObjectId;
    userId: string;
    context: ReplyByEmailContext;
}

interface NormalizedReplyContext {
    kind: EmailReplyTokenKind;
    community?: ReplyByEmailContext["community"];
    product?: ReplyByEmailContext["product"];
}

function assertNonEmptyStrings(values: Array<string | undefined>) {
    if (values.some((value) => !value?.trim())) {
        throw new Error("Reply context contains an empty identifier");
    }
}

function normalizeReplyContext(
    context: ReplyByEmailContext,
): NormalizedReplyContext {
    const hasCommunity = Boolean(context.community);
    const hasProduct = Boolean(context.product);

    if (hasCommunity === hasProduct) {
        throw new Error("Expected exactly one reply context");
    }

    if (context.community) {
        assertNonEmptyStrings([
            context.community.communityId,
            context.community.postId,
        ]);
        if (
            context.community.parentReplyId &&
            !context.community.parentCommentId
        ) {
            throw new Error(
                "A community parent reply requires a parent comment",
            );
        }

        return {
            kind: Constants.EmailReplyTokenKind.COMMUNITY,
            community: { ...context.community },
        };
    }

    assertNonEmptyStrings([
        context.product?.productId,
        context.product?.entityType,
        context.product?.entityId,
        context.product?.commentId,
    ]);
    return {
        kind: Constants.EmailReplyTokenKind.PRODUCT,
        product: { ...context.product! },
    };
}

function buildContextKey(context: NormalizedReplyContext) {
    const coordinates = context.community
        ? [
              context.kind,
              context.community.communityId,
              context.community.postId,
              context.community.parentCommentId || "",
              context.community.parentReplyId || "",
          ]
        : [
              context.kind,
              context.product!.productId,
              context.product!.entityType,
              context.product!.entityId,
              context.product!.commentId,
              context.product!.parentReplyId || "",
          ];

    return createHash("sha256")
        .update(JSON.stringify(coordinates))
        .digest("hex");
}

function generateReplyToken() {
    return randomBytes(20).toString("base64url");
}

function isDuplicateKeyError(error: unknown) {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
    );
}

export async function mintReplyToken({
    domainId,
    userId,
    context,
}: MintReplyTokenOptions): Promise<string> {
    if (!userId.trim()) {
        throw new Error("A recipient user is required to mint a reply token");
    }

    const normalizedContext = normalizeReplyContext(context);
    const contextKey = buildContextKey(normalizedContext);
    const expiresAt = new Date(Date.now() + EMAIL_REPLY_TOKEN_TTL_MS);
    const update = {
        $set: {
            kind: normalizedContext.kind,
            community: normalizedContext.community,
            product: normalizedContext.product,
            expiresAt,
        },
        $setOnInsert: {
            token: generateReplyToken(),
        },
    };
    const filter = { domain: domainId, userId, contextKey };

    try {
        const record = await EmailReplyTokenModel.findOneAndUpdate(
            filter,
            update,
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true,
            },
        ).lean();

        return record.token;
    } catch (error) {
        if (!isDuplicateKeyError(error)) {
            throw error;
        }

        const record = await EmailReplyTokenModel.findOneAndUpdate(
            filter,
            update,
            { new: true, runValidators: true },
        ).lean();

        if (!record) {
            throw error;
        }

        return record.token;
    }
}

export function isReplyByEmailEnabled() {
    return Boolean(process.env.INBOUND_EMAIL_DOMAIN?.trim());
}

function getInboundEmailDomain() {
    const domain = process.env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase();
    if (!domain) {
        throw new Error("INBOUND_EMAIL_DOMAIN is not configured");
    }

    const normalizedDomain = domain.endsWith(".")
        ? domain.slice(0, -1)
        : domain;
    const labels = normalizedDomain.split(".");
    const isValid =
        normalizedDomain.length <= 253 &&
        labels.length >= 2 &&
        labels.every(
            (label) =>
                label.length >= 1 &&
                label.length <= 63 &&
                /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
        );

    if (!isValid) {
        throw new Error("INBOUND_EMAIL_DOMAIN is not a valid email domain");
    }

    return normalizedDomain;
}

export function buildReplyToAddress(token: string) {
    if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
        throw new Error("Invalid reply token for an email local-part");
    }

    const address = `reply+${token}@${getInboundEmailDomain()}`;
    const localPart = address.slice(0, address.indexOf("@"));
    if (Buffer.byteLength(localPart, "utf8") > 64) {
        throw new Error("Reply-To local-part exceeds 64 octets");
    }

    return address;
}
