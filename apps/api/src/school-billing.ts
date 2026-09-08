import { BillingWorkflowError } from "@codelitdev/billing/core";
import {
  type Clock,
  createPlatformError,
  type PlatformError,
  uuidv7,
} from "@codelitdev/platform";
import { eq } from "drizzle-orm";
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
  const now = input.clock.now();
  const grant = input.billing.authorization.issue({
    grantId: uuidv7(input.clock),
    actorId: input.principalId,
    action: "checkout",
    target: { kind: "school", id: input.schoolInternalId },
    issuedAt: now,
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
  });
  try {
    const checkout = await input.billing.billing.startCheckout({
      grant,
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
