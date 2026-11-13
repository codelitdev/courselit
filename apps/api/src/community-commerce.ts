import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { ActivityType, recordActivity } from "./activities.js";
import { communityPlanToDto } from "./community-plans.js";
import * as schema from "./db/schema/index.js";
import {
  findLearnerMembership,
  type LearnerMembershipRow,
  revokeLearnerMembership,
  unstageLearnerMembership,
  upsertLearnerMembership,
} from "./learner-memberships.js";
import { createSchoolAdminNotifications } from "./notifications.js";
import { notifyCheckoutRefused, notifyPaymentSucceeded } from "./purchase-notifications.js";
import {
  getPaymentProvider,
  type PaymentCheckoutResult,
  type PaymentProvider,
  type PaymentWebhookScope,
} from "./payments.js";
import { nextRefundedAmount } from "./revenue.js";
import { amountMinorForPlan } from "./storefront.js";
import type { AppDb } from "./types.js";

type CommunityCheckoutStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "disputed";

export type CommunityCheckoutDto = {
  id: string;
  schoolId: string;
  communityId: string;
  planId: string;
  provider: "free" | "stripe" | "lemonsqueezy" | "razorpay";
  status: CommunityCheckoutStatus;
  currency: string;
  amountMinor: number;
  checkoutUrl: string | null;
  checkoutData: PaymentCheckoutResult["checkoutData"];
  createdAt: string;
  updatedAt: string;
};

export type CommunityCheckoutContext = {
  schoolId: string;
  publicSchoolId: string;
  learnerId: string;
  schoolAccountId?: string;
  learnerPublicId: string;
  learnerEmail: string;
  learnerName: string;
  requestId: string;
};

type CommunityCheckoutRow = typeof schema.communityCheckoutAttempts.$inferSelect;

function error(
  code: Parameters<typeof createPlatformError>[0],
  safeDetails?: Record<string, string | number | boolean | null>,
): { ok: false; error: PlatformError } {
  return {
    ok: false,
    error: createPlatformError(code, safeDetails ? { safeDetails } : undefined),
  };
}

function checkoutToDto(
  row: CommunityCheckoutRow,
  publicSchoolId: string,
  publicCommunityId: string,
  publicPlanId: string,
  checkoutData: PaymentCheckoutResult["checkoutData"] = null,
): CommunityCheckoutDto {
  return {
    id: row.publicId,
    schoolId: publicSchoolId,
    communityId: publicCommunityId,
    planId: publicPlanId,
    provider: row.provider,
    status: row.status,
    currency: row.currency,
    amountMinor: row.amountMinor,
    checkoutUrl: row.providerCheckoutUrl,
    checkoutData,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  };
}

function completedMembershipCheckoutDto(
  context: CommunityCheckoutContext,
  community: typeof schema.communities.$inferSelect,
  plan: typeof schema.storefrontPlans.$inferSelect,
  membership: LearnerMembershipRow,
  currency: string,
): CommunityCheckoutDto {
  const provider = membership.subscriptionMethod;
  return {
    id: membership.publicId,
    schoolId: context.publicSchoolId,
    communityId: community.publicId,
    planId: plan.publicId,
    provider:
      provider === "stripe" || provider === "lemonsqueezy" || provider === "razorpay"
        ? provider
        : "free",
    status: "paid",
    currency,
    amountMinor: amountMinorForPlan(plan, currency),
    checkoutUrl: null,
    checkoutData: null,
    createdAt: serializeDate(membership.createdAt),
    updatedAt: serializeDate(membership.updatedAt),
  };
}

async function loadCommunityPlan(
  db: AppDb,
  schoolId: string,
  communityPublicId: string,
  planPublicId: string,
) {
  const rows = await db
    .select({
      plan: schema.storefrontPlans,
      community: schema.communities,
      school: schema.schools,
    })
    .from(schema.storefrontPlans)
    .innerJoin(
      schema.communities,
      and(
        eq(schema.communities.publicId, schema.storefrontPlans.entityId),
        eq(schema.storefrontPlans.entityType, "community"),
      ),
    )
    .innerJoin(
      schema.schools,
      eq(schema.schools.id, schema.storefrontPlans.schoolId),
    )
    .where(
      and(
        eq(schema.storefrontPlans.schoolId, schoolId),
        eq(schema.storefrontPlans.entityType, "community"),
        eq(schema.storefrontPlans.entityId, communityPublicId),
        eq(schema.storefrontPlans.publicId, planPublicId),
        eq(schema.storefrontPlans.status, "active"),
        eq(schema.communities.publicId, communityPublicId),
        isNull(schema.communities.deletedAt),
        eq(schema.communities.enabled, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function loadCommunityPlans(
  db: AppDb,
  schoolId: string,
  communityPublicId: string,
) {
  const rows = await db
    .select({
      plan: schema.storefrontPlans,
      community: schema.communities,
      school: schema.schools,
    })
    .from(schema.storefrontPlans)
    .innerJoin(
      schema.communities,
      and(
        eq(schema.communities.publicId, schema.storefrontPlans.entityId),
        eq(schema.storefrontPlans.entityType, "community"),
      ),
    )
    .innerJoin(
      schema.schools,
      eq(schema.schools.id, schema.storefrontPlans.schoolId),
    )
    .where(
      and(
        eq(schema.storefrontPlans.schoolId, schoolId),
        eq(schema.storefrontPlans.entityType, "community"),
        eq(schema.storefrontPlans.entityId, communityPublicId),
        eq(schema.communities.publicId, communityPublicId),
        isNull(schema.communities.deletedAt),
        eq(schema.communities.enabled, true),
      ),
    );
  return rows;
}

export async function listLearnerCommunityPlans(
  db: AppDb,
  context: CommunityCheckoutContext,
  communityPublicId: string,
) {
  const rows = await loadCommunityPlans(db, context.schoolId, communityPublicId);
  if (!rows[0]) {
    const community = await db
      .select({ id: schema.communities.id })
      .from(schema.communities)
      .where(
        and(
          eq(schema.communities.schoolId, context.schoolId),
          eq(schema.communities.publicId, communityPublicId),
          isNull(schema.communities.deletedAt),
          eq(schema.communities.enabled, true),
        ),
      )
      .limit(1);
    if (!community[0]) return error("not_found");
  }
  return {
    ok: true as const,
    value: rows.map((row) =>
      communityPlanToDto(
        row.plan,
        context.publicSchoolId,
        row.community.publicId,
        row.school.currency.toUpperCase(),
      ),
    ),
  };
}

async function loadCheckout(
  db: AppDb,
  context: CommunityCheckoutContext,
  checkoutPublicId: string,
) {
  const rows = await db
    .select({
      attempt: schema.communityCheckoutAttempts,
      community: schema.communities,
      plan: schema.storefrontPlans,
    })
    .from(schema.communityCheckoutAttempts)
    .innerJoin(
      schema.communities,
      eq(schema.communities.id, schema.communityCheckoutAttempts.communityId),
    )
    .innerJoin(
      schema.storefrontPlans,
      and(
        eq(schema.storefrontPlans.id, schema.communityCheckoutAttempts.planId),
        eq(schema.storefrontPlans.entityType, "community"),
      ),
    )
    .where(
      and(
        eq(schema.communityCheckoutAttempts.publicId, checkoutPublicId),
        eq(schema.communityCheckoutAttempts.schoolId, context.schoolId),
        eq(schema.communityCheckoutAttempts.schoolAccountId, context.learnerId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function includedProducts(db: AppDb, schoolId: string, publicIds: string[]) {
  if (publicIds.length === 0) return [];
  return db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.schoolId, schoolId),
        inArray(schema.products.publicId, publicIds),
      ),
    );
}

export async function activateCommunityPlan(
  tx: AppDb,
  context: CommunityCheckoutContext,
  community: typeof schema.communities.$inferSelect,
  plan: typeof schema.storefrontPlans.$inferSelect,
  clock: Clock,
  joiningReason = "",
  options: { invited?: boolean } = {},
) {
  const existing = await findLearnerMembership(tx, {
    schoolId: context.schoolId,
    schoolAccountId: context.schoolAccountId ?? context.learnerId,
    entityType: "community",
    entityId: community.publicId,
  });
  // An admin invite is the approval, so invited members skip the request queue.
  const status =
    !options.invited && plan.kind === "free" && !community.autoAcceptMembers
      ? "pending"
      : "active";
  const learnerMembership = await upsertLearnerMembership(
    tx,
    {
      schoolId: context.schoolId,
      schoolAccountId: context.schoolAccountId ?? context.learnerId,
      entityType: "community",
      entityId: community.publicId,
      paymentPlanId: plan.publicId,
      status,
      role: status === "active" ? "post" : "comment",
      joiningReason: joiningReason || existing?.joiningReason || "",
      ...(options.invited ? { rejectionReason: null } : {}),
    },
    clock,
  );
  const wasActive = existing?.status === "active";
  const membershipPublicId = learnerMembership.publicId;
  if (!wasActive) {
    await recordActivity(
      tx as unknown as AppDb,
      {
        schoolId: context.schoolId,
        actorId: context.learnerId,
        type:
          status === "active"
            ? ActivityType.COMMUNITY_JOINED
            : ActivityType.COMMUNITY_MEMBERSHIP_REQUESTED,
        entityId: community.publicId,
        metadata: { membershipId: membershipPublicId },
      },
      clock,
    );
    // The inviting admin already knows; don't notify the team about it.
    if (!options.invited) await createSchoolAdminNotifications(
      tx as unknown as AppDb,
      context.schoolId,
      {
        type: status === "pending" ? "community_membership_requested" : "community_joined",
        title:
          status === "pending"
            ? "New community membership request"
            : "New community member",
        body:
          status === "pending"
            ? `A learner requested to join “${community.name}”.`
            : `A learner joined “${community.name}”.`,
        href: `/community/memberships`,
      },
      clock,
    );
  }
  if (status === "active") {
    await grantIncludedProducts(
      tx,
      { schoolId: context.schoolId, schoolAccountId: context.schoolAccountId ?? context.learnerId },
      plan,
      learnerMembership,
      clock,
    );
  }
  return learnerMembership;
}

/**
 * Gives an active community member the products bundled into their plan. Runs
 * whenever a membership becomes active: on joining, and when staff approve a
 * request, so approval-only communities hand out the bundle too.
 */
export async function grantIncludedProducts(
  tx: AppDb,
  member: { schoolId: string; schoolAccountId: string },
  plan: { publicId: string; includedProducts: string[] },
  parent: { id: string; sessionId: string | null },
  clock: Clock,
) {
  if (plan.includedProducts.length === 0) return;
  const products = await includedProducts(tx, member.schoolId, plan.includedProducts);
  for (const product of products) {
    await upsertLearnerMembership(
      tx,
      {
        schoolId: member.schoolId,
        schoolAccountId: member.schoolAccountId,
        entityType: "product",
        entityId: product.publicId,
        paymentPlanId: plan.publicId,
        status: "active",
        sessionId: parent.sessionId,
        isIncludedInPlan: true,
        parentMembershipId: parent.id,
      },
      clock,
    );
  }
}

async function stageCommunityMembership(
  db: AppDb,
  context: CommunityCheckoutContext,
  community: typeof schema.communities.$inferSelect,
  plan: typeof schema.storefrontPlans.$inferSelect,
  joiningReason: string,
  clock: Clock,
  sessionId?: string,
) {
  return upsertLearnerMembership(
    db,
    {
      schoolId: context.schoolId,
      schoolAccountId: context.schoolAccountId ?? context.learnerId,
      entityType: "community",
      entityId: community.publicId,
      paymentPlanId: plan.publicId,
      status: "pending",
      role: "comment",
      ...(plan.kind === "free"
        ? {}
        : { subscriptionId: null, subscriptionMethod: null }),
      joiningReason,
      sessionId,
    },
    clock,
  );
}

async function fulfillFreeCheckout(
  db: AppDb,
  row: CommunityCheckoutRow,
  community: typeof schema.communities.$inferSelect,
  plan: typeof schema.storefrontPlans.$inferSelect,
  context: CommunityCheckoutContext,
  clock: Clock,
) {
  const now = clock.now();
  return db.transaction(async (tx) => {
    const current = (
      await tx
        .select()
        .from(schema.communityCheckoutAttempts)
        .where(eq(schema.communityCheckoutAttempts.id, row.id))
        .limit(1)
    )[0];
    if (!current) throw new Error("community_checkout_missing");
    if (current.status === "paid") return current;
    const learnerMembership = await activateCommunityPlan(
      tx as unknown as AppDb,
      context,
      community,
      plan,
      clock,
    );
    await tx
      .update(schema.communityCheckoutAttempts)
      .set({ membershipId: learnerMembership.id, updatedAt: now })
      .where(eq(schema.communityCheckoutAttempts.id, current.id));
    const payment = {
      id: uuidv7(clock),
      publicId: createPublicId("pay", clock),
      checkoutId: current.id,
      membershipId: learnerMembership.id,
      providerPaymentId: `free_${current.publicId}`,
      kind: "one_time" as const,
      status: "succeeded" as const,
      currency: current.currency,
      amountMinor: current.amountMinor,
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await tx.insert(schema.communityPayments).values(payment);
    await tx.insert(schema.communityInvoices).values({
      id: uuidv7(clock),
      publicId: createPublicId("inv", clock),
      paymentId: payment.id,
      checkoutId: current.id,
      membershipId: learnerMembership.id,
      providerInvoiceId: null,
      status: "paid",
      currency: current.currency,
      amountMinor: current.amountMinor,
      issuedAt: now,
      updatedAt: now,
    });
    await tx
      .update(schema.communityCheckoutAttempts)
      .set({ status: "paid", updatedAt: now, completedAt: now })
      .where(eq(schema.communityCheckoutAttempts.id, current.id));
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: context.schoolId,
      actorId: context.learnerPublicId,
      action: "community_checkout.paid",
      resourceType: "community_checkout",
      resourceId: current.publicId,
      requestId: context.requestId,
      createdAt: now,
    });
    return { ...current, status: "paid" as const, updatedAt: now, completedAt: now };
  });
}

export async function startLearnerCommunityCheckout(
  db: AppDb,
  context: CommunityCheckoutContext,
  communityPublicId: string,
  input: {
    planPublicId: string;
    joiningReason: string;
    idempotencyKey: string;
    returnUrl: string;
  },
  clock: Clock,
  paymentProviderOverride?: PaymentProvider,
): Promise<
  { ok: true; value: CommunityCheckoutDto } | { ok: false; error: PlatformError }
> {
  const idempotencyKey = input.idempotencyKey.trim();
  if (!idempotencyKey || idempotencyKey.length > 200) {
    return error("validation_failed", { reason: "invalid_idempotency_key" });
  }
  let parsedReturnUrl: URL;
  try {
    parsedReturnUrl = new URL(input.returnUrl);
  } catch {
    return error("validation_failed", { reason: "invalid_return_url" });
  }
  const isLocalhost =
    parsedReturnUrl.hostname === "localhost" ||
    parsedReturnUrl.hostname === "127.0.0.1" ||
    parsedReturnUrl.hostname.endsWith(".localhost");
  if (parsedReturnUrl.protocol !== "https:" && !isLocalhost) {
    return error("validation_failed", { reason: "invalid_return_url" });
  }
  const selected = await loadCommunityPlan(
    db,
    context.schoolId,
    communityPublicId,
    input.planPublicId,
  );
  if (!selected) return error("not_found");
  const isFreePlan = selected.plan.kind === "free";
  const normalizedJoiningReason = isFreePlan ? input.joiningReason.trim() : "";
  if (isFreePlan && !selected.community.autoAcceptMembers && !normalizedJoiningReason) {
    return error("validation_failed", { reason: "joining_reason_required" });
  }
  const existing = await db
    .select()
    .from(schema.communityCheckoutAttempts)
    .where(
      and(
        eq(schema.communityCheckoutAttempts.schoolId, context.schoolId),
        eq(schema.communityCheckoutAttempts.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  if (existing[0]) {
    const row = existing[0];
    if (
      row.schoolAccountId !== (context.schoolAccountId ?? context.learnerId) ||
      row.communityId !== selected.community.id ||
      row.planId !== selected.plan.id
    ) {
      return error("conflict", { reason: "idempotency_key_reused" });
    }
    return {
      ok: true,
      value: checkoutToDto(
        row,
        context.publicSchoolId,
        selected.community.publicId,
        selected.plan.publicId,
      ),
    };
  }
  const existingLearnerMembership = await findLearnerMembership(db, {
    schoolId: context.schoolId,
    learnerId: context.learnerId,
    entityType: "community",
    entityId: selected.community.publicId,
  });
  if (existingLearnerMembership?.status === "rejected") {
    return error("conflict", { reason: "membership_rejected" });
  }
  const paymentProvider = selected.plan.kind === "free"
    ? null
    : await getPaymentProvider(db, context.schoolId, paymentProviderOverride);
  if (selected.plan.kind !== "free" && !paymentProvider) {
    return error("conflict", { reason: "provider_unavailable" });
  }
  if (existingLearnerMembership?.status === "active") {
    if (selected.plan.kind === "free") {
      return {
        ok: true,
        value: completedMembershipCheckoutDto(
          context,
          selected.community,
          selected.plan,
          existingLearnerMembership,
          selected.school.currency.toUpperCase(),
        ),
      };
    }
    if (
      (selected.plan.kind === "subscription" || selected.plan.kind === "installment") &&
      existingLearnerMembership.subscriptionId &&
      paymentProvider?.validateSubscription &&
      (await paymentProvider.validateSubscription(existingLearnerMembership.subscriptionId))
    ) {
      return {
        ok: true,
        value: completedMembershipCheckoutDto(
          context,
          selected.community,
          selected.plan,
          existingLearnerMembership,
          selected.school.currency.toUpperCase(),
        ),
      };
    }
    if (
      (selected.plan.kind === "subscription" || selected.plan.kind === "installment") &&
      existingLearnerMembership.subscriptionId
    ) {
      await db
        .update(schema.learnerMemberships)
        .set({ status: "expired", updatedAt: clock.now() })
        .where(eq(schema.learnerMemberships.id, existingLearnerMembership.id));
      existingLearnerMembership.status = "expired";
    }
  }
  const membership = (
    await db
      .select()
      .from(schema.learnerMemberships)
      .where(
        and(
          eq(schema.learnerMemberships.schoolId, context.schoolId),
          eq(schema.learnerMemberships.schoolAccountId, context.learnerId),
          eq(schema.learnerMemberships.entityType, "community"),
          eq(schema.learnerMemberships.entityId, selected.community.publicId),
          eq(schema.learnerMemberships.isIncludedInPlan, false),
          eq(schema.learnerMemberships.status, "active"),
        ),
      )
      .limit(1)
  )[0];
  if (membership) return error("conflict", { reason: "already_member" });
  const now = clock.now();
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("chk", clock),
    schoolId: context.schoolId,
    schoolAccountId: context.schoolAccountId ?? context.learnerId,
    communityId: selected.community.id,
    planId: selected.plan.id,
    provider: selected.plan.kind === "free" ? ("free" as const) : paymentProvider!.name,
    idempotencyKey,
    providerCheckoutId: null,
    providerCheckoutUrl: null,
    status: "pending" as const,
    currency: selected.school.currency.toUpperCase(),
    amountMinor: amountMinorForPlan(selected.plan, selected.school.currency),
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  try {
    await db.insert(schema.communityCheckoutAttempts).values(row);
  } catch (caught) {
    if (String(caught).includes("community_checkout_school_idempotency_uidx")) {
      return error("conflict", { reason: "checkout_in_progress" });
    }
    throw caught;
  }
  const learnerMembership = await stageCommunityMembership(
    db,
    context,
    selected.community,
    selected.plan,
    normalizedJoiningReason,
    clock,
    row.publicId,
  );
  await db
    .update(schema.communityCheckoutAttempts)
    .set({ membershipId: learnerMembership.id, updatedAt: clock.now() })
    .where(eq(schema.communityCheckoutAttempts.id, row.id));
  const linkedRow = { ...row, membershipId: learnerMembership.id };
  if (selected.plan.kind === "free") {
    const paid = await fulfillFreeCheckout(
      db,
      linkedRow,
      selected.community,
      selected.plan,
      { ...context },
      clock,
    );
    await notifyPaymentSucceeded(
      db,
      { resourceType: "community", providerPaymentId: `free_${paid.publicId}` },
      clock,
    );
    return {
      ok: true,
      value: checkoutToDto(
        paid,
        context.publicSchoolId,
        selected.community.publicId,
        selected.plan.publicId,
      ),
    };
  }
  let checkout: PaymentCheckoutResult;
  try {
    checkout = await paymentProvider!.createCheckout({
      paymentPlan: {
        kind: selected.plan.kind,
        amountMinor: row.amountMinor,
        billingInterval: selected.plan.billingInterval,
        installmentCount: selected.plan.installmentCount,
        providerProductId: selected.plan.providerProductId,
      },
      product: { id: selected.community.publicId, title: selected.community.name },
      customer: { email: context.learnerEmail, name: context.learnerName },
      currency: row.currency,
      returnUrl: input.returnUrl,
      metadata: {
        courselit_community_checkout_id: row.publicId,
        courselit_checkout_id: row.publicId,
        courselit_school_id: context.publicSchoolId,
        courselit_learner_id: context.learnerPublicId,
        courselit_community_id: selected.community.publicId,
        courselit_community_plan_id: selected.plan.publicId,
      },
    });
  } catch (thrown) {
    console.error("[CourseLit] Payment provider refused the checkout", {
      checkout: row.publicId,
      provider: paymentProvider!.name,
      error: thrown instanceof Error ? thrown.message : String(thrown),
    });
    await db
      .update(schema.communityCheckoutAttempts)
      .set({ status: "failed", updatedAt: clock.now(), completedAt: clock.now() })
      .where(eq(schema.communityCheckoutAttempts.id, row.id));
    await unstageLearnerMembership(db, learnerMembership.id, existingLearnerMembership);
    await notifyCheckoutRefused(
      db,
      {
        schoolId: context.schoolId,
        provider: paymentProvider!.name,
        title: selected.community.name,
      },
      clock,
    );
    return error("conflict", { reason: "checkout_refused" });
  }
  const updatedAt = clock.now();
  await db
    .update(schema.communityCheckoutAttempts)
    .set({
      providerCheckoutId: checkout.checkoutId,
      providerCheckoutUrl: checkout.checkoutUrl,
      updatedAt,
    })
    .where(eq(schema.communityCheckoutAttempts.id, row.id));
  await db.insert(schema.communityInvoices).values({
    id: uuidv7(clock),
    publicId: createPublicId("inv", clock),
    paymentId: null,
    checkoutId: row.id,
    membershipId: linkedRow.membershipId,
    providerInvoiceId: null,
    status: "pending",
    currency: row.currency,
    amountMinor: row.amountMinor,
    issuedAt: updatedAt,
    updatedAt,
  });
  return {
    ok: true,
    value: checkoutToDto(
      {
        ...linkedRow,
        providerCheckoutId: checkout.checkoutId,
        providerCheckoutUrl: checkout.checkoutUrl,
        updatedAt,
      },
      context.publicSchoolId,
      selected.community.publicId,
      selected.plan.publicId,
      checkout.checkoutData,
    ),
  };
}

export async function getLearnerCommunityCheckout(
  db: AppDb,
  context: CommunityCheckoutContext,
  checkoutPublicId: string,
): Promise<
  { ok: true; value: CommunityCheckoutDto } | { ok: false; error: PlatformError }
> {
  const row = await loadCheckout(db, context, checkoutPublicId);
  if (!row) return error("not_found");
  return {
    ok: true,
    value: checkoutToDto(
      row.attempt,
      context.publicSchoolId,
      row.community.publicId,
      row.plan.publicId,
    ),
  };
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function integerValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

function dateValue(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  // Raw provider timestamps (Stripe, Razorpay) are Unix seconds.
  const date = new Date(typeof value === "number" && value < 1e12 ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function metadataFrom(data: Record<string, unknown>): Record<string, string> {
  const raw = data.metadata ?? data.custom_data;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function communityAttemptInScope(scope: PaymentWebhookScope) {
  return and(
    eq(schema.communityCheckoutAttempts.schoolId, scope.schoolId),
    eq(schema.communityCheckoutAttempts.provider, scope.provider),
  );
}

async function findEventCheckout(
  db: AppDb,
  data: Record<string, unknown>,
  scope: PaymentWebhookScope,
) {
  const metadata = metadataFrom(data);
  const checkoutPublicId =
    metadata.courselit_community_checkout_id ??
    (metadata.courselit_community_id ? metadata.courselit_checkout_id : undefined);
  if (checkoutPublicId) {
    const rows = await db
      .select({
        attempt: schema.communityCheckoutAttempts,
        community: schema.communities,
        plan: schema.storefrontPlans,
        school: schema.schools,
      })
      .from(schema.communityCheckoutAttempts)
      .innerJoin(
        schema.communities,
        eq(schema.communities.id, schema.communityCheckoutAttempts.communityId),
      )
      .innerJoin(
        schema.storefrontPlans,
        and(
          eq(schema.storefrontPlans.id, schema.communityCheckoutAttempts.planId),
          eq(schema.storefrontPlans.entityType, "community"),
        ),
      )
      .innerJoin(
        schema.schools,
        eq(schema.schools.id, schema.communityCheckoutAttempts.schoolId),
      )
      .where(and(eq(schema.communityCheckoutAttempts.publicId, checkoutPublicId), communityAttemptInScope(scope)))
      .limit(1);
    if (rows[0]) return rows[0];
  }
  const providerCheckoutId = stringValue(
    data.checkout_id ?? data.checkout_session_id ?? data.session_id,
  );
  const providerSubscriptionId = stringValue(data.subscription_id);
  if (!providerCheckoutId && providerSubscriptionId) {
    // Renewal events can lack checkout metadata; the subscription recorded
    // from the first payment still points at its checkout.
    const subscription = await findCommunitySubscription(db, providerSubscriptionId, scope);
    return subscription
      ? {
          attempt: subscription.attempt,
          community: subscription.community,
          plan: subscription.plan,
          school: subscription.school,
        }
      : null;
  }
  if (!providerCheckoutId) return null;
  const rows = await db
    .select({
      attempt: schema.communityCheckoutAttempts,
      community: schema.communities,
      plan: schema.storefrontPlans,
      school: schema.schools,
    })
    .from(schema.communityCheckoutAttempts)
    .innerJoin(
      schema.communities,
      eq(schema.communities.id, schema.communityCheckoutAttempts.communityId),
    )
    .innerJoin(
      schema.storefrontPlans,
      and(
        eq(schema.storefrontPlans.id, schema.communityCheckoutAttempts.planId),
        eq(schema.storefrontPlans.entityType, "community"),
      ),
    )
    .innerJoin(
      schema.schools,
      eq(schema.schools.id, schema.communityCheckoutAttempts.schoolId),
    )
    .where(and(eq(schema.communityCheckoutAttempts.providerCheckoutId, providerCheckoutId), communityAttemptInScope(scope)))
    .limit(1);
  return rows[0] ?? null;
}

async function findCommunitySubscription(
  db: AppDb,
  providerSubscriptionId: string,
  scope: PaymentWebhookScope,
) {
  const rows = await db
    .select({
      subscription: schema.communitySubscriptions,
      attempt: schema.communityCheckoutAttempts,
      community: schema.communities,
      plan: schema.storefrontPlans,
      school: schema.schools,
    })
    .from(schema.communitySubscriptions)
    .innerJoin(
      schema.communityCheckoutAttempts,
      eq(schema.communityCheckoutAttempts.id, schema.communitySubscriptions.checkoutId),
    )
    .innerJoin(
      schema.communities,
      eq(schema.communities.id, schema.communityCheckoutAttempts.communityId),
    )
    .innerJoin(
      schema.storefrontPlans,
      and(
        eq(schema.storefrontPlans.id, schema.communityCheckoutAttempts.planId),
        eq(schema.storefrontPlans.entityType, "community"),
      ),
    )
    .innerJoin(
      schema.schools,
      eq(schema.schools.id, schema.communityCheckoutAttempts.schoolId),
    )
    .where(
      and(
        eq(schema.communitySubscriptions.providerSubscriptionId, providerSubscriptionId),
        communityAttemptInScope(scope),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function revokeIncludedProductAccess(
  tx: AppDb,
  schoolId: string,
  learnerId: string,
  plan: typeof schema.storefrontPlans.$inferSelect,
  clock: Clock,
  status: "expired" | "payment_failed",
  options?: { cancelSubscription?: boolean; paymentProvider?: PaymentProvider | null },
) {
  if (plan.includedProducts.length === 0) return;
  const memberships = await tx
    .select({ id: schema.learnerMemberships.id })
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.schoolId, schoolId),
        eq(schema.learnerMemberships.schoolAccountId, learnerId),
        eq(schema.learnerMemberships.entityType, "product"),
        eq(schema.learnerMemberships.isIncludedInPlan, true),
        eq(schema.learnerMemberships.paymentPlanId, plan.publicId),
        eq(schema.learnerMemberships.status, "active"),
      ),
    );
  for (const membership of memberships) {
    await revokeLearnerMembership(tx, membership.id, status, clock, options);
  }
}

async function revokeCommunityAccess(
  tx: AppDb,
  attempt: CommunityCheckoutRow,
  plan: typeof schema.storefrontPlans.$inferSelect,
  clock: Clock,
  status: "expired" | "payment_failed",
  options?: { cancelSubscription?: boolean; paymentProvider?: PaymentProvider | null },
) {
  if (attempt.membershipId) {
    await revokeLearnerMembership(tx, attempt.membershipId, status, clock, options);
  }
  await revokeIncludedProductAccess(
    tx,
    attempt.schoolId,
    attempt.schoolAccountId,
    plan,
    clock,
    status,
    options,
  );
}

/**
 * Remove access granted by a community payment plan when a learner leaves.
 * Membership deletion belongs to the communities service; this helper keeps
 * the entitlement cleanup in the commerce module alongside webhook revocation.
 */
export async function revokeCommunityMembershipAccess(
  tx: AppDb,
  input: {
    schoolId: string;
    learnerId: string;
    membershipId: string;
  },
  clock: Clock,
  options?: { cancelSubscription?: boolean; paymentProvider?: PaymentProvider | null },
) {
  const membership = (
    await tx
      .select()
      .from(schema.learnerMemberships)
      .where(eq(schema.learnerMemberships.id, input.membershipId))
      .limit(1)
  )[0];
  if (
    !membership ||
    membership.schoolId !== input.schoolId ||
    membership.schoolAccountId !== input.learnerId ||
    membership.entityType !== "community"
  ) {
    return;
  }
  await revokeLearnerMembership(tx, membership.id, "expired", clock, options);
}

async function ensureCommunitySubscription(
  tx: AppDb,
  scope: PaymentWebhookScope,
  checkoutId: string,
  providerSubscriptionId: string,
  data: Record<string, unknown>,
  clock: Clock,
  membershipId?: string | null,
) {
  const now = clock.now();
  const currentPeriodEnd = dateValue(
    data.current_period_end ?? data.next_billing_date ?? data.period_end,
  );
  const cancelAt = dateValue(data.cancel_at ?? data.cancelled_at);
  const existing = (
    await tx
      .select({ subscription: schema.communitySubscriptions })
      .from(schema.communitySubscriptions)
      .innerJoin(schema.communityCheckoutAttempts, eq(schema.communityCheckoutAttempts.id, schema.communitySubscriptions.checkoutId))
      .where(
        and(
          eq(schema.communitySubscriptions.providerSubscriptionId, providerSubscriptionId),
          communityAttemptInScope(scope),
        ),
      )
      .limit(1)
  )[0]?.subscription;
  if (existing) {
    // A payment never revives a subscription that already ended (e.g. a
    // paid-off installment plan cancelled after its last charge).
    const terminal = existing.status === "cancelled" || existing.status === "expired";
    const next = {
      status: terminal ? existing.status : ("active" as const),
      currentPeriodEnd: currentPeriodEnd ?? existing.currentPeriodEnd,
      cancelAt: cancelAt ?? existing.cancelAt,
      membershipId: membershipId ?? existing.membershipId,
      updatedAt: now,
    };
    await tx
      .update(schema.communitySubscriptions)
      .set(next)
      .where(eq(schema.communitySubscriptions.id, existing.id));
    return { ...existing, ...next };
  }
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("sub", clock),
    checkoutId,
    membershipId: membershipId ?? null,
    providerSubscriptionId,
    status: "active" as const,
    currentPeriodEnd,
    cancelAt,
    createdAt: now,
    updatedAt: now,
  };
  await tx.insert(schema.communitySubscriptions).values(row);
  return row;
}

/** Whether every installment of the plan has been paid through this checkout. */
async function communityInstallmentPlanPaidOff(
  db: AppDb,
  checkoutId: string,
  plan: Pick<typeof schema.storefrontPlans.$inferSelect, "kind" | "installmentCount">,
): Promise<boolean> {
  if (plan.kind !== "installment" || !plan.installmentCount) return false;
  const paid = await db
    .select({ id: schema.communityInvoices.id })
    .from(schema.communityInvoices)
    .where(
      and(
        eq(schema.communityInvoices.checkoutId, checkoutId),
        eq(schema.communityInvoices.status, "paid"),
      ),
    );
  return paid.length >= plan.installmentCount;
}

/** Find the recorded community payment a refund or dispute refers to. */
async function findRefundedCommunityPayment(
  db: AppDb,
  data: Record<string, unknown>,
  scope: PaymentWebhookScope,
) {
  const paymentId = stringValue(data.payment_id);
  if (paymentId) {
    const byId = (
      await db
        .select({ payment: schema.communityPayments })
        .from(schema.communityPayments)
        .innerJoin(schema.communityCheckoutAttempts, eq(schema.communityCheckoutAttempts.id, schema.communityPayments.checkoutId))
        .where(
          and(
            eq(schema.communityPayments.providerPaymentId, paymentId),
            communityAttemptInScope(scope),
          ),
        )
        .limit(1)
    )[0];
    if (byId) return byId.payment;
  }
  const invoiceId = stringValue(data.invoice_id);
  if (invoiceId) {
    const byInvoice = (
      await db
        .select({ payment: schema.communityPayments })
        .from(schema.communityInvoices)
        .innerJoin(
          schema.communityPayments,
          eq(schema.communityPayments.id, schema.communityInvoices.paymentId),
        )
        .innerJoin(schema.communityCheckoutAttempts, eq(schema.communityCheckoutAttempts.id, schema.communityPayments.checkoutId))
        .where(
          and(
            eq(schema.communityInvoices.providerInvoiceId, invoiceId),
            communityAttemptInScope(scope),
          ),
        )
        .limit(1)
    )[0];
    if (byInvoice) return byInvoice.payment;
  }
  const subscriptionId = stringValue(data.subscription_id);
  if (data.initial_charge === true && subscriptionId) {
    const first = (
      await db
        .select({ payment: schema.communityPayments })
        .from(schema.communitySubscriptions)
        .innerJoin(
          schema.communityPayments,
          eq(schema.communityPayments.checkoutId, schema.communitySubscriptions.checkoutId),
        )
        .innerJoin(schema.communityCheckoutAttempts, eq(schema.communityCheckoutAttempts.id, schema.communitySubscriptions.checkoutId))
        .where(
          and(
            eq(schema.communitySubscriptions.providerSubscriptionId, subscriptionId),
            communityAttemptInScope(scope),
          ),
        )
        .orderBy(asc(schema.communityPayments.occurredAt), asc(schema.communityPayments.createdAt))
        .limit(1)
    )[0];
    if (first) return first.payment;
  }
  return null;
}

/** Returns null when the event belongs to the product storefront. */
export async function processCommunityPaymentEvent(
  db: AppDb,
  scope: PaymentWebhookScope,
  eventType: string,
  data: Record<string, unknown>,
  clock: Clock,
  requestId: string,
  paymentProvider?: PaymentProvider,
): Promise<"processed" | "ignored" | null> {
  const eventCheckout = await findEventCheckout(db, data, scope);
  const paymentId = stringValue(data.payment_id);
  const providerSubscriptionId = stringValue(data.subscription_id ?? data.id);
  if (!eventCheckout && !paymentId && !providerSubscriptionId) return null;
  if (eventCheckout) {
    const now = clock.now();
    if (eventType === "payment.succeeded") {
      if (!paymentId) return "ignored";
      const amount = integerValue(data.amount ?? data.total_amount);
      const currency = stringValue(
        data.currency ?? data.billing_currency,
      )?.toUpperCase();
      if (amount === null || !currency) throw new Error("payment_amount_missing");
      if (
        amount !== eventCheckout.attempt.amountMinor ||
        currency !== eventCheckout.attempt.currency
      ) {
        throw new Error("payment_amount_mismatch");
      }
      await db.transaction(async (tx) => {
        const current = (
          await tx
            .select()
            .from(schema.communityCheckoutAttempts)
            .where(eq(schema.communityCheckoutAttempts.id, eventCheckout.attempt.id))
            .limit(1)
        )[0];
        if (!current) throw new Error("community_checkout_missing");
        const providerInvoiceId = stringValue(data.invoice_id);
        // One charge can be reported by several events with different
        // payment ids; the provider invoice id ties them together.
        const existingPayment =
          (
            await tx
              .select()
              .from(schema.communityPayments)
              .where(eq(schema.communityPayments.providerPaymentId, paymentId))
              .limit(1)
          )[0] ??
          (providerInvoiceId
            ? (
                await tx
                  .select({ payment: schema.communityPayments })
                  .from(schema.communityInvoices)
                  .innerJoin(
                    schema.communityPayments,
                    eq(schema.communityPayments.id, schema.communityInvoices.paymentId),
                  )
                  .where(eq(schema.communityInvoices.providerInvoiceId, providerInvoiceId))
                  .limit(1)
              )[0]?.payment
            : undefined);
        const isNewPayment = !existingPayment;
        let payment = existingPayment;
        if (payment && payment.checkoutId !== current.id)
        throw new Error("payment_checkout_mismatch");
        // A late duplicate of a refunded or disputed charge restores nothing.
        if (payment && (payment.status === "refunded" || payment.status === "disputed")) {
          return;
        }
        const learnerMembership = await upsertLearnerMembership(
          tx as unknown as AppDb,
          {
            schoolId: current.schoolId,
            learnerId: current.schoolAccountId,
            entityType: "community",
            entityId: eventCheckout.community.publicId,
            paymentPlanId: eventCheckout.plan.publicId,
            status: "active",
            role: "post",
            sessionId: current.publicId,
          },
          clock,
        );
        if (current.membershipId !== learnerMembership.id) {
          await tx
            .update(schema.communityCheckoutAttempts)
            .set({ membershipId: learnerMembership.id, updatedAt: now })
            .where(eq(schema.communityCheckoutAttempts.id, current.id));
        }
        if (!payment) {
          payment = {
            id: uuidv7(clock),
            publicId: createPublicId("pay", clock),
            checkoutId: current.id,
            membershipId: learnerMembership.id,
            providerPaymentId: paymentId,
            kind:
              eventCheckout.plan.kind === "subscription"
                ? ("subscription" as const)
                : eventCheckout.plan.kind === "installment"
                  ? ("installment" as const)
                  : ("one_time" as const),
            status: "succeeded" as const,
            currency,
            refundedAmountMinor: 0,
            amountMinor: amount,
            occurredAt: new Date(
              stringValue(data.created_at ?? data.timestamp) ?? now.toISOString(),
            ),
            createdAt: now,
            updatedAt: now,
          };
          await tx.insert(schema.communityPayments).values(payment);
        }
        const invoice = (
          await tx
            .select()
            .from(schema.communityInvoices)
            .where(
              or(
                eq(schema.communityInvoices.paymentId, payment.id),
                and(
                  eq(schema.communityInvoices.checkoutId, current.id),
                  eq(schema.communityInvoices.status, "pending"),
                ),
              ),
            )
            .limit(1)
        )[0];
        if (invoice) {
          await tx
            .update(schema.communityInvoices)
            .set({
              paymentId: payment.id,
              membershipId: learnerMembership.id,
              providerInvoiceId:
                stringValue(data.invoice_id) ?? invoice.providerInvoiceId,
              status: "paid",
              currency,
              amountMinor: amount,
              updatedAt: now,
            })
            .where(eq(schema.communityInvoices.id, invoice.id));
        } else {
          await tx.insert(schema.communityInvoices).values({
            id: uuidv7(clock),
            publicId: createPublicId("inv", clock),
            paymentId: payment.id,
            checkoutId: current.id,
            membershipId: learnerMembership.id,
            providerInvoiceId: stringValue(data.invoice_id),
            status: "paid",
            currency,
            amountMinor: amount,
            issuedAt: now,
            updatedAt: now,
          });
        }
        if (current.status !== "paid") {
          await activateCommunityPlan(
            tx as unknown as AppDb,
            {
              schoolId: current.schoolId,
              publicSchoolId: eventCheckout.school.publicId,
              learnerId: current.schoolAccountId,
              learnerPublicId: "payment:webhook",
              learnerEmail: "",
              learnerName: "",
              requestId,
            },
            eventCheckout.community,
            eventCheckout.plan,
            clock,
          );
          await tx
            .update(schema.communityCheckoutAttempts)
            .set({ status: "paid", updatedAt: now, completedAt: now })
            .where(eq(schema.communityCheckoutAttempts.id, current.id));
        }
        if (isNewPayment) {
          await recordActivity(tx as unknown as AppDb, {
            schoolId: current.schoolId,
            actorId: current.schoolAccountId,
            type: ActivityType.PURCHASED,
            entityId: eventCheckout.community.publicId,
            metadata: {
              amountMinor: amount,
              currency,
              purchaseId: current.publicId,
            },
          }, clock);
        }
        const recurringPlan =
          eventCheckout.plan.kind === "subscription" ||
          eventCheckout.plan.kind === "installment";
        // Lemon Squeezy orders carry no subscription id; it may already be
        // known from `subscription_created`.
        const subscriptionId =
          stringValue(data.subscription_id) ??
          (recurringPlan
            ? (
                await tx
                  .select({ id: schema.communitySubscriptions.providerSubscriptionId })
                  .from(schema.communitySubscriptions)
                  .where(eq(schema.communitySubscriptions.checkoutId, current.id))
                  .limit(1)
              )[0]?.id ?? null
            : null);
        let subscription: Awaited<ReturnType<typeof ensureCommunitySubscription>> | null = null;
        if (subscriptionId && recurringPlan) {
          subscription = await ensureCommunitySubscription(
            tx as unknown as AppDb,
            scope,
            current.id,
            subscriptionId,
            data,
            clock,
            learnerMembership.id,
          );
          await tx
            .update(schema.learnerMemberships)
            .set({
              subscriptionId,
              subscriptionMethod: current.provider,
              updatedAt: now,
            })
            .where(eq(schema.learnerMemberships.id, learnerMembership.id));
        }
        if (
          subscriptionId &&
          subscription &&
          subscription.status !== "cancelled" &&
          subscription.status !== "expired" &&
          (await communityInstallmentPlanPaidOff(
            tx as unknown as AppDb,
            current.id,
            eventCheckout.plan,
          ))
        ) {
          // The last installment is paid: stop the provider charging again.
          // Razorpay ends the subscription itself after `total_count` charges.
          if (data.subscription_completed !== true) {
            if (!paymentProvider?.cancelSubscription) {
              throw new Error("provider_unavailable");
            }
            await paymentProvider.cancelSubscription(subscriptionId);
          }
          await tx
            .update(schema.communitySubscriptions)
            .set({ status: "cancelled", cancelAt: now, updatedAt: now })
            .where(eq(schema.communitySubscriptions.id, subscription.id));
        }
        await tx.insert(schema.auditEvents).values({
          id: uuidv7(clock),
          schoolId: current.schoolId,
          actorId: "payment:webhook",
          action: "community_payment.succeeded",
          resourceType: "community_payment",
          resourceId: payment.publicId,
          requestId,
          createdAt: now,
        });
      });
      await notifyPaymentSucceeded(db, { resourceType: "community", providerPaymentId: paymentId }, clock);
      return "processed";
    }
    if (eventType === "payment.failed" || eventType === "payment.cancelled") {
      await db.transaction(async (tx) => {
        const current = (
          await tx
            .select()
            .from(schema.communityCheckoutAttempts)
            .where(eq(schema.communityCheckoutAttempts.id, eventCheckout.attempt.id))
            .limit(1)
        )[0];
        if (!current || current.status === "paid") return;
        await tx
          .update(schema.communityCheckoutAttempts)
          .set({
            status: eventType === "payment.failed" ? "failed" : "cancelled",
            updatedAt: now,
            completedAt: now,
          })
          .where(eq(schema.communityCheckoutAttempts.id, current.id));
        await revokeCommunityAccess(
          tx as unknown as AppDb,
          current,
          eventCheckout.plan,
          clock,
          "payment_failed",
          { paymentProvider },
        );
      });
      return "processed";
    }
  }
  if (eventType === "payment.partially_refunded") {
    // Some money went back but the member keeps access.
    const payment = await findRefundedCommunityPayment(db, data, scope);
    if (!payment) return eventCheckout ? "ignored" : null;
    const refunded = nextRefundedAmount(payment, integerValue(data.refunded_amount));
    if (refunded === null) return "processed";
    await db
      .update(schema.communityPayments)
      .set({ refundedAmountMinor: refunded, updatedAt: clock.now() })
      .where(eq(schema.communityPayments.id, payment.id));
    return "processed";
  }
  if (eventType === "payment.refunded" || eventType === "payment.disputed") {
    const payment = await findRefundedCommunityPayment(db, data, scope);
    if (!payment) return eventCheckout ? "ignored" : null;
    const now = clock.now();
    const status = eventType === "payment.refunded" ? "refunded" : "disputed";
    // One refund can arrive through several provider events; handle it once.
    if (payment.status === status) return "processed";
    await db.transaction(async (tx) => {
      const current = (
        await tx
          .select()
          .from(schema.communityCheckoutAttempts)
          .where(eq(schema.communityCheckoutAttempts.id, payment.checkoutId))
          .limit(1)
      )[0];
      if (!current) return;
      // Stop future charges unless the subscription already ended.
      const liveSubscriptions = (
        await tx
          .select()
          .from(schema.communitySubscriptions)
          .where(eq(schema.communitySubscriptions.checkoutId, current.id))
      ).filter((row) => row.status !== "cancelled" && row.status !== "expired");
      if (liveSubscriptions.length > 0) {
        await tx
          .update(schema.communitySubscriptions)
          .set({ status: "cancelled", cancelAt: now, updatedAt: now })
          .where(
            inArray(
              schema.communitySubscriptions.id,
              liveSubscriptions.map((row) => row.id),
            ),
          );
      }
      await tx
        .update(schema.communityPayments)
        .set({
          status,
          ...(status === "refunded" ? { refundedAmountMinor: payment.amountMinor } : {}),
          updatedAt: now,
        })
        .where(eq(schema.communityPayments.id, payment.id));
      await tx
        .update(schema.communityInvoices)
        .set({
          status: eventType === "payment.refunded" ? "refunded" : "void",
          updatedAt: now,
        })
        .where(eq(schema.communityInvoices.paymentId, payment.id));
      await tx
        .update(schema.communityCheckoutAttempts)
        .set({ status, updatedAt: now })
        .where(eq(schema.communityCheckoutAttempts.id, current.id));
      await revokeCommunityAccess(
        tx as unknown as AppDb,
        current,
        eventCheckout?.plan ??
          (
            await tx
              .select()
              .from(schema.storefrontPlans)
              .where(
                and(
                  eq(schema.storefrontPlans.id, current.planId),
                  eq(schema.storefrontPlans.entityType, "community"),
                ),
              )
              .limit(1)
          )[0]!,
        clock,
        "expired",
        { paymentProvider, cancelSubscription: liveSubscriptions.length > 0 },
      );
    });
    return "processed";
  }
  if (eventType.startsWith("subscription.")) {
    if (!providerSubscriptionId) return "ignored";
    let subscription = await findCommunitySubscription(db, providerSubscriptionId, scope);
    if (!subscription && eventCheckout) {
      const now = clock.now();
      await db.insert(schema.communitySubscriptions).values({
        id: uuidv7(clock),
        publicId: createPublicId("sub", clock),
        checkoutId: eventCheckout.attempt.id,
        providerSubscriptionId,
        status: "active",
        currentPeriodEnd: dateValue(
          data.current_period_end ?? data.next_billing_date ?? data.period_end,
        ),
        cancelAt: dateValue(data.cancel_at ?? data.cancelled_at),
        createdAt: now,
        updatedAt: now,
      });
      subscription = await findCommunitySubscription(db, providerSubscriptionId, scope);
    }
    if (!subscription) return null;
    const now = clock.now();
    const previousStatus = subscription.subscription.status;
    // Ended subscriptions (learner left, refunded, paid-off installments)
    // are never revived by a late or out-of-order provider event.
    const terminal = previousStatus === "cancelled" || previousStatus === "expired";
    const status =
      eventType === "subscription.cancelled"
        ? "cancelled"
        : eventType === "subscription.expired"
          ? "expired"
          : terminal
            ? previousStatus
            : eventType === "subscription.failed" || eventType === "subscription.past_due"
              ? "past_due"
              : "active";
    const currentPeriodEnd =
      dateValue(data.current_period_end ?? data.next_billing_date ?? data.period_end) ??
      subscription.subscription.currentPeriodEnd;
    const cancelAt =
      eventType === "subscription.cancel_scheduled"
        ? dateValue(data.cancel_at) ?? currentPeriodEnd
        : dateValue(data.cancel_at ?? data.cancelled_at);
    await db.transaction(async (tx) => {
      await tx
        .update(schema.communitySubscriptions)
        .set({
          status,
          currentPeriodEnd,
          cancelAt: cancelAt ?? (terminal ? subscription!.subscription.cancelAt : null),
          updatedAt: now,
        })
        .where(eq(schema.communitySubscriptions.id, subscription!.subscription.id));
      const membershipId = subscription!.attempt.membershipId;
      if (membershipId) {
        // Link the membership when the subscription is learnt from a
        // subscription event rather than a payment (Lemon Squeezy orders),
        // so leaving the community cancels it.
        await tx
          .update(schema.learnerMemberships)
          .set({
            subscriptionId: providerSubscriptionId,
            subscriptionMethod: subscription!.attempt.provider,
            updatedAt: now,
          })
          .where(
            and(
              eq(schema.learnerMemberships.id, membershipId),
              isNull(schema.learnerMemberships.subscriptionId),
            ),
          );
        if (!subscription!.subscription.membershipId) {
          await tx
            .update(schema.communitySubscriptions)
            .set({ membershipId })
            .where(eq(schema.communitySubscriptions.id, subscription!.subscription.id));
        }
      }
      // Renewal stopped but the paid period continues: nothing to change.
      if (eventType === "subscription.cancel_scheduled") return;
      if (status === previousStatus && status !== "active") return;
      if (
        status !== "active" &&
        (await communityInstallmentPlanPaidOff(
          tx as unknown as AppDb,
          subscription!.attempt.id,
          subscription!.plan,
        ))
      ) {
        // A paid-off installment plan keeps its access for good.
        return;
      }
      if (status === "active") {
        await activateCommunityPlan(
          tx as unknown as AppDb,
          {
            schoolId: subscription!.attempt.schoolId,
            publicSchoolId: subscription!.school.publicId,
            learnerId: subscription!.attempt.schoolAccountId,
            learnerPublicId: "payment:webhook",
            learnerEmail: "",
            learnerName: "",
            requestId,
          },
          subscription!.community,
          subscription!.plan,
          clock,
        );
      } else {
        await revokeCommunityAccess(
          tx as unknown as AppDb,
          subscription!.attempt,
          subscription!.plan,
          clock,
          status === "past_due" ? "payment_failed" : "expired",
          { cancelSubscription: false },
        );
      }
    });
    return "processed";
  }
  return eventCheckout ? "ignored" : null;
}
