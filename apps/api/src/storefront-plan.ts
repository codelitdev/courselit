import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { type Billing, schoolHasFeature } from "./plan-features.js";
import { CODE_INJECTION_FEATURE, REMOVE_BRANDING_FEATURE } from "./school-plan.js";
import type { AppDb } from "./types.js";

/**
 * What a school's plan changes on its public site (docs/wip/plan-limits.md,
 * section 4):
 * - the "Powered by CourseLit" badge shows unless the school hid it and its
 *   plan includes `remove_branding`;
 * - injected code is public only with `code_injection`. Without it (a trial)
 *   only the owner sees it, through its own authenticated call (S25).
 */
export async function storefrontPlanFlags(
  deps: { db: AppDb; billing: Billing; now: Date },
  schoolInternalId: string,
): Promise<{ showCourseLitBranding: boolean; publicCodeInjection: boolean }> {
  const [row] = await deps.db
    .select({ hide: schema.schools.hideCourseLitBranding })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolInternalId))
    .limit(1);
  const [removeBranding, codeInjection] = await Promise.all([
    row?.hide
      ? schoolHasFeature(
          deps.billing,
          schoolInternalId,
          REMOVE_BRANDING_FEATURE,
          deps.db,
          deps.now,
        )
      : false,
    schoolHasFeature(
      deps.billing,
      schoolInternalId,
      CODE_INJECTION_FEATURE,
      deps.db,
      deps.now,
    ),
  ]);
  return {
    showCourseLitBranding: !(row?.hide === true && removeBranding),
    publicCodeInjection: codeInjection,
  };
}

/** The badge link, with the attribution the plan asks for. */
export function courseLitBadgeUrl(subdomain: string): string {
  const url = new URL("https://courselit.app/");
  url.searchParams.set("utm_source", subdomain);
  url.searchParams.set("utm_medium", "badge");
  url.searchParams.set("utm_campaign", "powered_by");
  return url.toString();
}

/** Whether a school account is the school's owner. */
export async function isSchoolOwnerAccount(
  db: AppDb,
  schoolInternalId: string,
  schoolAccountId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.memberships.id })
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.schoolId, schoolInternalId),
        eq(schema.memberships.schoolAccountId, schoolAccountId),
        eq(schema.memberships.isOwner, true),
      ),
    )
    .limit(1);
  return row !== undefined;
}
