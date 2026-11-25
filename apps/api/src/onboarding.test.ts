import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import {
  createLegacySchoolChecker,
  type LegacySchoolChecker,
} from "./legacy-schools.js";
import { checkSchoolSubdomain } from "./onboarding.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { createSchool } from "./schools.js";
import { type SeededWorld, seedWorld } from "./seed.js";

async function setup(billingMode?: "oss", legacySchools?: LegacySchoolChecker) {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({
    clock,
    legacySchools,
    ...(billingMode ? { billingMode } : {}),
  });
  const world = await seedWorld(runtime, clock);
  return { runtime, world };
}

function owner(world: SeededWorld, schoolId = world.schoolA.publicId) {
  return { cookie: world.owner.sessionCookie, "x-school-id": schoolId };
}

type Onboarding = {
  status: string;
  step: string;
  draft: Record<string, unknown>;
  checklistHidden: boolean;
  resumePromptHidden: boolean;
  checklist: Array<{ key: string; done: boolean }>;
  billing: { required: boolean; entitled: boolean; paid: boolean; trialEndsAt: string | null };
};

const done = (state: Onboarding, key: string) =>
  state.checklist.find((item) => item.key === key)?.done;

describe("school onboarding", () => {
  it("creates an onboarding row with the school and saves wizard progress", async () => {
    const { runtime, world } = await setup();
    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/schools",
      headers: { cookie: world.owner.sessionCookie },
      body: { name: "Fresh School", subdomain: "fresh-school" },
    });
    expect(created.status).toBe(201);
    const schoolId = (created.body as { id: string }).id;
    const rows = await runtime.db.select().from(schema.schoolOnboarding);
    expect(rows.some((row) => row.status === "in_progress" && row.step === "school")).toBe(
      true,
    );

    const initial = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/onboarding",
      headers: owner(world, schoolId),
    });
    expect(initial.status).toBe(200);
    const state = initial.body as Onboarding;
    expect(state).toMatchObject({
      status: "in_progress",
      step: "school",
      draft: {},
      checklistHidden: false,
      resumePromptHidden: false,
      // The account's first school starts a cardless trial: it can go live,
      // but nothing has been paid.
      billing: { required: true, entitled: true, paid: false, trialEndsAt: expect.any(String) },
    });
    expect(state.checklist.map((item) => item.key)).toEqual([
      "pay", "mail", "legal", "home", "domain", "ai", "learners", "welcome", "course", "team",
    ]);
    expect(done(state, "course")).toBe(false);
    expect(done(state, "learners")).toBe(false);
    expect(done(state, "team")).toBe(false);
    // The legal pages start with starter text but stay to do until published.
    expect(done(state, "legal")).toBe(false);
    const [school] = await runtime.db
      .select({ id: schema.schools.id })
      .from(schema.schools)
      .where(eq(schema.schools.publicId, schoolId));
    const legalPages = await runtime.db
      .select({ publicId: schema.websitePages.publicId, slug: schema.websitePages.slug })
      .from(schema.websitePages)
      .where(eq(schema.websitePages.schoolId, school!.id));
    for (const slug of ["terms", "privacy"]) {
      const page = legalPages.find((row) => row.slug === slug)!;
      const published = await dispatch(runtime, {
        method: "POST",
        path: `/v1/school/website/pages/${page.publicId}/publish`,
        headers: owner(world, schoolId),
      });
      expect(published.status).toBe(200);
    }
    const afterLegal = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/onboarding",
      headers: owner(world, schoolId),
    });
    expect(done(afterLegal.body as Onboarding, "legal")).toBe(true);

    await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/school/onboarding",
      headers: owner(world, schoolId),
      body: { step: "offer", draft: { kind: "course", title: "Intro" } },
    });
    const patched = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/school/onboarding",
      headers: owner(world, schoolId),
      body: { draft: { price: 10 }, markDone: ["home"], checklistHidden: true },
    });
    expect(patched.status).toBe(200);
    const next = patched.body as Onboarding;
    expect(next.step).toBe("offer");
    expect(next.draft).toEqual({ kind: "course", title: "Intro", price: 10 });
    expect(next.checklistHidden).toBe(true);
    expect(done(next, "home")).toBe(true);
    // Saving other progress leaves the resume prompt as it was.
    expect(next.resumePromptHidden).toBe(false);

    // "Never show again" sticks for the school and setup stays under way.
    const hidden = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/school/onboarding",
      headers: owner(world, schoolId),
      body: { resumePromptHidden: true },
    });
    expect(hidden.body).toMatchObject({ status: "in_progress", resumePromptHidden: true });
    const reread = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/onboarding",
      headers: owner(world, schoolId),
    });
    expect(reread.body).toMatchObject({ resumePromptHidden: true, step: "offer" });

    const invalid = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/school/onboarding",
      headers: owner(world, schoolId),
      body: { step: "nonsense" },
    });
    expect(invalid.status).toBe(400);
    await runtime.close();
  });

  it("computes checklist items from real data", async () => {
    const { runtime, world } = await setup();
    const read = async () =>
      (
        await dispatch(runtime, {
          method: "GET",
          path: "/v1/school/onboarding",
          headers: owner(world),
        })
      ).body as Onboarding;
    const before = await read();
    expect(done(before, "domain")).toBe(false);

    const [school] = await runtime.db
      .select()
      .from(schema.schools)
      .where(eq(schema.schools.publicId, world.schoolA.publicId));
    await runtime.db.insert(schema.schoolHosts).values({
      id: crypto.randomUUID(),
      schoolId: school!.id,
      hostname: "learn.example.org",
      kind: "custom",
      verificationStatus: "verified",
      verifiedAt: new Date(),
      isPrimary: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const after = await read();
    expect(done(after, "domain")).toBe(true);
    await runtime.close();
  });

  it("is owner and session only, and unavailable billing is entitled in OSS", async () => {
    const { runtime, world } = await setup("oss");
    const viaToken = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/onboarding",
      headers: {
        authorization: `Bearer ${world.owner.oauthToken}`,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(viaToken.status).toBe(403);
    const state = (
      await dispatch(runtime, {
        method: "GET",
        path: "/v1/school/onboarding",
        headers: owner(world),
      })
    ).body as Onboarding;
    expect(state.billing).toEqual({ required: false, entitled: true, paid: true, trialEndsAt: null });
    const checkout = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/billing/checkout",
      headers: owner(world),
      body: { plan: "pro", interval: "month", catalogRevision: 1 },
    });
    expect(checkout.status).toBe(400);
    await runtime.close();
  });
});

describe("school billing checkout", () => {
  it("starts checkout for an existing school, returning to the setup page", async () => {
    const { runtime, world } = await setup();
    const catalog = (
      await dispatch(runtime, {
        method: "GET",
        path: "/v1/billing/catalog",
        headers: { cookie: world.owner.sessionCookie },
      })
    ).body as { catalogRevision: number };
    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/schools",
      headers: { cookie: world.owner.sessionCookie },
      body: { name: "Paid School", subdomain: "paid-school" },
    });
    const schoolId = (created.body as { id: string }).id;
    const response = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/billing/checkout",
      headers: owner(world, schoolId),
      body: { plan: "pro", interval: "month", catalogRevision: catalog.catalogRevision },
    });
    expect(response.status).toBe(200);
    expect((response.body as { checkoutUrl: string }).checkoutUrl).toMatch(/^https?:\/\//);

    const stale = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/billing/checkout",
      headers: owner(world, schoolId),
      body: { plan: "pro", interval: "year", catalogRevision: 9999 },
    });
    expect(stale.status).toBe(409);
    await runtime.close();
  });
});

describe("school subdomain availability", () => {
  it("reports invalid, taken (with free suggestions) and available addresses", async () => {
    const { runtime, world } = await setup();
    const check = async (subdomain: string) =>
      (
        await dispatch(runtime, {
          method: "GET",
          path: `/v1/schools/subdomain-availability?subdomain=${encodeURIComponent(subdomain)}`,
          headers: { cookie: world.owner.sessionCookie },
        })
      ).body as {
        subdomain: string;
        available: boolean;
        reason: string | null;
        suggestions: string[];
      };
    expect(await check("ab")).toMatchObject({ available: false, reason: "invalid" });
    expect(await check("Bad_Name")).toMatchObject({ available: false, reason: "invalid" });
    expect(await check("fresh-address")).toEqual({
      subdomain: "fresh-address",
      available: true,
      reason: null,
      suggestions: [],
    });

    const [school] = await runtime.db.select().from(schema.schools).limit(1);
    const taken = await check(school!.subdomain);
    expect(taken.available).toBe(false);
    expect(taken.reason).toBe("taken");
    expect(taken.suggestions).toHaveLength(3);
    expect(taken.suggestions[0]).toBe(`${school!.subdomain}-studio`);
    const anonymous = await dispatch(runtime, {
      method: "GET",
      path: "/v1/schools/subdomain-availability?subdomain=abc",
      headers: {},
    });
    expect(anonymous.status).toBe(401);
    await runtime.close();
  });
});

type LegacyAnswer = number | "error" | "hang";

/**
 * A classic-app checker over a fake `fetch`: each hostname answers with a
 * status, a network error, or never (until the timeout aborts it). Unlisted
 * hostnames answer 404. `calls` records the hostnames asked about.
 */
function legacyChecker(answers: Record<string, LegacyAnswer>) {
  const calls: string[] = [];
  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    expect(url.origin + url.pathname).toBe("https://classic.test/api/school-check");
    const host = url.searchParams.get("host") ?? "";
    calls.push(host);
    const answer = answers[host] ?? 404;
    if (answer === "error") throw new TypeError("fetch failed");
    if (answer === "hang") {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    }
    return new Response(null, { status: answer });
  }) as typeof globalThis.fetch;
  const checker = createLegacySchoolChecker({
    url: "https://classic.test/api/school-check",
    platformDomain: "courselit.app",
    fetch,
    timeoutMs: 50,
  });
  return { checker, calls };
}

describe("reserved school addresses", () => {
  async function reservedSetup(legacySchools?: LegacySchoolChecker) {
    // OSS mode: these tests create several schools and aren't about the cloud
    // per-day creation limit.
    const { runtime, world } = await setup("oss", legacySchools);
    const check = async (subdomain: string) =>
      (
        await dispatch(runtime, {
          method: "GET",
          path: `/v1/schools/subdomain-availability?subdomain=${encodeURIComponent(subdomain)}`,
          headers: { cookie: world.owner.sessionCookie },
        })
      ).body as {
        subdomain: string;
        available: boolean;
        reason: string | null;
        suggestions: string[];
      };
    const create = (subdomain: string) =>
      dispatch(runtime, {
        method: "POST",
        path: "/v1/schools",
        headers: { cookie: world.owner.sessionCookie },
        body: { name: "Reserved School", subdomain },
      });
    const schoolsWith = (subdomain: string) =>
      runtime.db
        .select()
        .from(schema.schools)
        .where(eq(schema.schools.subdomain, subdomain));
    return { runtime, check, create, schoolsWith };
  }

  it("rejects product hostnames in the check and on create", async () => {
    const { runtime, check, create, schoolsWith } = await reservedSetup();
    const result = await check("dash");
    expect(result).toMatchObject({ available: false, reason: "reserved" });
    expect(result.suggestions).toEqual(["dash-studio", "dash-art", "dash-school"]);
    // Fixed product names are refused by the contract schema (400) before the
    // handler; names a classic school owns get a 409 from the handler.
    const created = await create("dash");
    expect(created.status).toBe(400);
    expect(JSON.stringify(created.body)).toContain("validation_failed");
    expect(await schoolsWith("dash")).toHaveLength(0);
    await runtime.close();
  });

  it("rejects addresses a classic school owns in the check and on create", async () => {
    const { checker, calls } = legacyChecker({
      "old-school.courselit.app": 200,
      "old-school-art.courselit.app": 200,
    });
    const { runtime, check, create, schoolsWith } = await reservedSetup(checker);
    const result = await check("old-school");
    expect(result).toMatchObject({ available: false, reason: "reserved" });
    expect(result.suggestions).toEqual([
      "old-school-studio",
      "old-school-school",
      "old-school2",
    ]);
    // The address itself, then six candidates at most.
    expect(calls).toHaveLength(7);
    const created = await create("old-school");
    expect(created.status).toBe(409);
    expect(created.body).toMatchObject({
      code: "conflict",
      details: { reason: "subdomain_reserved" },
    });
    expect(await schoolsWith("old-school")).toHaveLength(0);
    await runtime.close();
  });

  it("allows addresses the classic app reports free", async () => {
    const { checker, calls } = legacyChecker({});
    const { runtime, check, create } = await reservedSetup(checker);
    expect(await check("new-school")).toEqual({
      subdomain: "new-school",
      available: true,
      reason: null,
      suggestions: [],
    });
    expect((await create("new-school")).status).toBe(201);
    expect(calls).toEqual(["new-school.courselit.app", "new-school.courselit.app"]);
    // A name taken here is answered without asking the classic app.
    calls.length = 0;
    const taken = await check("new-school");
    expect(taken.reason).toBe("taken");
    expect(calls).not.toContain("new-school.courselit.app");
    await runtime.close();
  });

  for (const [label, answer] of [
    ["an error status", 500],
    ["a bad request", 400],
    ["a network error", "error"],
    ["a timeout", "hang"],
  ] as const) {
    it(`fails closed when the classic app answers with ${label}`, async () => {
      const { checker } = legacyChecker({ "maybe-school.courselit.app": answer });
      const { runtime, check, create, schoolsWith } = await reservedSetup(checker);
      expect(await check("maybe-school")).toEqual({
        subdomain: "maybe-school",
        available: false,
        reason: "unavailable",
        suggestions: [],
      });
      const created = await create("maybe-school");
      expect(created.status).toBe(500);
      expect(created.body).toMatchObject({
        code: "internal_error",
        details: { reason: "legacy_check_unavailable" },
      });
      expect(await schoolsWith("maybe-school")).toHaveLength(0);
      await runtime.close();
    });
  }

  it("leaves owned and unchecked names out of suggestions", async () => {
    const { checker } = legacyChecker({
      "taken-art.courselit.app": 200,
      "taken-school.courselit.app": 503,
      "taken2.courselit.app": "error",
    });
    const { runtime, check, create } = await reservedSetup(checker);
    expect((await create("taken")).status).toBe(201);
    const taken = await check("taken");
    expect(taken.reason).toBe("taken");
    expect(taken.suggestions).toEqual(["taken-studio", "taken3", "taken4"]);
    await runtime.close();
  });

  it("skips the classic check when it isn't configured", async () => {
    const { runtime, check, create } = await reservedSetup();
    expect(await check("old-school")).toMatchObject({ available: true, reason: null });
    expect((await create("old-school")).status).toBe(201);
    await runtime.close();
  });
});

describe("AI connections", () => {
  it("lists and disconnects the signed-in user's OAuth connections", async () => {
    const { runtime, world } = await setup();
    const clientId = "https://assistant.example.com/client.json";
    await runtime.db.insert(schema.oauthClient).values({
      id: "client-row-1",
      clientId,
      redirectUris: ["https://assistant.example.com/callback"],
      name: null,
    });
    const at = new Date("2026-02-01T00:00:00.000Z");
    const [seeded] = await runtime.db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, world.owner.email));
    const userId = seeded!.id;
    await runtime.db.insert(schema.oauthConsent).values({
      id: "consent-1",
      clientId,
      userId,
      scopes: ["openid"],
      createdAt: at,
      updatedAt: at,
    });
    await runtime.db.insert(schema.oauthAccessToken).values({
      id: "at-1",
      token: "tok-1",
      clientId,
      userId,
      scopes: ["openid"],
      createdAt: new Date("2026-02-10T00:00:00.000Z"),
    });

    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/ai-connections",
      headers: { cookie: world.owner.sessionCookie },
    });
    expect(listed.status).toBe(200);
    const body = listed.body as {
      mcpUrl: string;
      items: Array<{ id: string; name: string; connectedAt: string; lastUsedAt: string | null }>;
    };
    expect(body.mcpUrl).toBe(runtime.auth.mcpResource);
    const item = body.items.find((entry) => entry.id === clientId);
    expect(item).toEqual({
      id: clientId,
      name: "assistant.example.com",
      connectedAt: at.toISOString(),
      lastUsedAt: "2026-02-10T00:00:00.000Z",
    });

    const state = (
      await dispatch(runtime, {
        method: "GET",
        path: "/v1/school/onboarding",
        headers: owner(world),
      })
    ).body as Onboarding;
    expect(done(state, "ai")).toBe(true);

    const removed = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/ai-connections/${encodeURIComponent(clientId)}`,
      headers: { cookie: world.owner.sessionCookie },
    });
    expect(removed.status).toBe(204);
    expect(await runtime.db.select().from(schema.oauthAccessToken).where(eq(schema.oauthAccessToken.clientId, clientId))).toHaveLength(0);
    const again = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/ai-connections/${encodeURIComponent(clientId)}`,
      headers: { cookie: world.owner.sessionCookie },
    });
    expect(again.status).toBe(404);
    await runtime.close();
  });
});

describe("reserved subdomains (S19)", () => {
  it("read as reserved, with suggestions, and can't be created even internally", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    try {
      const world = await seedWorld(runtime, clock);
      const checked = await checkSchoolSubdomain(runtime.db, "billing");
      expect(checked).toMatchObject({ available: false, reason: "reserved" });
      expect(checked.suggestions.length).toBeGreaterThan(0);
      const created = await createSchool(
        runtime.db,
        {
          name: "Billing",
          subdomain: "billing",
          locale: "en",
          currency: "USD",
          principalId: world.owner.id,
          requestId: "req_reserved",
        },
        clock,
      );
      expect(created.ok).toBe(false);
    } finally {
      await runtime.close();
    }
  });
});
