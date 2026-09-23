import { and, eq, inArray } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

/**
 * Return the spaces a learner can access through an active school membership.
 *
 * This is deliberately independent from the community membership tables:
 * product memberships can unlock a space without making the learner a member
 * of the school-wide community.
 */
export async function accessibleSpaceIds(
  db: AppDb,
  schoolId: string,
  schoolAccountId: string,
): Promise<Set<string>> {
  const memberships = await db
    .select()
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.schoolId, schoolId),
        eq(schema.learnerMemberships.schoolAccountId, schoolAccountId),
        eq(schema.learnerMemberships.status, "active"),
      ),
    );
  const ids = new Set<string>();
  if (memberships.length === 0) return ids;

  const unlocks = await db
    .select()
    .from(schema.spaceUnlocks)
    .where(eq(schema.spaceUnlocks.schoolId, schoolId));
  if (unlocks.length === 0) return ids;

  const planRows = await db
    .select({
      unlockId: schema.spaceUnlockPlans.unlockId,
      publicId: schema.storefrontPlans.publicId,
    })
    .from(schema.spaceUnlockPlans)
    .innerJoin(
      schema.storefrontPlans,
      eq(schema.storefrontPlans.id, schema.spaceUnlockPlans.paymentPlanId),
    )
    .where(
      inArray(
        schema.spaceUnlockPlans.unlockId,
        unlocks.map((row) => row.id),
      ),
    );
  const plansByUnlock = new Map<string, string[]>();
  for (const row of planRows) {
    const list = plansByUnlock.get(row.unlockId) ?? [];
    list.push(row.publicId);
    plansByUnlock.set(row.unlockId, list);
  }

  for (const unlock of unlocks) {
    const planIds = plansByUnlock.get(unlock.id) ?? [];

    const match = memberships.some((membership) => {
      if (membership.entityType !== unlock.entityType) return false;
      if (membership.entityId !== unlock.entityId) return false;
      if (planIds.length === 0) return true;
      if (unlock.entityType === "product" && membership.isIncludedInPlan) {
        return false;
      }
      return Boolean(
        membership.paymentPlanId && planIds.includes(membership.paymentPlanId),
      );
    });
    if (match) ids.add(unlock.spaceId);
  }
  return ids;
}
