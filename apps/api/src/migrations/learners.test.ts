import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import { createPgliteRuntime, freezeRuntimeClock } from "../runtime.js";
import { seedWorld } from "../seed.js";
import { importLegacyDomains } from "./domains.js";
import { importLegacyLearners } from "./learners.js";

describe.serial("legacy learner migration", () => {
  it("imports learner identities without importing legacy sessions and is idempotent", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    await importLegacyDomains(runtime.db, {
      clock,
      mode: "apply",
      records: [{ _id: "legacy-domain-learners", name: "learners-school", email: world.owner.email }],
    });
    const records = [
      {
        _id: "legacy-learner-1",
        domain: "legacy-domain-learners",
        email: "Learner@Example.com",
        displayName: "Imported Learner",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-02-01T00:00:00.000Z",
      },
    ];

    const dryRun = await importLegacyLearners(runtime.db, {
      clock,
      records,
      mode: "dry_run",
    });
    expect(dryRun.counts).toMatchObject({ seen: 1, ready: 1, imported: 0, rejected: 0 });
    expect(
      await runtime.db
        .select()
        .from(schema.schoolAccounts)
        .where(eq(schema.schoolAccounts.publicId, "legacy-learner-1")),
    ).toHaveLength(0);

    const applied = await importLegacyLearners(runtime.db, {
      clock,
      records,
      mode: "apply",
    });
    expect(applied.counts).toMatchObject({ seen: 1, ready: 1, imported: 1, rejected: 0 });
    const learner = (
      await runtime.db
        .select()
        .from(schema.schoolAccounts)
        .where(eq(schema.schoolAccounts.publicId, "legacy-learner-1"))
    )[0]!;
    expect(learner).toMatchObject({ email: "learner@example.com", displayName: "Imported Learner", status: "active" });
    expect(
      await runtime.db
        .select()
        .from(schema.schoolSessions)
        .where(eq(schema.schoolSessions.schoolAccountId, learner.id)),
    ).toHaveLength(0);

    const second = await importLegacyLearners(runtime.db, {
      clock,
      records,
      mode: "apply",
    });
    expect(second.counts).toMatchObject({ seen: 1, ready: 0, imported: 0, alreadyMapped: 1, rejected: 0 });
    await runtime.close();
  });

  it("quarantines admin identities, invalid owners, and duplicate school emails", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    await importLegacyDomains(runtime.db, {
      clock,
      mode: "apply",
      records: [{ _id: "legacy-domain-learner-rejections", name: "learner-rejections", email: world.owner.email }],
    });
    const result = await importLegacyLearners(runtime.db, {
      clock,
      records: [
        { _id: "legacy-admin", domain: "legacy-domain-learner-rejections", email: "admin@example.com", role: "admin" },
        { _id: "legacy-missing-school", domain: "missing-domain", email: "missing@example.com" },
        { _id: "legacy-valid", domain: "legacy-domain-learner-rejections", email: "duplicate@example.com" },
        { _id: "legacy-duplicate", domain: "legacy-domain-learner-rejections", email: "DUPLICATE@example.com" },
      ],
      mode: "apply",
    });
    expect(result.rejectionByCode).toMatchObject({
      admin_record_requires_admin_import: 1,
      school_mapping_missing: 1,
      learner_conflict: 1,
    });
    expect(result.counts.imported).toBe(1);
    const schools = await runtime.db
      .select({ id: schema.schools.id })
      .from(schema.schools)
      .where(eq(schema.schools.subdomain, "learner-rejections"));
    expect(
      await runtime.db
        .select()
        .from(schema.schoolAccounts)
        .where(and(eq(schema.schoolAccounts.schoolId, schools[0]!.id), eq(schema.schoolAccounts.email, "duplicate@example.com"))),
    ).toHaveLength(1);
    await runtime.close();
  });
});
