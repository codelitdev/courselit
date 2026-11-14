import { afterEach, describe, expect, it } from "bun:test";
import { uuidv7 } from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { assertTriggeredMailAllowed, TRIGGERED_MAIL_LIMITS } from "./mail-abuse-limits.js";
import { schoolSiteUrl } from "./membership-events.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import {
  PLATFORM_MAIL_DAILY_CAPS,
  platformMailTier,
  queueSchoolEmail,
} from "./school-emails.js";
import { createSchool } from "./schools.js";
import { seedWorld } from "./seed.js";
import { platformTeamApiKey } from "./system-mail.js";

const NOW = new Date("2026-03-01T10:00:00.000Z");
const previousMode = process.env.BILLING_MODE;

afterEach(() => {
  if (previousMode === undefined) delete process.env.BILLING_MODE;
  else process.env.BILLING_MODE = previousMode;
});

async function setup() {
  delete process.env.BILLING_MODE;
  const clock = freezeRuntimeClock(NOW);
  const runtime = await createPgliteRuntime({ clock });
  const world = await seedWorld(runtime, clock);
  return { runtime, world, clock };
}

const email = (n: number) => ({
  to: `learner${n}@example.com`,
  subject: "Your receipt for Course",
  html: "<p>Thanks</p>",
  text: "Thanks",
  idempotencyKey: `test:${n}`,
});

async function jobs(runtime: Awaited<ReturnType<typeof setup>>["runtime"], schoolId: string) {
  return runtime.db
    .select()
    .from(schema.integrationOutboxJobs)
    .where(
      and(
        eq(schema.integrationOutboxJobs.schoolId, schoolId),
        eq(schema.integrationOutboxJobs.type, "send_system_email"),
      ),
    );
}

describe("queueSchoolEmail", () => {
  it("always queues platform mail tagged with its stream, never the school's team", async () => {
    const { runtime, world, clock } = await setup();
    expect(await queueSchoolEmail(runtime.db, world.schoolA.id, email(1), clock, "sign_in")).toBe(
      "queued",
    );
    const [job] = await jobs(runtime, world.schoolA.id);
    expect(job).toMatchObject({ provider: "system", type: "send_system_email" });
    expect(job!.payload).toMatchObject({ stream: "sign_in" });
    await runtime.close();
  });

  it("names the school in the subject, once", async () => {
    const { runtime, world, clock } = await setup();
    await queueSchoolEmail(runtime.db, world.schoolA.id, email(1), clock);
    await queueSchoolEmail(
      runtime.db,
      world.schoolA.id,
      { ...email(2), subject: "Sign in to School A" },
      clock,
    );
    const subjects = (await jobs(runtime, world.schoolA.id)).map(
      (job) => (job.payload as { subject: string }).subject,
    );
    expect(subjects.sort()).toEqual(["Sign in to School A", "Your receipt for Course | School A"]);
    await runtime.close();
  });

  it("skips notifications over the school's daily cap; they stay in-app (S22)", async () => {
    const { runtime, world, clock } = await setup();
    const cap = PLATFORM_MAIL_DAILY_CAPS.notifications.trial;
    for (let n = 0; n < cap; n += 1) {
      expect(
        await queueSchoolEmail(runtime.db, world.schoolB.id, email(n), clock, "notifications"),
      ).toBe("queued");
    }
    expect(
      await queueSchoolEmail(runtime.db, world.schoolB.id, email(cap), clock, "notifications"),
    ).toBe("skipped");
    expect(await jobs(runtime, world.schoolB.id)).toHaveLength(cap);
    // Sign-in codes are never held back by the notification budget.
    expect(
      await queueSchoolEmail(runtime.db, world.schoolB.id, email(cap + 1), clock, "sign_in"),
    ).toBe("queued");
    await runtime.close();
  });

  it("holds transactional mail over the cap until the next UTC day", async () => {
    const { runtime, world, clock } = await setup();
    const cap = PLATFORM_MAIL_DAILY_CAPS.transactional.trial;
    for (let n = 0; n < cap; n += 1) {
      await queueSchoolEmail(runtime.db, world.schoolB.id, email(n), clock);
    }
    expect(await queueSchoolEmail(runtime.db, world.schoolB.id, email(cap), clock)).toBe(
      "deferred",
    );
    const deferred = (await jobs(runtime, world.schoolB.id)).find(
      (job) => (job.payload as { to: string }).to === `learner${cap}@example.com`,
    );
    expect(deferred!.nextAttemptAt).toEqual(new Date("2026-03-02T00:00:00.000Z"));
    await runtime.close();
  });

  it("gives a paid school the larger cap of its plan", async () => {
    const { runtime, world, clock } = await setup();
    await runtime.db
      .update(schema.schools)
      .set({ lastPlan: { kind: "paid", plan: "business", status: "active" } })
      .where(eq(schema.schools.id, world.schoolA.id));
    for (let n = 0; n < PLATFORM_MAIL_DAILY_CAPS.notifications.trial + 5; n += 1) {
      expect(
        await queueSchoolEmail(runtime.db, world.schoolA.id, email(n), clock, "notifications"),
      ).toBe("queued");
    }
    await runtime.close();
  });
});

describe("platformMailTier", () => {
  it("caps anything not known to be paid at the smallest tier", () => {
    expect(platformMailTier(null)).toBe("trial");
    expect(platformMailTier({ kind: "unknown" })).toBe("trial");
    expect(platformMailTier({ kind: "none", reason: "expired" })).toBe("trial");
    expect(platformMailTier({ kind: "paid", plan: "pro" })).toBe("pro");
    expect(platformMailTier({ kind: "oss" })).toBeNull();
  });

  it("is uncapped on a self-hosted deployment", () => {
    process.env.BILLING_MODE = "oss";
    expect(platformMailTier(null)).toBeNull();
  });
});

describe("platformTeamApiKey", () => {
  it("uses the stream's own team, else the single platform team", () => {
    const env = {
      SENDLIT_PLATFORM_TEAM_API_KEY: "shared",
      SENDLIT_PLATFORM_SIGN_IN_TEAM_API_KEY: "sign-in",
    };
    expect(platformTeamApiKey(env, "sign_in")).toBe("sign-in");
    expect(platformTeamApiKey(env, "notifications")).toBe("shared");
    expect(platformTeamApiKey({}, "staff")).toBeUndefined();
  });
});

describe("schoolSiteUrl", () => {
  it("links a trial's mail to its platform subdomain, and a paid school's to its custom domain (S31)", async () => {
    const { runtime, world, clock } = await setup();
    await runtime.db.insert(schema.schoolHosts).values({
      id: uuidv7(clock),
      schoolId: world.schoolA.id,
      hostname: "learn.example.org",
      kind: "custom",
      verificationStatus: "verified",
      isPrimary: true,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    } as typeof schema.schoolHosts.$inferInsert);
    expect(await schoolSiteUrl(runtime.db, world.schoolA.id)).not.toContain("learn.example.org");
    await runtime.db
      .update(schema.schools)
      .set({ lastPlan: { kind: "paid", plan: "pro", status: "active" } })
      .where(eq(schema.schools.id, world.schoolA.id));
    expect(await schoolSiteUrl(runtime.db, world.schoolA.id)).toContain("learn.example.org");
    await runtime.close();
  });
});

describe("assertTriggeredMailAllowed", () => {
  const send = (
    runtime: Awaited<ReturnType<typeof setup>>["runtime"],
    clock: ReturnType<typeof freezeRuntimeClock>,
    schoolId: string,
    to: string,
    clientIp: string | null,
  ) =>
    assertTriggeredMailAllowed(
      runtime.db,
      { schoolId, kind: "lead_magnet", email: to, clientIp },
      clock,
    );

  it("limits one address per school", async () => {
    const { runtime, world, clock } = await setup();
    const { limit } = TRIGGERED_MAIL_LIMITS.lead_magnet.addressPerSchool;
    for (let n = 0; n < limit; n += 1) {
      expect((await send(runtime, clock, world.schoolA.id, "target@example.com", `10.0.0.${n}`)).ok).toBe(true);
    }
    expect((await send(runtime, clock, world.schoolA.id, "Target@Example.com", "10.0.1.1")).ok).toBe(false);
    await runtime.close();
  });

  it("limits one address across every school, so it can't be flooded from many (S28)", async () => {
    const { runtime, world, clock } = await setup();
    const limits = TRIGGERED_MAIL_LIMITS.lead_magnet;
    // Enough schools that no one school reaches its own per-address limit.
    const schoolIds = [world.schoolA.id, world.schoolB.id];
    for (let n = 0; schoolIds.length * limits.addressPerSchool.limit <= limits.addressPlatform.limit; n += 1) {
      const created = await createSchool(
        runtime.db,
        {
          name: `Extra School ${n}`,
          subdomain: `extra-school-${n}`,
          locale: "en",
          currency: "USD",
          principalId: world.owner.id,
          requestId: `extra-${n}`,
        },
        clock,
      );
      if (!created.ok) throw new Error("school_creation_failed");
      const [row] = await runtime.db
        .select({ id: schema.schools.id })
        .from(schema.schools)
        .where(eq(schema.schools.publicId, created.value.id));
      schoolIds.push(row!.id);
    }
    for (let n = 0; n < limits.addressPlatform.limit; n += 1) {
      const result = await send(runtime, clock, schoolIds[n % schoolIds.length]!, "victim@example.com", `10.1.0.${n}`);
      expect(result.ok).toBe(true);
    }
    const next = schoolIds[limits.addressPlatform.limit % schoolIds.length]!;
    expect((await send(runtime, clock, next, "victim@example.com", "10.2.0.1")).ok).toBe(false);
    // Another address from the same school is still fine.
    expect((await send(runtime, clock, next, "someone-else@example.com", "10.2.0.2")).ok).toBe(true);
    await runtime.close();
  });

  it("limits one IP across addresses", async () => {
    const { runtime, world, clock } = await setup();
    const { limit } = TRIGGERED_MAIL_LIMITS.lead_magnet.ip;
    for (let n = 0; n < limit; n += 1) {
      await send(runtime, clock, n % 2 ? world.schoolA.id : world.schoolB.id, `a${n}@example.com`, "203.0.113.9");
    }
    expect((await send(runtime, clock, world.schoolA.id, "fresh@example.com", "203.0.113.9")).ok).toBe(false);
    expect((await send(runtime, clock, world.schoolA.id, "fresh@example.com", "203.0.113.10")).ok).toBe(true);
    await runtime.close();
  });
});
