/**
 * How CourseLit plans are described when someone picks one
 * (docs/wip/plan-limits.md, sections 2 and 4). The limits themselves are the
 * deployment's settings, served in the billing catalog; only the wording
 * lives here.
 */
const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

export type CourseLitPlanKey = "pro" | "business";

/** A plan's limits; `null` is unlimited. */
export type CourseLitPlanLimits = {
  marketing_emails_month: number | null;
  storage_bytes: number | null;
};

function emails(count: number | null): string {
  if (count === null) return "Unlimited marketing email";
  if (count === 0) return "No marketing email";
  return `${count.toLocaleString("en-US")} marketing emails a month`;
}

function storage(bytes: number | null): string {
  if (bytes === null) return "Unlimited storage";
  return bytes >= GB
    ? `${Math.round(bytes / GB)} GB of storage`
    : `${Math.round(bytes / MB)} MB of storage`;
}

/** The short list shown on a plan. Without limits, only the features. */
export function courseLitPlanHighlights(
  plan: CourseLitPlanKey,
  limits?: CourseLitPlanLimits | null,
): string[] {
  const allowance = limits
    ? [emails(limits.marketing_emails_month), storage(limits.storage_bytes)]
    : [];
  return plan === "pro"
    ? [
        "Courses, downloads, communities, website and blog",
        ...allowance,
        "Remove CourseLit branding",
        "Add your own code to your site",
        "Unlimited team members",
      ]
    : [
        "Everything in Pro",
        ...allowance,
        "SCORM lessons",
        "Single sign-on (SSO) for learners",
        "Audit log",
        "Priority support",
      ];
}
