import { createDrizzleBillingStore } from "@codelitdev/billing/drizzle";
import { FakeBillingProvider } from "@codelitdev/billing/providers";
import {
  aesGcmSensitiveValuesFromEnv,
  createBillingActionGrants,
  createReturnUrlValidator,
} from "@codelitdev/platform/billing";
import { drizzleVerificationGrantStore } from "@codelitdev/platform/billing/drizzle";
import {
  type BillingProviderEnvConfig,
  createBillingProvidersFromEnv,
  readBillingProviderEnv,
} from "@codelitdev/billing/providers/env";
import { COURSELIT_OFFER_KEYS, REFERENCE_OFFERS } from "@codelitdev/billing/testing";
import {
  type BillingEngine,
  createBilling,
} from "@codelitdev/billing/workflows";
import type { CanonicalSubscription } from "@codelitdev/billing/core";
import type { Clock } from "@codelitdev/platform";
import { createBillingAuditHook } from "./billing-audit.js";
import { verification } from "./db/schema/auth.generated.js";
import * as billingSchema from "./db/schema/billing.generated.js";
import { enqueuePlanFeatureSync } from "./plan-features.js";
import { planLimits } from "./plan-limits-config.js";
import {
  identifySchoolGroup,
  ProductEvent,
  schoolPublicId,
  subscriptionTransitionEvents,
  trackProductEvent,
  trackSchoolEvent,
} from "./product-events.js";
import { PLAN_FEATURES } from "./school-plan.js";
import type { AppDb } from "./types.js";

export type BillingBundle = {
  billing: BillingEngine;
  fake: FakeBillingProvider;
  /** Single-use, session-bound action grants stored in the `verification` table. */
  grants: ReturnType<typeof createBillingActionGrants>;
  /** Providers whose webhooks are accepted: the checkout provider, then any still connected. */
  providers: string[];
};

/** CourseLit's paid offers. Their prices and provider product ids come from env. */
const OFFERS = REFERENCE_OFFERS.filter((offer) =>
  (COURSELIT_OFFER_KEYS as readonly string[]).includes(offer.key),
).map(({ key, plan, interval }) => ({ key, plan, interval }));

/**
 * The payment provider for CourseLit's own plans, picked by settings
 * (`BILLING_PROVIDER=dodo` or `lemonsqueezy`; see `@codelitdev/billing/providers/env`).
 * With none set, cloud mode uses the fake. Prices, currency, revision and product ids
 * all come from env and must be set, so a deploy can never sell at a price nobody
 * configured. Provider products must have no trial: the cardless trial is
 * CourseLit's own (see docs/wip/plan-limits.md, S17).
 */
export function readBillingConfig(env: NodeJS.ProcessEnv): BillingProviderEnvConfig | null {
  if (env.NODE_ENV === "test") return null;
  return readBillingProviderEnv(env, { offers: OFFERS });
}

export async function composeBilling(
  db: AppDb,
  clock: Clock,
  options: {
    mode?: "cloud" | "oss";
    webOrigin?: string;
    /** Settings to read instead of `process.env`; tests use it. */
    env?: NodeJS.ProcessEnv;
  } = {},
): Promise<BillingBundle> {
  const mode = options.mode ?? "cloud";
  const fake = new FakeBillingProvider({ clock });
  const env: NodeJS.ProcessEnv = options.env ?? process.env;
  const config = mode === "cloud" ? readBillingConfig(env) : null;
  // The fake provider takes no money, so a production deployment must never fall back to it.
  if (mode === "cloud" && !config && env.NODE_ENV === "production") {
    throw new Error("billing_provider_required_in_production");
  }
  if (mode === "cloud" && !config) fake.seedDefaultCatalog();
  const providers =
    mode !== "cloud"
      ? []
      : config
        ? await createBillingProvidersFromEnv(config.providers, env, clock)
        : [fake];
  const store = createDrizzleBillingStore(db as never, {
    schema: billingSchema,
    clock,
  });
  const grants = createBillingActionGrants({
    store: drizzleVerificationGrantStore(db as never, verification),
    clock,
    // Buying, changing or cancelling a plan never asks for a fresh sign-in:
    // the single-use grant already stops replay and CSRF, and the provider
    // confirms the payer. Asking again only stops people mid-purchase.
    recentAuthActions: [],
  });
  const origins: string[] = [];
  for (const candidate of [options.webOrigin, env.NODE_ENV === "test" ? "https://app.test" : undefined]) {
    if (!candidate) continue;
    try {
      origins.push(new URL(candidate).origin);
    } catch {
      /* ignore an invalid origin */
    }
  }
  const billing = createBilling({
    database: store,
    // Without this the engine stores no checkout URL and cannot resume an open checkout.
    ...(config ? { sensitiveValues: aesGcmSensitiveValuesFromEnv(env) } : {}),
    providers,
    clock,
    authorization: grants.authorization,
    hooks: {
      audit: createBillingAuditHook({ db, clock, getTransaction: () => store.getTransaction() }),
      lifecycle: {
        // Only queues a background job, in the billing transaction, so it commits
        // with the plan change. The SSO work itself never runs here: a failed
        // statement would abort the billing write. Queued on every projection;
        // the sync reads the current plan and is safe to repeat.
        async afterProjection({ previous, next }) {
          const client = (store.getTransaction() ?? db) as Pick<AppDb, "execute">;
          await enqueuePlanFeatureSync(client, next.billableEntityId, clock);
          // Through the billing transaction: a second connection could wait on it.
          await trackSubscriptionProjection(
            (store.getTransaction() ?? db) as AppDb,
            previous,
            next,
          );
        },
        async afterCheckoutOpen({ attempt }) {
          await trackSchoolEvent((store.getTransaction() ?? db) as AppDb, attempt.billableEntityId, {
            event: ProductEvent.CHECKOUT_CREATED,
            userId: attempt.payerId,
            properties: {
              plan: attempt.plan,
              interval: attempt.interval,
              offer_key: attempt.offerKey,
              provider: attempt.provider,
            },
          });
        },
      },
    },
    planFeatures: PLAN_FEATURES,
    // In oss mode the package answers unlimited and needs no catalog plans.
    ...(mode === "cloud"
      ? { planLimits: { pro: planLimits().pro, business: planLimits().business } }
      : {}),
    mode,
    checkoutProvider: mode !== "cloud" ? "" : (config?.checkoutProvider ?? "fake"),
    // Revision numbers are unique across providers, so switching providers needs a new one.
    requestedRevision: mode === "cloud" ? (config?.revision ?? 1) : null,
    requiredOfferKeys: mode === "cloud" ? [...COURSELIT_OFFER_KEYS] : [],
    offers: mode !== "cloud" ? [] : (config?.offers ?? REFERENCE_OFFERS),
    returnUrlValidator: createReturnUrlValidator(origins),
  });
  return { billing, fake, grants, providers: providers.map((provider) => provider.provider) };
}

/** Fake customer IDs live in process memory; copy persisted IDs back after restart. */
export async function rebindFakeProviderMemory(
  db: AppDb,
  fake: FakeBillingProvider,
): Promise<void> {
  const rows = await db
    .select({
      providerCustomerId: billingSchema.billingProviderCustomers.providerCustomerId,
    })
    .from(billingSchema.billingProviderCustomers);
  const internals = fake as unknown as {
    customersById?: Map<string, { provider: string; providerCustomerId: string }>;
  };
  if (!internals.customersById) return;
  for (const row of rows) {
    if (!row.providerCustomerId) continue;
    internals.customersById.set(row.providerCustomerId, {
      provider: "fake",
      providerCustomerId: row.providerCustomerId,
    });
  }
}

export async function runBoundedMaintenance(billing: BillingEngine): Promise<number> {
  return billing.runWebhookInboxBatch({
    limit: 25,
    workerId: "reference-maintenance",
  });
}

/**
 * Product events for a subscription projection. Reads the school's public id
 * outside the billing transaction and never throws into it.
 */
async function trackSubscriptionProjection(
  db: AppDb,
  previous: CanonicalSubscription | null,
  next: CanonicalSubscription,
) {
  const events = subscriptionTransitionEvents(previous, next);
  if (events.length === 0) return;
  try {
    const schoolId = await schoolPublicId(db, next.billableEntityId);
    for (const event of events) {
      trackProductEvent({
        event,
        userId: next.payerId,
        schoolId,
        properties: {
          plan: next.plan,
          previous_plan: previous?.plan,
          interval: next.interval,
          offer_key: next.offerKey,
          status: next.status,
          previous_status: previous?.status,
          provider: next.provider,
        },
      });
    }
    identifySchoolGroup(schoolId, {
      plan: next.status === "active" || next.status === "trialing" || next.status === "past_due"
        ? next.plan
        : "none",
      status: next.status,
      interval: next.interval,
    });
  } catch {
    // Telemetry must never fail a billing projection.
  }
}
