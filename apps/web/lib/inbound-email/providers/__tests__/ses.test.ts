/**
 * @jest-environment node
 */

import { generateKeyPairSync, sign } from "node:crypto";
import {
    buildSnsSigningString,
    confirmSnsSubscription,
    createSesInboundEmailAdapter,
    type SnsMessage,
    verifySnsMessage,
} from "@/lib/inbound-email/providers/ses";

const textEncoder = new TextEncoder();

function snsEnvelope(overrides: Record<string, unknown> = {}): SnsMessage {
    return {
        Type: "Notification",
        MessageId: "sns-message-id",
        TopicArn: "arn:aws:sns:us-east-1:123456789012:courselit-replies",
        Subject: "Amazon SES Email Receipt Notification",
        Message: JSON.stringify({ notificationType: "Received" }),
        Timestamp: "2026-07-19T12:00:00.000Z",
        SignatureVersion: "2",
        SigningCertURL:
            "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-test.pem",
        Signature: "example-signature",
        ...overrides,
    } as SnsMessage;
}

function input(rawBody: string) {
    return {
        rawBody,
        headers: new Headers({ "content-type": "application/json" }),
        searchParams: new URL("https://example.test").searchParams,
        contentType: "application/json",
    };
}

describe("Amazon SES inbound adapter", () => {
    const originalTopic = process.env.INBOUND_EMAIL_SES_TOPIC_ARN;
    const originalBucket = process.env.INBOUND_EMAIL_SES_BUCKET;
    const originalRegion = process.env.INBOUND_EMAIL_SES_REGION;
    const originalPrefix = process.env.INBOUND_EMAIL_SES_OBJECT_PREFIX;

    beforeEach(() => {
        process.env.INBOUND_EMAIL_SES_TOPIC_ARN =
            "arn:aws:sns:us-east-1:123456789012:courselit-replies";
        process.env.INBOUND_EMAIL_SES_BUCKET = "courselit-inbound";
        process.env.INBOUND_EMAIL_SES_REGION = "us-east-1";
        process.env.INBOUND_EMAIL_SES_OBJECT_PREFIX = "replies";
    });

    afterEach(() => {
        for (const [name, value] of Object.entries({
            INBOUND_EMAIL_SES_TOPIC_ARN: originalTopic,
            INBOUND_EMAIL_SES_BUCKET: originalBucket,
            INBOUND_EMAIL_SES_REGION: originalRegion,
            INBOUND_EMAIL_SES_OBJECT_PREFIX: originalPrefix,
        })) {
            if (value === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = value;
            }
        }
    });

    it("constructs SNS's ordered, no-trailing-newline signing string", () => {
        expect(buildSnsSigningString(snsEnvelope())).toBe(
            [
                "Message",
                JSON.stringify({ notificationType: "Received" }),
                "MessageId",
                "sns-message-id",
                "Subject",
                "Amazon SES Email Receipt Notification",
                "Timestamp",
                "2026-07-19T12:00:00.000Z",
                "TopicArn",
                "arn:aws:sns:us-east-1:123456789012:courselit-replies",
                "Type",
                "Notification",
            ].join("\n"),
        );
    });

    it("accepts a valid SNS signature from the expected topic", async () => {
        const { privateKey, publicKey } = generateKeyPairSync("rsa", {
            modulusLength: 2048,
        });
        const unsignedEnvelope = snsEnvelope();
        const signature = sign(
            "RSA-SHA256",
            textEncoder.encode(buildSnsSigningString(unsignedEnvelope)),
            privateKey,
        ).toString("base64");
        const envelope = { ...unsignedEnvelope, Signature: signature };

        await expect(
            verifySnsMessage(envelope, {
                getSigningKey: async () => publicKey,
            }),
        ).resolves.toBeUndefined();
    });

    it("accepts an SNS subscription confirmation signed with a final delimiter", async () => {
        const { privateKey, publicKey } = generateKeyPairSync("rsa", {
            modulusLength: 2048,
        });
        const unsignedEnvelope = snsEnvelope({
            Type: "SubscriptionConfirmation",
            Token: "subscription-token",
            SubscribeURL:
                "https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription",
        });
        const signature = sign(
            "RSA-SHA256",
            textEncoder.encode(`${buildSnsSigningString(unsignedEnvelope)}\n`),
            privateKey,
        ).toString("base64");

        await expect(
            verifySnsMessage(
                { ...unsignedEnvelope, Signature: signature },
                { getSigningKey: async () => publicKey },
            ),
        ).resolves.toBeUndefined();
    });

    it("rejects an SNS message from an unexpected topic before reading S3", async () => {
        const adapter = createSesInboundEmailAdapter({
            verifySnsMessage: async () => undefined,
            getS3Object: async () =>
                Uint8Array.from(Buffer.from("should not be read")),
        });
        const message = {
            notificationType: "Received",
            receipt: {
                recipients: ["reply+token@replies.example.com"],
                action: {
                    type: "S3",
                    bucketName: "courselit-inbound",
                    objectKey: "replies/message.eml",
                },
            },
            mail: { messageId: "ses-message-id" },
        };
        const envelope = snsEnvelope({
            TopicArn: "arn:aws:sns:us-east-1:123456789012:another-topic",
            Message: JSON.stringify(message),
        });

        await expect(
            adapter.parse(input(JSON.stringify(envelope))),
        ).rejects.toMatchObject({
            kind: "authentication",
        });
    });

    it("loads only the configured S3 object prefix and normalizes the MIME email", async () => {
        const getS3Object = jest
            .fn()
            .mockResolvedValue(
                Uint8Array.from(
                    Buffer.from(
                        [
                            "From: Member <member@example.com>",
                            "To: reply+token@replies.example.com",
                            "Subject: Re: A discussion",
                            "Message-ID: <mime-message-id@example.com>",
                            "Content-Type: text/plain; charset=utf-8",
                            "",
                            "My direct reply",
                        ].join("\r\n"),
                    ),
                ),
            );
        const adapter = createSesInboundEmailAdapter({
            verifySnsMessage: async () => undefined,
            getS3Object,
        });
        const message = {
            notificationType: "Received",
            receipt: {
                recipients: ["reply+token@replies.example.com"],
                action: {
                    type: "S3",
                    bucketName: "courselit-inbound",
                    objectKey: "replies/2026/message.eml",
                },
            },
            mail: { messageId: "ses-message-id" },
        };
        const envelope = snsEnvelope({ Message: JSON.stringify(message) });

        await expect(
            adapter.parse(input(JSON.stringify(envelope))),
        ).resolves.toEqual({
            kind: "email",
            email: {
                from: "member@example.com",
                to: ["reply+token@replies.example.com"],
                subject: "Re: A discussion",
                textBody: "My direct reply",
                messageId: "ses-message-id",
            },
        });
        expect(getS3Object).toHaveBeenCalledWith({
            bucket: "courselit-inbound",
            key: "replies/2026/message.eml",
            region: "us-east-1",
        });
    });

    it("returns a subscription confirmation only after SNS verification", async () => {
        const verify = jest.fn().mockResolvedValue(undefined);
        const adapter = createSesInboundEmailAdapter({
            verifySnsMessage: verify,
            getS3Object: async () => Uint8Array.from(Buffer.from("unused")),
        });
        const envelope = snsEnvelope({
            Type: "SubscriptionConfirmation",
            Token: "subscription-token",
            SubscribeURL:
                "https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription",
        });

        await adapter.verify(input(JSON.stringify(envelope)));
        await expect(
            adapter.parse(input(JSON.stringify(envelope))),
        ).resolves.toEqual({
            kind: "subscription_confirmation",
            subscribeUrl:
                "https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription",
        });
        expect(verify).toHaveBeenCalledTimes(1);
    });

    it("rejects a subscription confirmation URL outside the expected SNS action", async () => {
        await expect(
            confirmSnsSubscription(
                "https://sns.us-east-1.amazonaws.com/?Action=Publish",
            ),
        ).rejects.toMatchObject({ kind: "authentication" });
    });
});
