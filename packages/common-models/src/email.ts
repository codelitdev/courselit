import { emailActionTypes } from "./constants";
import type { Email as EmailContent } from "@courselit/email-editor";

export interface Email {
    emailId: string;
    // templateId?: string;
    content: EmailContent;
    subject: string;
    // previewText?: string;
    delayInMillis: number;
    published: boolean;
    action: {
        type?: (typeof emailActionTypes)[number];
        data?: Record<string, unknown>;
    };
}
