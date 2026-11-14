import { describe, expect, it } from "bun:test";
import { eq, like } from "drizzle-orm";
import { composeBilling } from "./billing.js";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { type SeededWorld, seedWorld } from "./seed.js";

async function setup() {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock });
  const world = await seedWorld(runtime, clock);
  return { runtime, world, clock };
}

const owner = (world: SeededWorld) => ({
  cookie: world.owner.sessionCookie,
  "x-school-id": world.schoolA.publicId,
});

type Plan = {
  billingAvailable: boolean;
  plan: string | null;
  interval: string | null;
  status: string | null;
  amountMinor: number | null;
  currency: string | null;
  cancelAtPeriodEnd: boolean;
  canCancel: boolean;
  canResume: boolean;
};

describe("billing composition", () => {
  it("refuses to run production cloud billing on the fake provider", async () => {
    const { runtime, clock } = await setup();
    const previous = { nodeEnv: process.env.NODE_ENV, provider: process.env.BILLING_PROVIDER };
    process.env.NODE_ENV = "production";
    delete process.env.BILLING_PROVIDER;
    try {
      expect(() => composeBilling(runtime.db, clock, { mode: "cloud" })).toThrow(
        "billing_provider_required_in_production",
      );
      // OSS needs no provider.
      expect(() => composeBilling(runtime.db, clock, { mode: "oss" })).not.toThrow();
    } finally {
      process.env.NODE_ENV = previous.nodeEnv;
      if (previous.provider === undefined) delete process.env.BILLING_PROVIDER;
      else process.env.BILLING_PROVIDER = previous.provider;
    }
    await runtime.close();
  });
});

describe("school plan", () => {
  it("shows the school's paid plan with its price", async () => {
    const { runtime, world } = await setup();
    const response = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/billing",
      headers: owner(world),
    });
    expect(response.status).toBe(200);
    expect(response.body as Plan).toMatchObject({
      billingAvailable: true,
      plan: "pro",
      interval: "month",
      status: "active",
      currency: "USD",
      cancelAtPeriodEnd: false,
      canCancel: true,
      canResume: false,
    });
    expect((response.body as Plan).amountMinor).toBeGreaterThan(0);
    await runtime.close();
  });

  it("cancels at the period end, resumes, and keeps an audit trail", async () => {
    const { runtime, world } = await setup();
    const cancelled = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/billing/cancel",
      headers: owner(world),
      body: {},
    });
    expect(cancelled.status).toBe(200);
    const afterCancel = (cancelled.body as { plan: Plan }).plan;
    expect(afterCancel.plan).toBe("pro");
    expect(afterCancel.cancelAtPeriodEnd).toBe(true);
    expect(afterCancel.canCancel).toBe(false);
    expect(afterCancel.canResume).toBe(true);

    const resumed = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/billing/resume",
      headers: owner(world),
      body: {},
    });
    expect(resumed.status).toBe(200);
    const afterResume = (resumed.body as { plan: Plan }).plan;
    expect(afterResume.cancelAtPeriodEnd).toBe(false);
    expect(afterResume.canCancel).toBe(true);

    const audit = await runtime.db
      .select({ action: schema.auditEvents.action })
      .from(schema.auditEvents)
      .where(like(schema.auditEvents.action, "billing.%"));
    expect(audit.length).toBeGreaterThan(0);
    await runtime.close();
  });

  it("doesn't ask an owner who signed in a while ago to sign in again", async () => {
    // Creators often reach billing long after signing in, for example at the
    // end of onboarding. Sessions are stamped with the real time, so run the
    // API two hours after this owner signed in.
    const clock = freezeRuntimeClock(new Date(Date.now() + 2 * 60 * 60 * 1000));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const cancelled = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/billing/cancel",
      headers: owner(world),
      body: {},
    });
    expect(cancelled.status).toBe(200);
    await runtime.close();
  });

  it("uses each grant once and leaves none behind", async () => {
    const { runtime, world } = await setup();
    await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/billing/cancel",
      headers: owner(world),
      body: {},
    });
    const leftovers = await runtime.db.select().from(schema.verification);
    expect(leftovers.filter((row) => row.identifier.startsWith("billing"))).toHaveLength(0);
    await runtime.close();
  });

  it("is for the owner's browser session only", async () => {
    const { runtime, world } = await setup();
    for (const [method, path] of [
      ["GET", "/v1/school/billing"],
      ["POST", "/v1/school/billing/cancel"],
      ["POST", "/v1/school/billing/resume"],
    ] as const) {
      const viaToken = await dispatch(runtime, {
        method,
        path,
        headers: {
          authorization: `Bearer ${world.owner.oauthToken}`,
          "x-school-id": world.schoolA.publicId,
        },
        ...(method === "POST" ? { body: {} } : {}),
      });
      expect(viaToken.status).toBe(403);
      const anonymous = await dispatch(runtime, {
        method,
        path,
        headers: { "x-school-id": world.schoolA.publicId },
        ...(method === "POST" ? { body: {} } : {}),
      });
      expect(anonymous.status).toBe(401);
    }
    await runtime.close();
  });

  it("reports no billing in OSS", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);
    const plan = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/billing",
      headers: owner(world),
    });
    expect(plan.body as Plan).toMatchObject({ billingAvailable: false, plan: null, canCancel: false });
    const cancel = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/billing/cancel",
      headers: owner(world),
      body: {},
    });
    expect(cancel.status).toBe(400);
    await runtime.close();
  });
});
