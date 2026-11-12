import { describe, expect, it } from "bun:test";
import { uuidv7 } from "@codelitdev/platform";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { listSendLitSequenceSubscribers } from "./sendlit-client.js";
import { listSequenceSubscribers } from "./sendlit-service.js";
import { encryptIntegrationSecret } from "./utils/integration-secrets.js";

type Call = { url: string; method: string };

async function setup(handler: (url: URL) => Response) {
  process.env.AUTH_SECRET = "test-secret-that-is-at-least-thirty-two-characters";
  process.env.INTEGRATIONS_ENCRYPTION_KEY =
    "test-secret-that-is-at-least-thirty-two-characters";
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
  const world = await seedWorld(runtime, clock);
  await runtime.db.insert(schema.schoolIntegrations).values({
    id: uuidv7(clock),
    schoolId: world.schoolA.id,
    provider: "sendlit",
    server: "http://127.0.0.1:4101",
    externalId: world.schoolA.publicId,
    remoteTeamId: "team_school_a",
    encryptedTeamKey: encryptIntegrationSecret("sl_mock_team_key"),
    status: "ready",
    createdAt: clock.now(),
    updatedAt: clock.now(),
  });
  const calls: Call[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url: String(input), method: init?.method ?? "GET" });
    return handler(url);
  }) as typeof fetch;
  return {
    runtime,
    world,
    clock,
    calls,
    restore: async () => {
      globalThis.fetch = originalFetch;
      await runtime.close();
    },
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function sendLitFake(url: URL): Response {
  if (url.pathname === "/sequences/seq_1/subscribers") {
    const page = Number(url.searchParams.get("page") ?? "1");
    return json(page === 2 ? ["c_3"] : ["c_1", "c_2"]);
  }
  if (url.pathname === "/sequences/seq_1/stats") {
    return json({ sent: 9, openRate: 0, clickThroughRate: 0, subscribersCount: 3 });
  }
  if (url.pathname === "/contacts/c_1") {
    return json({ contactId: "c_1", email: "a@test.com", name: "Ada", subscribed: true });
  }
  if (url.pathname === "/contacts/c_2") {
    return json({ contactId: "c_2", email: "b@test.com", name: null, subscribed: false });
  }
  if (url.pathname === "/contacts/c_3") {
    return json({ error: "Contact not found" }, 404);
  }
  if (url.pathname === "/sequences/missing/subscribers") {
    return json({ error: "Sequence not found" }, 404);
  }
  return json({});
}

describe("listSendLitSequenceSubscribers", () => {
  const config = { server: "http://sendlit.test", provisioningApiKey: null };

  it("passes paging and returns the ids", async () => {
    let seen = "";
    const ids = await listSendLitSequenceSubscribers(
      "key",
      "seq 1",
      { page: 2, limit: 5 },
      {
        config,
        fetcher: async (input) => {
          seen = String(input);
          return json(["c_1", "c_2"]);
        },
      },
    );
    expect(ids).toEqual(["c_1", "c_2"]);
    expect(seen).toBe("http://sendlit.test/sequences/seq%201/subscribers?page=2&limit=5");
  });

  it("omits the query string without paging", async () => {
    let seen = "";
    await listSendLitSequenceSubscribers("key", "s", {}, {
      config,
      fetcher: async (input) => {
        seen = String(input);
        return json([]);
      },
    });
    expect(seen).toBe("http://sendlit.test/sequences/s/subscribers");
  });

  it("accepts an items envelope and drops non-string entries", async () => {
    const ids = await listSendLitSequenceSubscribers("key", "s", {}, {
      config,
      fetcher: async () => json({ items: ["c_1", 7, "", "c_2"] }),
    });
    expect(ids).toEqual(["c_1", "c_2"]);
  });

  it("returns nothing for an unexpected body", async () => {
    const ids = await listSendLitSequenceSubscribers("key", "s", {}, {
      config,
      fetcher: async () => json({ nope: true }),
    });
    expect(ids).toEqual([]);
  });
});

describe("listSequenceSubscribers", () => {
  it("resolves ids to contacts, keeps unreadable ones, and reports the total", async () => {
    const ctx = await setup(sendLitFake);
    try {
      const result = await listSequenceSubscribers(
        ctx.runtime.db,
        ctx.world.schoolA.id,
        ctx.clock,
        "seq_1",
        { page: 2, limit: 2 },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.total).toBe(3);
      expect(result.value.page).toBe(2);
      expect(result.value.limit).toBe(2);
      expect(result.value.items).toEqual([
        { contactId: "c_3", email: null, name: null, subscribed: null },
      ]);
      expect(ctx.calls.some((c) => c.url.includes("subscribers?page=2&limit=2"))).toBe(true);
    } finally {
      await ctx.restore();
    }
  });

  it("returns the contact's name, email and subscription state in order", async () => {
    const ctx = await setup(sendLitFake);
    try {
      const result = await listSequenceSubscribers(
        ctx.runtime.db,
        ctx.world.schoolA.id,
        ctx.clock,
        "seq_1",
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.page).toBe(1);
      expect(result.value.limit).toBe(25);
      expect(result.value.items).toEqual([
        { contactId: "c_1", email: "a@test.com", name: "Ada", subscribed: true },
        { contactId: "c_2", email: "b@test.com", name: null, subscribed: false },
      ]);
    } finally {
      await ctx.restore();
    }
  });

  it("clamps out-of-range paging", async () => {
    const ctx = await setup(sendLitFake);
    try {
      const result = await listSequenceSubscribers(
        ctx.runtime.db,
        ctx.world.schoolA.id,
        ctx.clock,
        "seq_1",
        { page: -4, limit: 5000 },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.page).toBe(1);
      expect(result.value.limit).toBe(100);
    } finally {
      await ctx.restore();
    }
  });

  it("fails the page instead of showing a contact as deleted when the lookup errors", async () => {
    const ctx = await setup((url) =>
      url.pathname === "/contacts/c_1"
        ? json({ error: "Internal error" }, 500)
        : sendLitFake(url),
    );
    try {
      const result = await listSequenceSubscribers(
        ctx.runtime.db,
        ctx.world.schoolA.id,
        ctx.clock,
        "seq_1",
      );
      expect(result.ok).toBe(false);
    } finally {
      await ctx.restore();
    }
  });

  it("fails with not_found when the sequence does not exist", async () => {
    const ctx = await setup(sendLitFake);
    try {
      const result = await listSequenceSubscribers(
        ctx.runtime.db,
        ctx.world.schoolA.id,
        ctx.clock,
        "missing",
      );
      expect(result.ok).toBe(false);
    } finally {
      await ctx.restore();
    }
  });
});

describe("GET /v1/school/mails/sequences/:id/subscribers", () => {
  it("serves a page to a signed-in admin", async () => {
    const ctx = await setup(sendLitFake);
    try {
      const response = await dispatch(ctx.runtime, {
        method: "GET",
        path: "/v1/school/mails/sequences/seq_1/subscribers?page=1&limit=2",
        headers: {
          cookie: ctx.world.owner.sessionCookie,
          "x-school-id": ctx.world.schoolA.publicId,
        },
      });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        total: 3,
        page: 1,
        limit: 2,
        items: [{ contactId: "c_1", email: "a@test.com" }, { contactId: "c_2" }],
      });
    } finally {
      await ctx.restore();
    }
  });

  it("rejects an invalid page size", async () => {
    const ctx = await setup(sendLitFake);
    try {
      const response = await dispatch(ctx.runtime, {
        method: "GET",
        path: "/v1/school/mails/sequences/seq_1/subscribers?limit=0",
        headers: {
          cookie: ctx.world.owner.sessionCookie,
          "x-school-id": ctx.world.schoolA.publicId,
        },
      });
      expect(response.status).toBe(400);
    } finally {
      await ctx.restore();
    }
  });

  it("requires a session", async () => {
    const ctx = await setup(sendLitFake);
    try {
      const response = await dispatch(ctx.runtime, {
        method: "GET",
        path: "/v1/school/mails/sequences/seq_1/subscribers",
        headers: { "x-school-id": ctx.world.schoolA.publicId },
      });
      expect(response.status).toBe(401);
    } finally {
      await ctx.restore();
    }
  });
});
