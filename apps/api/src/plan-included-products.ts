import { type Clock, uuidv7 } from "@codelitdev/platform";
import { and, eq, inArray } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  revokeLearnerMembership,
  upsertLearnerMembership,
} from "./learner-memberships.js";
import type { AppDb } from "./types.js";

/**
 * Products bundled into community plans.
 *
 * A community plan includes either every published product of the school
 * (`includesAllProducts`), or an explicit list (`includedProducts`). Access is
 * always an eager `learner_memberships` row per product (isIncludedInPlan,
 * paymentPlanId = the plan, parentMembershipId = the community membership),
 * so access checks never derive it at read time. The rows are created when a
 * member joins or is approved, and kept in step by the background job below
 * when a product is published or a plan's included products change.
 */

type PlanIncludes = {
  publicId: string;
  includesAllProducts: boolean;
  includedProducts: string[];
};

export const SYNC_PLAN_INCLUDED_PRODUCTS_JOB = "sync_plan_included_products";

export type SyncPlanIncludedProductsPayload =
  | { planId: string }
  | { productId: string };

/**
 * The public IDs of the products a plan includes right now: every published
 * product for an all-products plan, or the plan's list (restricted to products
 * that still exist in the school).
 */
export async function planIncludedProductIds(
  db: AppDb,
  schoolId: string,
  plan: PlanIncludes,
): Promise<string[]> {
  if (plan.includesAllProducts) {
    const rows = await db
      .select({ publicId: schema.products.publicId })
      .from(schema.products)
      .where(
        and(
          eq(schema.products.schoolId, schoolId),
          eq(schema.products.status, "published"),
        ),
      );
    return rows.map((row) => row.publicId);
  }
  const ids = [...new Set(plan.includedProducts)];
  if (ids.length === 0) return [];
  const rows = await db
    .select({ publicId: schema.products.publicId })
    .from(schema.products)
    .where(
      and(eq(schema.products.schoolId, schoolId), inArray(schema.products.publicId, ids)),
    );
  return rows.map((row) => row.publicId);
}

/** Gives one community member a product through their plan. */
export async function grantPlanIncludedProduct(
  db: AppDb,
  input: {
    schoolId: string;
    schoolAccountId: string;
    productPublicId: string;
    planPublicId: string;
    parent: { id: string; sessionId: string | null };
  },
  clock: Clock,
  options: { silent?: boolean } = {},
) {
  return upsertLearnerMembership(
    db,
    {
      schoolId: input.schoolId,
      schoolAccountId: input.schoolAccountId,
      entityType: "product",
      entityId: input.productPublicId,
      paymentPlanId: input.planPublicId,
      status: "active",
      sessionId: input.parent.sessionId,
      isIncludedInPlan: true,
      parentMembershipId: input.parent.id,
    },
    clock,
    options,
  );
}

/**
 * Brings every active member of a community plan in line with what the plan
 * includes now: grants the products they are missing and revokes the
 * plan-included rows for products the plan no longer includes. Revoked rows
 * are expired, not deleted, so progress survives and re-adding the product
 * restores it. The system makes these changes on its own, so no mailing
 * events are queued. Idempotent: running it twice changes nothing.
 *
 * `onlyProductId` limits the work to one product (a product that was just
 * published), and then nothing is revoked.
 */
export async function syncPlanIncludedProducts(
  db: AppDb,
  schoolId: string,
  plan: PlanIncludes,
  clock: Clock,
  options: { onlyProductId?: string } = {},
): Promise<{ granted: number; revoked: number }> {
  let included = await planIncludedProductIds(db, schoolId, plan);
  if (options.onlyProductId) {
    included = included.filter((id) => id === options.onlyProductId);
    if (included.length === 0) return { granted: 0, revoked: 0 };
  }
  const desired = new Set(included);
  const members = await db
    .select()
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.schoolId, schoolId),
        eq(schema.learnerMemberships.entityType, "community"),
        eq(schema.learnerMemberships.paymentPlanId, plan.publicId),
        eq(schema.learnerMemberships.status, "active"),
      ),
    );
  const result = { granted: 0, revoked: 0 };
  for (const member of members) {
    const rows = await db
      .select()
      .from(schema.learnerMemberships)
      .where(
        and(
          eq(schema.learnerMemberships.schoolId, schoolId),
          eq(schema.learnerMemberships.schoolAccountId, member.schoolAccountId),
          eq(schema.learnerMemberships.entityType, "product"),
          eq(schema.learnerMemberships.isIncludedInPlan, true),
          eq(schema.learnerMemberships.parentMembershipId, member.id),
        ),
      );
    const active = new Set(
      rows
        .filter((row) => row.status === "active" && row.paymentPlanId === plan.publicId)
        .map((row) => row.entityId),
    );
    for (const productPublicId of desired) {
      if (active.has(productPublicId)) continue;
      await grantPlanIncludedProduct(
        db,
        {
          schoolId,
          schoolAccountId: member.schoolAccountId,
          productPublicId,
          planPublicId: plan.publicId,
          parent: member,
        },
        clock,
        { silent: true },
      );
      result.granted += 1;
    }
    if (options.onlyProductId) continue;
    for (const row of rows) {
      if (row.status !== "active" || desired.has(row.entityId)) continue;
      await revokeLearnerMembership(db, row.id, "expired", clock, { silent: true });
      result.revoked += 1;
    }
  }
  return result;
}

/**
 * Queues the fan-out on the worker's platform job queue, so a publish or a
 * plan edit never waits on a school's whole membership. `{ planId }`
 * reconciles one plan's members; `{ productId }` gives a newly published
 * product to members of every all-products plan.
 */
export async function queuePlanIncludedProductsSync(
  db: AppDb,
  schoolId: string,
  payload: SyncPlanIncludedProductsPayload,
  clock: Clock,
): Promise<void> {
  const now = clock.now();
  await db.insert(schema.integrationOutboxJobs).values({
    id: uuidv7(clock),
    schoolId,
    provider: "platform",
    type: SYNC_PLAN_INCLUDED_PRODUCTS_JOB,
    payload,
    status: "pending",
    attempts: 0,
    revision: 1,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

/** Runs one `sync_plan_included_products` job. Safe to retry. */
export async function runPlanIncludedProductsJob(
  db: AppDb,
  schoolId: string,
  payload: Record<string, unknown>,
  clock: Clock,
): Promise<{ granted: number; revoked: number }> {
  if (typeof payload.planId === "string") {
    const [plan] = await db
      .select()
      .from(schema.storefrontPlans)
      .where(
        and(
          eq(schema.storefrontPlans.schoolId, schoolId),
          eq(schema.storefrontPlans.publicId, payload.planId),
          eq(schema.storefrontPlans.entityType, "community"),
        ),
      )
      .limit(1);
    if (!plan) return { granted: 0, revoked: 0 };
    return db.transaction((tx) =>
      syncPlanIncludedProducts(tx as unknown as AppDb, schoolId, plan, clock),
    );
  }
  if (typeof payload.productId === "string") {
    const productId = payload.productId;
    // Members keep the plan they joined on even once it is archived.
    const plans = await db
      .select()
      .from(schema.storefrontPlans)
      .where(
        and(
          eq(schema.storefrontPlans.schoolId, schoolId),
          eq(schema.storefrontPlans.entityType, "community"),
          eq(schema.storefrontPlans.includesAllProducts, true),
        ),
      );
    const total = { granted: 0, revoked: 0 };
    for (const plan of plans) {
      const result = await db.transaction((tx) =>
        syncPlanIncludedProducts(tx as unknown as AppDb, schoolId, plan, clock, {
          onlyProductId: productId,
        }),
      );
      total.granted += result.granted;
    }
    return total;
  }
  throw new Error("invalid_sync_plan_included_products_payload");
}
