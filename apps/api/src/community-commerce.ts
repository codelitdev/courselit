import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { ActivityType, recordActivity } from "./activities.js";
import { communityPlanToDto } from "./community-plans.js";
import * as schema from "./db/schema/index.js";
import {
  findLearnerMembership,
  type LearnerMembershipRow,
  revokeLearnerMembership,
  upsertLearnerMembership,
} from "./learner-memberships.js";
import { createSchoolAdminNotifications } from "./notifications.js";
import {
  getPaymentProvider,
  type PaymentCheckoutResult,
  type PaymentProvider,
} from "./payments.js";
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
    amountMinor: plan.amountMinor,
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

async function activateCommunityPlan(
  tx: AppDb,
  context: CommunityCheckoutContext,
  community: typeof schema.communities.$inferSelect,
  plan: typeof schema.storefrontPlans.$inferSelect,
  clock: Clock,
  joiningReason = "",
) {
  const existing = await findLearnerMembership(tx, {
    schoolId: context.schoolId,
    schoolAccountId: context.schoolAccountId ?? context.learnerId,
    entityType: "community",
    entityId: community.publicId,
  });
  const status =
    plan.kind === "free" && !community.autoAcceptMembers ? "pending" : "active";
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
    await createSchoolAdminNotifications(
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
  if (status !== "active" || plan.includedProducts.length === 0) return learnerMembership;
  const products = await includedProducts(tx, context.schoolId, plan.includedProducts);
  for (const product of products) {
    await upsertLearnerMembership(
      tx,
      {
        schoolId: context.schoolId,
        learnerId: context.learnerId,
        entityType: "product",
        entityId: product.publicId,
        paymentPlanId: plan.publicId,
        status: "active",
        sessionId: learnerMembership.sessionId,
        isIncludedInPlan: true,
        parentMembershipId: learnerMembership.id,
      },
      clock,
    );
  }
  return learnerMembership;
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
    amountMinor: selected.plan.amountMinor,
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
        amountMinor: selected.plan.amountMinor,
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
  } catch {
    await db
      .update(schema.communityCheckoutAttempts)
      .set({ status: "failed", updatedAt: clock.now(), completedAt: clock.now() })
      .where(eq(schema.communityCheckoutAttempts.id, row.id));
    await revokeLearnerMembership(db, linkedRow.membershipId, "payment_failed", clock);
    return error("conflict", { reason: "provider_unavailable" });
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
  const date = new Date(value);
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

async function findEventCheckout(db: AppDb, data: Record<string, unknown>) {
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
      .where(eq(schema.communityCheckoutAttempts.publicId, checkoutPublicId))
      .limit(1);
    if (rows[0]) return rows[0];
  }
  const providerCheckoutId = stringValue(
    data.checkout_id ?? data.checkout_session_id ?? data.session_id,
  );
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
    .where(eq(schema.communityCheckoutAttempts.providerCheckoutId, providerCheckoutId))
    .limit(1);
  return rows[0] ?? null;
}

async function findCommunitySubscription(db: AppDb, providerSubscriptionId: string) {
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
      eq(schema.communitySubscriptions.providerSubscriptionId, providerSubscriptionId),
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
      .select()
      .from(schema.communitySubscriptions)
      .where(
        eq(
          schema.communitySubscriptions.providerSubscriptionId,
          providerSubscriptionId,
        ),
      )
      .limit(1)
  )[0];
  if (existing) {
    await tx
      .update(schema.communitySubscriptions)
      .set({
        status: "active",
        currentPeriodEnd,
        cancelAt,
        ...(membershipId ? { membershipId } : {}),
        updatedAt: now,
      })
      .where(eq(schema.communitySubscriptions.id, existing.id));
    return;
  }
  await tx.insert(schema.communitySubscriptions).values({
    id: uuidv7(clock),
    publicId: createPublicId("sub", clock),
    checkoutId,
    membershipId: membershipId ?? null,
    providerSubscriptionId,
    status: "active",
    currentPeriodEnd,
    cancelAt,
    createdAt: now,
    updatedAt: now,
  });
}

/** Returns null when the event belongs to the product storefront. */
export async function processCommunityPaymentEvent(
  db: AppDb,
  eventType: string,
  data: Record<string, unknown>,
  clock: Clock,
  requestId: string,
  paymentProvider?: PaymentProvider,
): Promise<"processed" | "ignored" | null> {
  const eventCheckout = await findEventCheckout(db, data);
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
        const existingPayment = (
          await tx
            .select()
            .from(schema.communityPayments)
            .where(eq(schema.communityPayments.providerPaymentId, paymentId))
            .limit(1)
        )[0];
        let payment = existingPayment;
        if (payment && payment.checkoutId !== current.id)
        throw new Error("payment_checkout_mismatch");
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
        const subscriptionId = stringValue(data.subscription_id);
        if (
          subscriptionId &&
          (eventCheckout.plan.kind === "subscription" ||
            eventCheckout.plan.kind === "installment")
        ) {
          await ensureCommunitySubscription(
            tx as unknown as AppDb,
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
          eventCheckout.plan.kind === "installment" &&
          eventCheckout.plan.installmentCount
        ) {
          const paidInvoices = await tx
            .select({ id: schema.communityInvoices.id })
            .from(schema.communityInvoices)
            .where(
              and(
                eq(schema.communityInvoices.membershipId, learnerMembership.id),
                eq(schema.communityInvoices.status, "paid"),
              ),
            );
          if (paidInvoices.length >= eventCheckout.plan.installmentCount) {
            if (!paymentProvider?.cancelSubscription) {
              throw new Error("provider_unavailable");
            }
            await paymentProvider.cancelSubscription(subscriptionId);
            await tx
              .update(schema.communitySubscriptions)
              .set({ status: "cancelled", cancelAt: now, updatedAt: now })
              .where(
                eq(
                  schema.communitySubscriptions.providerSubscriptionId,
                  subscriptionId,
                ),
              );
          }
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
  if (eventType === "payment.refunded" || eventType === "payment.disputed") {
    if (!paymentId) return eventCheckout ? "ignored" : null;
    const payment = (
      await db
        .select()
        .from(schema.communityPayments)
        .where(eq(schema.communityPayments.providerPaymentId, paymentId))
        .limit(1)
    )[0];
    if (!payment) return eventCheckout ? "ignored" : null;
    const now = clock.now();
    const status = eventType === "payment.refunded" ? "refunded" : "disputed";
    await db.transaction(async (tx) => {
      const current = (
        await tx
          .select()
          .from(schema.communityCheckoutAttempts)
          .where(eq(schema.communityCheckoutAttempts.id, payment.checkoutId))
          .limit(1)
      )[0];
      if (!current) return;
      await tx
        .update(schema.communityPayments)
        .set({ status, updatedAt: now })
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
        { paymentProvider },
      );
    });
    return "processed";
  }
  if (eventType.startsWith("subscription.")) {
    if (!providerSubscriptionId) return "ignored";
    let subscription = await findCommunitySubscription(db, providerSubscriptionId);
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
      subscription = await findCommunitySubscription(db, providerSubscriptionId);
    }
    if (!subscription) return null;
    const now = clock.now();
    const status =
      eventType === "subscription.cancelled"
        ? "cancelled"
        : eventType === "subscription.expired"
          ? "expired"
          : eventType === "subscription.failed" || eventType === "subscription.past_due"
            ? "past_due"
            : "active";
    await db.transaction(async (tx) => {
      await tx
        .update(schema.communitySubscriptions)
        .set({
          status,
          currentPeriodEnd: dateValue(
            data.current_period_end ?? data.next_billing_date ?? data.period_end,
          ),
          cancelAt: dateValue(data.cancel_at ?? data.cancelled_at),
          updatedAt: now,
        })
        .where(eq(schema.communitySubscriptions.id, subscription!.subscription.id));
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
