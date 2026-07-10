/**
 * Vendor-agnostic inbound email abstraction.
 * 
 * CourseLit can be configured to receive inbound replies via:
 * - AWS SES (SNS notification)
 * - Postmark (Inbound webhook)
 * - Mailgun (Route + webhook)
 * - SendGrid (Inbound Parse webhook)
 * 
 * All providers normalize to a common `InboundEmailPayload` before processing.
 */

/**
 * Normalized payload from any inbound email provider.
 */
export interface InboundEmailPayload {
    /** The sender's email address (the person replying) */
    from: string;
    /** The recipient address (our reply-to address, contains the token) */
    to: string;
    /** Plain text body of the email (stripped of quoted content later) */
    text: string;
    /** HTML body of the email (optional) */
    html?: string;
    /** The original subject line */
    subject?: string;
    /** Message ID of the inbound email */
    messageId?: string;
    /** Provider-specific raw data for debugging */
    raw?: Record<string, unknown>;
}

/**
 * Interface for inbound email providers.
 * Each provider implements this to parse its webhook payload into our normalized format.
 */
export interface InboundEmailProvider {
    /** Provider name identifier */
    name: string;
    /**
     * Parse the incoming webhook body into a normalized InboundEmailPayload.
     * Returns null if the payload is invalid or cannot be parsed.
     */
    parse(payload: Record<string, unknown>): InboundEmailPayload | null;
}

/**
 * AWS SES provider implementation.
 * SES delivers inbound emails via SNS notifications.
 */
export class SESInboundProvider implements InboundEmailProvider {
    name = "ses";

    parse(payload: Record<string, unknown>): InboundEmailPayload | null {
        try {
            // SES SNS notification wraps the mail content
            const snsMessage =
                typeof payload.Message === "string"
                    ? JSON.parse(payload.Message)
                    : payload.Message;

            const mail = snsMessage?.mail || snsMessage;
            const content = snsMessage?.content || mail?.commonHeaders;

            if (!mail) {
                return null;
            }

            // SES sends the email body as base64 in the `content` field
            const rawText =
                typeof snsMessage?.content === "string"
                    ? Buffer.from(snsMessage.content, "base64").toString(
                          "utf-8",
                      )
                    : "";

            // Extract text/plain part
            const text = extractPlainTextFromRawEmail(rawText);

            return {
                from: extractFirstAddress(
                    content?.from || mail?.commonHeaders?.from?.[0] || "",
                ),
                to: extractFirstAddress(
                    content?.to || mail?.commonHeaders?.to?.[0] || "",
                ),
                text: text || "",
                html: rawText,
                subject: content?.subject || mail?.commonHeaders?.subject,
                messageId: mail?.messageId,
                raw: payload,
            };
        } catch {
            return null;
        }
    }
}

/**
 * Postmark provider implementation.
 */
export class PostmarkInboundProvider implements InboundEmailProvider {
    name = "postmark";

    parse(payload: Record<string, unknown>): InboundEmailPayload | null {
        if (!payload.From || !payload.To) {
            return null;
        }

        return {
            from: String(payload.From),
            to: String(payload.To),
            text: String(payload.TextBody || payload.StrippedTextReply || ""),
            html: String(payload.HtmlBody || ""),
            subject: payload.Subject ? String(payload.Subject) : undefined,
            messageId: payload.MessageID
                ? String(payload.MessageID)
                : undefined,
            raw: payload,
        };
    }
}

/**
 * Mailgun provider implementation.
 */
export class MailgunInboundProvider implements InboundEmailProvider {
    name = "mailgun";

    parse(payload: Record<string, unknown>): InboundEmailPayload | null {
        if (!payload.from || !payload.recipient) {
            return null;
        }

        return {
            from: String(payload.from),
            to: String(payload.recipient),
            text: String(payload["body-plain"] || payload["stripped-text"] || ""),
            html: String(payload["body-html"] || ""),
            subject: payload.subject ? String(payload.subject) : undefined,
            messageId: payload["message-id"]
                ? String(payload["message-id"])
                : undefined,
            raw: payload,
        };
    }
}

/**
 * SendGrid Inbound Parse provider implementation.
 */
export class SendGridInboundProvider implements InboundEmailProvider {
    name = "sendgrid";

    parse(payload: Record<string, unknown>): InboundEmailPayload | null {
        if (!payload.from || !payload.to) {
            return null;
        }

        return {
            from: String(payload.from),
            to: String(payload.to),
            text: String(payload.text || payload["stripped-text"] || ""),
            html: String(payload.html || payload["stripped-html"] || ""),
            subject: payload.subject ? String(payload.subject) : undefined,
            messageId: payload.message_id
                ? String(payload.message_id)
                : undefined,
            raw: payload,
        };
    }
}

/**
 * Factory to get the right provider based on config.
 */
export function getInboundEmailProvider(
    providerName?: string,
): InboundEmailProvider {
    const name =
        providerName ||
        process.env.INBOUND_EMAIL_PROVIDER ||
        "ses";

    switch (name) {
        case "postmark":
            return new PostmarkInboundProvider();
        case "mailgun":
            return new MailgunInboundProvider();
        case "sendgrid":
            return new SendGridInboundProvider();
        case "ses":
        default:
            return new SESInboundProvider();
    }
}

/**
 * Extract the email address from a string like "Name <email@example.com>"
 * or just "email@example.com".
 */
function extractFirstAddress(address: string): string {
    const match = address.match(/<([^>]+)>/) || address.match(/([^\s,;]+)/);
    return match ? match[1] || match[0] : address;
}

/**
 * Crude plain-text extraction from raw email content (MIME).
 * Uses line-by-line extraction of text/plain parts.
 */
function extractPlainTextFromRawEmail(raw: string): string {
    if (!raw) return "";

    // Try to find text/plain part in multipart MIME
    const textPlainMatch = raw.match(
        /Content-Type:\s*text\/plain[\s\S]*?(?:\r?\n\r?\n)([\s\S]*?)(?:\r?\n--|$)/i,
    );
    if (textPlainMatch) {
        return textPlainMatch[1].trim();
    }

    // If no MIME parsing works, return raw (it might already be plain text)
    return raw.trim();
}

/**
 * Strips quoted/replied content from an email body.
 * Handles common patterns:
 * - "On ... wrote:" blocks
 * - "> " quoted lines
 * - "--- Original Message ---" separators
 * - "From: ..." forwards
 */
export function stripQuotedContent(text: string): string {
    if (!text) return "";

    const lines = text.split("\n");
    const result: string[] = [];

    // Patterns that indicate quoted content start
    const quoteStartPatterns = [
        /^On\s.+\s?wrote:\s*$/i,
        /^-{3,}\s*Original\s*Message\s*-{3,}\s*$/i,
        /^_{3,}\s*Original\s*Message\s*_{3,}\s*$/i,
        /^>+\s*On\s.+\s?wrote:\s*$/i,
        /^From:.*$/i,
        /^Sent:\s.*$/i,
        /^To:.*$/i,
        /^Subject:.*$/i,
        /^Date:.*$/i,
        /^Reply\s*above\s*this\s*line/i,
        /^#{3,}\s*Forwarded\s*message\s*#{3,}/i,
    ];

    let inQuotedSection = false;
    let consecutiveQuotedLines = 0;

    for (const line of lines) {
        const trimmed = line.trim();

        // Check if this line starts a quoted section
        const isQuoteMarker = quoteStartPatterns.some((p) =>
            p.test(trimmed),
        );

        if (isQuoteMarker) {
            inQuotedSection = true;
            continue;
        }

        // Check for "> " quoted lines
        const isQuotedLine = /^>/.test(line);

        if (inQuotedSection) {
            // Keep going until we hit a non-quoted section
            if (trimmed === "" && consecutiveQuotedLines > 0) {
                // Empty lines inside quoted section
                continue;
            }
            if (isQuotedLine) {
                consecutiveQuotedLines++;
                continue;
            }
            if (trimmed === "") {
                continue;
            }
            // Check if this is an email signature
            if (/^--\s*$/.test(trimmed)) {
                inQuotedSection = true;
                continue;
            }
            // If we hit content that's not quoted, we're past the quoted section
            if (consecutiveQuotedLines > 2) {
                // We're still in quoted territory, skip
                continue;
            }
            inQuotedSection = false;
        }

        if (isQuotedLine) {
            // Count consecutive quoted lines
            consecutiveQuotedLines++;
            if (consecutiveQuotedLines > 3) {
                // Likely a quoted block
                continue;
            }
        } else {
            consecutiveQuotedLines = 0;
        }

        result.push(line);
    }

    return result.join("\n").trim();
}
