import { describe, expect, it } from "bun:test";
import { createPublicId, uuidv7 } from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe.serial("school currency lock", () => {
  it("fixes the currency once the school has taken a paid payment", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);
    const headers = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const setCurrency = (currency: string) =>
      dispatch(runtime, {
        method: "PATCH",
        path: `/v1/schools/${world.schoolA.publicId}`,
        headers,
        body: { currency },
      });
    const currencyLocked = async () => {
      const response = await dispatch(runtime, {
        method: "GET",
        path: "/v1/school/payment-settings",
        headers,
      });
      expect(response.status).toBe(200);
      return (response.body as { currencyLocked: boolean }).currencyLocked;
    };
    const insertPayment = async (key: string, amountMinor: number) => {
      const learnerId = uuidv7(clock);
      const userId = uuidv7(clock);
      await runtime.db.insert(schema.user).values({
        id: userId,
        email: `${key}@example.com`,
        name: key,
        emailVerified: true,
        createdAt: clock.now(),
        updatedAt: clock.now(),
      });
      await runtime.db.insert(schema.schoolAccounts).values({
        id: learnerId,
        publicId: createPublicId("sca", clock),
        schoolId: world.schoolA.id,
        userId,
        email: `${key}@example.com`,
        displayName: key,
        status: "active",
        createdAt: clock.now(),
        updatedAt: clock.now(),
      });
      const [note] = await runtime.db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(eq(schema.products.publicId, world.noteA.publicId));
      const planId = uuidv7(clock);
      await runtime.db.insert(schema.storefrontPlans).values({
        id: planId,
        publicId: createPublicId("pln", clock),
        schoolId: world.schoolA.id,
        entityType: "product",
        entityId: world.noteA.publicId,
        name: key,
        description: "",
        includedProducts: [],
        providerProductId: null,
        kind: amountMinor ? "one_time" : "free",
        amountMinor,
        billingInterval: null,
        installmentCount: null,
        status: "active",
        isDefault: false,
        createdBy: world.owner.id,
        createdAt: clock.now(),
        updatedAt: clock.now(),
      });
      const checkoutId = uuidv7(clock);
      await runtime.db.insert(schema.storefrontCheckoutAttempts).values({
        id: checkoutId,
        publicId: createPublicId("chk", clock),
        schoolId: world.schoolA.id,
        schoolAccountId: learnerId,
        productId: note!.id,
        planId,
        provider: "stripe",
        idempotencyKey: `lock-${key}`,
        providerCheckoutId: `checkout_${key}`,
        providerCheckoutUrl: null,
        status: "paid",
        currency: "USD",
        amountMinor,
        createdAt: clock.now(),
        updatedAt: clock.now(),
        completedAt: clock.now(),
      });
      await runtime.db.insert(schema.storefrontPayments).values({
        id: uuidv7(clock),
        publicId: createPublicId("pay", clock),
        checkoutId,
        providerPaymentId: `payment_${key}`,
        kind: "one_time",
        // Refunded money still fixes the currency it was taken in.
        status: amountMinor ? "refunded" : "succeeded",
        currency: "USD",
        amountMinor,
        occurredAt: clock.now(),
        createdAt: clock.now(),
        updatedAt: clock.now(),
      });
    };

    expect(await currencyLocked()).toBe(false);
    // Free sign-ups take no money, so the currency can still change.
    await insertPayment("free", 0);
    expect(await currencyLocked()).toBe(false);
    expect((await setCurrency("eur")).body).toMatchObject({ currency: "EUR" });
    expect((await setCurrency("usd")).body).toMatchObject({ currency: "USD" });

    await insertPayment("paid", 1250);
    expect(await currencyLocked()).toBe(true);
    const refused = await setCurrency("INR");
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({ code: "conflict" });
    // Saving the same currency (the settings form always sends it) still works.
    expect((await setCurrency("usd")).status).toBe(200);
    const [school] = await runtime.db
      .select({ currency: schema.schools.currency })
      .from(schema.schools)
      .where(eq(schema.schools.id, world.schoolA.id));
    expect(school?.currency).toBe("USD");

    await runtime.close();
  });
});
