import { z } from "zod";

/**
 * A school's name goes into the subject of every email the platform sends
 * for it, under CourseLit's reputation (docs/wip/plan-limits.md, S14). So it
 * can't carry a link or an address: no URLs, email addresses or domain-like
 * words such as `paypal.com`.
 */
export const schoolNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine((name) => !/[\r\n]/.test(name), { message: "school_name_invalid" })
  .refine(
    (name) => !/(:\/\/|www\.|@|[a-z0-9-]\.[a-z]{2,})/i.test(name),
    { message: "school_name_link_not_allowed" },
  );
