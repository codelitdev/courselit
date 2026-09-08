import { drizzleBillingAdapter } from "@codelitdev/billing/drizzle";
import { FakeBillingProvider } from "@codelitdev/billing/providers";
import { COURSELIT_OFFER_KEYS, REFERENCE_OFFERS } from "@codelitdev/billing/testing";
import {
  type BillingEngine,
  createBilling,
  MemoryAuditHook,
  MemoryAuthorizationPort,
} from "@codelitdev/billing/workflows";
import type { Clock } from "@codelitdev/platform";
import * as billingSchema from "./db/schema/billing.generated.js";
import type { AppDb } from "./types.js";

export type BillingBundle = {
  billing: BillingEngine;
  fake: FakeBillingProvider;
  authorization: MemoryAuthorizationPort;
  audit: MemoryAuditHook;
};

export function composeBilling(
  db: AppDb,
  clock: Clock,
  options: { mode?: "cloud" | "oss"; webOrigin?: string } = {},
): BillingBundle {
  const mode = options.mode ?? "cloud";
  const fake = new FakeBillingProvider({ clock });
  if (mode === "cloud") fake.seedDefaultCatalog();
  const authorization = new MemoryAuthorizationPort();
  const audit = new MemoryAuditHook();
  const store = drizzleBillingAdapter(db as never, {
    schema: billingSchema,
    clock,
  });
  const allowedOrigins = new Set<string>(["https://app.test", "http://localhost:3000"]);
  if (options.webOrigin) {
    try {
      allowedOrigins.add(new URL(options.webOrigin).origin);
    } catch {
      /* ignore invalid origin */
    }
  }
  const billing = createBilling({
    database: store,
    providers: mode === "cloud" ? [fake] : [],
    clock,
    authorization,
    hooks: {
      audit,
      lifecycle: {
        async afterProjection() {
          /* product-owned effect hook */
        },
      },
    },
    mode,
    checkoutProvider: mode === "cloud" ? "fake" : "",
    requestedRevision: mode === "cloud" ? 1 : null,
    requiredOfferKeys: mode === "cloud" ? [...COURSELIT_OFFER_KEYS] : [],
    offers: mode === "cloud" ? REFERENCE_OFFERS : [],
    returnUrlValidator: (url) => {
      try {
        return allowedOrigins.has(new URL(url).origin);
      } catch {
        return false;
      }
    },
  });
  return { billing, fake, authorization, audit };
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
