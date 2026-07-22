import { createHmac } from "node:crypto";
import { InboundEmailError } from "../errors";
import {
    parseEmailAddress,
    parseFormBody,
    parseMessageId,
    timingSafeEqualStrings,
} from "../provider-utils";
import type {
    InboundEmailAdapter,
    InboundEmailRequest,
    ParsedInboundEmail,
} from "../types";

const MAILGUN_SIGNATURE_MAX_AGE_SECONDS = 5 * 60;

async function getMailgunFields(input: InboundEmailRequest) {
    return parseFormBody({
        rawBody: input.rawBody,
        contentType: input.contentType,
    });
}

function hasValidMailgunSignature({
    timestamp,
    token,
    signature,
}: Record<string, string>) {
    const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
    if (!signingKey?.trim()) {
        throw new InboundEmailError(
            "configuration",
            "Mailgun webhook signing key is not configured",
        );
    }

    if (!/^\d+$/.test(timestamp || "") || !token || !signature) {
        return false;
    }

    const age = Math.abs(Date.now() - Number(timestamp) * 1000);
    if (age > MAILGUN_SIGNATURE_MAX_AGE_SECONDS * 1000) {
        return false;
    }

    const expected = createHmac("sha256", signingKey)
        .update(`${timestamp}${token}`)
        .digest("hex");
    return (
        /^[a-f0-9]{64}$/i.test(signature) &&
        timingSafeEqualStrings(signature.toLowerCase(), expected)
    );
}

function getMailgunMessageId(fields: Record<string, string>) {
    const rawHeaders = fields["message-headers"];
    if (!rawHeaders) {
        return undefined;
    }

    try {
        const headers = JSON.parse(rawHeaders);
        if (!Array.isArray(headers)) {
            return undefined;
        }

        const messageId = headers.find(
            (header) =>
                Array.isArray(header) &&
                typeof header[0] === "string" &&
                header[0].toLowerCase() === "message-id",
        )?.[1];

        return parseMessageId(messageId);
    } catch {
        return undefined;
    }
}

export const mailgunAdapter: InboundEmailAdapter = {
    provider: "mailgun",

    async verify(input: InboundEmailRequest) {
        const fields = await getMailgunFields(input);
        if (!hasValidMailgunSignature(fields)) {
            throw new InboundEmailError(
                "authentication",
                "Invalid Mailgun webhook signature",
            );
        }
    },

    async parse(input: InboundEmailRequest): Promise<ParsedInboundEmail> {
        const fields = await getMailgunFields(input);
        const from = parseEmailAddress(fields.from);
        const recipient = parseEmailAddress(fields.recipient);
        const textBody = fields["body-plain"];

        if (!from || !recipient || textBody === undefined) {
            throw new InboundEmailError(
                "invalid",
                "Mailgun payload is missing required email fields",
            );
        }

        return {
            kind: "email",
            email: {
                from,
                to: [recipient],
                subject: fields.subject,
                textBody,
                strippedReply: fields["stripped-text"],
                messageId: getMailgunMessageId(fields),
            },
        };
    },
};
