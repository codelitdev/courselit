import { describe, expect, it } from "bun:test";
import type { CaptureClient } from "@codelitdev/observability";
import { createExpressApp } from "./express-app.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { createCourseLitObservability } from "./telemetry.js";

describe("express error reporting", () => {
  it("answers a malformed body with 400 without reporting a server error", async () => {
    const exceptions: unknown[] = [];
    const client: CaptureClient = {
      capture: () => {},
      captureException: (error) => exceptions.push(error),
      shutdown: async () => {},
    };
    const runtime = await createPgliteRuntime({
      clock: freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z")),
      observability: createCourseLitObservability(
        "courselit-api",
        { POSTHOG_API_KEY: "phc_test", LOG_LEVEL: "silent" },
        { client },
      ),
    });
    const app = createExpressApp(runtime);
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const listening = app.listen(0, () => resolve(listening));
    });
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("listen_failed");
      const response = await fetch(`http://127.0.0.1:${address.port}/v1/schools`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{bad json",
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "validation_failed" });
      expect(exceptions).toHaveLength(0);
    } finally {
      server.close();
      await runtime.close();
    }
  });
});
