import { describe, expect, it } from "bun:test";
import { composeBilling } from "./billing.js";
import { createExpressApp } from "./express-app.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { billingEnv, LEMONSQUEEZY } from "./test-billing-env.js";

describe("platform billing webhook route", () => {
  it("routes every connected provider and nothing else", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    // Dodo takes new checkout; Lemon Squeezy still has subscribers.
    const billing = await composeBilling(runtime.db, clock, {
      mode: "cloud",
      env: billingEnv("dodo", LEMONSQUEEZY),
    });
    expect(billing.providers).toEqual(["dodo", "lemonsqueezy"]);
    const app = createExpressApp({ ...runtime, billing });
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const listening = app.listen(0, () => resolve(listening));
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("listen_failed");
    const base = `http://127.0.0.1:${address.port}/webhooks/billing`;
    const post = (provider: string) =>
      fetch(`${base}/${provider}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-signature": "not-a-signature",
        },
        body: JSON.stringify({
          meta: { event_name: "subscription_created" },
          data: {},
        }),
      });
    try {
      for (const provider of ["stripe", "fake"]) {
        expect((await post(provider)).status).toBe(404);
      }
      // Each connected route reaches the billing engine, which refuses an unsigned body.
      for (const provider of ["dodo", "lemonsqueezy"]) {
        const response = await post(provider);
        expect(response.status).not.toBe(404);
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    } finally {
      server.close();
      await runtime.close();
    }
  });
});
