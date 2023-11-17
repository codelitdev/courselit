export interface Email {
    emailId: string;
    templateId: string;
    content: string;
    subject: string;
    delayInMillis: number;
    published: boolean;
}
