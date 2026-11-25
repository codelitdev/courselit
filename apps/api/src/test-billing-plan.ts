// Test helpers that move a school between plans through the real billing
// engine and the fake provider, so the billing lifecycle hook runs.
import type { Runtime } from "./runtime.js";
import type { SeededWorld } from "./seed.js";

type FakeInternals = {
  subscriptions: Map<string, Record<string, unknown> & { providerSubscriptionId: string }>;
};

/** Buy a plan for a school as the world's owner; returns the provider subscription id. */
export async function buyPlan(
  runtime: Runtime,
  world: SeededWorld,
  schoolId: string,
  offerKey: "pro_month" | "business_month",
): Promise<string> {
  const target = { kind: "school", id: schoolId };
  const issued = await runtime.billing.grants.issue({
    actorId: world.owner.id,
    sessionId: `buy-${schoolId}`,
    sessionCreatedAt: runtime.clock.now(),
    action: "checkout",
    target,
  });
  if (!issued.ok) throw new Error("grant_failed");
  const grant = runtime.billing.grants.grant({
    token: issued.token,
    actorId: world.owner.id,
    sessionId: `buy-${schoolId}`,
    action: "checkout",
    target,
  });
  const checkout = await runtime.billing.billing.startCheckout({
    grant,
    entity: target,
    payer: { id: world.owner.id, email: "owner@example.com", name: "Owner" },
    offerKey,
    catalogRevision: 1,
    returnUrl: "https://app.test/billing",
  });
  const paid = await runtime.billing.fake.simulatePayment(checkout.attempt.providerCheckoutSessionId!);
  await runtime.billing.billing.ingestWebhook({
    provider: "fake",
    raw: runtime.billing.fake.signWebhook(
      JSON.stringify({
        type: "subscription.active",
        data: {
          subscription_id: paid.providerSubscriptionId,
          metadata: { checkoutAttemptId: checkout.attempt.attemptId },
        },
      }),
    ),
  });
  await runtime.billing.billing.runWebhookInboxBatch({ workerId: "test-webhooks" });
  return paid.providerSubscriptionId;
}

/** Change the provider's view of a subscription and let billing project it. */
export async function changeSubscription(
  runtime: Runtime,
  subscriptionId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const internals = runtime.billing.fake as unknown as FakeInternals;
  const current = internals.subscriptions.get(subscriptionId);
  if (!current) throw new Error("subscription_not_found");
  internals.subscriptions.set(subscriptionId, {
    ...current,
    ...patch,
    providerOccurredAt: runtime.clock.now(),
    providerVersion: String(Number(current.providerVersion ?? "1") + 1),
  });
  await runtime.billing.billing.ingestWebhook({
    provider: "fake",
    raw: runtime.billing.fake.signWebhook(
      JSON.stringify({ type: "subscription.updated", data: { subscription_id: subscriptionId } }),
    ),
  });
  await runtime.billing.billing.runWebhookInboxBatch({ workerId: "test-webhooks" });
}

/** Move a school that already has a plan to another offer, immediately. */
export async function changePlan(
  runtime: Runtime,
  world: SeededWorld,
  schoolId: string,
  offerKey: "pro_month" | "business_month",
): Promise<void> {
  const target = { kind: "school", id: schoolId };
  const sessionId = `change-${offerKey}-${schoolId}`;
  const issued = await runtime.billing.grants.issue({
    actorId: world.owner.id,
    sessionId,
    sessionCreatedAt: runtime.clock.now(),
    action: "plan_change",
    target,
  } as never);
  if (!issued.ok) throw new Error("grant_failed");
  const grant = runtime.billing.grants.grant({
    token: issued.token,
    actorId: world.owner.id,
    sessionId,
    action: "plan_change",
    target,
  } as never);
  await runtime.billing.billing.startPlanChange({
    grant,
    entity: target,
    payer: { id: world.owner.id, email: "owner@example.com", name: "Owner" },
    offerKey,
    catalogRevision: 1,
    effectiveAt: "immediately",
    prorationMode: "do_not_bill",
  });
  await runtime.billing.billing.runWebhookInboxBatch({ workerId: "test-webhooks" });
}
