import { describe, expect, it } from "bun:test";
import { API_KEY_FAILURE_LIMIT, CLIENT_IP_HEADER } from "./auth/api-key-throttle.js";
import { createExpressApp } from "./express-app.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe("client address at the Express edge", () => {
  it("ignores client-sent address headers, so forging them can't dodge API-key throttling", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const app = createExpressApp(runtime);
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const listening = app.listen(0, () => resolve(listening));
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("listen_failed");
    const url = `http://127.0.0.1:${address.port}/v1/school/hosts`;
    try {
      // Every failed attempt claims to come from a different address. The
      // socket is loopback (a trusted proxy hop), so `X-Forwarded-For` is read
      // from the right; its last entry is what counts, and here it's the same
      // address every time, so the forged left entries and the forged
      // internal header change nothing.
      for (let attempt = 0; attempt < API_KEY_FAILURE_LIMIT; attempt += 1) {
        const failed = await fetch(url, {
          headers: {
            "x-api-key": `cl_live_key_${"0".repeat(32)}.${"x".repeat(43)}`,
            [CLIENT_IP_HEADER]: `198.51.100.${attempt}`,
            "x-forwarded-for": `203.0.113.${attempt}, 192.0.2.10`,
          },
        });
        expect(failed.status).toBe(401);
      }
      const limited = await fetch(url, {
        headers: {
          "x-api-key": world.apiKeyA.raw,
          [CLIENT_IP_HEADER]: "198.51.100.250",
          "x-forwarded-for": "203.0.113.250, 192.0.2.10",
        },
      });
      expect(limited.status).toBe(429);
    } finally {
      server.close();
      await runtime.close();
    }
  });
});
