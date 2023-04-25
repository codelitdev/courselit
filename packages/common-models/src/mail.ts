export interface Mail {
    mailId: string;
    to?: string;
    subject?: string;
    body?: string;
    published: boolean;
}
