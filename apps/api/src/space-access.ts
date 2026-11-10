import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { parsePermissions } from "./permissions.js";
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
 * The live spaces a school account reaches as a member of the school's team,
 * without buying or joining anything. A product's discussion belongs to the
 * course, so it follows `products:write`; the community's spaces follow
 * `communities:moderate`. The owner has both. Team members may also post in
 * these spaces where only admins can.
 */
export async function staffSpaceIds(
  db: AppDb,
  schoolId: string,
  schoolAccountId: string,
): Promise<Set<string>> {
  const [staff] = await db
    .select({
      isOwner: schema.memberships.isOwner,
      permissions: schema.memberships.permissions,
    })
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.schoolId, schoolId),
        eq(schema.memberships.schoolAccountId, schoolAccountId),
      ),
    )
    .limit(1);
  if (!staff) return new Set();
  const permissions = parsePermissions(staff.permissions);
  const products = staff.isOwner || permissions.has("products:write");
  const community = staff.isOwner || permissions.has("communities:moderate");
  if (!products && !community) return new Set();
  const [rows, ownership] = await Promise.all([
    db
      .select({ id: schema.spaces.id })
      .from(schema.spaces)
      .where(eq(schema.spaces.schoolId, schoolId)),
    spaceOwnership(db, schoolId),
  ]);
  return new Set(
    rows
      .map((row) => row.id)
      .filter((id) => {
        if (!ownership.isLive(id)) return false;
        return ownership.productSpaces.has(id) ? products : community;
      }),
  );
}

/**
 * Whether a school account may remove other people's posts and comments in a
 * space. A course discussion is moderated by the team members who manage
 * products; a community space by those who moderate the community, and by
 * community members given the moderator role.
 */
export async function moderatesSpace(
  db: AppDb,
  schoolId: string,
  schoolAccountId: string,
  spaceId: string,
): Promise<boolean> {
  if ((await staffSpaceIds(db, schoolId, schoolAccountId)).has(spaceId)) return true;
  const ownership = await spaceOwnership(db, schoolId);
  if (ownership.productSpaces.has(spaceId)) return false;
  const [moderator] = await db
    .select({ id: schema.learnerMemberships.id })
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.schoolId, schoolId),
        eq(schema.learnerMemberships.schoolAccountId, schoolAccountId),
        eq(schema.learnerMemberships.entityType, "community"),
        eq(schema.learnerMemberships.status, "active"),
        eq(schema.learnerMemberships.role, "moderate"),
      ),
    )
    .limit(1);
  return Boolean(moderator);
}

/**
 * Return the spaces a school account can access: those its active learner
 * memberships unlock, plus those it reaches as a team member (see
 * `staffSpaceIds`). Spaces whose owner is switched off (see `spaceOwnership`)
 * are left out.
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
  const [learner, staff] = await Promise.all([
    learnerSpaceIds(db, schoolId, schoolAccountId),
    staffSpaceIds(db, schoolId, schoolAccountId),
  ]);
  for (const id of staff) learner.add(id);
  return learner;
}

async function learnerSpaceIds(
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
