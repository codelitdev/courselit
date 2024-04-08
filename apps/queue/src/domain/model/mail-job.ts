import { z } from "zod";

export const MailJob = z.object({
    to: z.string().array(),
    from: z.string(),
    subject: z.string(),
    body: z.string(),
});

export type MailJob = z.infer<typeof MailJob>;
