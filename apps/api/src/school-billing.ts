import { BillingWorkflowError } from "@codelitdev/billing/core";
import {
  type Clock,
  createPlatformError,
  type PlatformError,
  uuidv7,
} from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";
import type { BillingBundle } from "./billing.js";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

export type BillingMode = "cloud" | "oss";

export type PublicCatalogDto = {
  catalogRevision: number | null;
  currency: string | null;
  checkoutAvailable: boolean;
  offers: Array<{
    catalogKey: string;
    plan: "pro" | "business";
    interval: "month" | "year";
    currency: string;
    amountMinor: number;
    trialDays: number;
  }>;
};

export async function readPublicBillingCatalog(
  billing: BillingBundle["billing"],
): Promise<PublicCatalogDto> {
  const catalog = await billing.publicCatalog();
  if (!catalog) {
    return {
      catalogRevision: null,
      currency: null,
      checkoutAvailable: false,
      offers: [],
    };
  }
  return {
    catalogRevision: catalog.revision,
    currency: catalog.currency,
    checkoutAvailable: catalog.checkoutAvailable,
    offers: catalog.offers.map((offer) => ({
      catalogKey: offer.key,
      plan: offer.plan as "pro" | "business",
      interval: offer.interval,
      currency: offer.currency,
      amountMinor: offer.amountMinor,
      trialDays: offer.displayTrialDays,
    })),
  };
}

export async function startSchoolCheckout(input: {
  db: AppDb;
  billing: BillingBundle;
  clock: Clock;
  principalId: string;
  schoolInternalId: string;
  plan: "pro" | "business";
  interval: "month" | "year";
  catalogRevision: number;
  returnUrl: string;
  session: BillingSession | null;
}): Promise<{ ok: true; checkoutUrl: string } | { ok: false; error: PlatformError }> {
  const offerKey = `${input.plan}_${input.interval}`;
  const catalog = await readPublicBillingCatalog(input.billing.billing);
  if (
    catalog.catalogRevision !== input.catalogRevision ||
    !catalog.checkoutAvailable ||
    !catalog.offers.some((offer) => offer.catalogKey === offerKey)
  ) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "billing_catalog_changed" },
      }),
    };
  }
  const users = await input.db
    .select({
      email: schema.user.email,
      name: schema.user.name,
    })
    .from(schema.user)
    .where(eq(schema.user.id, input.principalId))
    .limit(1);
  const actor = users[0];
  if (!actor) {
    return { ok: false, error: createPlatformError("unauthenticated") };
  }
  const grant = await issueBillingGrant({
    billing: input.billing,
    principalId: input.principalId,
    session: input.session,
    action: "checkout",
    schoolInternalId: input.schoolInternalId,
  });
  if (!grant.ok) return grant;
  try {
    const checkout = await input.billing.billing.startCheckout({
      grant: grant.grant,
      entity: { kind: "school", id: input.schoolInternalId },
      payer: {
        id: input.principalId,
        email: actor.email,
        name: actor.name,
      },
      offerKey,
      catalogRevision: input.catalogRevision,
      returnUrl: input.returnUrl,
    });
    return { ok: true, checkoutUrl: checkout.checkoutUrl };
  } catch (error) {
    return { ok: false, error: mapCheckoutError(error) };
  }
}

function mapCheckoutError(error: unknown): PlatformError {
  if (error instanceof BillingWorkflowError) {
    if (error.code === "catalog_changed") {
      return createPlatformError("conflict", {
        safeDetails: { reason: "billing_catalog_changed" },
      });
    }
    if (error.code === "catalog_unavailable") {
      return createPlatformError("conflict", {
        safeDetails: { reason: "billing_catalog_unavailable" },
      });
    }
    if (error.code === "checkout_pending") {
      return createPlatformError("conflict", {
        safeDetails: { reason: "checkout_pending" },
      });
    }
    if (error.code === "active_subscription_exists") {
      return createPlatformError("conflict", {
        safeDetails: { reason: "active_subscription_exists" },
      });
    }
    if (error.code === "invalid_return_url") {
      return createPlatformError("validation_failed", {
        safeDetails: { reason: "invalid_return_url" },
      });
    }
    if (error.code === "provider_unavailable") {
      return createPlatformError("conflict", {
        safeDetails: { reason: "billing_provider_unavailable" },
      });
    }
  }
  return createPlatformError("internal_error");
}

/** The signed-in browser session a billing action is bound to. */
export type BillingSession = { id: string; createdAt: Date };

type AuthWithSession = {
  auth: {
    api: {
      getSession(input: { headers: Headers }): Promise<{
        session?: { id?: string; createdAt?: Date | string };
      } | null>;
    };
  };
};

/**
 * Reads the Better Auth session behind a request. Billing grants are bound to
 * the session and need to know when it signed in.
 */
export async function readBillingSession(
  auth: AuthWithSession,
  headers: Record<string, string | string[] | undefined>,
): Promise<BillingSession | null> {
  const result = await auth.auth.api.getSession({ headers: fromNodeHeaders(headers) });
  const session = result?.session;
  if (!session?.id || !session.createdAt) return null;
  return { id: session.id, createdAt: new Date(session.createdAt) };
}

type GrantResult =
  | { ok: true; grant: ReturnType<BillingBundle["grants"]["grant"]> }
  | { ok: false; error: PlatformError };

/**
 * Issues a single-use grant for one billing action on one school.
 */
async function issueBillingGrant(input: {
  billing: BillingBundle;
  principalId: string;
  session: BillingSession | null;
  action: "checkout" | "cancellation";
  schoolInternalId: string;
}): Promise<GrantResult> {
  if (!input.session) {
    return { ok: false, error: createPlatformError("unauthenticated") };
  }
  const target = { kind: "school", id: input.schoolInternalId };
  const issued = await input.billing.grants.issue({
    actorId: input.principalId,
    sessionId: input.session.id,
    sessionCreatedAt: input.session.createdAt,
    action: input.action,
    target,
  });
  if (!issued.ok) {
    return {
      ok: false,
      error: createPlatformError("unauthenticated", {
        safeDetails: { reason: "recent_authentication_required" },
      }),
    };
  }
  return {
    ok: true,
    grant: input.billing.grants.grant({
      token: issued.token,
      actorId: input.principalId,
      sessionId: input.session.id,
      action: input.action,
      target,
    }),
  };
}

export type SchoolPlanDto = {
  /** False when this deployment has no hosted billing (OSS). */
  billingAvailable: boolean;
  plan: "pro" | "business" | null;
  interval: "month" | "year" | null;
  /** Provider subscription status, for example `active`, `past_due`, `cancelled`. */
  status: string | null;
  amountMinor: number | null;
  currency: string | null;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  /** The plan stays active until this moment. */
  paidThroughAt: string | null;
  cancelAtPeriodEnd: boolean;
  pendingCheckout: boolean;
  pendingPlanChange: boolean;
  /** People can cancel now, or resume a scheduled cancellation. */
  canCancel: boolean;
  canResume: boolean;
};

const iso = (value: Date | null): string | null => (value ? value.toISOString() : null);

export async function readSchoolPlan(input: {
  billing: BillingBundle;
  billingMode: BillingMode;
  schoolInternalId: string;
}): Promise<SchoolPlanDto> {
  const empty: SchoolPlanDto = {
    billingAvailable: input.billingMode === "cloud",
    plan: null,
    interval: null,
    status: null,
    amountMinor: null,
    currency: null,
    trialEndsAt: null,
    currentPeriodEndsAt: null,
    paidThroughAt: null,
    cancelAtPeriodEnd: false,
    pendingCheckout: false,
    pendingPlanChange: false,
    canCancel: false,
    canResume: false,
  };
  if (input.billingMode !== "cloud") return empty;
  const [state, catalog] = await Promise.all([
    input.billing.billing.commercialState(input.schoolInternalId),
    readPublicBillingCatalog(input.billing.billing),
  ]);
  const plan = state.activePaidPlan === "pro" || state.activePaidPlan === "business" ? state.activePaidPlan : null;
  const offer = plan
    ? catalog.offers.find((entry) => entry.plan === plan && entry.interval === state.billingInterval)
    : undefined;
  const live = plan !== null && state.subscriptionStatus !== "cancelled";
  return {
    ...empty,
    plan,
    interval: state.billingInterval,
    status: state.subscriptionStatus,
    amountMinor: offer?.amountMinor ?? null,
    currency: offer?.currency ?? null,
    trialEndsAt: iso(state.providerTrialEndsAt),
    currentPeriodEndsAt: iso(state.currentPeriodEndsAt),
    paidThroughAt: iso(state.paidThroughAt),
    cancelAtPeriodEnd: state.cancelAtPeriodEnd,
    pendingCheckout: state.pendingCheckout,
    pendingPlanChange: state.pendingPlanChange,
    canCancel: live && !state.cancelAtPeriodEnd,
    canResume: live && state.cancelAtPeriodEnd,
  };
}

/** Cancels at the end of the paid period, or resumes a scheduled cancellation. */
export async function changeSchoolCancellation(input: {
  db: AppDb;
  billing: BillingBundle;
  principalId: string;
  schoolInternalId: string;
  session: BillingSession | null;
  action: "cancel" | "resume";
}): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  const [actor] = await input.db
    .select({ email: schema.user.email, name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.id, input.principalId))
    .limit(1);
  if (!actor) return { ok: false, error: createPlatformError("unauthenticated") };
  const grant = await issueBillingGrant({
    billing: input.billing,
    principalId: input.principalId,
    session: input.session,
    action: "cancellation",
    schoolInternalId: input.schoolInternalId,
  });
  if (!grant.ok) return grant;
  const request = {
    grant: grant.grant,
    entity: { kind: "school" as const, id: input.schoolInternalId },
    payer: { id: input.principalId, email: actor.email, name: actor.name },
  };
  try {
    if (input.action === "cancel") await input.billing.billing.cancel(request);
    else await input.billing.billing.resumeCancellation(request);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mapCheckoutError(error) };
  }
}
