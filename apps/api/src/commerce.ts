import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import { and, asc, eq, isNull, lt, or } from "drizzle-orm";
import {
  processCommunityPaymentEvent,
  startLearnerCommunityCheckout,
  type CommunityCheckoutDto,
} from "./community-commerce.js";
import { ActivityType, recordActivity } from "./activities.js";
import * as schema from "./db/schema/index.js";
import {
  getConfiguredPaymentProvider,
  getPaymentProvider,
  type NormalizedPaymentEvent,
  type PaymentCheckoutResult,
  type PaymentProvider,
  type PaymentWebhookScope,
} from "./payments.js";
import {
  findLearnerMembership,
  upsertLearnerMembership,
  revokeLearnerMembership,
} from "./learner-memberships.js";
import { notifyPaymentSucceeded } from "./purchase-notifications.js";
import { amountMinorForPlan, sourceTypeForKind } from "./storefront.js";
import type { AppDb } from "./types.js";

type CheckoutStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "disputed";

export type StorefrontCheckoutDto = {
  id: string;
  schoolId: string;
  productId: string;
  planId: string;
  provider: "free" | "stripe" | "lemonsqueezy" | "razorpay";
  status: CheckoutStatus;
  currency: string;
  amountMinor: number;
  checkoutUrl: string | null;
  checkoutData: PaymentCheckoutResult["checkoutData"];
  createdAt: string;
  updatedAt: string;
};

type CheckoutContext = {
  schoolId: string;
  publicSchoolId: string;
  schoolAccountId?: string;
  learnerId?: string;
  learnerPublicId: string;
  learnerEmail: string;
  learnerName: string;
  requestId: string;
};

type CheckoutRow = typeof schema.storefrontCheckoutAttempts.$inferSelect;
type CheckoutSessionRow = typeof schema.storefrontCheckoutSessions.$inferSelect;

export type StorefrontCheckoutSessionDto = {
  id: string;
  resourceType: "product" | "community";
  resourceId: string;
  productId: string | null;
  communityId: string | null;
  planId: string;
  productTitle: string | null;
  productKind: "course" | "download" | null;
  communityName: string | null;
  planName: string;
  planDescription: string;
  planType: "free" | "onetime" | "emi" | "subscription";
  currency: string;
  amountMinor: number;
  billingInterval: "month" | "year" | null;
  installmentCount: number | null;
  status: "open" | "completed" | "expired";
  checkoutId: string | null;
  checkoutStatus: CheckoutStatus | null;
  expiresAt: string;
};

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
  row: CheckoutRow,
  publicSchoolId: string,
  publicProductId: string,
  publicPlanId: string,
  checkoutData: PaymentCheckoutResult["checkoutData"] = null,
) {
  return {
    id: row.publicId,
    schoolId: publicSchoolId,
    productId: publicProductId,
    planId: publicPlanId,
    provider: row.provider,
    status: row.status,
    currency: row.currency,
    amountMinor: row.amountMinor,
    checkoutUrl: row.providerCheckoutUrl,
    checkoutData,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  } satisfies StorefrontCheckoutDto;
}

/** Whether the learner can already open the product, directly or through a
 * community plan that includes it. */
async function hasActiveProductAccess(
  db: AppDb,
  schoolId: string,
  schoolAccountId: string,
  productPublicId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: schema.learnerMemberships.id })
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.schoolId, schoolId),
        eq(schema.learnerMemberships.schoolAccountId, schoolAccountId),
        eq(schema.learnerMemberships.entityType, "product"),
        eq(schema.learnerMemberships.entityId, productPublicId),
        eq(schema.learnerMemberships.status, "active"),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function loadCheckoutPlan(db: AppDb, schoolId: string, planPublicId: string) {
  const rows = await db
    .select({
      plan: schema.storefrontPlans,
      product: schema.products,
      school: schema.schools,
    })
    .from(schema.storefrontPlans)
    .innerJoin(
      schema.products,
      and(
        eq(schema.products.publicId, schema.storefrontPlans.entityId),
        eq(schema.storefrontPlans.entityType, "product"),
      ),
    )
    .innerJoin(schema.schools, eq(schema.schools.id, schema.storefrontPlans.schoolId))
    .where(
      and(
        eq(schema.storefrontPlans.publicId, planPublicId),
        eq(schema.storefrontPlans.schoolId, schoolId),
        eq(schema.storefrontPlans.status, "active"),
        eq(schema.products.schoolId, schoolId),
        eq(schema.products.status, "published"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function loadCommunityCheckoutPlan(
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
    .innerJoin(schema.schools, eq(schema.schools.id, schema.storefrontPlans.schoolId))
    .where(
      and(
        eq(schema.storefrontPlans.publicId, planPublicId),
        eq(schema.storefrontPlans.schoolId, schoolId),
        eq(schema.storefrontPlans.entityId, communityPublicId),
        eq(schema.storefrontPlans.status, "active"),
        eq(schema.communities.schoolId, schoolId),
        isNull(schema.communities.deletedAt),
        eq(schema.communities.enabled, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function loadCheckoutSession(
  db: AppDb,
  schoolId: string,
  sessionPublicId: string,
  schoolAccountId?: string,
) {
  const conditions = [
    eq(schema.storefrontCheckoutSessions.publicId, sessionPublicId),
    eq(schema.storefrontCheckoutSessions.schoolId, schoolId),
  ];
  if (schoolAccountId) {
    conditions.push(
      or(
        isNull(schema.storefrontCheckoutSessions.schoolAccountId),
        eq(schema.storefrontCheckoutSessions.schoolAccountId, schoolAccountId),
      )!,
    );
  }
  const rows = await db
    .select({
      session: schema.storefrontCheckoutSessions,
      plan: schema.storefrontPlans,
      product: schema.products,
      community: schema.communities,
      school: schema.schools,
      attempt: schema.storefrontCheckoutAttempts,
      communityAttempt: schema.communityCheckoutAttempts,
    })
    .from(schema.storefrontCheckoutSessions)
    .innerJoin(
      schema.storefrontPlans,
      eq(schema.storefrontPlans.id, schema.storefrontCheckoutSessions.planId),
    )
    .leftJoin(
      schema.products,
      and(
        eq(schema.products.id, schema.storefrontCheckoutSessions.productId),
        eq(schema.storefrontCheckoutSessions.entityType, "product"),
      ),
    )
    .leftJoin(
      schema.communities,
      and(
        eq(schema.communities.id, schema.storefrontCheckoutSessions.communityId),
        eq(schema.storefrontCheckoutSessions.entityType, "community"),
      ),
    )
    .innerJoin(
      schema.schools,
      eq(schema.schools.id, schema.storefrontCheckoutSessions.schoolId),
    )
    .leftJoin(
      schema.storefrontCheckoutAttempts,
      eq(
        schema.storefrontCheckoutAttempts.id,
        schema.storefrontCheckoutSessions.checkoutId,
      ),
    )
    .leftJoin(
      schema.communityCheckoutAttempts,
      eq(
        schema.communityCheckoutAttempts.id,
        schema.storefrontCheckoutSessions.communityCheckoutId,
      ),
    )
    .where(and(...conditions))
    .limit(1);
  return rows[0] ?? null;
}

function checkoutSessionToDto(row: {
  session: CheckoutSessionRow;
  plan: typeof schema.storefrontPlans.$inferSelect;
  product: typeof schema.products.$inferSelect | null;
  community: typeof schema.communities.$inferSelect | null;
  school: typeof schema.schools.$inferSelect;
  attempt: CheckoutRow | null;
  communityAttempt: typeof schema.communityCheckoutAttempts.$inferSelect | null;
}): StorefrontCheckoutSessionDto {
  const isProduct = row.session.entityType === "product";
  const resource = isProduct ? row.product : row.community;
  if (!resource) {
    throw new Error("checkout_session_resource_missing");
  }
  return {
    id: row.session.publicId,
    resourceType: row.session.entityType,
    resourceId: resource.publicId,
    productId: row.product?.publicId ?? null,
    communityId: row.community?.publicId ?? null,
    planId: row.plan.publicId,
    productTitle: row.product?.title ?? null,
    productKind: row.product?.kind ?? null,
    communityName: row.community?.name ?? null,
    planName: row.plan.name,
    planDescription: row.plan.description,
    planType: sourceTypeForKind(row.plan.kind),
    currency: row.school.currency.toUpperCase(),
    amountMinor: amountMinorForPlan(row.plan),
    billingInterval: row.plan.billingInterval,
    installmentCount: row.plan.installmentCount,
    status: row.session.status,
    checkoutId: row.attempt?.publicId ?? row.communityAttempt?.publicId ?? null,
    checkoutStatus: row.attempt?.status ?? row.communityAttempt?.status ?? null,
    expiresAt: serializeDate(row.session.expiresAt),
  };
}

function checkoutSessionExpired(row: CheckoutSessionRow, clock: Clock): boolean {
  return row.expiresAt.getTime() <= clock.now().getTime();
}

async function expireCheckoutSession(db: AppDb, row: CheckoutSessionRow, clock: Clock) {
  const now = clock.now();
  await db
    .update(schema.storefrontCheckoutSessions)
    .set({ status: "expired", updatedAt: now })
    .where(eq(schema.storefrontCheckoutSessions.id, row.id));
}

export async function createCheckoutSession(
  db: AppDb,
  school: { schoolId: string; publicId: string },
  input:
    | { resourceType: "product"; resourcePublicId: string; planPublicId: string }
    | { resourceType: "community"; resourcePublicId: string; planPublicId: string },
  clock: Clock,
): Promise<
  | { ok: true; value: StorefrontCheckoutSessionDto }
  | { ok: false; error: PlatformError }
> {
  const selected =
    input.resourceType === "product"
      ? await loadCheckoutPlan(db, school.schoolId, input.planPublicId)
      : await loadCommunityCheckoutPlan(
          db,
          school.schoolId,
          input.resourcePublicId,
          input.planPublicId,
        );
  if (!selected) return error("not_found");
  const productSelected =
    input.resourceType === "product"
      ? (selected as NonNullable<Awaited<ReturnType<typeof loadCheckoutPlan>>>)
      : null;
  const communitySelected =
    input.resourceType === "community"
      ? (selected as NonNullable<Awaited<ReturnType<typeof loadCommunityCheckoutPlan>>>)
      : null;
  if (
    input.resourceType === "product" &&
    (!productSelected ||
      productSelected.product.publicId !== input.resourcePublicId ||
      productSelected.product.status !== "published")
  ) {
    return error("not_found");
  }
  const now = clock.now();
  // Checkout intents contain no financial history. Remove stale intents as
  // new ones are created; the checkout attempt/payment rows remain the source
  // of truth for any provider callback or audit record.
  await db
    .delete(schema.storefrontCheckoutSessions)
    .where(
      and(
        eq(schema.storefrontCheckoutSessions.schoolId, school.schoolId),
        lt(schema.storefrontCheckoutSessions.expiresAt, now),
      ),
    );
  const session: CheckoutSessionRow = {
    id: uuidv7(clock),
    publicId: createPublicId("cse", clock),
    schoolId: school.schoolId,
    entityType: input.resourceType,
    productId: productSelected?.product.id ?? null,
    communityId: communitySelected?.community.id ?? null,
    planId: selected.plan.id,
    schoolAccountId: null,
    checkoutId: null,
    communityCheckoutId: null,
    status: "open",
    expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(schema.storefrontCheckoutSessions).values(session);
  return {
    ok: true,
    value: checkoutSessionToDto({
      session,
      plan: selected.plan,
      product: productSelected?.product ?? null,
      community: communitySelected?.community ?? null,
      school: selected.school,
      attempt: null,
      communityAttempt: null,
    }),
  };
}

export async function getCheckoutSession(
  db: AppDb,
  input: { schoolId: string; sessionPublicId: string; learnerId?: string },
  clock: Clock,
): Promise<
  | { ok: true; value: StorefrontCheckoutSessionDto }
  | { ok: false; error: PlatformError }
> {
  const row = await loadCheckoutSession(
    db,
    input.schoolId,
    input.sessionPublicId,
    input.learnerId,
  );
  if (!row) return error("not_found");
  if (
    checkoutSessionExpired(row.session, clock) &&
    row.session.status !== "completed"
  ) {
    await expireCheckoutSession(db, row.session, clock);
    return error("not_found");
  }
  return { ok: true, value: checkoutSessionToDto(row) };
}

export async function startCheckoutSession(
  db: AppDb,
  context: CheckoutContext,
  input: {
    sessionPublicId: string;
    returnUrl: string;
    joiningReason?: string;
  },
  clock: Clock,
  paymentProvider?: PaymentProvider,
): Promise<
  | { ok: true; value: StorefrontCheckoutDto | CommunityCheckoutDto }
  | { ok: false; error: PlatformError }
> {
  const row = await loadCheckoutSession(db, context.schoolId, input.sessionPublicId);
  if (!row) return error("not_found");
  if (
    checkoutSessionExpired(row.session, clock) &&
    row.session.status !== "completed"
  ) {
    await expireCheckoutSession(db, row.session, clock);
    return error("not_found");
  }
  const accountId = context.schoolAccountId ?? context.learnerId!;
  if (row.session.schoolAccountId && row.session.schoolAccountId !== accountId) {
    return error("conflict", { reason: "checkout_session_already_claimed" });
  }
  if (!row.session.schoolAccountId) {
    await db
      .update(schema.storefrontCheckoutSessions)
      .set({ schoolAccountId: accountId, updatedAt: clock.now() })
      .where(
        and(
          eq(schema.storefrontCheckoutSessions.id, row.session.id),
          isNull(schema.storefrontCheckoutSessions.schoolAccountId),
        ),
      );
    const claimed = await loadCheckoutSession(
      db,
      context.schoolId,
      input.sessionPublicId,
    );
    if (!claimed || claimed.session.schoolAccountId !== accountId) {
      return error("conflict", { reason: "checkout_session_already_claimed" });
    }
  }
  const result =
    row.session.entityType === "community"
      ? row.community
        ? await startLearnerCommunityCheckout(
            db,
            { ...context, learnerId: accountId },
            row.community.publicId,
            {
              planPublicId: row.plan.publicId,
              joiningReason: input.joiningReason ?? "",
              idempotencyKey: `session:${row.session.publicId}`,
              returnUrl: input.returnUrl,
            },
            clock,
            paymentProvider,
          )
        : error("not_found")
      : await startLearnerCheckout(
          db,
          context,
          {
            planPublicId: row.plan.publicId,
            idempotencyKey: `session:${row.session.publicId}`,
            returnUrl: input.returnUrl,
          },
          clock,
          paymentProvider,
        );
  if (!result.ok) return result;
  if (row.session.entityType === "community") {
    const attempt = await db
      .select({ id: schema.communityCheckoutAttempts.id })
      .from(schema.communityCheckoutAttempts)
      .where(eq(schema.communityCheckoutAttempts.publicId, result.value.id))
      .limit(1);
    await db
      .update(schema.storefrontCheckoutSessions)
      .set({
        communityCheckoutId: attempt[0]?.id ?? null,
        status: result.value.status === "paid" ? "completed" : "open",
        updatedAt: clock.now(),
      })
      .where(eq(schema.storefrontCheckoutSessions.id, row.session.id));
  } else {
    const attempt = await db
      .select({ id: schema.storefrontCheckoutAttempts.id })
      .from(schema.storefrontCheckoutAttempts)
      .where(eq(schema.storefrontCheckoutAttempts.publicId, result.value.id))
      .limit(1);
    if (attempt[0]) {
      await db
        .update(schema.storefrontCheckoutSessions)
        .set({
          checkoutId: attempt[0].id,
          status: result.value.status === "paid" ? "completed" : "open",
          updatedAt: clock.now(),
        })
        .where(eq(schema.storefrontCheckoutSessions.id, row.session.id));
    } else if (result.value.status === "paid") {
      await db
        .update(schema.storefrontCheckoutSessions)
        .set({ status: "completed", updatedAt: clock.now() })
        .where(eq(schema.storefrontCheckoutSessions.id, row.session.id));
    }
  }
  return result;
}

async function loadCheckoutById(
  db: AppDb,
  context: CheckoutContext,
  checkoutPublicId: string,
) {
  const rows = await db
    .select({
      attempt: schema.storefrontCheckoutAttempts,
      plan: schema.storefrontPlans,
      product: schema.products,
    })
    .from(schema.storefrontCheckoutAttempts)
    .innerJoin(
      schema.storefrontPlans,
      and(
        eq(schema.storefrontPlans.id, schema.storefrontCheckoutAttempts.planId),
        eq(schema.storefrontPlans.entityType, "product"),
      ),
    )
    .innerJoin(
      schema.products,
      eq(schema.products.id, schema.storefrontCheckoutAttempts.productId),
    )
    .where(
      and(
        eq(schema.storefrontCheckoutAttempts.publicId, checkoutPublicId),
        eq(schema.storefrontCheckoutAttempts.schoolId, context.schoolId),
        eq(schema.storefrontCheckoutAttempts.schoolAccountId, context.schoolAccountId ?? context.learnerId!),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function markCheckoutFailed(db: AppDb, id: string, clock: Clock) {
  const now = clock.now();
  await db
    .update(schema.storefrontCheckoutAttempts)
    .set({ status: "failed", updatedAt: now, completedAt: now })
    .where(eq(schema.storefrontCheckoutAttempts.id, id));
}

async function fulfillFreeCheckout(
  db: AppDb,
  row: CheckoutRow,
  product: typeof schema.products.$inferSelect,
  plan: typeof schema.storefrontPlans.$inferSelect,
  context: CheckoutContext,
  clock: Clock,
): Promise<CheckoutRow> {
  const now = clock.now();
  return db.transaction(async (tx) => {
    const current = (
      await tx
        .select()
        .from(schema.storefrontCheckoutAttempts)
        .where(eq(schema.storefrontCheckoutAttempts.id, row.id))
        .limit(1)
    )[0];
    if (!current) throw new Error("storefront_checkout_missing");
    if (current.status === "paid") return current;
    const membership = await upsertLearnerMembership(
      tx as unknown as AppDb,
      {
        schoolId: context.schoolId,
        schoolAccountId: context.schoolAccountId ?? context.learnerId!,
        entityType: "product",
        entityId: product.publicId,
        paymentPlanId: plan.publicId,
        status: "active",
        sessionId: current.publicId,
      },
      clock,
    );
    await tx
      .update(schema.storefrontCheckoutAttempts)
      .set({ membershipId: membership.id, updatedAt: now })
      .where(eq(schema.storefrontCheckoutAttempts.id, current.id));
    const providerPaymentId = `free_${current.publicId}`;
    const payment = {
      id: uuidv7(clock),
      publicId: createPublicId("pay", clock),
      checkoutId: current.id,
      membershipId: membership.id,
      providerPaymentId,
      kind: "one_time" as const,
      status: "succeeded" as const,
      currency: current.currency,
      amountMinor: current.amountMinor,
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await tx.insert(schema.storefrontPayments).values(payment);
    await tx.insert(schema.storefrontInvoices).values({
      id: uuidv7(clock),
      publicId: createPublicId("inv", clock),
      paymentId: payment.id,
      checkoutId: current.id,
      membershipId: membership.id,
      providerInvoiceId: null,
      status: "paid",
      currency: current.currency,
      amountMinor: current.amountMinor,
      issuedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await tx
      .update(schema.storefrontCheckoutAttempts)
      .set({ status: "paid", updatedAt: now, completedAt: now })
      .where(eq(schema.storefrontCheckoutAttempts.id, current.id));
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: context.schoolId,
      actorId: context.learnerPublicId,
      action: "storefront_checkout.paid",
      resourceType: "storefront_checkout",
      resourceId: current.publicId,
      requestId: context.requestId,
      createdAt: now,
    });
    return {
      ...current,
      status: "paid" as const,
      updatedAt: now,
      completedAt: now,
    };
  });
}

export async function startLearnerCheckout(
  db: AppDb,
  context: CheckoutContext,
  input: { planPublicId: string; idempotencyKey: string; returnUrl: string },
  clock: Clock,
  paymentProviderOverride?: PaymentProvider,
): Promise<
  { ok: true; value: StorefrontCheckoutDto } | { ok: false; error: PlatformError }
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
  const isLocalReturnHost =
    parsedReturnUrl.hostname === "localhost" ||
    parsedReturnUrl.hostname.endsWith(".localhost") ||
    parsedReturnUrl.hostname === "127.0.0.1";
  if (parsedReturnUrl.protocol !== "https:" && !isLocalReturnHost) {
    return error("validation_failed", { reason: "invalid_return_url" });
  }
  const existing = await db
    .select()
    .from(schema.storefrontCheckoutAttempts)
    .where(
      and(
        eq(schema.storefrontCheckoutAttempts.schoolId, context.schoolId),
        eq(schema.storefrontCheckoutAttempts.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  if (existing[0]) {
    const row = existing[0];
    const selected = await loadCheckoutPlan(db, context.schoolId, input.planPublicId);
    if (
      !selected ||
      row.schoolAccountId !== (context.schoolAccountId ?? context.learnerId) ||
      row.planId !== selected.plan.id ||
      row.productId !== selected.product.id
    ) {
      return error("conflict", { reason: "idempotency_key_reused" });
    }
    if (row.status === "pending" && !row.providerCheckoutId) {
      return error("conflict", { reason: "checkout_in_progress" });
    }
    return {
      ok: true,
      value: checkoutToDto(
        row,
        context.publicSchoolId,
        selected.product.publicId,
        selected.plan.publicId,
      ),
    };
  }
  const selected = await loadCheckoutPlan(db, context.schoolId, input.planPublicId);
  if (!selected) return error("not_found");
  const paymentProvider = selected.plan.kind === "free"
    ? null
    : await getPaymentProvider(db, context.schoolId, paymentProviderOverride);
  if (selected.plan.kind !== "free" && !paymentProvider) {
    return error("conflict", { reason: "provider_unavailable" });
  }
  const existingMembership = await findLearnerMembership(db, {
    schoolId: context.schoolId,
    learnerId: context.learnerId,
    entityType: "product",
    entityId: selected.product.publicId,
  });
  if (existingMembership?.status === "rejected") {
    return error("conflict", { reason: "membership_rejected" });
  }
  // A learner who already has access never starts another checkout: staging
  // one would set their membership to pending and lock them out until (or
  // unless) they paid again. Only a subscription the provider reports as
  // lapsed counts as no longer having access.
  if (existingMembership?.status === "active") {
    const subscriptionLapsed =
      Boolean(existingMembership.subscriptionId) &&
      Boolean(paymentProvider?.validateSubscription) &&
      !(await paymentProvider!.validateSubscription!(existingMembership.subscriptionId!));
    if (!subscriptionLapsed) {
      return error("conflict", { reason: "already_member" });
    }
    await db
      .update(schema.learnerMemberships)
      .set({ status: "expired", updatedAt: clock.now() })
      .where(eq(schema.learnerMemberships.id, existingMembership.id));
  } else if (
    await hasActiveProductAccess(
      db,
      context.schoolId,
      context.schoolAccountId ?? context.learnerId!,
      selected.product.publicId,
    )
  ) {
    // Access that came with a community plan counts too.
    return error("conflict", { reason: "already_member" });
  }
  const now = clock.now();
  const accountId = context.schoolAccountId ?? context.learnerId!;
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("chk", clock),
    schoolId: context.schoolId,
    schoolAccountId: accountId,
    productId: selected.product.id,
    planId: selected.plan.id,
    provider: selected.plan.kind === "free"
      ? ("free" as const)
      : paymentProvider!.name,
    idempotencyKey,
    providerCheckoutId: null,
    providerCheckoutUrl: null,
    status: "pending" as const,
    currency: selected.school.currency.toUpperCase(),
    amountMinor: amountMinorForPlan(selected.plan),
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    membershipId: null,
  };
  try {
    await db.insert(schema.storefrontCheckoutAttempts).values(row);
  } catch (caught) {
    if (String(caught).includes("storefront_checkout_school_idempotency_uidx")) {
      return error("conflict", { reason: "checkout_in_progress" });
    }
    throw caught;
  }
  const membership = await upsertLearnerMembership(
    db,
    {
      schoolId: context.schoolId,
      schoolAccountId: accountId,
      entityType: "product",
      entityId: selected.product.publicId,
      paymentPlanId: selected.plan.publicId,
      status: "pending",
      ...(selected.plan.kind === "free"
        ? {}
        : { subscriptionId: null, subscriptionMethod: null }),
      sessionId: row.publicId,
    },
    clock,
  );
  await db
    .update(schema.storefrontCheckoutAttempts)
    .set({ membershipId: membership.id, updatedAt: clock.now() })
    .where(eq(schema.storefrontCheckoutAttempts.id, row.id));
  const linkedRow = { ...row, membershipId: membership.id };
  if (selected.plan.kind === "free") {
    const paid = await fulfillFreeCheckout(
      db,
      linkedRow,
      selected.product,
      selected.plan,
      context,
      clock,
    );
    await notifyPaymentSucceeded(
      db,
      { resourceType: "product", providerPaymentId: `free_${paid.publicId}` },
      clock,
    );
    return {
      ok: true,
      value: checkoutToDto(
        paid,
        context.publicSchoolId,
        selected.product.publicId,
        selected.plan.publicId,
      ),
    };
  }
  let checkout: PaymentCheckoutResult;
  try {
    checkout = await paymentProvider!.createCheckout({
      paymentPlan: {
        kind: selected.plan.kind,
        amountMinor: amountMinorForPlan(selected.plan),
        billingInterval: selected.plan.billingInterval,
        installmentCount: selected.plan.installmentCount,
        providerProductId: selected.plan.providerProductId,
      },
      product: { id: selected.product.publicId, title: selected.product.title },
      customer: { email: context.learnerEmail, name: context.learnerName },
      currency: selected.school.currency.toUpperCase(),
      returnUrl: input.returnUrl,
      metadata: {
        courselit_checkout_id: row.publicId,
        courselit_school_id: context.publicSchoolId,
        courselit_learner_id: context.learnerPublicId,
        courselit_product_id: selected.product.publicId,
        courselit_plan_id: selected.plan.publicId,
      },
    });
  } catch {
    await markCheckoutFailed(db, row.id, clock);
    if (linkedRow.membershipId) {
      await revokeLearnerMembership(db, linkedRow.membershipId, "payment_failed", clock);
    }
    return error("conflict", { reason: "provider_unavailable" });
  }
  const updatedAt = clock.now();
  await db
    .update(schema.storefrontCheckoutAttempts)
    .set({
      providerCheckoutId: checkout.checkoutId,
      providerCheckoutUrl: checkout.checkoutUrl,
      updatedAt,
    })
    .where(eq(schema.storefrontCheckoutAttempts.id, row.id));
  await db.insert(schema.storefrontInvoices).values({
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
    createdAt: updatedAt,
    updatedAt,
  });
  return {
    ok: true,
    value: {
      ...checkoutToDto(
        {
          ...linkedRow,
          providerCheckoutId: checkout.checkoutId,
          providerCheckoutUrl: checkout.checkoutUrl,
          updatedAt,
        },
        context.publicSchoolId,
        selected.product.publicId,
        selected.plan.publicId,
        checkout.checkoutData,
      ),
      checkoutUrl: checkout.checkoutUrl,
      checkoutData: checkout.checkoutData,
    },
  };
}

export async function getLearnerCheckout(
  db: AppDb,
  context: CheckoutContext,
  checkoutPublicId: string,
): Promise<
  { ok: true; value: StorefrontCheckoutDto } | { ok: false; error: PlatformError }
> {
  const row = await loadCheckoutById(db, context, checkoutPublicId);
  if (!row) return error("not_found");
  return {
    ok: true,
    value: checkoutToDto(
      row.attempt,
      context.publicSchoolId,
      row.product.publicId,
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
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Whether every installment of an installment plan has been paid through
 * this checkout. A paid-off plan grants lifetime access, so the provider
 * ending its subscription afterwards must not revoke anything.
 */
export async function installmentPlanPaidOff(
  db: AppDb,
  checkoutId: string,
  plan: Pick<typeof schema.storefrontPlans.$inferSelect, "kind" | "installmentCount">,
): Promise<boolean> {
  if (plan.kind !== "installment" || !plan.installmentCount) return false;
  const paid = await db
    .select({ id: schema.storefrontInvoices.id })
    .from(schema.storefrontInvoices)
    .where(
      and(
        eq(schema.storefrontInvoices.checkoutId, checkoutId),
        eq(schema.storefrontInvoices.status, "paid"),
      ),
    );
  return paid.length >= plan.installmentCount;
}

function metadataFrom(data: Record<string, unknown>): Record<string, string> {
  const raw = data.metadata ?? data.custom_data;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

function storefrontAttemptInScope(scope: PaymentWebhookScope) {
  return and(
    eq(schema.storefrontCheckoutAttempts.schoolId, scope.schoolId),
    eq(schema.storefrontCheckoutAttempts.provider, scope.provider),
  );
}

async function findEventCheckout(
  db: AppDb,
  data: Record<string, unknown>,
  scope: PaymentWebhookScope,
) {
  const metadata = metadataFrom(data);
  const checkoutPublicId = metadata.courselit_checkout_id;
  if (checkoutPublicId) {
    const rows = await db
      .select({
        attempt: schema.storefrontCheckoutAttempts,
        plan: schema.storefrontPlans,
        product: schema.products,
      })
      .from(schema.storefrontCheckoutAttempts)
      .innerJoin(
        schema.storefrontPlans,
        and(
          eq(schema.storefrontPlans.id, schema.storefrontCheckoutAttempts.planId),
          eq(schema.storefrontPlans.entityType, "product"),
        ),
      )
      .innerJoin(
        schema.products,
        eq(schema.products.id, schema.storefrontCheckoutAttempts.productId),
      )
      .where(and(eq(schema.storefrontCheckoutAttempts.publicId, checkoutPublicId), storefrontAttemptInScope(scope)))
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
    const rows = await db
      .select({
        attempt: schema.storefrontCheckoutAttempts,
        plan: schema.storefrontPlans,
        product: schema.products,
      })
      .from(schema.storefrontSubscriptions)
      .innerJoin(
        schema.storefrontCheckoutAttempts,
        eq(schema.storefrontCheckoutAttempts.id, schema.storefrontSubscriptions.checkoutId),
      )
      .innerJoin(
        schema.storefrontPlans,
        and(
          eq(schema.storefrontPlans.id, schema.storefrontCheckoutAttempts.planId),
          eq(schema.storefrontPlans.entityType, "product"),
        ),
      )
      .innerJoin(
        schema.products,
        eq(schema.products.id, schema.storefrontCheckoutAttempts.productId),
      )
      .where(
        and(
          eq(schema.storefrontSubscriptions.providerSubscriptionId, providerSubscriptionId),
          storefrontAttemptInScope(scope),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }
  if (!providerCheckoutId) return null;
  const rows = await db
    .select({
      attempt: schema.storefrontCheckoutAttempts,
      plan: schema.storefrontPlans,
      product: schema.products,
    })
    .from(schema.storefrontCheckoutAttempts)
    .innerJoin(
      schema.storefrontPlans,
      and(
        eq(schema.storefrontPlans.id, schema.storefrontCheckoutAttempts.planId),
        eq(schema.storefrontPlans.entityType, "product"),
      ),
    )
    .innerJoin(
      schema.products,
      eq(schema.products.id, schema.storefrontCheckoutAttempts.productId),
    )
    .where(and(eq(schema.storefrontCheckoutAttempts.providerCheckoutId, providerCheckoutId), storefrontAttemptInScope(scope)))
    .limit(1);
  return rows[0] ?? null;
}

async function revokeStorefrontAccess(
  tx: AppDb,
  attempt: CheckoutRow,
  clock: Clock,
  status: "expired" | "payment_failed",
  options?: { cancelSubscription?: boolean; paymentProvider?: PaymentProvider | null },
) {
  if (!attempt.membershipId) return;
  await revokeLearnerMembership(tx, attempt.membershipId, status, clock, options);
}

async function processPaymentEvent(
  db: AppDb,
  scope: PaymentWebhookScope,
  eventType: string,
  data: Record<string, unknown>,
  clock: Clock,
  requestId: string,
  paymentProvider?: PaymentProvider,
): Promise<"processed" | "ignored"> {
  const eventCheckout = await findEventCheckout(db, data, scope);
  const paymentId = stringValue(data.payment_id);
  if (eventType === "payment.succeeded") {
    if (!eventCheckout || !paymentId) return "ignored";
    const amount = integerValue(data.amount ?? data.total_amount);
    const currency = stringValue(data.currency ?? data.billing_currency)?.toUpperCase();
    if (amount === null || !currency) throw new Error("payment_amount_missing");
    if (
      amount !== eventCheckout.attempt.amountMinor ||
      currency !== eventCheckout.attempt.currency
    ) {
      throw new Error("payment_amount_mismatch");
    }
    const now = clock.now();
    await db.transaction(async (tx) => {
      const current = (
        await tx
          .select()
          .from(schema.storefrontCheckoutAttempts)
          .where(eq(schema.storefrontCheckoutAttempts.id, eventCheckout.attempt.id))
          .limit(1)
      )[0];
      if (!current) throw new Error("storefront_checkout_missing");
      const providerInvoiceId = stringValue(data.invoice_id);
      // One charge can be reported by several events with different payment
      // ids (e.g. a checkout session and its first invoice); the provider
      // invoice id ties them to the payment already recorded.
      const existingPayment =
        (
          await tx
            .select()
            .from(schema.storefrontPayments)
            .where(eq(schema.storefrontPayments.providerPaymentId, paymentId))
            .limit(1)
        )[0] ??
        (providerInvoiceId
          ? (
              await tx
                .select({ payment: schema.storefrontPayments })
                .from(schema.storefrontInvoices)
                .innerJoin(
                  schema.storefrontPayments,
                  eq(schema.storefrontPayments.id, schema.storefrontInvoices.paymentId),
                )
                .where(eq(schema.storefrontInvoices.providerInvoiceId, providerInvoiceId))
                .limit(1)
            )[0]?.payment
          : undefined);
      const isNewPayment = !existingPayment;
      let payment = existingPayment;
      if (payment && payment.checkoutId !== current.id)
        throw new Error("payment_checkout_mismatch");
      // A late duplicate of a charge that was refunded or disputed since must
      // not restore access.
      if (payment && (payment.status === "refunded" || payment.status === "disputed")) {
        return;
      }
      const membership = await upsertLearnerMembership(
        tx as unknown as AppDb,
        {
          schoolId: current.schoolId,
          schoolAccountId: current.schoolAccountId,
          entityType: "product",
          entityId: eventCheckout.product.publicId,
          paymentPlanId: eventCheckout.plan.publicId,
          status: "active",
          sessionId: current.publicId,
        },
        clock,
      );
      if (current.membershipId !== membership.id) {
        await tx
          .update(schema.storefrontCheckoutAttempts)
          .set({ membershipId: membership.id, updatedAt: now })
          .where(eq(schema.storefrontCheckoutAttempts.id, current.id));
      }
      if (!payment) {
        payment = {
          id: uuidv7(clock),
          publicId: createPublicId("pay", clock),
          checkoutId: current.id,
          membershipId: membership.id,
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
        await tx.insert(schema.storefrontPayments).values(payment);
      } else if (payment.status !== "succeeded") {
        await tx
          .update(schema.storefrontPayments)
          .set({ status: "succeeded", updatedAt: now })
          .where(eq(schema.storefrontPayments.id, payment.id));
        payment = { ...payment, status: "succeeded", updatedAt: now };
      }
      const invoice = (
        await tx
          .select()
          .from(schema.storefrontInvoices)
          .where(
            or(
              eq(schema.storefrontInvoices.paymentId, payment.id),
              and(
                eq(schema.storefrontInvoices.checkoutId, current.id),
                eq(schema.storefrontInvoices.status, "pending"),
              ),
            ),
          )
          .limit(1)
      )[0];
      if (invoice) {
        await tx
          .update(schema.storefrontInvoices)
          .set({
            paymentId: payment.id,
            membershipId: membership.id,
            providerInvoiceId:
              stringValue(data.invoice_id) ?? invoice.providerInvoiceId,
            status: "paid",
            currency,
            amountMinor: amount,
            updatedAt: now,
          })
          .where(eq(schema.storefrontInvoices.id, invoice.id));
      } else {
        await tx.insert(schema.storefrontInvoices).values({
          id: uuidv7(clock),
          publicId: createPublicId("inv", clock),
          paymentId: payment.id,
          checkoutId: current.id,
          membershipId: membership.id,
          providerInvoiceId: stringValue(data.invoice_id),
          status: "paid",
          currency,
          amountMinor: amount,
          issuedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (current.status !== "paid") {
        await tx
          .update(schema.storefrontCheckoutAttempts)
          .set({
            status: "paid",
            updatedAt: now,
            completedAt: now,
          })
          .where(eq(schema.storefrontCheckoutAttempts.id, current.id));
      }
      if (isNewPayment) {
        await recordActivity(tx as unknown as AppDb, {
          schoolId: current.schoolId,
          actorId: current.schoolAccountId,
          type: ActivityType.PURCHASED,
          entityId: eventCheckout.product.publicId,
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
                .select({ id: schema.storefrontSubscriptions.providerSubscriptionId })
                .from(schema.storefrontSubscriptions)
                .where(eq(schema.storefrontSubscriptions.checkoutId, current.id))
                .limit(1)
            )[0]?.id ?? null
          : null);
      let subscription: typeof schema.storefrontSubscriptions.$inferSelect | undefined;
      if (subscriptionId && recurringPlan) {
        subscription = (
          await tx
            .select({ subscription: schema.storefrontSubscriptions })
            .from(schema.storefrontSubscriptions)
            .innerJoin(schema.storefrontCheckoutAttempts, eq(schema.storefrontCheckoutAttempts.id, schema.storefrontSubscriptions.checkoutId))
            .where(
              and(
                eq(schema.storefrontSubscriptions.providerSubscriptionId, subscriptionId),
                storefrontAttemptInScope(scope),
              ),
            )
            .limit(1)
        )[0]?.subscription;
        const currentPeriodEnd = dateValue(data.current_period_end);
        if (!subscription) {
          subscription = {
            id: uuidv7(clock),
            publicId: createPublicId("sub", clock),
            checkoutId: current.id,
            providerSubscriptionId: subscriptionId,
            status: "active",
            currentPeriodEnd,
            cancelAt: null,
            cancelAtPeriodEnd: false,
            createdAt: now,
            updatedAt: now,
          };
          await tx.insert(schema.storefrontSubscriptions).values(subscription);
        } else if (currentPeriodEnd) {
          await tx
            .update(schema.storefrontSubscriptions)
            .set({ currentPeriodEnd, updatedAt: now })
            .where(eq(schema.storefrontSubscriptions.id, subscription.id));
        }
        await tx
          .update(schema.learnerMemberships)
          .set({
            subscriptionId,
            subscriptionMethod: current.provider,
            updatedAt: now,
          })
          .where(eq(schema.learnerMemberships.id, membership.id));
      }
      if (
        subscriptionId &&
        subscription &&
        subscription.status !== "cancelled" &&
        subscription.status !== "expired" &&
        eventCheckout.plan.kind === "installment" &&
        (await installmentPlanPaidOff(tx as unknown as AppDb, current.id, eventCheckout.plan))
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
          .update(schema.storefrontSubscriptions)
          .set({ status: "cancelled", cancelAt: now, updatedAt: now })
          .where(eq(schema.storefrontSubscriptions.id, subscription.id));
      }
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId: current.schoolId,
        actorId: "payment:webhook",
        action: "storefront_payment.succeeded",
        resourceType: "storefront_payment",
        resourceId: payment.publicId,
        requestId,
        createdAt: now,
      });
    });
    await notifyPaymentSucceeded(db, { resourceType: "product", providerPaymentId: paymentId }, clock);
    return "processed";
  }
  if (
    eventType === "payment.failed" ||
    eventType === "payment.cancelled" ||
    eventType === "payment.processing"
  ) {
    if (!eventCheckout) return "ignored";
    if (eventType === "payment.processing") return "processed";
    const now = clock.now();
    await db.transaction(async (tx) => {
      const current = (
        await tx
          .select()
          .from(schema.storefrontCheckoutAttempts)
          .where(eq(schema.storefrontCheckoutAttempts.id, eventCheckout.attempt.id))
          .limit(1)
      )[0];
      if (!current || current.status === "paid") return;
      await tx
        .update(schema.storefrontCheckoutAttempts)
        .set({
          status: eventType === "payment.failed" ? "failed" : "cancelled",
          updatedAt: now,
          completedAt: now,
        })
        .where(eq(schema.storefrontCheckoutAttempts.id, current.id));
      if (current.membershipId) {
        await revokeLearnerMembership(
          tx as unknown as AppDb,
          current.membershipId,
          "payment_failed",
          clock,
        );
      }
    });
    return "processed";
  }
  if (eventType === "payment.refunded" || eventType === "payment.disputed") {
    const payment = await findRefundedPayment(db, data, scope);
    if (!payment) return "ignored";
    const nextPaymentStatus =
      eventType === "payment.refunded" ? "refunded" : "disputed";
    // Providers report one refund through several events (e.g. Stripe
    // `charge.refunded` and `charge.refund.updated`); handle it once.
    if (payment.status === nextPaymentStatus) return "processed";
    const now = clock.now();
    await db.transaction(async (tx) => {
      const current = (
        await tx
          .select()
          .from(schema.storefrontCheckoutAttempts)
          .where(eq(schema.storefrontCheckoutAttempts.id, payment.checkoutId))
          .limit(1)
      )[0];
      if (!current) return;
      // Stop future charges unless the subscription already ended.
      const liveSubscription = (
        await tx
          .select()
          .from(schema.storefrontSubscriptions)
          .where(eq(schema.storefrontSubscriptions.checkoutId, current.id))
          .limit(1)
      )[0];
      const cancelSubscription =
        !!liveSubscription &&
        liveSubscription.status !== "cancelled" &&
        liveSubscription.status !== "expired";
      if (liveSubscription && cancelSubscription) {
        await tx
          .update(schema.storefrontSubscriptions)
          .set({ status: "cancelled", cancelAt: now, updatedAt: now })
          .where(eq(schema.storefrontSubscriptions.id, liveSubscription.id));
      }
      await tx
        .update(schema.storefrontPayments)
        .set({ status: nextPaymentStatus, updatedAt: now })
        .where(eq(schema.storefrontPayments.id, payment.id));
      await tx
        .update(schema.storefrontInvoices)
        .set({
          status: eventType === "payment.refunded" ? "refunded" : "void",
          updatedAt: now,
        })
        .where(eq(schema.storefrontInvoices.paymentId, payment.id));
      await tx
        .update(schema.storefrontCheckoutAttempts)
        .set({
          status: nextPaymentStatus,
          updatedAt: now,
        })
        .where(eq(schema.storefrontCheckoutAttempts.id, current.id));
      await revokeStorefrontAccess(
        tx as unknown as AppDb,
        current,
        clock,
        "expired",
        { paymentProvider, cancelSubscription },
      );
    });
    return "processed";
  }
  if (eventType.startsWith("subscription.")) {
    const subscriptionId = stringValue(data.subscription_id ?? data.id);
    if (!subscriptionId) return "ignored";
    let subscription = (
      await db
        .select({ subscription: schema.storefrontSubscriptions })
        .from(schema.storefrontSubscriptions)
        .innerJoin(schema.storefrontCheckoutAttempts, eq(schema.storefrontCheckoutAttempts.id, schema.storefrontSubscriptions.checkoutId))
        .where(
          and(
            eq(schema.storefrontSubscriptions.providerSubscriptionId, subscriptionId),
            storefrontAttemptInScope(scope),
          ),
        )
        .limit(1)
    )[0]?.subscription;
    if (!subscription && eventCheckout) {
      const now = clock.now();
      subscription = {
        id: uuidv7(clock),
        publicId: createPublicId("sub", clock),
        checkoutId: eventCheckout.attempt.id,
        providerSubscriptionId: subscriptionId,
        status: "active",
        currentPeriodEnd: null,
        cancelAt: null,
        cancelAtPeriodEnd: false,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(schema.storefrontSubscriptions).values(subscription);
    }
    if (!subscription) return "ignored";
    const row = subscription;
    const now = clock.now();
    const terminal = row.status === "cancelled" || row.status === "expired";
    const currentPeriodEnd = dateValue(data.current_period_end) ?? row.currentPeriodEnd;
    const update: Partial<typeof schema.storefrontSubscriptions.$inferInsert> =
      eventType === "subscription.cancel_scheduled"
        ? {
            // Renewal stopped; access lasts until the paid period ends.
            status: terminal ? row.status : "active",
            cancelAtPeriodEnd: !terminal,
            cancelAt: dateValue(data.cancel_at) ?? currentPeriodEnd ?? row.cancelAt,
            currentPeriodEnd,
          }
        : eventType === "subscription.cancelled"
          ? { status: "cancelled", cancelAtPeriodEnd: false, currentPeriodEnd }
          : eventType === "subscription.expired"
            ? { status: "expired", cancelAtPeriodEnd: false, currentPeriodEnd }
            : eventType === "subscription.failed" || eventType === "subscription.past_due"
              ? { status: terminal ? row.status : "past_due", currentPeriodEnd }
              : terminal
                ? { currentPeriodEnd }
                : {
                    status: "active",
                    cancelAtPeriodEnd: false,
                    cancelAt: null,
                    currentPeriodEnd,
                  };
    const status = update.status ?? row.status;
    await db.transaction(async (tx) => {
      await tx
        .update(schema.storefrontSubscriptions)
        .set({ ...update, updatedAt: now })
        .where(eq(schema.storefrontSubscriptions.id, row.id));
      const current = (
        await tx
          .select()
          .from(schema.storefrontCheckoutAttempts)
          .where(eq(schema.storefrontCheckoutAttempts.id, row.checkoutId))
          .limit(1)
      )[0];
      if (!current) return;
      if (current.membershipId) {
        // Link the membership when the subscription is learnt from a
        // subscription event rather than a payment (Lemon Squeezy orders).
        await tx
          .update(schema.learnerMemberships)
          .set({ subscriptionId, subscriptionMethod: current.provider, updatedAt: now })
          .where(
            and(
              eq(schema.learnerMemberships.id, current.membershipId),
              isNull(schema.learnerMemberships.subscriptionId),
            ),
          );
      }
      if (
        (status === "cancelled" || status === "expired" || status === "past_due") &&
        status !== row.status
      ) {
        const plan = (
          await tx
            .select()
            .from(schema.storefrontPlans)
            .where(eq(schema.storefrontPlans.id, current.planId))
            .limit(1)
        )[0];
        // A paid-off installment plan is lifetime access: the provider ending
        // its (deliberately cancelled) subscription changes nothing.
        if (plan && (await installmentPlanPaidOff(tx as unknown as AppDb, current.id, plan))) {
          return;
        }
        await revokeStorefrontAccess(
          tx as unknown as AppDb,
          current,
          clock,
          status === "past_due" ? "payment_failed" : "expired",
          { cancelSubscription: false },
        );
      }
    });
    return "processed";
  }
  return "ignored";
}

/**
 * Find the recorded payment a refund or dispute refers to. Providers do not
 * always echo the id the payment was recorded under: a Stripe refund of a
 * subscription's first charge carries the payment intent and the invoice,
 * never the checkout session, and a Lemon Squeezy refund of an `initial`
 * subscription invoice refers to the charge recorded from its order.
 */
async function findRefundedPayment(
  db: AppDb,
  data: Record<string, unknown>,
  scope: PaymentWebhookScope,
) {
  const paymentId = stringValue(data.payment_id);
  if (paymentId) {
    const byId = (
      await db
        .select({ payment: schema.storefrontPayments })
        .from(schema.storefrontPayments)
        .innerJoin(schema.storefrontCheckoutAttempts, eq(schema.storefrontCheckoutAttempts.id, schema.storefrontPayments.checkoutId))
        .where(
          and(
            eq(schema.storefrontPayments.providerPaymentId, paymentId),
            storefrontAttemptInScope(scope),
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
        .select({ payment: schema.storefrontPayments })
        .from(schema.storefrontInvoices)
        .innerJoin(
          schema.storefrontPayments,
          eq(schema.storefrontPayments.id, schema.storefrontInvoices.paymentId),
        )
        .innerJoin(schema.storefrontCheckoutAttempts, eq(schema.storefrontCheckoutAttempts.id, schema.storefrontPayments.checkoutId))
        .where(
          and(
            eq(schema.storefrontInvoices.providerInvoiceId, invoiceId),
            storefrontAttemptInScope(scope),
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
        .select({ payment: schema.storefrontPayments })
        .from(schema.storefrontSubscriptions)
        .innerJoin(
          schema.storefrontPayments,
          eq(schema.storefrontPayments.checkoutId, schema.storefrontSubscriptions.checkoutId),
        )
        .innerJoin(schema.storefrontCheckoutAttempts, eq(schema.storefrontCheckoutAttempts.id, schema.storefrontSubscriptions.checkoutId))
        .where(
          and(
            eq(schema.storefrontSubscriptions.providerSubscriptionId, subscriptionId),
            storefrontAttemptInScope(scope),
          ),
        )
        .orderBy(asc(schema.storefrontPayments.occurredAt), asc(schema.storefrontPayments.createdAt))
        .limit(1)
    )[0];
    if (first) return first.payment;
  }
  return null;
}

function webhookMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const object = value as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const key of ["metadata", "custom_data", "notes"]) {
    const candidate = object[key];
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      for (const [name, item] of Object.entries(candidate)) {
        if (typeof item === "string") result[name] = item;
      }
    }
  }
  for (const child of Object.values(object)) {
    if (child && typeof child === "object") Object.assign(result, webhookMetadata(child));
  }
  return result;
}

async function webhookSchoolId(db: AppDb, rawBody: string): Promise<string | null> {
  let parsed: unknown;
  try { parsed = JSON.parse(rawBody); } catch { return null; }
  const meta = webhookMetadata(parsed);
  if (meta.courselit_school_id) {
    const rows = await db.select({ id: schema.schools.id }).from(schema.schools).where(eq(schema.schools.publicId, meta.courselit_school_id)).limit(1);
    if (rows[0]) return rows[0].id;
  }
  const checkoutId = meta.courselit_checkout_id ?? meta.courselit_community_checkout_id;
  if (checkoutId) {
    const storefront = await db.select({ schoolId: schema.storefrontCheckoutAttempts.schoolId }).from(schema.storefrontCheckoutAttempts).where(eq(schema.storefrontCheckoutAttempts.publicId, checkoutId)).limit(1);
    if (storefront[0]) return storefront[0].schoolId;
    const community = await db.select({ schoolId: schema.communityCheckoutAttempts.schoolId }).from(schema.communityCheckoutAttempts).where(eq(schema.communityCheckoutAttempts.publicId, checkoutId)).limit(1);
    if (community[0]) return community[0].schoolId;
  }
  const ids = new Set<string>();
  const collectProviderIds = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (["payment_id", "payment_intent", "order_id", "transaction_id", "subscription_id"].includes(key) && typeof item === "string") ids.add(item);
      // Lemon Squeezy references other resources by numeric id.
      if (key === "subscription_id" && typeof item === "number") ids.add(String(item));
      if (item && typeof item === "object") collectProviderIds(item);
    }
  };
  collectProviderIds(parsed);
  for (const providerPaymentId of ids) {
    const payment = await db.select({ schoolId: schema.storefrontCheckoutAttempts.schoolId }).from(schema.storefrontPayments)
      .innerJoin(schema.storefrontCheckoutAttempts, eq(schema.storefrontCheckoutAttempts.id, schema.storefrontPayments.checkoutId))
      .where(eq(schema.storefrontPayments.providerPaymentId, providerPaymentId)).limit(1);
    if (payment[0]) return payment[0].schoolId;
    const communityPayment = await db.select({ schoolId: schema.communityCheckoutAttempts.schoolId }).from(schema.communityPayments)
      .innerJoin(schema.communityCheckoutAttempts, eq(schema.communityCheckoutAttempts.id, schema.communityPayments.checkoutId))
      .where(eq(schema.communityPayments.providerPaymentId, providerPaymentId)).limit(1);
    if (communityPayment[0]) return communityPayment[0].schoolId;
    const storefrontSubscription = await db
      .select({ schoolId: schema.storefrontCheckoutAttempts.schoolId })
      .from(schema.storefrontSubscriptions)
      .innerJoin(
        schema.storefrontCheckoutAttempts,
        eq(schema.storefrontCheckoutAttempts.id, schema.storefrontSubscriptions.checkoutId),
      )
      .where(eq(schema.storefrontSubscriptions.providerSubscriptionId, providerPaymentId))
      .limit(1);
    if (storefrontSubscription[0]) return storefrontSubscription[0].schoolId;
    const communitySubscription = await db
      .select({ schoolId: schema.communityCheckoutAttempts.schoolId })
      .from(schema.communitySubscriptions)
      .innerJoin(
        schema.communityCheckoutAttempts,
        eq(schema.communityCheckoutAttempts.id, schema.communitySubscriptions.checkoutId),
      )
      .where(eq(schema.communitySubscriptions.providerSubscriptionId, providerPaymentId))
      .limit(1);
    if (communitySubscription[0]) return communitySubscription[0].schoolId;
    // A Razorpay order or subscription id is the checkout's provider id; events
    // such as `payment.captured` carry only that, without notes.
    const storefrontCheckout = await db
      .select({ schoolId: schema.storefrontCheckoutAttempts.schoolId })
      .from(schema.storefrontCheckoutAttempts)
      .where(eq(schema.storefrontCheckoutAttempts.providerCheckoutId, providerPaymentId))
      .limit(1);
    if (storefrontCheckout[0]) return storefrontCheckout[0].schoolId;
    const communityCheckout = await db
      .select({ schoolId: schema.communityCheckoutAttempts.schoolId })
      .from(schema.communityCheckoutAttempts)
      .where(eq(schema.communityCheckoutAttempts.providerCheckoutId, providerPaymentId))
      .limit(1);
    if (communityCheckout[0]) return communityCheckout[0].schoolId;
  }
  // A Stripe charge for a subscription's first invoice carries neither
  // metadata nor the id its payment was recorded under, only the invoice.
  const invoiceIds = new Set<string>();
  const collectInvoiceIds = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if ((key === "invoice" || key === "invoice_id") && typeof item === "string") invoiceIds.add(item);
      if (item && typeof item === "object") collectInvoiceIds(item);
    }
  };
  collectInvoiceIds(parsed);
  for (const providerInvoiceId of invoiceIds) {
    const storefrontInvoice = await db
      .select({ schoolId: schema.storefrontCheckoutAttempts.schoolId })
      .from(schema.storefrontInvoices)
      .innerJoin(
        schema.storefrontCheckoutAttempts,
        eq(schema.storefrontCheckoutAttempts.id, schema.storefrontInvoices.checkoutId),
      )
      .where(eq(schema.storefrontInvoices.providerInvoiceId, providerInvoiceId))
      .limit(1);
    if (storefrontInvoice[0]) return storefrontInvoice[0].schoolId;
    const communityInvoice = await db
      .select({ schoolId: schema.communityCheckoutAttempts.schoolId })
      .from(schema.communityInvoices)
      .innerJoin(
        schema.communityCheckoutAttempts,
        eq(schema.communityCheckoutAttempts.id, schema.communityInvoices.checkoutId),
      )
      .where(eq(schema.communityInvoices.providerInvoiceId, providerInvoiceId))
      .limit(1);
    if (communityInvoice[0]) return communityInvoice[0].schoolId;
  }
  return null;
}

export async function receivePaymentWebhook(
  db: AppDb,
  providerName: "stripe" | "lemonsqueezy" | "razorpay",
  rawBody: string,
  headers: Record<string, string | undefined>,
  clock: Clock,
  requestId: string,
  paymentProviderOverride?: PaymentProvider,
): Promise<
  | { ok: true; duplicate: boolean; status: "processed" | "ignored" }
  | { ok: false; error: PlatformError }
> {
  // An event that isn't about a CourseLit purchase (the school's provider
  // account may serve other apps too), or names a provider the school never
  // set up, is acknowledged and dropped: failing it would only make the
  // provider retry it for days and eventually switch the endpoint off.
  const schoolId = await webhookSchoolId(db, rawBody);
  if (!schoolId) return { ok: true, duplicate: false, status: "ignored" };
  const provider = await getConfiguredPaymentProvider(db, schoolId, providerName, paymentProviderOverride);
  if (!provider) return { ok: true, duplicate: false, status: "ignored" };
  let event: NormalizedPaymentEvent;
  try {
    provider.verifyWebhook(rawBody, headers, clock.now());
    event = provider.parseWebhook(rawBody, headers);
  } catch {
    return error("unauthenticated");
  }
  const existing = await db.select({ id: schema.storefrontWebhookEvents.id, status: schema.storefrontWebhookEvents.status }).from(schema.storefrontWebhookEvents).where(eq(schema.storefrontWebhookEvents.providerEventId, event.eventId)).limit(1);
  const receivedAt = clock.now();
  // A provider redelivers an event we failed to process (e.g. the payment
  // provider API was briefly down); process it again rather than swallowing
  // it as a duplicate, or the learner pays and never gets access.
  const retryingFailed = existing[0]?.status === "failed";
  if (existing[0] && !retryingFailed) return { ok: true, duplicate: true, status: "processed" };
  if (retryingFailed) {
    const claimed = await db
      .update(schema.storefrontWebhookEvents)
      .set({ status: "received", error: null, receivedAt, processedAt: null })
      .where(and(eq(schema.storefrontWebhookEvents.id, existing[0]!.id), eq(schema.storefrontWebhookEvents.status, "failed")))
      .returning({ id: schema.storefrontWebhookEvents.id });
    if (!claimed[0]) return { ok: true, duplicate: true, status: "processed" };
  } else {
    try {
      await db.insert(schema.storefrontWebhookEvents).values({
        id: uuidv7(clock), provider: providerName, providerEventId: event.eventId,
        eventType: event.eventType, payload: rawBody, status: "received", error: null,
        receivedAt, processedAt: null,
      });
    } catch (caught) {
      if (String(caught).includes("storefront_webhook_events_provider_event_id_key")) return { ok: true, duplicate: true, status: "processed" };
      throw caught;
    }
  }
  try {
    if (provider.completeWebhookEvent) event = await provider.completeWebhookEvent(event);
    const scope: PaymentWebhookScope = { schoolId, provider: providerName };
    const communityStatus = await processCommunityPaymentEvent(
      db,
      scope,
      event.eventType,
      event.data,
      clock,
      requestId,
      provider,
    );
    const status = communityStatus ?? await processPaymentEvent(
      db,
      scope,
      event.eventType,
      event.data,
      clock,
      requestId,
      provider,
    );
    await db.update(schema.storefrontWebhookEvents).set({ status, processedAt: clock.now() }).where(eq(schema.storefrontWebhookEvents.providerEventId, event.eventId));
    return { ok: true, duplicate: false, status };
  } catch (caught) {
    await db.update(schema.storefrontWebhookEvents).set({ status: "failed", error: caught instanceof Error ? caught.message : "webhook_processing_failed", processedAt: clock.now() }).where(eq(schema.storefrontWebhookEvents.providerEventId, event.eventId));
    return error("validation_failed", { reason: "webhook_processing_failed" });
  }
}
