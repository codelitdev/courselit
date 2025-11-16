import { z } from "zod";

export const ZapierJob = z.object({
    domainId: z.string(),
    action: z.string(),
    payload: z.any(),
});

export type ZapierJob = z.infer<typeof ZapierJob>;
