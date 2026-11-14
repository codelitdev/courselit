import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { SchoolStatus } from "./db/schema/schools.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { type SeededWorld, seedWorld } from "./seed.js";

async function setup(status: SchoolStatus) {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock });
  const world = await seedWorld(runtime, clock);
  await runtime.db
    .update(schema.schools)
    .set({ status })
    .where(eq(schema.schools.id, world.schoolA.id));
  return { runtime, world };
}

const owner = (world: SeededWorld) => ({
  cookie: world.owner.sessionCookie,
  "x-school-id": world.schoolA.publicId,
});

const reason = (body: unknown) =>
  (body as { details?: { reason?: string } }).details?.reason;

describe("school state at the dispatch edge", () => {
  it("leaves an active school alone", async () => {
    const { runtime, world } = await setup("active");
    const settings = await dispatch(runtime, {
      method: "GET",
      path: `/v1/public/${world.schoolA.publicId}/site/settings`,
      headers: {},
    });
    expect(settings.status).toBe(200);
    await runtime.close();
  });

  it("read_only: staff can read and the owner can reach billing, but nothing changes", async () => {
    const { runtime, world } = await setup("read_only");
    const plan = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/billing",
      headers: owner(world),
    });
    expect(plan.status).toBe(200);
    const create = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: owner(world),
      body: { title: "New course", type: "course" },
    });
    expect(create.status).toBe(403);
    expect(reason(create.body)).toBe("school_read_only");
    await runtime.close();
  });

  it("read_only: the public site stays up, but nobody can buy or sign up", async () => {
    const { runtime, world } = await setup("read_only");
    const settings = await dispatch(runtime, {
      method: "GET",
      path: `/v1/public/${world.schoolA.publicId}/site/settings`,
      headers: {},
    });
    expect(settings.status).toBe(200);
    for (const path of ["checkout-sessions", "lead-magnets"]) {
      const refused = await dispatch(runtime, {
        method: "POST",
        path: `/v1/public/${world.schoolA.publicId}/${path}`,
        headers: {},
        body: {},
      });
      expect(refused.status).toBe(403);
      expect(reason(refused.body)).toBe("school_read_only");
    }
    await runtime.close();
  });

  it("read_only: learners can still ask for a sign-in code", async () => {
    const { runtime, world } = await setup("read_only");
    const code = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/email-code",
      headers: { "x-school-id": world.schoolA.publicId },
      body: { email: "learner@example.com" },
    });
    expect(code.status).not.toBe(403);
    await runtime.close();
  });

  it.each(["pending_checkout", "imported", "suspended"] as const)(
    "%s: the site is offline and learners can't sign in",
    async (status) => {
      const { runtime, world } = await setup(status);
      const settings = await dispatch(runtime, {
        method: "GET",
        path: `/v1/public/${world.schoolA.publicId}/site/settings`,
        headers: {},
      });
      expect(settings.status).toBe(403);
      // The storefront asks for the host first and shows its offline page.
      const host = await dispatch(runtime, {
        method: "GET",
        path: "/v1/public/resolve-host?host=school-a.localhost",
        headers: {},
      });
      expect(host.status).toBe(200);
      expect((host.body as { offline: boolean }).offline).toBe(true);
      const code = await dispatch(runtime, {
        method: "POST",
        path: "/v1/learner/auth/email-code",
        headers: { "x-school-id": world.schoolA.publicId },
        body: { email: "learner@example.com" },
      });
      expect(code.status).toBe(403);
      // The owner can still see the plan.
      const plan = await dispatch(runtime, {
        method: "GET",
        path: "/v1/school/billing",
        headers: owner(world),
      });
      expect(plan.status).toBe(200);
      await runtime.close();
    },
  );

  it("an API key is staff, not the owner, so it can't use billing on a suspended school", async () => {
    const { runtime, world } = await setup("suspended");
    const products = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products",
      headers: { "x-api-key": world.apiKeyA.raw },
    });
    expect(products.status).toBe(403);
    await runtime.close();
  });

  it("leaves another school's routes alone", async () => {
    const { runtime, world } = await setup("suspended");
    const settings = await dispatch(runtime, {
      method: "GET",
      path: `/v1/public/${world.schoolB.publicId}/site/settings`,
      headers: {},
    });
    expect(settings.status).toBe(200);
    await runtime.close();
  });
});
