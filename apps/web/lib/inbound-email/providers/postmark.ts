import { InboundEmailError } from "../errors";
import {
    getString,
    parseEmailAddress,
    parseEmailAddresses,
    parseJsonBody,
    parseMessageId,
    timingSafeEqualStrings,
} from "../provider-utils";
import type {
    InboundEmailAdapter,
    InboundEmailRequest,
    ParsedInboundEmail,
} from "../types";

function hasValidPostmarkAuthentication(headers: Headers) {
    const secret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
    const authorization = headers.get("authorization");
    if (!secret?.trim()) {
        throw new InboundEmailError(
            "configuration",
            "Postmark inbound webhook authentication is not configured",
        );
    }

    if (!authorization?.startsWith("Basic ")) {
        return false;
    }

    let usernameAndPassword: string;
    try {
        usernameAndPassword = Buffer.from(
            authorization.slice("Basic ".length),
            "base64",
        ).toString("utf8");
    } catch {
        return false;
    }

    const separator = usernameAndPassword.indexOf(":");
    if (separator <= 0) {
        return false;
    }

    const suppliedSecret = usernameAndPassword.slice(separator + 1);
    return timingSafeEqualStrings(suppliedSecret, secret);
}

function getPostmarkRecipients(body: Record<string, unknown>) {
    const toFull = body.ToFull;
    if (!Array.isArray(toFull)) {
        return [];
    }

    return parseEmailAddresses(
        toFull.map((recipient) =>
            recipient && typeof recipient === "object"
                ? (recipient as Record<string, unknown>).Email
                : undefined,
        ),
    );
}

export const postmarkAdapter: InboundEmailAdapter = {
    provider: "postmark",

    async verify(input: InboundEmailRequest) {
        if (!hasValidPostmarkAuthentication(input.headers)) {
            throw new InboundEmailError(
                "authentication",
                "Invalid Postmark inbound webhook authentication",
            );
        }
    },

    async parse(input: InboundEmailRequest): Promise<ParsedInboundEmail> {
        const body = parseJsonBody(input.rawBody);
        const fromFull = body.FromFull as Record<string, unknown> | undefined;
        const from = parseEmailAddress(fromFull?.Email);
        const to = getPostmarkRecipients(body);
        const textBody = getString(body, "TextBody");

        if (!from || !to.length || textBody === undefined) {
            throw new InboundEmailError(
                "invalid",
                "Postmark payload is missing required email fields",
            );
        }

        return {
            kind: "email",
            email: {
                from,
                to,
                subject: getString(body, "Subject"),
                textBody,
                strippedReply: getString(body, "StrippedTextReply"),
                messageId: parseMessageId(getString(body, "MessageID")),
            },
        };
    },
};
