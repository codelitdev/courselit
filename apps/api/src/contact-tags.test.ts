import { afterEach, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock, type Runtime } from "./runtime.js";
import { createSchool } from "./schools.js";
import { seedWorld, type SeededWorld } from "./seed.js";
import {
  deleteSendLitTag,
  getSendLitTagReferences,
  listSendLitTags,
  renameSendLitTag,
} from "./sendlit-client.js";
import { encryptIntegrationSecret } from "./utils/integration-secrets.js";

const config = { server: "http://sendlit.test", provisioningApiKey: null };
const references = {
  tag: "vip club",
  contactCount: 3,
  segments: [{ segmentId: "seg_1", name: "VIPs" }],
  sequences: [
    {
      sequenceId: "seq_1",
      title: "Welcome",
      type: "sequence",
      status: "active",
      usages: ["trigger"],
    },
  ],
  signupForms: [{ formId: "form_1", name: "Footer" }],
};

type Call = { url: string; method: string; body?: any; key?: string };
const originalFetch = globalThis.fetch;
const originalServer = process.env.SENDLIT_SERVER;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalServer === undefined) delete process.env.SENDLIT_SERVER;
  else process.env.SENDLIT_SERVER = originalServer;
});

function mockSendLit(
  handler: (call: Call) => Response,
): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(init.body as string) : undefined,
      key: (init?.headers as Record<string, string> | undefined)?.["x-sendlit-apikey"],
    };
    calls.push(call);
    return handler(call);
  }) as typeof fetch;
  return calls;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe("SendLit tag client", () => {
  it("uses the right paths, methods and encoding", async () => {
    const calls = mockSendLit((call) =>
      call.url.endsWith("/tags") ? json({ items: [] }) : json({}),
    );
    await listSendLitTags("k", { config });
    await getSendLitTagReferences("k", "a b/c?", { config });
    await renameSendLitTag("k", "a b/c?", { name: "new" }, { config });
    await deleteSendLitTag("k", "a b/c?", { config });
    expect(calls.map((c) => [c.method, c.url])).toEqual([
      ["GET", "http://sendlit.test/tags"],
      ["GET", "http://sendlit.test/tags/a%20b%2Fc%3F/references"],
      ["PATCH", "http://sendlit.test/tags/a%20b%2Fc%3F"],
      ["DELETE", "http://sendlit.test/tags/a%20b%2Fc%3F"],
    ]);
    expect(calls[2]!.body).toEqual({ name: "new" });
    expect(calls.every((c) => c.key === "k")).toBe(true);
  });
});

describe("contact tag operations", () => {
  async function setup(withSendLit = true) {
    process.env.AUTH_SECRET = "test-secret-that-is-at-least-thirty-two-characters";
    process.env.INTEGRATIONS_ENCRYPTION_KEY =
      "test-secret-that-is-at-least-thirty-two-characters";
    process.env.SENDLIT_SERVER = "http://sendlit.test";
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);
    const created = await createSchool(
      runtime.db,
      {
        name: "Tags School",
        subdomain: "tags-school",
        locale: "en",
        currency: "USD",
        principalId: world.owner.id,
        requestId: "req_tags",
      },
      clock,
    );
    if (!created.ok) throw new Error("School creation failed");
    const [row] = await runtime.db
      .select()
      .from(schema.schools)
      .where(eq(schema.schools.publicId, created.value.id));
    if (withSendLit) {
      await runtime.db
        .update(schema.schoolIntegrations)
        .set({
          status: "ready",
          remoteTeamId: "team_tags",
          encryptedTeamKey: encryptIntegrationSecret("sl_team_key"),
          server: "http://sendlit.test",
        })
        .where(
          and(
            eq(schema.schoolIntegrations.schoolId, row!.id),
            eq(schema.schoolIntegrations.provider, "sendlit"),
          ),
        );
    }
    const headers = {
      cookie: world.owner.sessionCookie,
      "x-school-id": created.value.id,
      "content-type": "application/json",
    };
    return { runtime, world, headers, schoolId: created.value.id };
  }

  async function keyHeaders(
    runtime: Runtime,
    world: SeededWorld,
    schoolId: string,
    permissions: string[],
  ) {
    const res = await dispatch(runtime, {
      method: "POST",
      path: "/v1/api-keys",
      headers: { cookie: world.owner.sessionCookie, "x-school-id": schoolId },
      body: { name: "k", permissions },
    });
    expect(res.status).toBe(201);
    return { "x-api-key": (res.body as { key: string }).key };
  }

  it("lists tags and returns an empty list when SendLit is not configured", async () => {
    const { runtime, headers } = await setup();
    const calls = mockSendLit(() =>
      json({ items: [{ tag: "vip", contactCount: 2 }] }),
    );
    const res = await dispatch(runtime, {
      method: "GET",
      path: "/v1/contact-tags",
      headers,
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [{ tag: "vip", contactCount: 2 }] });
    expect(calls[0]).toMatchObject({
      url: "http://sendlit.test/tags",
      key: "sl_team_key",
    });
    await runtime.close();

    const bare = await setup(false);
    const calls2 = mockSendLit(() => json({ items: [] }));
    const empty = await dispatch(bare.runtime, {
      method: "GET",
      path: "/v1/contact-tags",
      headers: bare.headers,
    });
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({ items: [] });
    expect(calls2).toHaveLength(0);
    const refs = await dispatch(bare.runtime, {
      method: "GET",
      path: "/v1/contact-tags/vip/references",
      headers: bare.headers,
    });
    expect(refs.status).toBe(500);
    await bare.runtime.close();
  }, 60000);

  it("returns references and URL-encodes tags with spaces and special characters", async () => {
    const { runtime, headers } = await setup();
    const calls = mockSendLit(() => json(references));
    const res = await dispatch(runtime, {
      method: "GET",
      path: `/v1/contact-tags/${encodeURIComponent("vip club")}/references`,
      headers,
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(references);
    expect(calls[0]!.url).toBe("http://sendlit.test/tags/vip%20club/references");

    const tag = "a/b & c?#é";
    const renamed = {
      tag: "x",
      previousTag: tag,
      contactsUpdated: 1,
      segmentsUpdated: 0,
      sequencesUpdated: 0,
      signupFormsUpdated: 0,
    };
    const calls2 = mockSendLit(() => json(renamed));
    const patch = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/contact-tags/${encodeURIComponent(tag)}`,
      headers,
      body: { name: "  x  " },
    });
    expect(patch.status).toBe(200);
    expect(patch.body).toEqual(renamed);
    expect(calls2[0]).toMatchObject({
      method: "PATCH",
      url: `http://sendlit.test/tags/${encodeURIComponent(tag)}`,
      body: { name: "x" },
    });
    await runtime.close();
  }, 60000);

  it("maps rename errors: 404 to not_found, tag_unchanged to validation_failed", async () => {
    const { runtime, headers } = await setup();
    mockSendLit(() => json({ error: "tag_not_found" }, 404));
    const missing = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/contact-tags/ghost",
      headers,
      body: { name: "other" },
    });
    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({ code: "not_found" });

    mockSendLit(() => json({ error: "tag_unchanged" }, 400));
    const same = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/contact-tags/vip",
      headers,
      body: { name: "vip" },
    });
    expect(same.status).toBe(400);
    expect(same.body).toMatchObject({
      code: "validation_failed",
      details: { reason: "tag_unchanged" },
    });

    const calls = mockSendLit(() => json({}));
    const blank = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/contact-tags/vip",
      headers,
      body: { name: "   " },
    });
    expect(blank.status).toBe(400);
    expect(calls).toHaveLength(0);
    await runtime.close();
  }, 60000);

  it("deletes a tag, maps 404, and enforces contacts:write", async () => {
    const { runtime, world, headers, schoolId } = await setup();
    const result = { tag: "vip club", contactsUpdated: 3, references };
    const calls = mockSendLit(() => json(result));
    const res = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/contact-tags/${encodeURIComponent("vip club")}`,
      headers,
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(calls[0]).toMatchObject({
      method: "DELETE",
      url: "http://sendlit.test/tags/vip%20club",
    });

    mockSendLit(() => json({ error: "tag_not_found" }, 404));
    const gone = await dispatch(runtime, {
      method: "DELETE",
      path: "/v1/contact-tags/ghost",
      headers,
    });
    expect(gone.status).toBe(404);

    const readOnly = await keyHeaders(runtime, world, schoolId, ["contacts:read"]);
    const denyCalls = mockSendLit(() => json({}));
    for (const [method, body] of [
      ["PATCH", { name: "n" }],
      ["DELETE", undefined],
    ] as const) {
      const denied = await dispatch(runtime, {
        method,
        path: "/v1/contact-tags/vip",
        headers: readOnly,
        body,
      });
      expect(denied.status).toBe(403);
    }
    expect(denyCalls).toHaveLength(0);

    mockSendLit(() => json({ items: [] }));
    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/contact-tags",
      headers: readOnly,
    });
    expect(listed.status).toBe(200);
    await runtime.close();
  }, 60000);
});
