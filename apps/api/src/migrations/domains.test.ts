import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import { loadSchoolByPublicId } from "../schools.js";
import { createPgliteRuntime, freezeRuntimeClock } from "../runtime.js";
import { seedWorld } from "../seed.js";
import { importLegacyDomains } from "./domains.js";

describe.serial("legacy domain migration", () => {
  it("dry-runs valid domains without creating schools and records the run", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const result = await importLegacyDomains(runtime.db, {
      clock,
      records: [
        {
          _id: { $oid: "domain-dry-run-1" },
          name: "imported-school",
          email: world.owner.email,
          customDomain: "learn.imported.example",
          createdAt: { $date: "2025-01-01T00:00:00.000Z" },
          updatedAt: "2025-02-01T00:00:00.000Z",
        },
      ],
    });

    expect(result.mode).toBe("dry_run");
    expect(result.counts).toMatchObject({
      seen: 1,
      ready: 1,
      imported: 0,
      rejected: 0,
    });
    expect(result.rejections).toEqual([]);
    expect(
      await runtime.db
        .select()
        .from(schema.schools)
        .where(eq(schema.schools.subdomain, "imported-school")),
    ).toEqual([]);
    const runs = await runtime.db
      .select()
      .from(schema.migrationRuns)
      .where(eq(schema.migrationRuns.id, result.runId));
    expect(runs[0]).toMatchObject({
      mode: "dry_run",
      status: "succeeded",
      counts: expect.objectContaining({ ready: 1, imported: 0 }),
    });
    expect(
      await runtime.db
        .select()
        .from(schema.migrationRejections)
        .where(eq(schema.migrationRejections.runId, result.runId)),
    ).toHaveLength(0);
    await runtime.close();
  });

  it("applies an owner-matched domain, preserves custom host state, and is idempotent", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const record = {
      _id: "domain-apply-1",
      name: "imported-school",
      email: world.owner.email.toUpperCase(),
      customDomain: "https://learn.imported.example/",
      customDomainVerified: true,
      customDomainVerifiedAt: "2025-02-15T00:00:00.000Z",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-02-01T00:00:00.000Z",
      locale: "en-IN",
      currency: "inr",
    };
    const pendingRecord = {
      _id: "domain-apply-pending",
      name: "pending-school",
      email: world.owner.email,
      customDomain: "pending.imported.example",
      customDomainVerified: false,
    };

    const first = await importLegacyDomains(runtime.db, {
      clock,
      mode: "apply",
      records: [record, pendingRecord],
    });
    expect(first.counts).toMatchObject({ seen: 2, ready: 2, imported: 2, rejected: 0 });
    expect(first.verificationChallenges).toHaveLength(1);

    const schools = await runtime.db
      .select()
      .from(schema.schools)
      .where(eq(schema.schools.subdomain, "imported-school"));
    expect(schools).toHaveLength(1);
    const school = schools[0]!;
    expect(school).toMatchObject({
      name: "imported-school",
      locale: "en-IN",
      currency: "INR",
    });
    expect(await loadSchoolByPublicId(runtime.db, "learn.imported.example")).toMatchObject({
      id: school.id,
    });
    expect(await loadSchoolByPublicId(runtime.db, "pending.imported.example")).toBeNull();
    const pendingHosts = await runtime.db
      .select()
      .from(schema.schoolHosts)
      .where(eq(schema.schoolHosts.hostname, "pending.imported.example"));
    expect(pendingHosts[0]).toMatchObject({
      verificationStatus: "unverified",
      verificationTokenDigest: expect.any(String),
    });

    const hosts = await runtime.db
      .select()
      .from(schema.schoolHosts)
      .where(eq(schema.schoolHosts.schoolId, school.id));
    expect(hosts).toHaveLength(2);
    expect(hosts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          hostname: "imported-school",
          kind: "subdomain",
          verificationStatus: "verified",
          isPrimary: true,
        }),
        expect.objectContaining({
          hostname: "learn.imported.example",
          kind: "custom",
          verificationStatus: "verified",
          isPrimary: false,
        }),
      ]),
    );
    expect(
      await runtime.db
        .select()
        .from(schema.migrationMappings)
        .where(
          and(
            eq(schema.migrationMappings.sourceId, "domain-apply-1"),
            eq(schema.migrationMappings.targetTable, "schools"),
          ),
        ),
    ).toHaveLength(1);

    const second = await importLegacyDomains(runtime.db, {
      clock,
      mode: "apply",
      records: [record],
    });
    expect(second.counts).toMatchObject({
      seen: 1,
      ready: 0,
      imported: 0,
      alreadyMapped: 1,
      rejected: 0,
    });
    expect(
      await runtime.db
        .select()
        .from(schema.schools)
        .where(eq(schema.schools.subdomain, "imported-school")),
    ).toHaveLength(1);
    await runtime.close();
  });

  it("reports deleted domains, missing owners, and duplicate hosts without applying them", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const result = await importLegacyDomains(runtime.db, {
      clock,
      records: [
        {
          _id: "domain-deleted",
          name: "deleted-school",
          email: world.owner.email,
          deleted: true,
        },
        {
          _id: "domain-no-owner",
          name: "no-owner-school",
          email: "missing@example.com",
        },
        {
          _id: "domain-host-a",
          name: "same-host",
          email: world.owner.email,
        },
        {
          _id: "domain-host-b",
          name: "SAME-HOST",
          email: world.owner.email,
        },
      ],
    });

    expect(result.counts).toMatchObject({
      seen: 4,
      ready: 1,
      imported: 0,
      skippedDeleted: 1,
      rejected: 2,
    });
    expect(result.rejectionByCode).toMatchObject({
      skipped_deleted: 1,
      owner_not_found: 1,
      duplicate_host: 1,
    });
    const storedRejections = await runtime.db
      .select()
      .from(schema.migrationRejections)
      .where(eq(schema.migrationRejections.runId, result.runId));
    expect(storedRejections).toHaveLength(3);
    expect(storedRejections.map((item) => item.code)).toEqual(
      expect.arrayContaining(["skipped_deleted", "owner_not_found", "duplicate_host"]),
    );
    await runtime.close();
  });
});
