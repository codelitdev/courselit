import {
  type Clock,
  createPlatformError,
  type PlatformError,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import type {
  ProductCustomerAccessRemoved,
  ProductSubscription,
} from "@courselit/api-contract";
import { and, desc, eq, inArray } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  findLearnerMembership,
  type LearnerMembershipRow,
  revokeLearnerMembership,
} from "./learner-memberships.js";
import {
  getConfiguredPaymentProvider,
  type PaymentProvider,
  type PaymentProviderName,
  paymentProviderNames,
} from "./payments.js";
import type { CourseLitPermission } from "./permissions.js";
import type { AppDb } from "./types.js";

type Result<T> = { ok: true; value: T } | { ok: false; error: PlatformError };

type SubscriptionRecord = {
  subscription: typeof schema.storefrontSubscriptions.$inferSelect;
  attempt: typeof schema.storefrontCheckoutAttempts.$inferSelect;
  plan: typeof schema.storefrontPlans.$inferSelect;
  installmentsPaid: number;
};

function conflict(reason: string): { ok: false; error: PlatformError } {
  return {
    ok: false,
    error: createPlatformError("conflict", { safeDetails: { reason } }),
  };
}

function failure(code: "not_found" | "forbidden"): { ok: false; error: PlatformError } {
  return { ok: false, error: createPlatformError(code) };
}

function toDto(record: SubscriptionRecord): ProductSubscription | null {
  const { subscription, attempt, plan, installmentsPaid } = record;
  if (plan.kind !== "subscription" && plan.kind !== "installment") return null;
  const paidOff =
    plan.kind === "installment" &&
    !!plan.installmentCount &&
    installmentsPaid >= plan.installmentCount;
  const status: ProductSubscription["status"] =
    subscription.status === "active"
      ? subscription.cancelAtPeriodEnd
        ? "cancelling"
        : "active"
      : (subscription.status === "cancelled" || subscription.status === "expired") &&
          paidOff
        ? "completed"
        : subscription.status;
  const accessUntil =
    status === "cancelling"
      ? (subscription.cancelAt ?? subscription.currentPeriodEnd)
      : status === "cancelled" || status === "expired"
        ? subscription.cancelAt
        : null;
  return {
    id: subscription.publicId,
    planKind: plan.kind,
    status,
    provider: attempt.provider === "free" ? null : attempt.provider,
    currentPeriodEnd: subscription.currentPeriodEnd
      ? serializeDate(subscription.currentPeriodEnd)
      : null,
    accessUntil: accessUntil ? serializeDate(accessUntil) : null,
    installmentCount: plan.kind === "installment" ? plan.installmentCount : null,
    installmentsPaid: plan.kind === "installment" ? installmentsPaid : null,
    learnerCanCancel:
      plan.kind === "subscription" && (status === "active" || status === "past_due"),
  };
}

/**
 * The recurring payment behind each of the given product memberships, keyed
 * by membership id. Memberships granted by a community plan or without a
 * recurring plan have none.
 */
async function subscriptionRecordsFor(
  db: AppDb,
  memberships: readonly LearnerMembershipRow[],
): Promise<Map<string, SubscriptionRecord>> {
  const direct = memberships.filter(
    (membership) => membership.entityType === "product" && !membership.isIncludedInPlan,
  );
  const result = new Map<string, SubscriptionRecord>();
  if (direct.length === 0) return result;
  const rows = await db
    .select({
      subscription: schema.storefrontSubscriptions,
      attempt: schema.storefrontCheckoutAttempts,
      plan: schema.storefrontPlans,
    })
    .from(schema.storefrontSubscriptions)
    .innerJoin(
      schema.storefrontCheckoutAttempts,
      eq(
        schema.storefrontCheckoutAttempts.id,
        schema.storefrontSubscriptions.checkoutId,
      ),
    )
    .innerJoin(
      schema.storefrontPlans,
      eq(schema.storefrontPlans.id, schema.storefrontCheckoutAttempts.planId),
    )
    .where(
      inArray(
        schema.storefrontCheckoutAttempts.membershipId,
        direct.map((membership) => membership.id),
      ),
    )
    .orderBy(desc(schema.storefrontSubscriptions.createdAt));
  if (rows.length === 0) return result;
  const paidInvoices = await db
    .select({ checkoutId: schema.storefrontInvoices.checkoutId })
    .from(schema.storefrontInvoices)
    .where(
      and(
        inArray(
          schema.storefrontInvoices.checkoutId,
          rows.map((row) => row.attempt.id),
        ),
        eq(schema.storefrontInvoices.status, "paid"),
      ),
    );
  const paidByCheckout = new Map<string, number>();
  for (const invoice of paidInvoices) {
    paidByCheckout.set(
      invoice.checkoutId,
      (paidByCheckout.get(invoice.checkoutId) ?? 0) + 1,
    );
  }
  for (const membership of direct) {
    const candidates = rows.filter((row) => row.attempt.membershipId === membership.id);
    // Prefer the subscription the membership currently points at; otherwise
    // the most recent one (rows are newest first).
    const chosen =
      candidates.find(
        (row) => row.subscription.providerSubscriptionId === membership.subscriptionId,
      ) ?? candidates[0];
    if (!chosen) continue;
    result.set(membership.id, {
      ...chosen,
      installmentsPaid: paidByCheckout.get(chosen.attempt.id) ?? 0,
    });
  }
  return result;
}

/** Subscription state for each membership, for learner and admin listings. */
export async function productSubscriptionsForMemberships(
  db: AppDb,
  memberships: readonly LearnerMembershipRow[],
): Promise<Map<string, ProductSubscription>> {
  const records = await subscriptionRecordsFor(db, memberships);
  const result = new Map<string, ProductSubscription>();
  for (const [membershipId, record] of records) {
    const dto = toDto(record);
    if (dto) result.set(membershipId, dto);
  }
  return result;
}

async function subscriptionRecordFor(
  db: AppDb,
  membership: LearnerMembershipRow,
): Promise<SubscriptionRecord | null> {
  return (await subscriptionRecordsFor(db, [membership])).get(membership.id) ?? null;
}

async function providerFor(
  db: AppDb,
  record: SubscriptionRecord,
  override?: PaymentProvider,
): Promise<PaymentProvider | null> {
  const name = record.attempt.provider;
  if (!(paymentProviderNames as readonly string[]).includes(name)) return null;
  return getConfiguredPaymentProvider(
    db,
    record.attempt.schoolId,
    name as PaymentProviderName,
    override,
  );
}

async function scheduleCancellation(
  db: AppDb,
  record: SubscriptionRecord,
  audit: { actorId: string; requestId: string; action: string },
  clock: Clock,
  override?: PaymentProvider,
): Promise<Result<ProductSubscription>> {
  const provider = await providerFor(db, record, override);
  if (!provider?.cancelSubscription) return conflict("provider_unavailable");
  let endsAt: Date | null = null;
  try {
    const result = await provider.cancelSubscription(
      record.subscription.providerSubscriptionId,
      { atPeriodEnd: true },
    );
    endsAt = result?.endsAt ?? null;
  } catch {
    return conflict("provider_unavailable");
  }
  const now = clock.now();
  const accessUntil = endsAt ?? record.subscription.currentPeriodEnd;
  const next = {
    cancelAtPeriodEnd: true,
    cancelAt: accessUntil,
    currentPeriodEnd: record.subscription.currentPeriodEnd ?? endsAt,
    updatedAt: now,
  };
  await db.transaction(async (tx) => {
    await tx
      .update(schema.storefrontSubscriptions)
      .set(next)
      .where(eq(schema.storefrontSubscriptions.id, record.subscription.id));
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: record.attempt.schoolId,
      actorId: audit.actorId,
      action: audit.action,
      resourceType: "storefront_subscription",
      resourceId: record.subscription.publicId,
      requestId: audit.requestId,
      createdAt: now,
    });
  });
  const dto = toDto({ ...record, subscription: { ...record.subscription, ...next } });
  return dto ? { ok: true, value: dto } : failure("not_found");
}

/**
 * Stop renewing the learner's own subscription for a product. Access lasts
 * until the paid period ends; the provider's end-of-subscription webhook then
 * revokes it. Installment plans cannot be stopped by the learner: they would
 * otherwise keep lifetime access without paying the remaining installments.
 */
export async function cancelLearnerProductSubscription(
  db: AppDb,
  input: {
    schoolId: string;
    learnerId: string;
    learnerPublicId: string;
    productPublicId: string;
    requestId: string;
  },
  clock: Clock,
  paymentProviderOverride?: PaymentProvider,
): Promise<Result<ProductSubscription>> {
  const membership = await findLearnerMembership(db, {
    schoolId: input.schoolId,
    learnerId: input.learnerId,
    entityType: "product",
    entityId: input.productPublicId,
  });
  if (!membership || membership.status !== "active") return failure("not_found");
  const record = await subscriptionRecordFor(db, membership);
  const dto = record ? toDto(record) : null;
  if (!record || !dto) return failure("not_found");
  if (dto.planKind === "installment")
    return conflict("installment_plan_not_cancellable");
  if (dto.status === "cancelling") return { ok: true, value: dto };
  if (dto.status !== "active" && dto.status !== "past_due") {
    return conflict("subscription_not_active");
  }
  return scheduleCancellation(
    db,
    record,
    {
      actorId: input.learnerPublicId,
      requestId: input.requestId,
      action: "storefront_subscription.cancel_requested",
    },
    clock,
    paymentProviderOverride,
  );
}

type AdminContext = {
  requestId: string;
  principalId: string;
  tenantId?: string | null;
  permissions: ReadonlySet<CourseLitPermission>;
};

async function loadCustomerMembership(
  db: AppDb,
  ctx: AdminContext,
  input: { productPublicId: string; customerPublicId: string },
): Promise<
  | {
      ok: true;
      value: {
        membership: LearnerMembershipRow | null;
        account: typeof schema.schoolAccounts.$inferSelect;
      };
    }
  | { ok: false; error: PlatformError }
> {
  if (!ctx.tenantId || !ctx.permissions.has("products:write"))
    return failure("forbidden");
  const product = (
    await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(
        and(
          eq(schema.products.schoolId, ctx.tenantId),
          eq(schema.products.publicId, input.productPublicId),
        ),
      )
      .limit(1)
  )[0];
  if (!product) return failure("not_found");
  const account = (
    await db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, ctx.tenantId),
          eq(schema.schoolAccounts.publicId, input.customerPublicId),
        ),
      )
      .limit(1)
  )[0];
  if (!account) return failure("not_found");
  const membership = await findLearnerMembership(db, {
    schoolId: ctx.tenantId,
    schoolAccountId: account.id,
    entityType: "product",
    entityId: input.productPublicId,
  });
  return { ok: true, value: { membership, account } };
}

/** A creator stops a customer's subscription at the end of the paid period. */
export async function cancelProductCustomerSubscription(
  db: AppDb,
  ctx: AdminContext,
  input: { productPublicId: string; customerPublicId: string },
  clock: Clock,
  paymentProviderOverride?: PaymentProvider,
): Promise<Result<ProductSubscription>> {
  const loaded = await loadCustomerMembership(db, ctx, input);
  if (!loaded.ok) return loaded;
  const { membership } = loaded.value;
  if (!membership) return failure("not_found");
  const record = await subscriptionRecordFor(db, membership);
  const dto = record ? toDto(record) : null;
  if (!record || !dto) return failure("not_found");
  if (dto.status === "cancelling") return { ok: true, value: dto };
  if (dto.status !== "active" && dto.status !== "past_due") {
    return conflict("subscription_not_active");
  }
  return scheduleCancellation(
    db,
    record,
    {
      actorId: ctx.principalId,
      requestId: ctx.requestId,
      action: "storefront_subscription.cancel_requested",
    },
    clock,
    paymentProviderOverride,
  );
}

/**
 * A creator removes a customer's access to a product now. Any running
 * subscription is cancelled immediately at the provider first, so the
 * customer is not charged again; one-time, free and granted access is simply
 * revoked.
 */
export async function removeProductCustomerAccess(
  db: AppDb,
  ctx: AdminContext,
  input: { productPublicId: string; customerPublicId: string },
  clock: Clock,
  paymentProviderOverride?: PaymentProvider,
): Promise<Result<ProductCustomerAccessRemoved>> {
  const loaded = await loadCustomerMembership(db, ctx, input);
  if (!loaded.ok) return loaded;
  const { membership, account } = loaded.value;
  if (!membership) return failure("not_found");
  if (membership.status === "expired" || membership.status === "rejected") {
    return conflict("access_already_removed");
  }
  const record = await subscriptionRecordFor(db, membership);
  const running =
    !!record &&
    record.subscription.status !== "cancelled" &&
    record.subscription.status !== "expired";
  if (record && running) {
    const provider = await providerFor(db, record, paymentProviderOverride);
    if (!provider?.cancelSubscription) return conflict("provider_unavailable");
    try {
      await provider.cancelSubscription(record.subscription.providerSubscriptionId);
    } catch {
      return conflict("provider_unavailable");
    }
  }
  const now = clock.now();
  const subscriptionUpdate = {
    status: "cancelled" as const,
    cancelAtPeriodEnd: false,
    cancelAt: now,
    updatedAt: now,
  };
  await db.transaction(async (tx) => {
    if (record && running) {
      await tx
        .update(schema.storefrontSubscriptions)
        .set(subscriptionUpdate)
        .where(eq(schema.storefrontSubscriptions.id, record.subscription.id));
    }
    await revokeLearnerMembership(
      tx as unknown as AppDb,
      membership.id,
      "expired",
      clock,
      {
        cancelSubscription: false,
      },
    );
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: membership.schoolId,
      actorId: ctx.principalId,
      action: "product_customer.access_removed",
      resourceType: "learner_membership",
      resourceId: membership.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
  });
  return {
    ok: true,
    value: {
      customerId: account.publicId,
      membershipStatus: "expired",
      subscription: record
        ? toDto(
            running
              ? {
                  ...record,
                  subscription: { ...record.subscription, ...subscriptionUpdate },
                }
              : record,
          )
        : null,
    },
  };
}
