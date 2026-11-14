import { describe, expect, it } from "bun:test";
import { createExpressApp } from "./express-app.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";

describe("platform billing webhook route", () => {
  it("accepts Lemon Squeezy webhooks and no longer routes Dodo", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const app = createExpressApp(runtime);
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const listening = app.listen(0, () => resolve(listening));
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("listen_failed");
    const base = `http://127.0.0.1:${address.port}/webhooks/billing`;
    const post = (provider: string) =>
      fetch(`${base}/${provider}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-signature": "not-a-signature" },
        body: JSON.stringify({ meta: { event_name: "subscription_created" }, data: {} }),
      });
    try {
      expect((await post("dodo")).status).toBe(404);
      // The route reaches the billing engine, which refuses an unsigned body. It is
      // never treated as an unknown route.
      const lemonsqueezy = await post("lemonsqueezy");
      expect(lemonsqueezy.status).not.toBe(404);
      expect(lemonsqueezy.status).toBeGreaterThanOrEqual(400);
    } finally {
      server.close();
      await runtime.close();
    }
  });
});
