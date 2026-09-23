import { describe, expect, it } from "bun:test";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe.serial("product customers", () => {
  it("lists school-scoped customers with an empty progress view", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-05T15:30:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const response = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/customers`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [], total: 0, page: 1, limit: 25 });

    const wrongSchool = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/customers`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolB.publicId,
      },
    });
    expect(wrongSchool.status).toBe(404);

    const missingProgress = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/customers/cnt_missing/progress`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(missingProgress.status).toBe(404);

    await runtime.close();
  });
});
