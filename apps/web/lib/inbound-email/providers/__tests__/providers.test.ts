/**
 * @jest-environment node
 */

import { createHmac } from "node:crypto";
import { mailgunAdapter } from "@/lib/inbound-email/providers/mailgun";
import { postmarkAdapter } from "@/lib/inbound-email/providers/postmark";

function verificationInput({
    rawBody,
    contentType = "application/json",
    authorization,
}: {
    rawBody: string;
    contentType?: string;
    authorization?: string;
}) {
    const headers = new Headers({ "content-type": contentType });
    if (authorization) {
        headers.set("authorization", authorization);
    }

    return {
        rawBody,
        headers,
        searchParams: new URL("https://example.test").searchParams,
        contentType,
    };
}

describe("inbound email provider adapters", () => {
    const originalWebhookSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
    const originalMailgunSigningKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

    beforeEach(() => {
        process.env.INBOUND_EMAIL_WEBHOOK_SECRET = "webhook-secret";
        process.env.MAILGUN_WEBHOOK_SIGNING_KEY = "mailgun-signing-key";
    });

    afterEach(() => {
        if (originalWebhookSecret === undefined) {
            delete process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
        } else {
            process.env.INBOUND_EMAIL_WEBHOOK_SECRET = originalWebhookSecret;
        }

        if (originalMailgunSigningKey === undefined) {
            delete process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
        } else {
            process.env.MAILGUN_WEBHOOK_SIGNING_KEY = originalMailgunSigningKey;
        }
    });

    it("uses Postmark's parsed addresses and stripped reply after basic authentication", async () => {
        const rawBody = JSON.stringify({
            FromFull: {
                Email: "member@example.com",
            },
            ToFull: [
                {
                    Email: "reply+CaseSensitiveToken@REPLIES.example.com",
                },
            ],
            Subject: "Re: A discussion",
            TextBody:
                "My reply\n\nOn yesterday, someone wrote:\n> Earlier text",
            StrippedTextReply: "My reply",
            MessageID: "postmark-message-id",
        });
        const authorization = `Basic ${Buffer.from(
            "courselit:webhook-secret",
        ).toString("base64")}`;
        const input = verificationInput({ rawBody, authorization });

        await expect(postmarkAdapter.verify(input)).resolves.toBeUndefined();
        await expect(postmarkAdapter.parse(input)).resolves.toEqual({
            kind: "email",
            email: {
                from: "member@example.com",
                to: ["reply+CaseSensitiveToken@replies.example.com"],
                subject: "Re: A discussion",
                textBody:
                    "My reply\n\nOn yesterday, someone wrote:\n> Earlier text",
                strippedReply: "My reply",
                messageId: "postmark-message-id",
            },
        });
    });

    it("rejects a Postmark request with an invalid shared secret", async () => {
        const input = verificationInput({
            rawBody: "{}",
            authorization: `Basic ${Buffer.from("courselit:not-it").toString(
                "base64",
            )}`,
        });

        await expect(postmarkAdapter.verify(input)).rejects.toMatchObject({
            kind: "authentication",
        });
    });

    it("verifies a fresh Mailgun HMAC and normalizes its form payload", async () => {
        const timestamp = String(Math.floor(Date.now() / 1000));
        const token = "mailgun-token";
        const signature = createHmac(
            "sha256",
            process.env.MAILGUN_WEBHOOK_SIGNING_KEY!,
        )
            .update(`${timestamp}${token}`)
            .digest("hex");
        const rawBody = new URLSearchParams({
            timestamp,
            token,
            signature,
            recipient: "reply+token@replies.example.com",
            from: "Member <member@example.com>",
            subject: "Re: A discussion",
            "body-plain":
                "My reply\n\nOn yesterday, someone wrote:\n> Earlier text",
            "stripped-text": "My reply",
            "message-headers": JSON.stringify([
                ["Message-Id", "<mailgun-message-id@example.com>"],
            ]),
        }).toString();
        const input = verificationInput({
            rawBody,
            contentType: "application/x-www-form-urlencoded",
        });

        await expect(mailgunAdapter.verify(input)).resolves.toBeUndefined();
        await expect(mailgunAdapter.parse(input)).resolves.toEqual({
            kind: "email",
            email: {
                from: "member@example.com",
                to: ["reply+token@replies.example.com"],
                subject: "Re: A discussion",
                textBody:
                    "My reply\n\nOn yesterday, someone wrote:\n> Earlier text",
                strippedReply: "My reply",
                messageId: "mailgun-message-id@example.com",
            },
        });
    });

    it("rejects stale Mailgun webhook signatures", async () => {
        const timestamp = String(Math.floor(Date.now() / 1000) - 301);
        const token = "mailgun-token";
        const signature = createHmac(
            "sha256",
            process.env.MAILGUN_WEBHOOK_SIGNING_KEY!,
        )
            .update(`${timestamp}${token}`)
            .digest("hex");
        const rawBody = new URLSearchParams({
            timestamp,
            token,
            signature,
        }).toString();

        await expect(
            mailgunAdapter.verify(
                verificationInput({
                    rawBody,
                    contentType: "application/x-www-form-urlencoded",
                }),
            ),
        ).rejects.toMatchObject({ kind: "authentication" });
    });
});
