import { afterEach, describe, expect, it } from "bun:test";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

const CLASSIC = new Set([
  "oldschool.courselit.app",
  "oldschool-studio.courselit.app",
  "elsewhere.classic.test",
]);

/** A stand-in classic app on a random local port; `status` forces every answer. */
function startClassicApp(status?: number) {
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      const host = new URL(request.url).searchParams.get("host") ?? "";
      return new Response(null, { status: status ?? (CLASSIC.has(host) ? 200 : 404) });
    },
  });
  process.env.LEGACY_SCHOOL_CHECK_URL = `http://127.0.0.1:${server.port}/school/exists`;
  return server;
}

async function setup() {
  process.env.PLATFORM_SITE_DOMAIN = "courselit.app";
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
  const world = await seedWorld(runtime, clock);
  const headers = { cookie: world.owner.sessionCookie };
  const check = async (subdomain: string) =>
    (
      await dispatch(runtime, {
        method: "GET",
        path: `/v1/schools/subdomain-availability?subdomain=${subdomain}`,
        headers,
      })
    ).body as { available: boolean; reason: string | null; suggestions: string[] };
  const create = (subdomain: string) =>
    dispatch(runtime, {
      method: "POST",
      path: "/v1/schools",
      headers,
      body: { name: "School", subdomain },
    });
  return { runtime, check, create };
}

describe("classic app school subdomains", () => {
  const originalUrl = process.env.LEGACY_SCHOOL_CHECK_URL;
  const originalDomain = process.env.PLATFORM_SITE_DOMAIN;
  const originalLegacyDomain = process.env.LEGACY_SCHOOL_DOMAIN;
  afterEach(() => {
    if (originalLegacyDomain === undefined) delete process.env.LEGACY_SCHOOL_DOMAIN;
    else process.env.LEGACY_SCHOOL_DOMAIN = originalLegacyDomain;
    if (originalUrl === undefined) delete process.env.LEGACY_SCHOOL_CHECK_URL;
    else process.env.LEGACY_SCHOOL_CHECK_URL = originalUrl;
    if (originalDomain === undefined) delete process.env.PLATFORM_SITE_DOMAIN;
    else process.env.PLATFORM_SITE_DOMAIN = originalDomain;
  });

  it("read as taken, skip classic names in suggestions and can't be created", async () => {
    const classic = startClassicApp();
    const { runtime, check, create } = await setup();
    try {
      const checked = await check("oldschool");
      expect(checked).toMatchObject({ available: false, reason: "taken" });
      expect(checked.suggestions).toEqual([
        "oldschool-art",
        "oldschool-school",
        "oldschool2",
      ]);
      const created = await create("oldschool");
      expect(created.status).toBe(409);
      expect(JSON.stringify(created.body)).toContain("subdomain_taken");
      expect(await check("newschool")).toMatchObject({ available: true, reason: null });
      expect((await create("newschool")).status).toBe(201);
    } finally {
      classic.stop(true);
      await runtime.close();
    }
  });

  it("refuses to create when the classic app can't answer", async () => {
    const classic = startClassicApp(503);
    const { runtime, create } = await setup();
    try {
      expect((await create("newschool")).status).toBe(500);
    } finally {
      classic.stop(true);
      await runtime.close();
    }
  });

  it("asks about LEGACY_SCHOOL_DOMAIN when the classic app is on another domain", async () => {
    const classic = startClassicApp();
    const { runtime, check } = await setup();
    try {
      expect(await check("elsewhere")).toMatchObject({ available: true });
      process.env.LEGACY_SCHOOL_DOMAIN = "classic.test";
      expect(await check("elsewhere")).toMatchObject({
        available: false,
        reason: "taken",
      });
    } finally {
      classic.stop(true);
      await runtime.close();
    }
  });

  it("isn't consulted when LEGACY_SCHOOL_CHECK_URL is unset", async () => {
    const classic = startClassicApp();
    const { runtime, create } = await setup();
    delete process.env.LEGACY_SCHOOL_CHECK_URL;
    try {
      expect((await create("oldschool")).status).toBe(201);
    } finally {
      classic.stop(true);
      await runtime.close();
    }
  });
});
