import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { evaluateSchoolLifecycle, GRACE_DAYS, PENDING_CHECKOUT_DAYS } from "./school-lifecycle.js";
import {
  normalizeTrialEmail,
  SCHOOL_CREATIONS_PER_DAY,
  TRIAL_DAYS,
} from "./school-trials.js";
import { createSchool } from "./schools.js";
import { seedWorld } from "./seed.js";
import { ssoEnforcementApplies } from "./sign-in-policy.js";
import { importSchool, removeImportedSchool, suspendSchool, unsuspendSchool } from "./staff.js";

const DAY = 86_400_000;
const START = new Date("2026-03-01T00:00:00.000Z");

async function setup() {
  const clock = freezeRuntimeClock(START);
  const runtime = await createPgliteRuntime({ clock });
  const world = await seedWorld(runtime, clock);
  // The seeded schools don't count toward today's creation limit.
  await runtime.db.update(schema.schools).set({ createdAt: new Date(START.getTime() - 2 * DAY) });
  const deps = { db: runtime.db, billing: runtime.billing.billing, mode: "cloud" as const, clock };
  return { runtime, world, clock, deps };
}

/** A clock fixed at `at`, for evaluating the lifecycle later in time. */
const at = (date: Date) => freezeRuntimeClock(date);

async function newSchool(
  t: Awaited<ReturnType<typeof setup>>,
  subdomain: string,
  billingMode: "cloud" | "oss" | "internal" = "cloud",
) {
  const created = await createSchool(
    t.runtime.db,
    {
      name: `School ${subdomain}`,
      subdomain,
      locale: "en",
      currency: "USD",
      principalId: t.world.owner.id,
      requestId: `req-${subdomain}`,
      billingMode: billingMode === "internal" ? undefined : billingMode,
    },
    t.clock,
  );
  if (!created.ok) throw new Error(`create failed: ${created.error.safeDetails?.reason ?? created.error.code}`);
  const [row] = await t.runtime.db
    .select()
    .from(schema.schools)
    .where(eq(schema.schools.publicId, created.value.id));
  return row!;
}

async function status(t: Awaited<ReturnType<typeof setup>>, schoolId: string) {
  const [row] = await t.runtime.db
    .select({ status: schema.schools.status, graceEndsAt: schema.schools.graceEndsAt })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId));
  return row!;
}

async function ownerNotices(t: Awaited<ReturnType<typeof setup>>, schoolId: string) {
  const jobs = await t.runtime.db
    .select()
    .from(schema.integrationOutboxJobs)
    .where(
      and(
        eq(schema.integrationOutboxJobs.schoolId, schoolId),
        eq(schema.integrationOutboxJobs.type, "send_system_email"),
      ),
    );
  return jobs.map((job) => (job.payload as { subject: string; stream: string }));
}

describe("normalizeTrialEmail", () => {
  it("folds case, +tags and Gmail dots, so one mailbox gets one trial", () => {
    expect(normalizeTrialEmail(" Maya.Patel+trial2@GoogleMail.com ")).toBe("mayapatel@gmail.com");
    expect(normalizeTrialEmail("maya.patel+x@example.com")).toBe("maya.patel@example.com");
  });
});

describe("one trial per account", () => {
  it("starts a trial for the first school and waits for checkout on the next", async () => {
    const t = await setup();
    const first = await newSchool(t, "first-school");
    expect(first.status).toBe("active");
    const [trial] = await t.runtime.db
      .select()
      .from(schema.schoolTrials)
      .where(eq(schema.schoolTrials.schoolId, first.id));
    expect(trial!.endsAt).toEqual(new Date(START.getTime() + TRIAL_DAYS * DAY));
    // The lifecycle job is queued for the trial's end.
    const [job] = await t.runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(
        and(
          eq(schema.integrationOutboxJobs.schoolId, first.id),
          eq(schema.integrationOutboxJobs.type, "evaluate_school_lifecycle"),
        ),
      );
    expect(job!.nextAttemptAt).toEqual(trial!.endsAt);

    const second = await newSchool(t, "second-school");
    expect(second.status).toBe("pending_checkout");
    await t.runtime.close();
  });

  it("doesn't give a new trial after the first school is deleted", async () => {
    const t = await setup();
    const first = await newSchool(t, "first-school");
    await t.runtime.db
      .update(schema.schools)
      .set({ status: "deleted" })
      .where(eq(schema.schools.id, first.id));
    expect((await newSchool(t, "again-school")).status).toBe("pending_checkout");
    await t.runtime.close();
  });

  it("limits how many schools one account creates in a day (S15)", async () => {
    const t = await setup();
    for (let n = 0; n < SCHOOL_CREATIONS_PER_DAY; n += 1) await newSchool(t, `burst-${n}`);
    await expect(newSchool(t, "one-too-many")).rejects.toThrow(/rate_limited/);
    await t.runtime.close();
  });

  it("leaves internal callers (imports, tests) with an active school and no trial", async () => {
    const t = await setup();
    const school = await newSchool(t, "internal-school", "internal");
    expect(school.status).toBe("active");
    expect(
      await t.runtime.db.select().from(schema.schoolTrials).where(eq(schema.schoolTrials.schoolId, school.id)),
    ).toHaveLength(0);
    await t.runtime.close();
  });
});

describe("evaluateSchoolLifecycle", () => {
  it("leaves a running trial alone, then makes the school read-only when it ends unpaid", async () => {
    const t = await setup();
    const school = await newSchool(t, "trial-school");
    expect(await evaluateSchoolLifecycle(t.deps, school.id)).toBe("unchanged");

    const ended = new Date(START.getTime() + (TRIAL_DAYS + 1) * DAY);
    const later = { ...t.deps, clock: at(ended) };
    expect(await evaluateSchoolLifecycle(later, school.id)).toBe("read_only");
    const after = await status(t, school.id);
    expect(after.status).toBe("read_only");
    expect(after.graceEndsAt).toEqual(new Date(ended.getTime() + GRACE_DAYS * DAY));
    const [trial] = await t.runtime.db
      .select()
      .from(schema.schoolTrials)
      .where(eq(schema.schoolTrials.schoolId, school.id));
    expect(trial).toMatchObject({ endReason: "expired" });
    expect(await ownerNotices(t, school.id)).toEqual([
      expect.objectContaining({ subject: "School trial-school is now read-only", stream: "staff" }),
    ]);
    // Running it again changes and sends nothing.
    expect(await evaluateSchoolLifecycle(later, school.id)).toBe("unchanged");
    expect(await ownerNotices(t, school.id)).toHaveLength(1);
    await t.runtime.close();
  });

  it("warns the owner 7 days and 1 day before deletion, once each", async () => {
    const t = await setup();
    const school = await newSchool(t, "warn-school");
    const ended = new Date(START.getTime() + (TRIAL_DAYS + 1) * DAY);
    await evaluateSchoolLifecycle({ ...t.deps, clock: at(ended) }, school.id);
    const grace = (await status(t, school.id)).graceEndsAt!;
    const sevenBefore = { ...t.deps, clock: at(new Date(grace.getTime() - 6 * DAY)) };
    expect(await evaluateSchoolLifecycle(sevenBefore, school.id)).toBe("warned");
    expect(await evaluateSchoolLifecycle(sevenBefore, school.id)).toBe("unchanged");
    const dayBefore = { ...t.deps, clock: at(new Date(grace.getTime() - DAY / 2)) };
    expect(await evaluateSchoolLifecycle(dayBefore, school.id)).toBe("warned");
    const subjects = (await ownerNotices(t, school.id)).map((notice) => notice.subject);
    expect(subjects).toEqual([
      "School warn-school is now read-only",
      "School warn-school will be deleted in 7 days",
      "School warn-school will be deleted tomorrow",
    ]);
    await t.runtime.close();
  });

  it("brings a read-only school back when it pays, and ends the trial as purchased", async () => {
    const t = await setup();
    // School A is seeded on Pro; make it read-only and give it an open trial.
    await t.runtime.db
      .update(schema.schools)
      .set({ status: "read_only", graceEndsAt: new Date(START.getTime() + DAY) })
      .where(eq(schema.schools.id, t.world.schoolA.id));
    await t.runtime.db.insert(schema.schoolTrials).values({
      id: "01a1aaaa-0000-7000-8000-000000000001",
      userId: "someone",
      normalizedEmail: "someone@example.com",
      schoolId: t.world.schoolA.id,
      startedAt: START,
      endsAt: new Date(START.getTime() + 10 * DAY),
    });
    expect(await evaluateSchoolLifecycle(t.deps, t.world.schoolA.id)).toBe("activated");
    expect(await status(t, t.world.schoolA.id)).toEqual({ status: "active", graceEndsAt: null });
    const [trial] = await t.runtime.db
      .select()
      .from(schema.schoolTrials)
      .where(eq(schema.schoolTrials.schoolId, t.world.schoolA.id));
    expect(trial).toMatchObject({ endReason: "purchased" });
    await t.runtime.close();
  });

  it("removes a school that waited too long for its first checkout", async () => {
    const t = await setup();
    await newSchool(t, "first-school");
    const pending = await newSchool(t, "pending-school");
    expect(await evaluateSchoolLifecycle(t.deps, pending.id)).toBe("unchanged");
    const late = { ...t.deps, clock: at(new Date(START.getTime() + PENDING_CHECKOUT_DAYS * DAY)) };
    expect(await evaluateSchoolLifecycle(late, pending.id)).toBe("expired_pending");
    expect((await status(t, pending.id)).status).toBe("deleted");
    await t.runtime.close();
  });

  it("does nothing while billing can't be read (S23), or while the school is suspended", async () => {
    const t = await setup();
    const failing = {
      ...t.deps,
      billing: {
        commercialState: async () => {
          throw new Error("billing down");
        },
      },
    };
    expect(await evaluateSchoolLifecycle(failing, t.world.schoolB.id)).toBe("unknown");
    expect((await status(t, t.world.schoolB.id)).status).toBe("active");
    await t.runtime.db
      .update(schema.schools)
      .set({ status: "suspended" })
      .where(eq(schema.schools.id, t.world.schoolB.id));
    expect(await evaluateSchoolLifecycle(t.deps, t.world.schoolB.id)).toBe("skipped");
    await t.runtime.close();
  });
});

describe("ssoEnforcementApplies", () => {
  it("keeps enforcing unless billing confirmed a plan without SSO (S10)", async () => {
    const t = await setup();
    const set = (lastPlan: unknown) =>
      t.runtime.db
        .update(schema.schools)
        .set({ lastPlan })
        .where(eq(schema.schools.id, t.world.schoolB.id));
    expect(await ssoEnforcementApplies(t.runtime.db, t.world.schoolB.id)).toBe(true);
    await set({ kind: "unknown" });
    expect(await ssoEnforcementApplies(t.runtime.db, t.world.schoolB.id)).toBe(true);
    await set({ kind: "paid", plan: "business", status: "active" });
    expect(await ssoEnforcementApplies(t.runtime.db, t.world.schoolB.id)).toBe(true);
    await set({ kind: "paid", plan: "pro", status: "active" });
    expect(await ssoEnforcementApplies(t.runtime.db, t.world.schoolB.id)).toBe(false);
    await set({ kind: "none", reason: "expired" });
    expect(await ssoEnforcementApplies(t.runtime.db, t.world.schoolB.id)).toBe(false);
    await t.runtime.close();
  });
});

describe("staff commands", () => {
  async function auditRows(t: Awaited<ReturnType<typeof setup>>) {
    return t.runtime.db.select().from(schema.platformAuditEvents);
  }

  it("suspends and unsuspends, and records both", async () => {
    const t = await setup();
    expect((await suspendSchool(t.runtime.db, t.clock, { school: "school-b", reason: "phishing", actor: "" })).ok).toBe(false);
    const suspended = await suspendSchool(t.runtime.db, t.clock, {
      school: "school-b",
      reason: "phishing report #12",
      actor: "ops@courselit",
    });
    expect(suspended.ok).toBe(true);
    expect((await status(t, t.world.schoolB.id)).status).toBe("suspended");
    expect((await unsuspendSchool(t.runtime.db, t.clock, { school: "school-b", actor: "ops@courselit" })).ok).toBe(true);
    expect((await status(t, t.world.schoolB.id)).status).toBe("active");
    expect((await auditRows(t)).map((row) => [row.command, row.actor, row.reason])).toEqual([
      ["suspend", "ops@courselit", "phishing report #12"],
      ["unsuspend", "ops@courselit", null],
    ]);
    await t.runtime.close();
  });

  it("imports a school offline with no trial, and removes it", async () => {
    const t = await setup();
    const imported = await importSchool(t.runtime.db, t.clock, {
      ownerEmail: t.world.owner.email,
      name: "Moved School",
      subdomain: "moved-school",
      mainSchool: "main_123",
      actor: "ops@courselit",
    });
    expect(imported.ok).toBe(true);
    const [row] = await t.runtime.db
      .select()
      .from(schema.schools)
      .where(eq(schema.schools.subdomain, "moved-school"));
    expect(row!.status).toBe("imported");
    expect(
      await t.runtime.db.select().from(schema.schoolTrials).where(eq(schema.schoolTrials.schoolId, row!.id)),
    ).toHaveLength(0);
    expect(
      (await importSchool(t.runtime.db, t.clock, {
        ownerEmail: "nobody@example.com",
        name: "X",
        subdomain: "x-school",
        mainSchool: "m",
        actor: "ops",
      })).ok,
    ).toBe(false);
    expect((await removeImportedSchool(t.runtime.db, t.clock, { school: "moved-school", actor: "ops@courselit" })).ok).toBe(true);
    expect((await status(t, row!.id)).status).toBe("deleted");
    await t.runtime.close();
  });
});

describe("onboarding during a trial", () => {
  it("counts a trial as entitled but not as paid", async () => {
    const t = await setup();
    const school = await newSchool(t, "trial-onboarding");
    const response = await dispatch(t.runtime, {
      method: "GET",
      path: "/v1/school/onboarding",
      headers: { cookie: t.world.owner.sessionCookie, "x-school-id": school.publicId },
    });
    expect(response.status).toBe(200);
    expect((response.body as { billing: unknown }).billing).toEqual({
      required: true,
      entitled: true,
      paid: false,
      trialEndsAt: new Date(START.getTime() + TRIAL_DAYS * DAY).toISOString(),
    });
    await t.runtime.close();
  });
});
