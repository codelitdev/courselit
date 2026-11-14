import { describe, expect, it } from "bun:test";
import { uuidv7 } from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { schoolUsage, usageShare, warnUsage } from "./usage.js";

const MB = 1024 * 1024;

async function setup(at = "2026-03-01T00:00:00.000Z") {
  const clock = freezeRuntimeClock(new Date(at));
  const runtime = await createPgliteRuntime({ clock, billingMode: "cloud" });
  const world = await seedWorld(runtime, clock);
  return { clock, runtime, world };
}

type Setup = Awaited<ReturnType<typeof setup>>;

const deps = (t: Setup, accepted = 0) => ({
  db: t.runtime.db,
  billing: t.runtime.billing.billing,
  mode: "cloud" as const,
  clock: t.clock,
  teamUsage: async () => ({
    limit: 10_000,
    accepted,
    reserved: 0,
    resetsAt: "2026-04-01T00:00:00.000Z",
  }),
});

async function startTrial(t: Setup, schoolId: string) {
  await t.runtime.db.insert(schema.schoolTrials).values({
    id: uuidv7(t.clock),
    userId: "trial-user",
    normalizedEmail: "trial@example.com",
    schoolId,
    startedAt: t.clock.now(),
    endsAt: new Date(t.clock.now().getTime() + 14 * 86_400_000),
  });
}

async function store(t: Setup, schoolId: string, bytes: number, id = "filler") {
  await t.runtime.db.insert(schema.media).values({
    id: uuidv7(t.clock),
    publicId: `med_${id}`,
    schoolId,
    mediaLitId: `asset_${id}`,
    canonicalUrl: "https://media.test/x",
    fileName: "x.mp4",
    mimeType: "video/mp4",
    byteSize: bytes,
    kind: "video",
    createdAt: t.clock.now(),
    updatedAt: t.clock.now(),
  });
}

async function readySendLit(t: Setup, schoolId: string) {
  const now = t.clock.now();
  await t.runtime.db
    .insert(schema.schoolIntegrations)
    .values({
      id: uuidv7(t.clock),
      schoolId,
      provider: "sendlit",
      server: "https://sendlit.test",
      externalId: `school_${schoolId}`,
      status: "ready",
      remoteTeamId: "team_1",
      createdAt: now,
      updatedAt: now,
    } as typeof schema.schoolIntegrations.$inferInsert)
    .onConflictDoUpdate({
      target: [schema.schoolIntegrations.schoolId, schema.schoolIntegrations.provider],
      set: { status: "ready", remoteTeamId: "team_1" },
    });
}

const warnings = async (t: Setup) =>
  (await t.runtime.db.select().from(schema.integrationOutboxJobs))
    .map((job) => (job.payload as { subject?: string }).subject ?? "")
    .filter((subject) => subject.includes("% of"));

describe("usage", () => {
  it("reports storage and email against the plan", async () => {
    const t = await setup();
    try {
      await startTrial(t, t.world.schoolB.id);
      await store(t, t.world.schoolB.id, 100 * MB);
      const items = await schoolUsage(deps(t), t.world.schoolB.id);
      const storage = items.find((item) => item.key === "storage_bytes")!;
      expect(storage).toMatchObject({ used: 100 * MB, allowed: 500 * MB });
      expect(usageShare(storage)).toBeCloseTo(0.2);
      // No mailing team yet: the count is unknown, the trial's quota is 0.
      expect(items.find((item) => item.key === "marketing_emails_month")).toMatchObject({
        used: null,
        allowed: 0,
      });
      await readySendLit(t, t.world.schoolB.id);
      const withTeam = await schoolUsage(deps(t, 42), t.world.schoolB.id);
      expect(withTeam.find((item) => item.key === "marketing_emails_month")!.used).toBe(42);
    } finally {
      await t.runtime.close();
    }
  });

  it("is the owner's, in a browser session only (S9)", async () => {
    const t = await setup();
    try {
      const owner = await dispatch(t.runtime, {
        method: "GET",
        path: "/v1/school/billing/usage",
        headers: { cookie: t.world.owner.sessionCookie, "x-school-id": t.world.schoolA.publicId },
      });
      expect(owner.status).toBe(200);
      const key = await dispatch(t.runtime, {
        method: "GET",
        path: "/v1/school/billing/usage",
        headers: { "x-api-key": t.world.apiKeyA.raw },
      });
      expect(key.status).toBe(403);
      const member = await dispatch(t.runtime, {
        method: "GET",
        path: "/v1/school/billing/usage",
        headers: { cookie: t.world.member.sessionCookie, "x-school-id": t.world.schoolA.publicId },
      });
      expect(member.status).toBe(403);
    } finally {
      await t.runtime.close();
    }
  });
});

describe("usage warnings", () => {
  it("warns about storage once per crossing of 80%, again after dropping below 70%", async () => {
    const t = await setup();
    try {
      await startTrial(t, t.world.schoolB.id);
      const school = { id: t.world.schoolB.id, name: "School B" };
      await store(t, t.world.schoolB.id, 410 * MB, "big");
      expect(await warnUsage(deps(t), school)).toEqual(["storage"]);
      expect(await warnUsage(deps(t), school)).toEqual([]);
      expect(await warnings(t)).toHaveLength(1);

      await t.runtime.db.delete(schema.media).where(eq(schema.media.publicId, "med_big"));
      await store(t, t.world.schoolB.id, 300 * MB, "smaller");
      expect(await warnUsage(deps(t), school)).toEqual([]);
      await store(t, t.world.schoolB.id, 120 * MB, "again");
      expect(await warnUsage(deps(t), school)).toEqual(["storage"]);
    } finally {
      await t.runtime.close();
    }
  });

  it("warns about marketing email once a month on a paid plan, never during a trial", async () => {
    const t = await setup("2026-03-15T00:00:00.000Z");
    try {
      // School A is on Pro: 10,000 emails a month.
      await readySendLit(t, t.world.schoolA.id);
      const school = { id: t.world.schoolA.id, name: "School A" };
      expect(await warnUsage(deps(t, 7_000), school)).toEqual([]);
      expect(await warnUsage(deps(t, 8_500), school)).toEqual(["email:2026-03"]);
      expect(await warnUsage(deps(t, 9_500), school)).toEqual([]);

      await startTrial(t, t.world.schoolB.id);
      await readySendLit(t, t.world.schoolB.id);
      expect(await warnUsage(deps(t, 0), { id: t.world.schoolB.id, name: "School B" })).toEqual(
        [],
      );
    } finally {
      await t.runtime.close();
    }
  });
});
