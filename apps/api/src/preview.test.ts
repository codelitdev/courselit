import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { textDoc } from "./test-content.js";

describe.serial("product preview grants", () => {
  it("creates a scoped grant and reads draft content without learner state", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const lesson = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/lessons`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { title: "Draft lesson", content: textDoc("private preview content") },
    });
    expect(lesson.status).toBe(201);

    const beforeMemberships = await runtime.db
      .select()
      .from(schema.learnerMemberships)
      .where(eq(schema.learnerMemberships.schoolId, world.schoolA.id));
    const beforeProgress = await runtime.db
      .select()
      .from(schema.lessonProgress)
      .where(eq(schema.lessonProgress.schoolId, world.schoolA.id));
    const grant = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/preview`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { ttlSeconds: 300 },
    });
    expect(grant.status).toBe(201);
    const token = (grant.body as { token: string }).token;
    expect(token.length).toBeGreaterThan(20);

    const preview = await dispatch(runtime, {
      method: "GET",
      path: `/v1/preview/products/${world.noteA.publicId}`,
      headers: { "x-preview-token": token },
    });
    expect(preview.status).toBe(200);
    expect(preview.body).toMatchObject({
      id: world.noteA.publicId,
      status: "draft",
      lessons: [{ title: "Draft lesson", content: textDoc("private preview content") }],
    });

    const afterMemberships = await runtime.db
      .select()
      .from(schema.learnerMemberships)
      .where(eq(schema.learnerMemberships.schoolId, world.schoolA.id));
    const afterProgress = await runtime.db
      .select()
      .from(schema.lessonProgress)
      .where(eq(schema.lessonProgress.schoolId, world.schoolA.id));
    expect(afterMemberships).toHaveLength(beforeMemberships.length);
    expect(afterProgress).toHaveLength(beforeProgress.length);
    await runtime.close();
  });

  it("rejects invalid, expired, and cross-product tokens", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const secondProduct = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolB.publicId,
      },
      body: { title: "School B course" },
    });
    expect(secondProduct.status).toBe(201);
    const secondProductId = (secondProduct.body as { id: string }).id;
    const grant = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/preview`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: {},
    });
    expect(grant.status).toBe(201);
    const token = (grant.body as { token: string }).token;

    const invalid = await dispatch(runtime, {
      method: "GET",
      path: `/v1/preview/products/${world.noteA.publicId}`,
      headers: { "x-preview-token": "not-a-grant" },
    });
    expect(invalid.status).toBe(404);
    const crossProduct = await dispatch(runtime, {
      method: "GET",
      path: `/v1/preview/products/${secondProductId}`,
      headers: { "x-preview-token": token },
    });
    expect(crossProduct.status).toBe(404);

    await runtime.db
      .update(schema.previewGrants)
      .set({ expiresAt: new Date("2026-02-28T00:00:00.000Z") });
    const expired = await dispatch(runtime, {
      method: "GET",
      path: `/v1/preview/products/${world.noteA.publicId}`,
      headers: { "x-preview-token": token },
    });
    expect(expired.status).toBe(404);
    await runtime.close();
  });
});
