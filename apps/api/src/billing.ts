import { createDrizzleBillingStore } from "@codelitdev/billing/drizzle";
import { FakeBillingProvider } from "@codelitdev/billing/providers";
import {
  aesGcmSensitiveValuesFromEnv,
  createBillingActionGrants,
  createReturnUrlValidator,
} from "@codelitdev/platform/billing";
import { drizzleVerificationGrantStore } from "@codelitdev/platform/billing/drizzle";
import { createLemonSqueezyBillingProvider } from "@codelitdev/billing/providers/lemonsqueezy";
import { COURSELIT_OFFER_KEYS, REFERENCE_OFFERS } from "@codelitdev/billing/testing";
import {
  type BillingEngine,
  createBilling,
} from "@codelitdev/billing/workflows";
import type { Clock } from "@codelitdev/platform";
import { createBillingAuditHook } from "./billing-audit.js";
import { verification } from "./db/schema/auth.generated.js";
import * as billingSchema from "./db/schema/billing.generated.js";
import { enqueuePlanFeatureSync } from "./plan-features.js";
import { SSO_FEATURE } from "./sso-config.js";
import type { AppDb } from "./types.js";

export type BillingBundle = {
  billing: BillingEngine;
  fake: FakeBillingProvider;
  /** Single-use, session-bound action grants stored in the `verification` table. */
  grants: ReturnType<typeof createBillingActionGrants>;
};

type OfferKey = (typeof COURSELIT_OFFER_KEYS)[number];

export type LemonSqueezyConfig = {
  apiKey: string;
  storeId: string;
  /** The current signing secret first, then an optional previous one during rotation. */
  webhookSecrets: Array<{ version: string; secret: string }>;
  revision: number;
  offers: Array<{
    key: OfferKey;
    currency: string;
    amountMinor: number;
    /** The Lemon Squeezy variant id. */
    providerProductId: string;
    providerTrialDays: number;
  }>;
};

/**
 * Lemon Squeezy is opted into with BILLING_PROVIDER=lemonsqueezy; otherwise cloud
 * mode uses the fake. Prices, currency, revision and variant ids all come from env
 * and must be set, so a deploy can never sell at a price nobody configured. The
 * variants must have no trial: the cardless trial is CourseLit's, not the
 * provider's (see docs/wip/plan-limits.md, S17).
 */
export function readLemonSqueezyConfig(env: NodeJS.ProcessEnv): LemonSqueezyConfig | null {
  const provider = env.BILLING_PROVIDER?.trim();
  if (!provider || env.NODE_ENV === "test") return null;
  if (provider !== "lemonsqueezy") throw new Error("BILLING_PROVIDER_invalid");
  const need = (name: string): string => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`${name}_required`);
    return value;
  };
  const positiveInt = (name: string): number => {
    const raw = need(name);
    const value = Number(raw);
    if (!/^[1-9][0-9]*$/.test(raw) || !Number.isSafeInteger(value)) {
      throw new Error(`${name}_invalid`);
    }
    return value;
  };
  // Checked here, though only read by aesGcmSensitiveValuesFromEnv, so a missing key
  // fails at startup rather than at the first checkout.
  need("BILLING_DATA_ENCRYPTION_KEY");
  const currency = need("BILLING_CURRENCY").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("BILLING_CURRENCY_invalid");
  const previous = env.LEMONSQUEEZY_WEBHOOK_SECRET_PREVIOUS?.trim();
  const offers = COURSELIT_OFFER_KEYS.map((key) => {
    const name = key.toUpperCase();
    const providerProductId = need(`BILLING_${name}_PRODUCT_ID`);
    if (!/^[0-9]+$/.test(providerProductId)) {
      throw new Error(`BILLING_${name}_PRODUCT_ID_invalid`);
    }
    return {
      key,
      currency,
      amountMinor: positiveInt(`BILLING_${name}_AMOUNT_MINOR`),
      providerProductId,
      providerTrialDays: 0,
    };
  });
  if (new Set(offers.map((offer) => offer.providerProductId)).size !== offers.length) {
    throw new Error("BILLING_PRODUCT_IDS_must_be_unique");
  }
  return {
    apiKey: need("LEMONSQUEEZY_API_KEY"),
    storeId: need("LEMONSQUEEZY_STORE_ID"),
    webhookSecrets: [
      { version: "current", secret: need("LEMONSQUEEZY_WEBHOOK_SECRET") },
      ...(previous ? [{ version: "previous", secret: previous }] : []),
    ],
    revision: positiveInt("BILLING_CATALOG_REVISION"),
    offers,
  };
}

export function composeBilling(
  db: AppDb,
  clock: Clock,
  options: { mode?: "cloud" | "oss"; webOrigin?: string } = {},
): BillingBundle {
  const mode = options.mode ?? "cloud";
  const fake = new FakeBillingProvider({ clock });
  const env: NodeJS.ProcessEnv = process.env;
  const lsConfig = mode === "cloud" ? readLemonSqueezyConfig(env) : null;
  // The fake provider takes no money, so a production deployment must never fall back to it.
  if (mode === "cloud" && !lsConfig && env.NODE_ENV === "production") {
    throw new Error("billing_provider_required_in_production");
  }
  if (mode === "cloud" && !lsConfig) fake.seedDefaultCatalog();
  // Revision numbers are unique across providers, so switching providers needs a new one.
  const revision = lsConfig?.revision ?? 1;
  const lsOffers = lsConfig
    ? REFERENCE_OFFERS.map((offer) => ({
        ...offer,
        provider: "lemonsqueezy",
        revision,
        ...lsConfig.offers.find((entry) => entry.key === offer.key)!,
      }))
    : null;
  const lemonsqueezy = lsConfig
    ? createLemonSqueezyBillingProvider({
        apiKey: lsConfig.apiKey,
        storeId: lsConfig.storeId,
        webhookSecrets: lsConfig.webhookSecrets,
        clock,
      })
    : null;
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
    ...(lsConfig ? { sensitiveValues: aesGcmSensitiveValuesFromEnv(process.env) } : {}),
    providers: mode !== "cloud" ? [] : lemonsqueezy ? [lemonsqueezy] : [fake],
    clock,
    authorization: grants.authorization,
    hooks: {
      audit: createBillingAuditHook({ db, clock, getTransaction: () => store.getTransaction() }),
      lifecycle: {
        // Only queues a background job, in the billing transaction, so it commits
        // with the plan change. The SSO work itself never runs here: a failed
        // statement would abort the billing write. Queued on every projection;
        // the sync reads the current plan and is safe to repeat.
        async afterProjection({ next }) {
          const client = (store.getTransaction() ?? db) as Pick<AppDb, "execute">;
          await enqueuePlanFeatureSync(client, next.billableEntityId, clock);
        },
      },
    },
    planFeatures: { business: [SSO_FEATURE] },
    mode,
    checkoutProvider: mode !== "cloud" ? "" : lemonsqueezy ? "lemonsqueezy" : "fake",
    requestedRevision: mode === "cloud" ? (lemonsqueezy ? revision : 1) : null,
    requiredOfferKeys: mode === "cloud" ? [...COURSELIT_OFFER_KEYS] : [],
    offers: mode !== "cloud" ? [] : (lsOffers ?? REFERENCE_OFFERS),
    returnUrlValidator: createReturnUrlValidator(origins),
  });
  return { billing, fake, grants };
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
