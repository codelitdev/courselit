import { describe, expect, it } from "bun:test";
import { uuidv7 } from "@codelitdev/platform";
import * as schema from "./db/schema/index.js";
import { checkLimit, type PlanLimitKey, schoolLimit } from "./plan-limit.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { PLAN_LIMITS } from "./school-plan.js";
import { seedWorld } from "./seed.js";

const NOW = new Date("2026-03-01T00:00:00.000Z");
const MB = 1024 * 1024;

async function setup(billingMode: "cloud" | "oss" = "cloud") {
  const clock = freezeRuntimeClock(NOW);
  const runtime = await createPgliteRuntime({ clock, billingMode });
  const world = await seedWorld(runtime, clock);
  const deps = { db: runtime.db, billing: runtime.billing.billing, mode: billingMode, clock };
  return { runtime, world, deps };
}

const reason = (error: { safeDetails?: Record<string, unknown> }) => error.safeDetails?.reason;

describe("schoolLimit", () => {
  it("reads a paid plan's allowance from the billing package", async () => {
    const { runtime, world, deps } = await setup();
    expect(await schoolLimit(deps, world.schoolA.id, "storage_bytes")).toBe(
      PLAN_LIMITS.pro.storage_bytes,
    );
    expect(await schoolLimit(deps, world.schoolA.id, "marketing_emails_month")).toBe(10_000);
    await runtime.close();
  });

  it("uses the trial's own limits, not Business's", async () => {
    const { runtime, world, deps } = await setup();
    await runtime.db.insert(schema.schoolTrials).values({
      id: uuidv7(runtime.clock),
      userId: "trial_owner",
      normalizedEmail: "trial@example.com",
      schoolId: world.schoolB.id,
      startedAt: NOW,
      endsAt: new Date(NOW.getTime() + 14 * 86_400_000),
    });
    expect(await schoolLimit(deps, world.schoolB.id, "storage_bytes")).toBe(500 * MB);
    expect(await schoolLimit(deps, world.schoolB.id, "marketing_emails_month")).toBe(0);
    await runtime.close();
  });

  it("is 0 with no plan and unlimited in oss mode", async () => {
    const cloud = await setup();
    expect(await schoolLimit(cloud.deps, cloud.world.schoolB.id, "storage_bytes")).toBe(0);
    await cloud.runtime.close();
    const oss = await setup("oss");
    expect(await schoolLimit(oss.deps, oss.world.schoolB.id, "storage_bytes")).toBeNull();
    await oss.runtime.close();
  });

  it("throws on an undeclared key instead of reading it as unlimited (S7)", async () => {
    const { runtime, world, deps } = await setup();
    await expect(
      schoolLimit(deps, world.schoolA.id, "storage_byte" as PlanLimitKey),
    ).rejects.toThrow(/limit_key_unknown/);
    await runtime.close();
  });
});

describe("checkLimit", () => {
  it("allows usage that fits and refuses usage that doesn't", async () => {
    const { runtime, world, deps } = await setup();
    const allowed = PLAN_LIMITS.pro.storage_bytes!;
    const fits = await checkLimit(deps, {
      schoolId: world.schoolA.id,
      key: "storage_bytes",
      used: allowed - 10,
      increment: 10,
      showNumbers: true,
    });
    expect(fits.ok).toBe(true);
    const over = await checkLimit(deps, {
      schoolId: world.schoolA.id,
      key: "storage_bytes",
      used: allowed - 10,
      increment: 11,
      showNumbers: true,
    });
    expect(over.ok).toBe(false);
    if (over.ok) throw new Error("expected a refusal");
    expect(over.error.code).toBe("forbidden");
    expect(over.error.safeDetails).toEqual({
      reason: "plan_limit_reached",
      limit: "storage_bytes",
      used: allowed - 10,
      allowed,
    });
    await runtime.close();
  });

  it("leaves the numbers out for someone who can't see billing (S9)", async () => {
    const { runtime, world, deps } = await setup();
    const over = await checkLimit(deps, {
      schoolId: world.schoolB.id,
      key: "storage_bytes",
      used: 0,
      increment: 1,
      showNumbers: false,
    });
    if (over.ok) throw new Error("expected a refusal");
    expect(over.error.safeDetails).toEqual({ reason: "plan_limit_reached", limit: "storage_bytes" });
    await runtime.close();
  });

  it("refuses new usage when billing can't be read (S23)", async () => {
    const { runtime, world, deps } = await setup();
    const failing = {
      ...deps,
      billing: {
        ...deps.billing,
        commercialState: async () => {
          throw new Error("billing down");
        },
      },
    };
    const result = await checkLimit(failing, {
      schoolId: world.schoolA.id,
      key: "storage_bytes",
      used: 0,
      increment: 1,
      showNumbers: true,
    });
    if (result.ok) throw new Error("expected a refusal");
    expect(reason(result.error)).toBe("billing_unavailable");
    await runtime.close();
  });

  it("never refuses in oss mode", async () => {
    const { runtime, world, deps } = await setup("oss");
    const result = await checkLimit(deps, {
      schoolId: world.schoolA.id,
      key: "storage_bytes",
      used: Number.MAX_SAFE_INTEGER - 1,
      increment: 1,
      showNumbers: true,
    });
    expect(result.ok).toBe(true);
    await runtime.close();
  });
});
