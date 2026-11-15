/**
 * What each CourseLit plan includes on courselit.app (docs/wip/plan-limits.md,
 * sections 2, 4 and 5). The API enforces these limits and the admin shows
 * them when someone picks a plan, so both read them from here.
 */
const GB = 1024 * 1024 * 1024;

export type CourseLitPlanKey = "pro" | "business";

export const COURSELIT_PLAN_LIMITS: Record<
  CourseLitPlanKey,
  { marketing_emails_month: number | null; storage_bytes: number | null }
> = {
  pro: { marketing_emails_month: 10_000, storage_bytes: 20 * GB },
  business: { marketing_emails_month: 50_000, storage_bytes: 200 * GB },
};

function emails(count: number | null): string {
  return count === null
    ? "Unlimited marketing email"
    : `${count.toLocaleString("en-US")} marketing emails a month`;
}

function storage(bytes: number | null): string {
  return bytes === null ? "Unlimited storage" : `${Math.round(bytes / GB)} GB of storage`;
}

/** The short list shown on each plan when someone picks one. */
export const COURSELIT_PLAN_HIGHLIGHTS: Record<CourseLitPlanKey, readonly string[]> = {
  pro: [
    "Courses, downloads, communities, website and blog",
    emails(COURSELIT_PLAN_LIMITS.pro.marketing_emails_month),
    storage(COURSELIT_PLAN_LIMITS.pro.storage_bytes),
    "Remove CourseLit branding",
    "Add your own code to your site",
    "Unlimited team members",
  ],
  business: [
    "Everything in Pro",
    emails(COURSELIT_PLAN_LIMITS.business.marketing_emails_month),
    storage(COURSELIT_PLAN_LIMITS.business.storage_bytes),
    "SCORM lessons",
    "Single sign-on (SSO) for learners",
    "Audit log",
    "Priority support",
  ],
};
