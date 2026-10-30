import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { listSchoolsForUser, resolveSchoolByHost } from "./schools.js";
import { seedWorld } from "./seed.js";
import { customDomainConfig, type DnsResolver } from "./school-hosts.js";

type DnsRecords = {
  txt: Record<string, string[][]>;
  cname: Record<string, string[]>;
  a: Record<string, string[]>;
};

function stubDns(runtime: Awaited<ReturnType<typeof createPgliteRuntime>>) {
  const records: DnsRecords = { txt: {}, cname: {}, a: {} };
  const missing = () => Promise.reject(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }));
  const resolver: DnsResolver = {
    resolveTxt: (hostname) => (records.txt[hostname] ? Promise.resolve(records.txt[hostname]) : missing()),
    resolveCname: (hostname) =>
      records.cname[hostname] ? Promise.resolve(records.cname[hostname]) : missing(),
    resolve4: (hostname) => (records.a[hostname] ? Promise.resolve(records.a[hostname]) : missing()),
  };
  runtime.dnsResolver = resolver;
  return records;
}

describe.serial("school custom host lifecycle", () => {
  it("returns runtime storefront hosts and prefers a verified custom host", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalPlatformDomain = process.env.PLATFORM_SITE_DOMAIN;
    process.env.NODE_ENV = "test";
    process.env.PLATFORM_SITE_DOMAIN = "schools.example.test";

    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    try {
      const world = await seedWorld(runtime, clock);
      const initialSchools = await listSchoolsForUser(runtime.db, world.owner.id);
      expect(
        initialSchools.find((school) => school.id === world.schoolA.publicId)?.storefrontHost,
      ).toBe("school-a.schools.example.test");

      const [schoolRow] = await runtime.db
        .select({ id: schema.schools.id })
        .from(schema.schools)
        .where(eq(schema.schools.id, world.schoolA.id))
        .limit(1);
      const now = clock.now();
      await runtime.db.insert(schema.schoolHosts).values({
        id: crypto.randomUUID(),
        schoolId: schoolRow!.id,
        hostname: "learn.school-a.example.net",
        kind: "custom",
        verificationStatus: "verified",
        verificationToken: null,
        verifiedAt: now,
        isPrimary: false,
        createdAt: now,
        updatedAt: now,
      });

      const updatedSchools = await listSchoolsForUser(runtime.db, world.owner.id);
      expect(
        updatedSchools.find((school) => school.id === world.schoolA.publicId)?.storefrontHost,
      ).toBe("learn.school-a.example.net");
    } finally {
      await runtime.close();
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
      if (originalPlatformDomain === undefined) delete process.env.PLATFORM_SITE_DOMAIN;
      else process.env.PLATFORM_SITE_DOMAIN = originalPlatformDomain;
    }
  });

  it("adds, verifies, resolves, removes, and reuses a custom host", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const dns = stubDns(runtime);

    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/hosts",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { hostname: "HTTPS://learn.example.com." },
    });
    expect(created.status).toBe(201);
    const createdBody = created.body as {
      host: { hostname: string; verificationStatus: string };
      verification: { name: string; value: string };
    };
    expect(createdBody.host).toMatchObject({
      hostname: "learn.example.com",
      verificationStatus: "unverified",
    });
    expect(createdBody.verification.name).toBe(
      "_courselit-verification.learn.example.com",
    );
    expect(createdBody.verification.value).toMatch(/^[0-9a-f]{32}$/);
    const token = createdBody.verification.value;

    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/hosts",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(listed.status).toBe(200);
    expect(listed.body).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          hostname: "learn.example.com",
          verificationRecords: {
            cnameTarget: customDomainConfig().cnameTarget,
            txtName: "_courselit-verification.learn.example.com",
            txtValue: token,
            kind: "cname",
            txtSatisfied: null,
            routingSatisfied: null,
          },
        }),
      ]),
    });

    expect(await resolveSchoolByHost(runtime.db, "learn.example.com")).toBeNull();
    // Without DNS records the check fails and records which side is missing.
    const unconfigured = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/hosts/learn.example.com/verify",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: {},
    });
    expect(unconfigured.body).toMatchObject({
      verificationStatus: "unverified",
      verificationRecords: { txtSatisfied: false, routingSatisfied: false },
    });
    expect(await resolveSchoolByHost(runtime.db, "learn.example.com")).toBeNull();

    dns.txt["_courselit-verification.learn.example.com"] = [[token]];
    const txtOnly = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/hosts/learn.example.com/verify",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: {},
    });
    expect(txtOnly.body).toMatchObject({
      verificationStatus: "unverified",
      verificationRecords: { txtSatisfied: true, routingSatisfied: false },
    });

    // A CNAME chain that reaches the target satisfies routing.
    dns.cname["learn.example.com"] = ["edge.example.net."];
    dns.cname["edge.example.net"] = [`${customDomainConfig().cnameTarget.toUpperCase()}.`];
    const checkedDns = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/hosts/learn.example.com/verify",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: {},
    });
    expect(checkedDns.status).toBe(200);
    expect(checkedDns.body).toMatchObject({
      hostname: "learn.example.com",
      verificationStatus: "verified",
    });

    const verified = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/hosts/learn.example.com/verify",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: {},
    });
    expect(verified.status).toBe(200);
    expect(verified.body).toMatchObject({
      hostname: "learn.example.com",
      verificationStatus: "verified",
    });
    expect((await resolveSchoolByHost(runtime.db, "learn.example.com"))?.id).toBe(
      world.schoolA.id,
    );

    const removed = await dispatch(runtime, {
      method: "DELETE",
      path: "/v1/school/hosts/learn.example.com",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(removed.status).toBe(204);
    expect(await resolveSchoolByHost(runtime.db, "learn.example.com")).toBeNull();

    const reused = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/hosts",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { hostname: "learn.example.com" },
    });
    expect(reused.status).toBe(201);
    const audit = await runtime.db
      .select({ action: schema.auditEvents.action })
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.schoolId, world.schoolA.id));
    expect(audit.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        "school.host_added",
        "school.host_verified",
        "school.host_removed",
      ]),
    );
    await runtime.close();
  });

  it("verifies apex domains through their A records", async () => {
    const originalARecords = process.env.CUSTOM_DOMAIN_A_RECORDS;
    process.env.CUSTOM_DOMAIN_A_RECORDS = "203.0.113.10, 203.0.113.11";
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    try {
      const world = await seedWorld(runtime, clock);
      const dns = stubDns(runtime);
      const headers = {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      };
      const created = await dispatch(runtime, {
        method: "POST",
        path: "/v1/school/hosts",
        headers,
        body: { hostname: "example.org" },
      });
      expect(created.status).toBe(201);
      const token = (created.body as { verification: { value: string } }).verification
        .value;
      dns.txt["_courselit-verification.example.org"] = [[token.slice(0, 10), token.slice(10)]];

      dns.a["example.org"] = ["203.0.113.10"];
      const partial = await dispatch(runtime, {
        method: "POST",
        path: "/v1/school/hosts/example.org/verify",
        headers,
        body: {},
      });
      expect(partial.body).toMatchObject({
        verificationStatus: "unverified",
        verificationRecords: { kind: "alias", txtSatisfied: true, routingSatisfied: false },
      });

      dns.a["example.org"] = ["203.0.113.11", "203.0.113.10"];
      const verified = await dispatch(runtime, {
        method: "POST",
        path: "/v1/school/hosts/example.org/verify",
        headers,
        body: {},
      });
      expect(verified.body).toMatchObject({
        verificationStatus: "verified",
        verificationRecords: { txtSatisfied: true, routingSatisfied: true },
      });

      // Removing the TXT record and re-checking stops serving the domain.
      delete dns.txt["_courselit-verification.example.org"];
      const rechecked = await dispatch(runtime, {
        method: "POST",
        path: "/v1/school/hosts/example.org/verify",
        headers,
        body: {},
      });
      expect(rechecked.body).toMatchObject({ verificationStatus: "unverified" });
      expect(await resolveSchoolByHost(runtime.db, "example.org")).toBeNull();
    } finally {
      await runtime.close();
      if (originalARecords === undefined) delete process.env.CUSTOM_DOMAIN_A_RECORDS;
      else process.env.CUSTOM_DOMAIN_A_RECORDS = originalARecords;
    }
  });

  it("enforces admin scope, tenant uniqueness, and primary-host protection", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const member = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/hosts",
      headers: {
        cookie: world.member.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { hostname: "courses.example.com" },
    });
    expect(member.status).toBe(403);

    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/hosts",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { hostname: "courses.example.com" },
    });
    expect(created.status).toBe(201);
    const duplicate = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/hosts",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolB.publicId,
      },
      body: { hostname: "COURSES.EXAMPLE.COM" },
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject({
      code: "conflict",
      details: { reason: "hostname_taken" },
    });

    const primary = await dispatch(runtime, {
      method: "DELETE",
      path: "/v1/school/hosts/school-a",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(primary.status).toBe(409);
    expect(primary.body).toMatchObject({
      code: "conflict",
      details: { reason: "primary_host_cannot_be_removed" },
    });
    expect(await resolveSchoolByHost(runtime.db, "not-a-real-school")).toBeNull();
    await runtime.close();
  });
});
