import { describe, expect, it } from "bun:test";
import { createPublicId, uuidv7 } from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { ActivityType, getSchoolOverview, recordActivity } from "./activities.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe.serial("activities", () => {
  it("records one-time events idempotently and allows repeatable events", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-05T15:30:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const purchase = {
      schoolId: world.schoolA.id,
      actorId: "learner-1",
      type: ActivityType.PURCHASED,
      entityId: world.noteA.publicId,
      metadata: { amountMinor: 1250, currency: "USD", paymentId: "pay-1" },
    } as const;
    await recordActivity(runtime.db, purchase, clock);
    await recordActivity(runtime.db, purchase, clock);
    await recordActivity(runtime.db, {
      ...purchase,
      type: ActivityType.COMMUNITY_JOINED,
      entityId: "community-1",
    }, clock);
    await recordActivity(runtime.db, {
      ...purchase,
      type: ActivityType.COMMUNITY_JOINED,
      entityId: "community-1",
    }, clock);

    const rows = await runtime.db
      .select()
      .from(schema.activities)
      .where(eq(schema.activities.schoolId, world.schoolA.id));
    expect(rows.filter((row) => row.type === ActivityType.PURCHASED)).toHaveLength(1);
    expect(rows.filter((row) => row.type === ActivityType.COMMUNITY_JOINED)).toHaveLength(2);

    await runtime.close();
  });

  it("aggregates activity metrics for the admin overview", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-05T15:30:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const common = { schoolId: world.schoolA.id, actorId: "learner-1" };
    // A purchase event alone isn't money: sales come from succeeded payments.
    await recordActivity(runtime.db, {
      ...common,
      type: ActivityType.PURCHASED,
      entityId: world.noteA.publicId,
      metadata: { amountMinor: 7777 },
    }, clock);
    await insertPayments(runtime, world, clock, [
      { amountMinor: 1250, currency: "USD", status: "succeeded" },
      { amountMinor: 5000, currency: "USD", status: "refunded" },
      { amountMinor: 3000, currency: "EUR", status: "succeeded" },
    ]);
    await recordActivity(runtime.db, { ...common, type: ActivityType.ENROLLED, entityId: world.noteA.publicId }, clock);
    await recordActivity(runtime.db, { ...common, type: ActivityType.COMMUNITY_JOINED, entityId: "community-1" }, clock);
    await recordActivity(runtime.db, { ...common, type: ActivityType.NEWSLETTER_SUBSCRIBED, entityId: "contact-1" }, clock);

    const result = await getSchoolOverview(runtime.db, world.schoolA.id, "7d", clock);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sales.amountMinor).toBe(1250);
      expect(result.value.sales.points).toHaveLength(7);
      expect(result.value.customers.count).toBe(1);
      expect(result.value.communityMembers.count).toBe(1);
      expect(result.value.subscribers.count).toBe(1);
    }

    const response = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/overview?range=7d",
      headers: { cookie: world.owner.sessionCookie, "x-school-id": world.schoolA.publicId },
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ sales: { amountMinor: 1250 }, customers: { count: 1 } });
    await runtime.close();
  });
});

/** One product checkout with the given payments, a day before the frozen clock. */
async function insertPayments(
  runtime: Awaited<ReturnType<typeof createPgliteRuntime>>,
  world: Awaited<ReturnType<typeof seedWorld>>,
  clock: ReturnType<typeof freezeRuntimeClock>,
  payments: Array<{
    amountMinor: number;
    currency: string;
    status: "succeeded" | "refunded";
  }>,
) {
  const date = new Date("2026-03-04T10:00:00.000Z");
  const [product] = await runtime.db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.publicId, world.noteA.publicId));
  const userId = uuidv7(clock);
  const learnerId = uuidv7(clock);
  const planId = uuidv7(clock);
  const checkoutId = uuidv7(clock);
  await runtime.db.insert(schema.user).values({
    id: userId,
    email: "buyer@example.com",
    name: "Buyer",
    emailVerified: true,
    createdAt: date,
    updatedAt: date,
  });
  await runtime.db.insert(schema.schoolAccounts).values({
    id: learnerId,
    publicId: createPublicId("sca", clock),
    schoolId: world.schoolA.id,
    userId,
    email: "buyer@example.com",
    displayName: "Buyer",
    status: "active",
    createdAt: date,
    updatedAt: date,
  });
  await runtime.db.insert(schema.storefrontPlans).values({
    id: planId,
    publicId: createPublicId("pln", clock),
    schoolId: world.schoolA.id,
    entityType: "product",
    entityId: world.noteA.publicId,
    name: "Paid",
    description: "",
    includedProducts: [],
    providerProductId: null,
    kind: "one_time",
    amountMinor: 1250,
    billingInterval: null,
    installmentCount: null,
    status: "active",
    isDefault: true,
    createdBy: world.owner.id,
    createdAt: date,
    updatedAt: date,
  });
  await runtime.db.insert(schema.storefrontCheckoutAttempts).values({
    id: checkoutId,
    publicId: createPublicId("chk", clock),
    schoolId: world.schoolA.id,
    schoolAccountId: learnerId,
    productId: product!.id,
    planId,
    provider: "stripe",
    idempotencyKey: "overview-fixture",
    providerCheckoutId: "checkout_overview",
    providerCheckoutUrl: null,
    status: "paid",
    currency: "USD",
    amountMinor: 1250,
    createdAt: date,
    updatedAt: date,
    completedAt: date,
  });
  for (const [index, payment] of payments.entries()) {
    await runtime.db.insert(schema.storefrontPayments).values({
      id: uuidv7(clock),
      publicId: createPublicId("pay", clock),
      checkoutId,
      providerPaymentId: `payment_overview_${index}`,
      kind: "one_time",
      status: payment.status,
      currency: payment.currency,
      amountMinor: payment.amountMinor,
      occurredAt: date,
      createdAt: date,
      updatedAt: date,
    });
  }
}
