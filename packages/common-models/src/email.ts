import { emailActionTypes } from "./constants";

export interface Email {
    emailId: string;
    templateId?: string;
    content: string;
    subject: string;
    previewText?: string;
    delayInMillis: number;
    published: boolean;
    action: {
        type?: (typeof emailActionTypes)[number];
        data?: Record<string, unknown>;
    };
}
