import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { loadSchoolByPublicId } from "./schools.js";
import { seedWorld } from "./seed.js";
import { encryptIntegrationSecret } from "./utils/integration-secrets.js";

type RemoteDomainSettings = {
  subdomain: { name: string; hostname: string } | null;
  customDomain: {
    hostname: string;
    status: "pending" | "verified" | "failed";
    verifiedAt: string | null;
  } | null;
  canonicalHost: string | null;
  verificationRecords: {
    cnameTarget: string;
    txtName: string;
    txtValue: string;
    kind: "cname" | "alias";
    txtSatisfied: boolean | null;
    routingSatisfied: boolean | null;
  } | null;
  subdomainPublic: boolean;
  platformDomain: string;
};

function mockFrontLitDomainApi() {
  let settings: RemoteDomainSettings = {
    subdomain: { name: "school-a", hostname: "school-a.frontlit.test" },
    customDomain: null,
    canonicalHost: "school-a.frontlit.test",
    verificationRecords: null,
    subdomainPublic: true,
    platformDomain: "frontlit.test",
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.endsWith("/domain") && method === "GET") {
      return Response.json(settings);
    }
    if (url.endsWith("/domain/custom") && method === "POST") {
      const body = JSON.parse(String(init?.body)) as { hostname: string };
      settings = {
        ...settings,
        customDomain: {
          hostname: body.hostname,
          status: "pending",
          verifiedAt: null,
        },
        canonicalHost: settings.subdomain?.hostname ?? null,
        verificationRecords: {
          cnameTarget: "domains.courselit.test",
          txtName: `_courselit-verification.${body.hostname}`,
          txtValue: "frontlit-dns-token",
          kind: body.hostname.split(".").length === 2 ? "alias" : "cname",
          txtSatisfied: null,
          routingSatisfied: null,
        },
      };
      return Response.json(settings);
    }
    if (url.endsWith("/domain/custom/verify") && method === "POST") {
      if (settings.customDomain) {
        settings = {
          ...settings,
          customDomain: {
            ...settings.customDomain,
            status: "verified",
            verifiedAt: "2026-03-01T00:00:00.000Z",
          },
          canonicalHost: settings.customDomain.hostname,
          verificationRecords: settings.verificationRecords
            ? { ...settings.verificationRecords, txtSatisfied: true, routingSatisfied: true }
            : null,
        };
      }
      return Response.json(settings);
    }
    if (url.endsWith("/domain/custom") && method === "DELETE") {
      settings = {
        ...settings,
        customDomain: null,
        canonicalHost: settings.subdomain?.hostname ?? null,
        verificationRecords: null,
      };
      return Response.json(settings);
    }
    return Response.json({ error: "unexpected_request" }, { status: 404 });
  }) as typeof fetch;
  return {
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

async function readyFrontLitIntegration(
  runtime: Awaited<ReturnType<typeof createPgliteRuntime>>,
  schoolId: string,
) {
  process.env.AUTH_SECRET ??= "school-hosts-test-auth-secret";
  const now = new Date();
  await runtime.db.insert(schema.schoolIntegrations).values({
    id: crypto.randomUUID(),
    schoolId,
    provider: "frontlit",
    server: "http://frontlit.test",
    externalId: `test:${schoolId}`,
    remoteTeamId: "team_frontlit_1",
    encryptedTeamKey: encryptIntegrationSecret("frontlit-team-key"),
    status: "ready",
    lastAttemptAt: now,
    lastSuccessfulSyncAt: now,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  });
}

describe.serial("school custom host lifecycle", () => {
  it("adds, verifies, resolves, removes, and reuses a custom host", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    await readyFrontLitIntegration(runtime, world.schoolA.id);
    const frontLit = mockFrontLitDomainApi();

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
    expect(createdBody.verification.value).toBe("frontlit-dns-token");

    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/hosts",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(listed.status).toBe(200);
    expect(JSON.stringify(listed.body)).toContain("frontlit-dns-token");

    expect(await loadSchoolByPublicId(runtime.db, "learn.example.com")).toBeNull();
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
    expect((await loadSchoolByPublicId(runtime.db, "learn.example.com"))?.id).toBe(
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
    expect(await loadSchoolByPublicId(runtime.db, "learn.example.com")).toBeNull();

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
    frontLit.restore();
    await runtime.close();
  });

  it("enforces admin scope, tenant uniqueness, and primary-host protection", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    await readyFrontLitIntegration(runtime, world.schoolA.id);
    await readyFrontLitIntegration(runtime, world.schoolB.id);
    const frontLit = mockFrontLitDomainApi();

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
    expect(await loadSchoolByPublicId(runtime.db, "not-a-real-school")).toBeNull();
    frontLit.restore();
    await runtime.close();
  });
});
