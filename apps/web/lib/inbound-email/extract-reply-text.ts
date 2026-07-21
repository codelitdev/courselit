export const MAX_INBOUND_REPLY_TEXT_LENGTH = 5000;

export async function extractReplyText({
    strippedReply,
    textBody,
}: {
    strippedReply?: string;
    textBody: string;
}): Promise<string> {
    if (strippedReply?.trim()) {
        return strippedReply.trim().slice(0, MAX_INBOUND_REPLY_TEXT_LENGTH);
    }

    const { default: EmailReplyParser } = await import("email-reply-parser");
    const candidate = new EmailReplyParser().parseReply(textBody);

    return candidate.trim().slice(0, MAX_INBOUND_REPLY_TEXT_LENGTH);
}
