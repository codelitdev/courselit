export interface ReplyTokenPayload {
    userId: string;
    domainId: string;
    entityId: string;
    entityType: "community" | "product";
    commentId?: string;
    parentReplyId?: string;
}

export interface InboundEmailConfig {
    provider: "ses" | "postmark" | "mailgun" | "sendgrid";
    endpoint?: string;
    apiKey?: string;
}
