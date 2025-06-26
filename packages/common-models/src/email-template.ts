import type { Email } from "@courselit/email-editor";

export interface EmailTemplate {
    templateId: string;
    title: string;
    content: Email;
}
