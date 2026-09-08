import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { loadSchoolByPublicId } from "./schools.js";
import { seedWorld } from "./seed.js";

describe.serial("school custom host lifecycle", () => {
  it("adds, verifies, resolves, removes, and reuses a custom host", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    let verificationToken = "";
    const runtime = await createPgliteRuntime({
      clock,
      customDomainVerifier: async (_hostname, token) => token === verificationToken,
    });
    const world = await seedWorld(runtime, clock);

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
    verificationToken = createdBody.verification.value;

    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/hosts",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(listed.status).toBe(200);
    expect(JSON.stringify(listed.body)).not.toContain(verificationToken);

    expect(await loadSchoolByPublicId(runtime.db, "learn.example.com")).toBeNull();
    const wrongToken = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/hosts/learn.example.com/verify",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { token: "wrong-token" },
    });
    expect(wrongToken.status).toBe(400);
    expect(wrongToken.body).toMatchObject({
      code: "validation_failed",
      details: { reason: "invalid_verification_token" },
    });

    const verified = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/hosts/learn.example.com/verify",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { token: verificationToken },
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
    await runtime.close();
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
    expect(await loadSchoolByPublicId(runtime.db, "not-a-real-school")).toBeNull();
    await runtime.close();
  });
});
