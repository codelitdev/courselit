import { type Clock, createPublicId, uuidv7 } from "@codelitdev/platform";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { getPaymentProvider, type PaymentProvider } from "./payments.js";
import type { AppDb } from "./types.js";

export type LearnerMembershipStatus =
  | "active"
  | "payment_failed"
  | "expired"
  | "pending"
  | "rejected"
  | "paused";

export type LearnerMembershipEntityType = "product" | "community";

export type LearnerMembershipRow = typeof schema.learnerMemberships.$inferSelect;

type MembershipInput = {
  schoolId: string;
  schoolAccountId?: string;
  learnerId?: string;
  entityType: LearnerMembershipEntityType;
  entityId: string;
  paymentPlanId?: string | null;
  status: LearnerMembershipStatus;
  role?: "comment" | "post" | "moderate" | null;
  subscriptionId?: string | null;
  subscriptionMethod?: string | null;
  joiningReason?: string;
  rejectionReason?: string | null;
  sessionId?: string | null;
  isIncludedInPlan?: boolean;
  parentMembershipId?: string | null;
};

function parentCondition(parentMembershipId: string | null | undefined) {
  return parentMembershipId
    ? eq(schema.learnerMemberships.parentMembershipId, parentMembershipId)
    : isNull(schema.learnerMemberships.parentMembershipId);
}

/** Find a membership by its durable learner/entity relationship. */
export async function findLearnerMembership(
  db: AppDb,
  input: Pick<MembershipInput, "schoolId" | "schoolAccountId" | "learnerId" | "entityType" | "entityId"> & {
    isIncludedInPlan?: boolean;
    parentMembershipId?: string | null;
  },
): Promise<LearnerMembershipRow | null> {
  const accountId = input.schoolAccountId ?? input.learnerId!;
  const rows = await db
    .select()
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.schoolId, input.schoolId),
        eq(schema.learnerMemberships.schoolAccountId, accountId),
        eq(schema.learnerMemberships.entityType, input.entityType),
        eq(schema.learnerMemberships.entityId, input.entityId),
        eq(schema.learnerMemberships.isIncludedInPlan, input.isIncludedInPlan ?? false),
        parentCondition(input.parentMembershipId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Create or update one relationship, keeping checkout retries idempotent. */
export async function upsertLearnerMembership(
  db: AppDb,
  input: MembershipInput,
  clock: Clock,
): Promise<LearnerMembershipRow> {
  const included = input.isIncludedInPlan ?? false;
  const existing = await findLearnerMembership(db, {
    ...input,
    isIncludedInPlan: included,
  });
  const now = clock.now();
  const values = {
    paymentPlanId:
      input.paymentPlanId !== undefined
        ? input.paymentPlanId
        : existing?.paymentPlanId ?? null,
    status: input.status,
    role: input.role !== undefined ? input.role : existing?.role ?? null,
    subscriptionId:
      input.subscriptionId !== undefined
        ? input.subscriptionId
        : existing?.subscriptionId ?? null,
    subscriptionMethod:
      input.subscriptionMethod !== undefined
        ? input.subscriptionMethod
        : existing?.subscriptionMethod ?? null,
    joiningReason: input.joiningReason ?? existing?.joiningReason ?? "",
    rejectionReason:
      input.rejectionReason !== undefined
        ? input.rejectionReason
        : existing?.rejectionReason ?? null,
    sessionId:
      input.sessionId !== undefined ? input.sessionId : existing?.sessionId ?? null,
    isIncludedInPlan: included,
    parentMembershipId: input.parentMembershipId ?? null,
    updatedAt: now,
  };
  if (existing) {
    await db
      .update(schema.learnerMemberships)
      .set(values)
      .where(eq(schema.learnerMemberships.id, existing.id));
    return { ...existing, ...values };
  }
  const accountId = input.schoolAccountId ?? input.learnerId!;
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("lrm", clock),
    schoolId: input.schoolId,
    schoolAccountId: accountId,
    entityType: input.entityType,
    entityId: input.entityId,
    ...values,
    createdAt: now,
  } satisfies typeof schema.learnerMemberships.$inferInsert;
  await db.insert(schema.learnerMemberships).values(row);
  return row;
}

export async function activeProductMembership(
  db: AppDb,
  input: { schoolId: string; schoolAccountId?: string; learnerId?: string; productPublicId: string },
): Promise<LearnerMembershipRow | null> {
  const accountId = input.schoolAccountId ?? input.learnerId!;
  const rows = await db
    .select()
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.schoolId, input.schoolId),
        eq(schema.learnerMemberships.schoolAccountId, accountId),
        eq(schema.learnerMemberships.entityType, "product"),
        eq(schema.learnerMemberships.entityId, input.productPublicId),
        eq(schema.learnerMemberships.status, "active"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function activeProductMemberships(
  db: AppDb,
  input: { schoolId: string; schoolAccountId?: string; learnerId?: string; productPublicId: string },
): Promise<LearnerMembershipRow[]> {
  const accountId = input.schoolAccountId ?? input.learnerId!;
  return db
    .select()
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.schoolId, input.schoolId),
        eq(schema.learnerMemberships.schoolAccountId, accountId),
        eq(schema.learnerMemberships.entityType, "product"),
        eq(schema.learnerMemberships.entityId, input.productPublicId),
        eq(schema.learnerMemberships.status, "active"),
      ),
    );
}

/** Revoke a membership and every product membership derived from it. */
export async function revokeLearnerMembership(
  db: AppDb,
  membershipId: string,
  status: Extract<LearnerMembershipStatus, "expired" | "payment_failed" | "rejected">,
  clock: Clock,
  options: {
    cancelSubscription?: boolean;
    paymentProvider?: PaymentProvider | null;
  } = {},
): Promise<void> {
  const membership = (
    await db
      .select()
      .from(schema.learnerMemberships)
      .where(eq(schema.learnerMemberships.id, membershipId))
      .limit(1)
  )[0];
  if (!membership) return;

  if (options.cancelSubscription !== false && membership.subscriptionId) {
    const paymentProvider =
      options.paymentProvider ?? (await getPaymentProvider(db, membership.schoolId));
    if (!paymentProvider?.cancelSubscription) {
      throw new Error("provider_unavailable");
    }
    await paymentProvider.cancelSubscription(membership.subscriptionId);
  }

  const now = clock.now();
  await db
    .update(schema.learnerMemberships)
    .set({ status, updatedAt: now })
    .where(eq(schema.learnerMemberships.id, membershipId));
  await db
    .update(schema.learnerMemberships)
    .set({ status, updatedAt: now })
    .where(eq(schema.learnerMemberships.parentMembershipId, membershipId));
}
