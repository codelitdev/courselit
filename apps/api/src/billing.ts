import { createDrizzleBillingStore } from "@codelitdev/billing/drizzle";
import { FakeBillingProvider } from "@codelitdev/billing/providers";
import {
  aesGcmSensitiveValuesFromEnv,
  createBillingActionGrants,
  createReturnUrlValidator,
} from "@codelitdev/platform/billing";
import { drizzleVerificationGrantStore } from "@codelitdev/platform/billing/drizzle";
import { createDodoBillingProvider } from "@codelitdev/billing/providers/dodo";
import { COURSELIT_OFFER_KEYS, REFERENCE_OFFERS } from "@codelitdev/billing/testing";
import {
  type BillingEngine,
  createBilling,
} from "@codelitdev/billing/workflows";
import type { Clock } from "@codelitdev/platform";
import { createBillingAuditHook } from "./billing-audit.js";
import { verification } from "./db/schema/auth.generated.js";
import * as billingSchema from "./db/schema/billing.generated.js";
import type { AppDb } from "./types.js";

export type BillingBundle = {
  billing: BillingEngine;
  fake: FakeBillingProvider;
  /** Single-use, session-bound action grants stored in the `verification` table. */
  grants: ReturnType<typeof createBillingActionGrants>;
};

type OfferKey = (typeof COURSELIT_OFFER_KEYS)[number];

type DodoConfig = {
  apiKey: string;
  environment: "test_mode" | "live_mode";
  webhookSecret: string;
  brandId?: string;
  /** Base64 of 32 bytes; encrypts stored checkout URLs and webhook payloads. */
  dataEncryptionKey: string;
  revision: number;
  offers: Array<{
    key: OfferKey;
    currency: string;
    amountMinor: number;
    providerProductId: string;
    providerTrialDays: number;
  }>;
};

/**
 * Dodo is opted into with BILLING_CHECKOUT_PROVIDER=dodo; otherwise cloud mode uses the fake.
 * Prices, currency, revision and product ids all come from env and must be set, so a
 * deploy can never sell at a price nobody configured.
 */
function readDodoConfig(env: NodeJS.ProcessEnv): DodoConfig | null {
  if (env.BILLING_CHECKOUT_PROVIDER !== "dodo" || env.NODE_ENV === "test") return null;
  const need = (name: string): string => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`${name}_required`);
    return value;
  };
  const positiveInt = (name: string): number => {
    const value = Number(need(name));
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name}_invalid`);
    return value;
  };
  const currency = need("BILLING_CURRENCY");
  return {
    apiKey: need("DODO_PAYMENTS_API_KEY"),
    environment: env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode",
    webhookSecret: need("DODO_PAYMENTS_WEBHOOK_KEY_CURRENT"),
    ...(env.DODO_BRAND_ID?.trim() ? { brandId: env.DODO_BRAND_ID.trim() } : {}),
    dataEncryptionKey: need("BILLING_DATA_ENCRYPTION_KEY"),
    revision: positiveInt("BILLING_CATALOG_REVISION"),
    offers: COURSELIT_OFFER_KEYS.map((key) => {
      const name = key.toUpperCase();
      const trial = env[`BILLING_${name}_TRIAL_DAYS`]?.trim();
      return {
        key,
        currency,
        amountMinor: positiveInt(`BILLING_${name}_AMOUNT_MINOR`),
        providerProductId: need(`DODO_${name}_PRODUCT_ID`),
        providerTrialDays: trial ? Number(trial) : 0,
      };
    }),
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
  const dodoConfig = mode === "cloud" ? readDodoConfig(env) : null;
  // The fake provider takes no money, so a production deployment must never fall back to it.
  if (mode === "cloud" && !dodoConfig && env.NODE_ENV === "production") {
    throw new Error("billing_provider_required_in_production");
  }
  if (mode === "cloud" && !dodoConfig) fake.seedDefaultCatalog();
  // Revision numbers are unique across providers, so switching providers needs a new one.
  const revision = dodoConfig?.revision ?? 1;
  const dodoOffers = dodoConfig
    ? REFERENCE_OFFERS.map((offer) => ({
        ...offer,
        provider: "dodo",
        revision,
        ...dodoConfig.offers.find((entry) => entry.key === offer.key)!,
      }))
    : null;
  const dodo = dodoConfig
    ? createDodoBillingProvider({
        apiKey: dodoConfig.apiKey,
        environment: dodoConfig.environment,
        webhookSecrets: [{ version: "current", secret: dodoConfig.webhookSecret }],
        ...(dodoConfig.brandId ? { brandId: dodoConfig.brandId } : {}),
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
    ...(dodoConfig ? { sensitiveValues: aesGcmSensitiveValuesFromEnv(process.env) } : {}),
    providers: mode !== "cloud" ? [] : dodo ? [dodo] : [fake],
    clock,
    authorization: grants.authorization,
    hooks: {
      audit: createBillingAuditHook({ db, clock, getTransaction: () => store.getTransaction() }),
      lifecycle: {
        async afterProjection() {
          /* product-owned effect hook */
        },
      },
    },
    mode,
    checkoutProvider: mode !== "cloud" ? "" : dodo ? "dodo" : "fake",
    requestedRevision: mode === "cloud" ? (dodo ? revision : 1) : null,
    requiredOfferKeys: mode === "cloud" ? [...COURSELIT_OFFER_KEYS] : [],
    offers: mode !== "cloud" ? [] : (dodoOffers ?? REFERENCE_OFFERS),
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
