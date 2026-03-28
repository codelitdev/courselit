import { z } from "zod";

export const MailJob = z.object({
    to: z.string().array(),
    from: z.string(),
    subject: z.string(),
    body: z.string(),
    domainId: z.string(),
    headers: z.record(z.string()).optional(),
});

export type MailJob = z.infer<typeof MailJob>;
