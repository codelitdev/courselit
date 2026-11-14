import { describe, expect, it } from "bun:test";
import { uuidv7 } from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import {
  lastKnownPlan,
  planIncludesFeature,
  type SchoolPlan,
  schoolPlan,
  TRIAL,
} from "./school-plan.js";
import { seedWorld } from "./seed.js";

const NOW = new Date("2026-03-01T00:00:00.000Z");
const DAY = 86_400_000;

async function setup(billingMode: "cloud" | "oss" = "cloud") {
  const clock = freezeRuntimeClock(NOW);
  const runtime = await createPgliteRuntime({ clock, billingMode });
  const world = await seedWorld(runtime, clock);
  const deps = {
    db: runtime.db,
    billing: runtime.billing.billing,
    mode: billingMode,
    clock,
  };
  return { runtime, world, clock, deps };
}

async function addTrial(
  runtime: Awaited<ReturnType<typeof setup>>["runtime"],
  schoolId: string,
  endsAt: Date,
  endedAt: Date | null = null,
) {
  await runtime.db.insert(schema.schoolTrials).values({
    id: uuidv7(runtime.clock),
    userId: `user_${schoolId}`,
    normalizedEmail: `${schoolId}@example.com`,
    schoolId,
    startedAt: new Date(endsAt.getTime() - 14 * DAY),
    endsAt,
    endedAt,
    endReason: endedAt ? "purchased" : null,
  });
}

describe("schoolPlan", () => {
  it("is oss in oss mode", async () => {
    const { runtime, world, deps } = await setup("oss");
    expect(await schoolPlan(deps, world.schoolA.id)).toEqual({ kind: "oss" });
    await runtime.close();
  });

  it("reads the entitled paid plan", async () => {
    const { runtime, world, deps } = await setup();
    expect(await schoolPlan(deps, world.schoolA.id)).toMatchObject({
      kind: "paid",
      plan: "pro",
    });
    await runtime.close();
  });

  it("puts a paid plan ahead of a trial that is still running (S18)", async () => {
    const { runtime, world, deps } = await setup();
    await addTrial(runtime, world.schoolA.id, new Date(NOW.getTime() + 10 * DAY));
    expect((await schoolPlan(deps, world.schoolA.id)).kind).toBe("paid");
    await runtime.close();
  });

  it("is a trial while one is running and nothing is paid", async () => {
    const { runtime, world, deps } = await setup();
    const endsAt = new Date(NOW.getTime() + 10 * DAY);
    await addTrial(runtime, world.schoolB.id, endsAt);
    expect(await schoolPlan(deps, world.schoolB.id)).toEqual({ kind: "trial", endsAt });
    await runtime.close();
  });

  it("is expired once the trial has ended or was closed", async () => {
    const { runtime, world, deps } = await setup();
    await addTrial(runtime, world.schoolB.id, new Date(NOW.getTime() - DAY));
    expect(await schoolPlan(deps, world.schoolB.id)).toEqual({
      kind: "none",
      reason: "expired",
    });
    await runtime.close();
  });

  it("is never a trial for a school with no trial record (S15)", async () => {
    const { runtime, world, deps } = await setup();
    expect(await schoolPlan(deps, world.schoolB.id)).toEqual({
      kind: "none",
      reason: "expired",
    });
    await runtime.close();
  });

  it.each(["pending_checkout", "imported"] as const)(
    "gives the %s reason for a school waiting on its first checkout",
    async (status) => {
      const { runtime, world, deps } = await setup();
      await runtime.db
        .update(schema.schools)
        .set({ status })
        .where(eq(schema.schools.id, world.schoolB.id));
      expect(await schoolPlan(deps, world.schoolB.id)).toEqual({
        kind: "none",
        reason: status,
      });
      await runtime.close();
    },
  );

  it("is unknown when billing can't be read, and keeps the last plan billing confirmed (S23)", async () => {
    const { runtime, world, deps } = await setup();
    const confirmed = await schoolPlan(deps, world.schoolA.id);
    const [cached] = await runtime.db
      .select({ lastPlan: schema.schools.lastPlan, lastPlanAt: schema.schools.lastPlanAt })
      .from(schema.schools)
      .where(eq(schema.schools.id, world.schoolA.id));
    expect(cached!.lastPlan).toEqual(confirmed);
    expect(cached!.lastPlanAt).toEqual(NOW);

    const failing = {
      ...deps,
      billing: {
        commercialState: async () => {
          throw new Error("billing down");
        },
      },
    };
    const live = await schoolPlan(failing, world.schoolA.id);
    expect(live).toEqual({ kind: "unknown" });
    expect(lastKnownPlan(live, cached!.lastPlan)).toEqual(confirmed);
    await runtime.close();
  });
});

describe("planIncludesFeature", () => {
  const paid = (plan: "pro" | "business"): SchoolPlan => ({ kind: "paid", plan, status: "active" });
  const trial: SchoolPlan = { kind: "trial", endsAt: NOW };

  it("follows the plan matrix", () => {
    expect(planIncludesFeature(paid("pro"), "remove_branding")).toBe(true);
    expect(planIncludesFeature(paid("pro"), "learner_sso")).toBe(false);
    expect(planIncludesFeature(paid("business"), "learner_sso")).toBe(true);
    expect(planIncludesFeature(paid("business"), "audit_log")).toBe(true);
    expect(planIncludesFeature({ kind: "oss" }, "anything")).toBe(true);
  });

  it("gives a trial Business features except removing branding and public code injection", () => {
    expect(planIncludesFeature(trial, "learner_sso")).toBe(true);
    expect(planIncludesFeature(trial, "scorm")).toBe(true);
    expect(planIncludesFeature(trial, "remove_branding")).toBe(false);
    expect(planIncludesFeature(trial, "code_injection")).toBe(false);
    expect(TRIAL.limits).toEqual({ marketing_emails_month: 0, storage_bytes: 500 * 1024 * 1024 });
  });

  it("gives nothing to no plan or an unknown one", () => {
    expect(planIncludesFeature({ kind: "none", reason: "expired" }, "remove_branding")).toBe(false);
    expect(planIncludesFeature({ kind: "unknown" }, "learner_sso")).toBe(false);
  });
});
