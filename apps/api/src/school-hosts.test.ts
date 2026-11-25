import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createLegacySchoolChecker } from "./legacy-schools.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import {
  createSchool,
  listSchoolsForUser,
  resolveSchoolByHost,
  storefrontOriginForHost,
} from "./schools.js";
import { seedWorld } from "./seed.js";
import { isPlatformHostname } from "./school-host.js";
import {
  createSchoolCustomHost,
  customDomainConfig,
  type DnsResolver,
} from "./school-hosts.js";
import type { AppDb } from "./types.js";

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

describe("storefront origin", () => {
  it("uses http for localhost, https elsewhere, and the configured local port", () => {
    const originalPort = process.env.STOREFRONT_PORT;
    try {
      delete process.env.STOREFRONT_PORT;
      expect(storefrontOriginForHost("hathi.localhost")).toBe("http://hathi.localhost");
      expect(storefrontOriginForHost("learn.example.net")).toBe("https://learn.example.net");
      expect(storefrontOriginForHost(null)).toBeNull();
      process.env.STOREFRONT_PORT = "3002";
      expect(storefrontOriginForHost("hathi.localhost")).toBe("http://hathi.localhost:3002");
    } finally {
      if (originalPort === undefined) delete process.env.STOREFRONT_PORT;
      else process.env.STOREFRONT_PORT = originalPort;
    }
  });
});

describe.serial("school custom host lifecycle", () => {
  it("returns runtime storefront hosts and prefers a verified custom host", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalPlatformDomain = process.env.PLATFORM_SITE_DOMAIN;
    const originalPort = process.env.STOREFRONT_PORT;
    process.env.NODE_ENV = "test";
    delete process.env.STOREFRONT_PORT;
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
      expect(
        updatedSchools.find((school) => school.id === world.schoolA.publicId)?.storefrontOrigin,
      ).toBe("https://learn.school-a.example.net");
    } finally {
      await runtime.close();
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
      if (originalPlatformDomain === undefined) delete process.env.PLATFORM_SITE_DOMAIN;
      else process.env.PLATFORM_SITE_DOMAIN = originalPlatformDomain;
      if (originalPort !== undefined) process.env.STOREFRONT_PORT = originalPort;
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

/** A unique violation as node-postgres reports it, wrapped like a Drizzle query error. */
function uniqueViolation(constraint: string) {
  return Object.assign(new Error("Failed query"), {
    cause: Object.assign(new Error("duplicate key value"), {
      code: "23505",
      constraint,
    }),
  });
}

/** The runtime database, except that transactions fail with `error`. */
function failingTransactions(db: AppDb, error: Error): AppDb {
  return new Proxy(db, {
    get(target, property, receiver) {
      if (property === "transaction") return () => Promise.reject(error);
      return Reflect.get(target, property, receiver);
    },
  });
}

describe.serial("reserved and contended hostnames", () => {
  it("rejects the platform domain and names under it as custom domains", async () => {
    const originalPlatformDomain = process.env.PLATFORM_SITE_DOMAIN;
    process.env.PLATFORM_SITE_DOMAIN = "schools.example.test";
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    try {
      const world = await seedWorld(runtime, clock);
      const attach = (hostname: string) =>
        dispatch(runtime, {
          method: "POST",
          path: "/v1/school/hosts",
          headers: {
            cookie: world.owner.sessionCookie,
            "x-school-id": world.schoolA.publicId,
          },
          body: { hostname },
        });
      for (const hostname of [
        "schools.example.test",
        "www.schools.example.test",
        "Dash.Schools.Example.Test",
        "school-b.schools.example.test",
        "deep.nested.schools.example.test",
        "acme.localhost",
      ]) {
        const response = await attach(hostname);
        expect(response.status).toBe(409);
        expect(response.body).toMatchObject({
          code: "conflict",
          details: { reason: "hostname_reserved" },
        });
      }
      expect((await attach("notschools.example.test")).status).toBe(201);
    } finally {
      await runtime.close();
      if (originalPlatformDomain === undefined) delete process.env.PLATFORM_SITE_DOMAIN;
      else process.env.PLATFORM_SITE_DOMAIN = originalPlatformDomain;
    }
  });

  it("refuses custom domains a classic school uses, failing closed", async () => {
    const asked: string[] = [];
    const answers: Record<string, number | "error" | "hang"> = {
      "classic.example.com": 200,
      "flaky.example.com": 503,
      "offline.example.com": "error",
      "slow.example.com": "hang",
    };
    const legacySchools = createLegacySchoolChecker({
      url: "https://classic.test/api/school-check",
      platformDomain: "courselit.app",
      timeoutMs: 50,
      fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
        const host = new URL(String(input)).searchParams.get("host") ?? "";
        asked.push(host);
        const answer = answers[host] ?? 404;
        if (answer === "error") throw new TypeError("fetch failed");
        if (answer === "hang") {
          return new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
          });
        }
        return new Response(null, { status: answer });
      }) as typeof fetch,
    });
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, legacySchools });
    try {
      const world = await seedWorld(runtime, clock);
      const attach = (hostname: string) =>
        dispatch(runtime, {
          method: "POST",
          path: "/v1/school/hosts",
          headers: {
            cookie: world.owner.sessionCookie,
            "x-school-id": world.schoolA.publicId,
          },
          body: { hostname },
        });
      const owned = await attach("Classic.Example.com");
      expect(owned.status).toBe(409);
      expect(owned.body).toMatchObject({
        code: "conflict",
        details: { reason: "hostname_taken" },
      });
      for (const hostname of [
        "flaky.example.com",
        "offline.example.com",
        "slow.example.com",
      ]) {
        const response = await attach(hostname);
        expect(response.status).toBe(500);
        expect(response.body).toMatchObject({
          code: "internal_error",
          details: { reason: "legacy_check_unavailable" },
        });
      }
      const hosts = await runtime.db
        .select()
        .from(schema.schoolHosts)
        .where(eq(schema.schoolHosts.schoolId, world.schoolA.id));
      expect(hosts.filter((host) => host.kind === "custom")).toHaveLength(0);

      expect((await attach("learn.example.com")).status).toBe(201);
      // Re-attaching the school's own domain doesn't ask again.
      asked.length = 0;
      expect((await attach("learn.example.com")).status).toBe(201);
      expect(asked).toEqual([]);
    } finally {
      await runtime.close();
    }
  });

  it("matches only the platform domain and its subdomains", () => {
    expect(isPlatformHostname("courselit.app", "courselit.app")).toBe(true);
    expect(isPlatformHostname("www.courselit.app", "courselit.app")).toBe(true);
    expect(isPlatformHostname("api.courselit.app.", "https://courselit.app/")).toBe(
      true,
    );
    expect(isPlatformHostname("mycourselit.app", "courselit.app")).toBe(false);
    expect(isPlatformHostname("courselit.app.example.com", "courselit.app")).toBe(
      false,
    );
    expect(isPlatformHostname("learn.example.com", "courselit.app")).toBe(false);
  });

  it("reports a unique violation on insert as a taken address", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    try {
      const world = await seedWorld(runtime, clock);
      const host = await createSchoolCustomHost(
        failingTransactions(
          runtime.db,
          uniqueViolation("school_hosts_hostname_unique"),
        ),
        {
          schoolId: world.schoolA.id,
          actorId: world.owner.id,
          hostname: "race.example.com",
          requestId: "req-race-host",
        },
        clock,
      );
      expect(host.ok).toBe(false);
      if (!host.ok) {
        expect(host.error.code).toBe("conflict");
        expect(host.error.safeDetails).toEqual({ reason: "hostname_taken" });
      }

      const school = await createSchool(
        failingTransactions(runtime.db, uniqueViolation("schools_subdomain_unique")),
        {
          name: "Race School",
          subdomain: "race-school",
          locale: "en",
          currency: "USD",
          principalId: world.owner.id,
          requestId: "req-race-school",
        },
        clock,
      );
      expect(school.ok).toBe(false);
      if (!school.ok) {
        expect(school.error.code).toBe("conflict");
        expect(school.error.safeDetails).toEqual({ reason: "subdomain_taken" });
      }

      // Other failures, including unrelated unique constraints, still throw.
      await expect(
        createSchool(
          failingTransactions(runtime.db, uniqueViolation("schools_public_id_unique")),
          {
            name: "Race School",
            subdomain: "race-school",
            locale: "en",
            currency: "USD",
            principalId: world.owner.id,
            requestId: "req-race-school-2",
          },
          clock,
        ),
      ).rejects.toThrow("Failed query");
    } finally {
      await runtime.close();
    }
  });
});
