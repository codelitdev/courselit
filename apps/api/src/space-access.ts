import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

/**
 * Who owns each space: a product's discussions, or the school's community
 * (every other space). A space is live, and visible to learners, only while
 * its owner is switched on: the product has discussions enabled, or the
 * community is launched.
 */
export async function spaceOwnership(db: AppDb, schoolId: string) {
  const [productRows, communityRows] = await Promise.all([
    db
      .select({
        spaceId: schema.products.discussionSpaceId,
        discussions: schema.products.discussions,
      })
      .from(schema.products)
      .where(
        and(eq(schema.products.schoolId, schoolId), isNotNull(schema.products.discussionSpaceId)),
      ),
    db
      .select({ enabled: schema.communities.enabled })
      .from(schema.communities)
      .where(and(eq(schema.communities.schoolId, schoolId), isNull(schema.communities.deletedAt)))
      .limit(1),
  ]);
  /** Course discussion space id → whether the course's discussions are on. */
  const productSpaces = new Map<string, boolean>();
  for (const row of productRows) {
    if (row.spaceId) productSpaces.set(row.spaceId, row.discussions);
  }
  const communityLaunched = communityRows[0]?.enabled === true;
  return {
    productSpaces,
    isLive(spaceId: string) {
      return productSpaces.get(spaceId) ?? communityLaunched;
    },
  };
}

/**
 * Return the spaces a learner can access through an active school membership.
 * Spaces whose owner is switched off (see `spaceOwnership`) are left out.
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
  if (ids.size === 0) return ids;
  const ownership = await spaceOwnership(db, schoolId);
  for (const id of ids) {
    if (!ownership.isLive(id)) ids.delete(id);
  }
  return ids;
}
