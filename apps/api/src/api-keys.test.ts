import { describe, expect, it } from "bun:test";
import type { Clock } from "@codelitdev/platform";
import { createObservability } from "@codelitdev/observability";
import { COURSELIT_PERMISSIONS } from "@courselit/api-contract";
import { and, eq } from "drizzle-orm";
import pino from "pino";
import {
  API_KEY_LAST_USED_THROTTLE_MS,
  apiKeyDigestMatches,
  MAX_ACTIVE_API_KEYS_PER_SCHOOL,
  parseApiKey,
} from "./auth/api-keys.js";
import { API_KEY_FAILURE_LIMIT } from "./auth/api-key-throttle.js";
import {
  authorizeOperationCredential,
  OPERATION_POLICIES,
  resolveOperationId,
} from "./auth/operation-policy.js";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { mcpFor } from "./dispatch.js";
import { guardMcpTool, MCP_TOOL_OPERATIONS } from "./mcp.js";
import { createOpenApiDocument } from "./openapi.js";
import { createPgliteRuntime, type Runtime } from "./runtime.js";
import { type SeededWorld, seedWorld } from "./seed.js";

type CreatedKey = {
  id: string;
  name: string;
  prefix: string;
  permissions: string[];
  key: string;
  expiresAt: string | null;
};

function movableClock(start: string): Clock & { advance(ms: number): void } {
  let at = new Date(start).getTime();
  return {
    now: () => new Date(at),
    advance(ms: number) {
      at += ms;
    },
  };
}

async function setup(start = "2026-03-01T00:00:00.000Z") {
  const clock = movableClock(start);
  const runtime = await createPgliteRuntime({ clock });
  const world = await seedWorld(runtime, clock);
  return { clock, runtime, world };
}

function ownerHeaders(world: SeededWorld) {
  return {
    cookie: world.owner.sessionCookie,
    "x-school-id": world.schoolA.publicId,
  };
}

async function createKey(
  runtime: Runtime,
  world: SeededWorld,
  body: Record<string, unknown>,
  headers: Record<string, string> = ownerHeaders(world),
) {
  return dispatch(runtime, {
    method: "POST",
    path: "/v1/api-keys",
    headers,
    body,
  });
}

async function withKey(
  runtime: Runtime,
  key: string,
  extra: Record<string, string> = {},
) {
  return dispatch(runtime, {
    method: "GET",
    path: "/v1/products",
    headers: { "x-api-key": key, "x-forwarded-for": "203.0.113.1", ...extra },
  });
}

async function memberMembership(runtime: Runtime, world: SeededWorld) {
  const rows = await runtime.db
    .select({
      membershipId: schema.memberships.id,
      schoolAccountId: schema.schoolAccounts.id,
    })
    .from(schema.memberships)
    .innerJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
    )
    .where(
      and(
        eq(schema.memberships.schoolId, world.schoolA.id),
        eq(schema.schoolAccounts.userId, world.member.id),
      ),
    )
    .limit(1);
  return rows[0]!;
}

async function setMemberPermissions(
  runtime: Runtime,
  world: SeededWorld,
  permissions: string[],
) {
  const { membershipId } = await memberMembership(runtime, world);
  await runtime.db
    .update(schema.memberships)
    .set({ permissions })
    .where(eq(schema.memberships.id, membershipId));
}

const memberHeaders = (world: SeededWorld) => ({
  cookie: world.member.sessionCookie,
  "x-school-id": world.schoolA.publicId,
});

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 25));
}

/** The platform code of an MCP tool result reported with `isError`. */
function toolErrorCode(body: unknown): string | undefined {
  const result = (
    body as { result?: { isError?: boolean; structuredContent?: { code?: string } } }
  ).result;
  return result?.isError ? result.structuredContent?.code : undefined;
}

describe.serial("school API keys", () => {
  it("formats keys with a recognisable prefix and parses only that format", () => {
    const publicId = `key_${"a".repeat(32)}`;
    const secret = "A".repeat(43);
    expect(parseApiKey(`cl_live_${publicId}.${secret}`)).toEqual({ publicId, secret });
    for (const malformed of [
      `${publicId}.${secret}`,
      `cl_test_${publicId}.${secret}`,
      `cl_live_${publicId}`,
      `cl_live_${publicId}.${secret.slice(1)}`,
      `cl_live_${publicId}.${secret}x`,
      `cl_live_key_xyz.${secret}`,
      `cl_live_${publicId}.${secret.slice(1)}+`,
      "",
    ]) {
      expect(parseApiKey(malformed)).toBeNull();
    }
  });

  it("shows the raw key only once and stores only its digest", async () => {
    const { runtime, world } = await setup();
    const created = await createKey(runtime, world, {
      name: "Zapier",
      permissions: ["products:read"],
    });
    expect(created.status).toBe(201);
    const key = created.body as CreatedKey;
    expect(key.key).toMatch(/^cl_live_key_[0-9a-f]{32}\.[A-Za-z0-9_-]{43}$/);
    expect(key.prefix).toBe(`cl_live_${key.id}`);
    expect(key.key.startsWith(`${key.prefix}.`)).toBe(true);
    expect(key.name).toBe("Zapier");
    const secret = key.key.split(".")[1]!;

    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/api-keys",
      headers: ownerHeaders(world),
    });
    expect(listed.status).toBe(200);
    const listedText = JSON.stringify(listed.body);
    expect(listedText).not.toContain(secret);
    expect(listedText).not.toContain("digest");
    const item = (listed.body as { items: Array<Record<string, unknown>> }).items.find(
      (entry) => entry.id === key.id,
    );
    expect(item).toMatchObject({
      name: "Zapier",
      prefix: key.prefix,
      permissions: ["products:read"],
      createdBy: { email: world.owner.email },
      lastUsedAt: null,
      expiresAt: null,
      expired: false,
    });
    expect(item).not.toHaveProperty("key");

    const rows = await runtime.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.publicId, key.id));
    const stored = JSON.stringify(rows[0]);
    expect(stored).not.toContain(secret);
    expect(stored).not.toContain(key.key);
    expect(apiKeyDigestMatches(runtime.apiKeyPepper, secret, rows[0]!.digest)).toBe(
      true,
    );
    expect(rows[0]!.digest).toMatch(/^[0-9a-f]{64}$/);

    const audit = await runtime.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.resourceId, key.id));
    expect(audit.map((event) => [event.action, event.actorId])).toEqual([
      ["api_key.created", world.owner.id],
    ]);
    await runtime.close();
  });

  it("validates the create body with the contract", async () => {
    const { runtime, world } = await setup();
    const invalid: Array<Record<string, unknown>> = [
      { permissions: ["products:read"] },
      { name: "", permissions: ["products:read"] },
      { name: "x".repeat(101), permissions: ["products:read"] },
      { name: "No perms", permissions: [] },
      { name: "Bad perm", permissions: ["products:fly"] },
      {
        name: "Past",
        permissions: ["products:read"],
        expiresAt: "2026-02-01T00:00:00.000Z",
      },
      {
        name: "Far",
        permissions: ["products:read"],
        expiresAt: "2029-03-01T00:00:00.000Z",
      },
      { name: "Not a date", permissions: ["products:read"], expiresAt: "tomorrow" },
    ];
    for (const body of invalid) {
      const response = await createKey(runtime, world, body);
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: "validation_failed" });
    }
    await runtime.close();
  });

  it("rejects malformed, unknown, revoked, and expired keys with an identical 401", async () => {
    const { clock, runtime, world } = await setup();
    const created = (
      await createKey(runtime, world, {
        name: "Short lived",
        permissions: ["products:read"],
        expiresAt: "2026-03-02T00:00:00.000Z",
      })
    ).body as CreatedKey;
    const revoked = (
      await createKey(runtime, world, {
        name: "Revoked",
        permissions: ["products:read"],
      })
    ).body as CreatedKey;
    await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/api-keys/${revoked.id}`,
      headers: ownerHeaders(world),
    });
    expect((await withKey(runtime, created.key)).status).toBe(200);

    const [, secret] = created.key.split(".");
    const unknownKey = `cl_live_key_${"0".repeat(32)}.${secret}`;
    const wrongSecret = `${created.prefix}.${"B".repeat(43)}`;
    const unprefixed = created.key.replace(/^cl_live_/, "");
    clock.advance(24 * 60 * 60 * 1000);
    const responses = await Promise.all(
      [created.key, revoked.key, unknownKey, wrongSecret, unprefixed, "garbage"].map(
        (key) => withKey(runtime, key),
      ),
    );
    const expected = { status: 401, body: responses[0]!.body };
    expect(responses[0]!.body).toEqual({
      code: "unauthenticated",
      message: "Authentication is required.",
    });
    for (const response of responses) {
      expect({ status: response.status, body: response.body }).toEqual(expected);
    }
    await runtime.close();
  });

  it("supports rotation overlap and immediate revocation", async () => {
    const { runtime, world } = await setup();
    const oldKey = (
      await createKey(runtime, world, { name: "Old", permissions: ["products:read"] })
    ).body as CreatedKey;
    const newKey = (
      await createKey(runtime, world, { name: "New", permissions: ["products:read"] })
    ).body as CreatedKey;
    expect((await withKey(runtime, oldKey.key)).status).toBe(200);
    expect((await withKey(runtime, newKey.key)).status).toBe(200);

    const otherSchool = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/api-keys/${oldKey.id}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolB.publicId,
      },
    });
    expect(otherSchool.status).toBe(404);
    const revoke = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/api-keys/${oldKey.id}`,
      headers: ownerHeaders(world),
    });
    expect(revoke.status).toBe(204);
    expect((await withKey(runtime, oldKey.key)).status).toBe(401);
    expect((await withKey(runtime, newKey.key)).status).toBe(200);
    const again = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/api-keys/${oldKey.id}`,
      headers: ownerHeaders(world),
    });
    expect(again.status).toBe(404);

    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/api-keys",
      headers: ownerHeaders(world),
    });
    const ids = (listed.body as { items: Array<{ id: string }> }).items.map(
      (item) => item.id,
    );
    expect(ids).toContain(newKey.id);
    expect(ids).not.toContain(oldKey.id);
    const audit = await runtime.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.resourceId, oldKey.id));
    expect(audit.map((event) => event.action).sort()).toEqual([
      "api_key.created",
      "api_key.revoked",
    ]);
    await runtime.close();
  });

  it("flags expired keys in the list and expires them via the injected clock", async () => {
    const { clock, runtime, world } = await setup();
    const key = (
      await createKey(runtime, world, {
        name: "Thirty days",
        permissions: ["products:read"],
        expiresAt: "2026-03-31T00:00:00.000Z",
      })
    ).body as CreatedKey;
    expect((await withKey(runtime, key.key)).status).toBe(200);
    clock.advance(30 * 24 * 60 * 60 * 1000);
    expect((await withKey(runtime, key.key)).status).toBe(401);
    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/api-keys",
      headers: ownerHeaders(world),
    });
    const item = (
      listed.body as { items: Array<{ id: string; expired: boolean }> }
    ).items.find((entry) => entry.id === key.id);
    expect(item?.expired).toBe(true);
    await runtime.close();
  });

  it("keeps working with its own permissions after the creator leaves", async () => {
    const { runtime, world } = await setup();
    const created = await createKey(runtime, world, {
      name: "School integration",
      permissions: ["products:write", "contacts:read"],
    });
    expect(created.status).toBe(201);
    const key = (created.body as CreatedKey).key;
    const contacts = () =>
      dispatch(runtime, {
        method: "GET",
        path: "/v1/contacts",
        headers: { "x-api-key": key },
      });
    const media = () =>
      dispatch(runtime, {
        method: "GET",
        path: "/v1/media",
        headers: { "x-api-key": key },
      });
    expect((await withKey(runtime, key)).status).toBe(200);
    expect((await contacts()).status).toBe(200);
    expect((await media()).status).toBe(403);

    // Ownership moves to the member, then the original creator's account is
    // removed from the school entirely.
    const member = await memberMembership(runtime, world);
    const ownerRows = await runtime.db
      .select({ schoolAccountId: schema.schoolAccounts.id })
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, world.schoolA.id),
          eq(schema.schoolAccounts.userId, world.owner.id),
        ),
      );
    await runtime.db
      .delete(schema.memberships)
      .where(
        and(
          eq(schema.memberships.schoolId, world.schoolA.id),
          eq(schema.memberships.schoolAccountId, ownerRows[0]!.schoolAccountId),
        ),
      );
    await runtime.db
      .update(schema.memberships)
      .set({ isOwner: true })
      .where(eq(schema.memberships.id, member.membershipId));
    await runtime.db
      .update(schema.schoolAccounts)
      .set({ status: "deactivated" })
      .where(eq(schema.schoolAccounts.id, ownerRows[0]!.schoolAccountId));

    // Same permissions as before: no more, no less.
    expect((await withKey(runtime, key)).status).toBe(200);
    expect((await contacts()).status).toBe(200);
    expect((await media()).status).toBe(403);
    const write = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: { "x-api-key": key },
      body: { kind: "course", title: "After the creator left", description: "" },
    });
    expect(write.status).toBe(201);

    const rows = await runtime.db
      .select({ membershipId: schema.apiKeys.membershipId })
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.publicId, (created.body as CreatedKey).id));
    expect(rows[0]?.membershipId).toBeNull();

    // The new owner manages the school's keys, including the old owner's.
    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/api-keys",
      headers: memberHeaders(world),
    });
    expect(listed.status).toBe(200);
    expect(
      (listed.body as { items: Array<{ id: string }> }).items.map((item) => item.id),
    ).toContain((created.body as CreatedKey).id);
    await runtime.close();
  });

  it("lets only the school owner list, create, and revoke keys", async () => {
    const { runtime, world } = await setup();
    await setMemberPermissions(runtime, world, [...COURSELIT_PERMISSIONS]);
    const list = await dispatch(runtime, {
      method: "GET",
      path: "/v1/api-keys",
      headers: memberHeaders(world),
    });
    const create = await createKey(
      runtime,
      world,
      { name: "Member", permissions: ["products:read"] },
      memberHeaders(world),
    );
    const revoke = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/api-keys/${world.apiKeyA.publicId}`,
      headers: memberHeaders(world),
    });
    for (const response of [list, create, revoke]) {
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ code: "forbidden" });
    }
    expect((await withKey(runtime, world.apiKeyA.raw)).status).toBe(200);
    // The catalog no longer carries API-key permissions to delegate.
    expect(
      (COURSELIT_PERMISSIONS as readonly string[]).some((p) =>
        p.startsWith("api_keys:"),
      ),
    ).toBe(false);
    await runtime.close();
  });

  it("stops working when its school is deleted", async () => {
    const { runtime, world } = await setup();
    expect((await withKey(runtime, world.apiKeyA.raw)).status).toBe(200);
    await runtime.db
      .update(schema.schools)
      .set({ status: "deleted" })
      .where(eq(schema.schools.id, world.schoolA.id));
    expect((await withKey(runtime, world.apiKeyA.raw)).status).toBe(401);
    await runtime.close();
  });

  it("caps active keys per school", async () => {
    const { runtime, world } = await setup();
    const existing = await runtime.db
      .select({ id: schema.apiKeys.id })
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.schoolId, world.schoolA.id));
    for (
      let index = existing.length;
      index < MAX_ACTIVE_API_KEYS_PER_SCHOOL;
      index += 1
    ) {
      const response = await createKey(runtime, world, {
        name: `Key ${index}`,
        permissions: ["products:read"],
      });
      expect(response.status).toBe(201);
    }
    const over = await createKey(runtime, world, {
      name: "One too many",
      permissions: ["products:read"],
    });
    expect(over.status).toBe(409);
    expect(over.body).toMatchObject({
      code: "conflict",
      details: { reason: "api_key_limit_reached" },
    });
    await runtime.close();
  });

  it("denies API keys on key management, team, school, billing, and account operations", async () => {
    const { runtime, world } = await setup();
    const key = world.apiKeyA.raw;
    const attempts: Array<{ method: string; path: string; body?: unknown }> = [
      { method: "GET", path: "/v1/api-keys" },
      {
        method: "POST",
        path: "/v1/api-keys",
        body: { name: "x", permissions: ["products:read"] },
      },
      { method: "DELETE", path: `/v1/api-keys/${world.apiKeyA.publicId}` },
      { method: "GET", path: "/v1/school/team" },
      {
        method: "POST",
        path: "/v1/school/team/invitations",
        body: { email: "a@example.com" },
      },
      { method: "POST", path: "/v1/invitations", body: { email: "a@example.com" } },
      { method: "POST", path: "/v1/school/team/leave" },
      { method: "POST", path: "/v1/school/team/transfer-ownership", body: {} },
      { method: "GET", path: "/v1/schools" },
      {
        method: "POST",
        path: "/v1/schools",
        body: { name: "Evil", subdomain: "evil" },
      },
      {
        method: "POST",
        path: "/api/school/select",
        body: { schoolId: world.schoolB.publicId },
      },
      { method: "GET", path: "/v1/billing/catalog" },
      { method: "GET", path: "/v1/billing/entitlement" },
      { method: "GET", path: "/v1/school/payment-settings" },
      {
        method: "PATCH",
        path: "/v1/school/code-injection",
        body: { head: "<script>" },
      },
      { method: "POST", path: "/v1/team-invitations/accept", body: {} },
      { method: "GET", path: "/v1/notifications" },
      // Not a contract operation: API keys fail closed.
      { method: "GET", path: "/v1/school/mails/overview" },
    ];
    for (const attempt of attempts) {
      const response = await dispatch(runtime, {
        method: attempt.method,
        path: attempt.path,
        headers: { "x-api-key": key },
        body: attempt.body,
      });
      expect({ path: attempt.path, status: response.status }).toEqual({
        path: attempt.path,
        status: 403,
      });
      expect(response.body).toMatchObject({
        code: "forbidden",
        details: { reason: "credential_not_allowed" },
      });
    }
    const keys = await runtime.db
      .select({ id: schema.apiKeys.id, revokedAt: schema.apiKeys.revokedAt })
      .from(schema.apiKeys);
    expect(keys).toHaveLength(1);
    expect(keys[0]?.revokedAt).toBeNull();
    await runtime.close();
  });

  it("allows school content operations the key holds", async () => {
    const { runtime, world } = await setup();
    const key = (
      await createKey(runtime, world, {
        name: "Writer",
        permissions: ["products:write"],
      })
    ).body as CreatedKey;
    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: { "x-api-key": key.key },
      body: { kind: "course", title: "Made by a key", description: "" },
    });
    expect(created.status).toBe(201);
    const media = await dispatch(runtime, {
      method: "GET",
      path: "/v1/media",
      headers: { "x-api-key": key.key },
    });
    expect(media.status).toBe(403);
    expect(media.body).toMatchObject({ code: "forbidden" });
    await runtime.close();
  });

  it("manages product plans with products and community plans with communities", async () => {
    const { runtime, world } = await setup();
    const [community] = await runtime.db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.schoolId, world.schoolA.id));
    const productPlans = `/v1/products/${world.noteA.publicId}/plans`;
    const communityPlans = `/v1/communities/${community!.publicId}/plans`;
    const plan = { name: "Free access", kind: "free", amountMinor: 0 };
    const keyWith = async (permissions: string[]) =>
      (
        (await createKey(runtime, world, { name: permissions.join(" "), permissions }))
          .body as CreatedKey
      ).key;
    const call = (key: string, method: string, path: string, body?: unknown) =>
      dispatch(runtime, { method, path, headers: { "x-api-key": key }, body });

    const products = await keyWith(["products:write"]);
    expect((await call(products, "POST", productPlans, plan)).status).toBe(201);
    expect((await call(products, "GET", productPlans)).status).toBe(200);
    expect((await call(products, "POST", communityPlans, plan)).status).toBe(403);

    const communities = await keyWith(["communities:write"]);
    expect((await call(communities, "POST", communityPlans, plan)).status).toBe(201);
    expect((await call(communities, "GET", communityPlans)).status).toBe(200);
    expect((await call(communities, "GET", productPlans)).status).toBe(403);

    // Website access does not reach pricing.
    const website = await keyWith(["storefront:write"]);
    expect((await call(website, "GET", productPlans)).status).toBe(403);
    expect((await call(website, "POST", productPlans, plan)).status).toBe(403);
    expect((await call(website, "GET", communityPlans)).status).toBe(403);
    expect((await call(website, "POST", communityPlans, plan)).status).toBe(403);
    await runtime.close();
  });

  it("accepts keys only from the x-api-key header", async () => {
    const { runtime, world } = await setup();
    const key = world.apiKeyA.raw;
    const viaQuery = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products?api_key=${encodeURIComponent(key)}&x-api-key=${encodeURIComponent(key)}`,
      headers: {},
    });
    expect(viaQuery.status).toBe(401);
    const viaBody = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: {},
      body: {
        apiKey: key,
        "x-api-key": key,
        kind: "course",
        title: "t",
        description: "",
      },
    });
    expect(viaBody.status).toBe(401);
    const viaBearer = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products",
      headers: { authorization: `Bearer ${key}` },
    });
    expect(viaBearer.status).toBe(401);
    expect((await withKey(runtime, key)).status).toBe(200);
    await runtime.close();
  });

  it("rejects a key combined with another credential as ambiguous", async () => {
    const { runtime, world } = await setup();
    for (const headers of [
      { "x-api-key": world.apiKeyA.raw, cookie: world.owner.sessionCookie },
      {
        "x-api-key": world.apiKeyA.raw,
        authorization: `Bearer ${world.owner.oauthToken}`,
      },
    ]) {
      const response = await dispatch(runtime, {
        method: "GET",
        path: "/v1/products",
        headers: { ...headers, "x-school-id": world.schoolA.publicId },
      });
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: "credential_ambiguous" });
    }
    await runtime.close();
  });

  it("rate limits failed API-key attempts per client", async () => {
    const { clock, runtime, world } = await setup();
    const bad = `${world.apiKeyA.raw.split(".")[0]}.${"Z".repeat(43)}`;
    for (let attempt = 0; attempt < API_KEY_FAILURE_LIMIT; attempt += 1) {
      expect((await withKey(runtime, bad)).status).toBe(401);
    }
    const limited = await withKey(runtime, bad);
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({
      code: "rate_limited",
      message: "The request was rate limited.",
    });
    expect(Number(limited.headers?.["Retry-After"])).toBeGreaterThan(0);
    // Even a valid key is refused from the limited client (no oracle)...
    expect((await withKey(runtime, world.apiKeyA.raw)).status).toBe(429);
    // ...while other clients and successful traffic are unaffected.
    expect(
      (await withKey(runtime, world.apiKeyA.raw, { "x-forwarded-for": "198.51.100.7" }))
        .status,
    ).toBe(200);
    clock.advance(5 * 60 * 1000 + 1);
    expect((await withKey(runtime, world.apiKeyA.raw)).status).toBe(200);
    await runtime.close();
  });

  it("does not count successful requests toward the failure limit", async () => {
    const { runtime, world } = await setup();
    for (let attempt = 0; attempt < API_KEY_FAILURE_LIMIT + 5; attempt += 1) {
      expect((await withKey(runtime, world.apiKeyA.raw)).status).toBe(200);
    }
    await runtime.close();
  });

  it("throttles lastUsedAt writes", async () => {
    const { clock, runtime, world } = await setup();
    const lastUsed = async () =>
      (
        await runtime.db
          .select({ lastUsedAt: schema.apiKeys.lastUsedAt })
          .from(schema.apiKeys)
          .where(eq(schema.apiKeys.publicId, world.apiKeyA.publicId))
      )[0]?.lastUsedAt?.toISOString() ?? null;
    expect(await lastUsed()).toBeNull();
    await withKey(runtime, world.apiKeyA.raw);
    await settle();
    expect(await lastUsed()).toBe("2026-03-01T00:00:00.000Z");
    clock.advance(60 * 1000);
    await withKey(runtime, world.apiKeyA.raw);
    await settle();
    expect(await lastUsed()).toBe("2026-03-01T00:00:00.000Z");
    clock.advance(API_KEY_LAST_USED_THROTTLE_MS);
    await withKey(runtime, world.apiKeyA.raw);
    await settle();
    expect(await lastUsed()).toBe("2026-03-01T00:06:00.000Z");
    await runtime.close();
  });

  it("keeps API keys and digests out of logs", async () => {
    const observability = createObservability({
      serviceName: "api-key-redaction",
      environment: "test",
      contextPolicy: { propertyAllowlist: new Set(["path"]) },
    });
    const lines: string[] = [];
    (observability.logger as unknown as Record<symbol, unknown>)[
      pino.symbols.streamSym
    ] = {
      write: (line: string) => lines.push(line),
    };
    const clock = movableClock("2026-03-01T00:00:00.000Z");
    const runtime = await createPgliteRuntime({ clock, observability });
    const world = await seedWorld(runtime, clock);
    const [, secret] = world.apiKeyA.raw.split(".");
    // Request headers are redacted by the shared logger; the auth path itself
    // never logs key material (success or failure).
    observability.logger.info(
      { headers: { "x-api-key": world.apiKeyA.raw } },
      "request",
    );
    await withKey(runtime, world.apiKeyA.raw);
    await withKey(runtime, `${world.apiKeyA.raw}x`);
    await settle();
    const output = lines.join("\n");
    expect(lines.length).toBeGreaterThan(0);
    expect(output).not.toContain(secret!);
    expect(output).not.toContain(world.apiKeyA.publicId);
    await runtime.close();
  });

  it("documents the x-api-key security scheme in OpenAPI", () => {
    const document = createOpenApiDocument("https://api.example.test") as {
      components?: { securitySchemes?: Record<string, unknown> };
      paths: Record<string, Record<string, { security?: unknown }>>;
    };
    expect(document.components?.securitySchemes?.apiKey).toMatchObject({
      type: "apiKey",
      in: "header",
      name: "x-api-key",
    });
    expect(document.paths["/v1/products"]?.get?.security).toEqual([
      { apiKey: [] },
      { oauth: [] },
    ]);
    expect(document.paths["/v1/api-keys"]?.post?.security).toEqual([]);
    expect(document.paths["/v1/schools"]?.get?.security).toEqual([{ oauth: [] }]);
  });
});

describe("operation policy enforcement", () => {
  it("maps requests to contract operations, preferring literal segments", () => {
    expect(resolveOperationId("GET", "/v1/media/unsplash?query=x")).toBe(
      "searchUnsplash",
    );
    expect(resolveOperationId("GET", "/v1/media/med_1")).toBe("getMedia");
    expect(resolveOperationId("DELETE", "/v1/api-keys/key_1")).toBe("revokeApiKey");
    expect(resolveOperationId("GET", "/v1/nope")).toBeNull();
  });

  it("fails closed for unknown operations and disallowed credentials", () => {
    expect(authorizeOperationCredential("unknown.operation", "session")).toMatchObject({
      code: "forbidden",
    });
    expect(authorizeOperationCredential(null, "api_key")).toMatchObject({
      code: "forbidden",
    });
    // Routes outside the contract are closed to every credential unless named
    // as an internal browser route.
    expect(authorizeOperationCredential(null, "session")).toMatchObject({
      code: "forbidden",
    });
    expect(authorizeOperationCredential(null, "oauth")).toMatchObject({
      code: "forbidden",
    });
    expect(
      authorizeOperationCredential(null, "session", { internalRoute: true }),
    ).toBeNull();
    expect(
      authorizeOperationCredential(null, "api_key", { internalRoute: true }),
    ).toMatchObject({ code: "forbidden" });
    expect(authorizeOperationCredential("listProducts", "api_key")).toBeNull();
    for (const operationId of [
      "listApiKeys",
      "createApiKey",
      "revokeApiKey",
      "listSchoolTeam",
      "createSchoolTeamInvitation",
      "transferSchoolOwnership",
      "createSchool",
      "selectSchool",
      "listSchools",
      "getEntitlement",
      "getBillingCatalog",
      "getSchoolPaymentSettings",
      "updateSchoolPaymentSettings",
      "learnerMe",
      "stripeWebhook",
    ]) {
      expect({
        operationId,
        denied: Boolean(authorizeOperationCredential(operationId, "api_key")),
      }).toEqual({
        operationId,
        denied: true,
      });
    }
  });

  it("never lets API keys reach key management", () => {
    for (const operationId of [
      "listApiKeys",
      "createApiKey",
      "revokeApiKey",
    ] as const) {
      expect(OPERATION_POLICIES[operationId].allowedCredentials).toEqual(["session"]);
    }
  });
});

describe.serial("API keys over MCP", () => {
  const call = (
    runtime: Runtime,
    headers: Record<string, string>,
    name: string,
    args = {},
  ) =>
    dispatch(runtime, {
      method: "POST",
      path: "/mcp",
      headers,
      body: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      },
    });

  it("uses the same school pinning and key permissions", async () => {
    const { runtime, world } = await setup();
    const listed = await call(
      runtime,
      { "x-api-key": world.apiKeyA.raw, "x-school-id": world.schoolB.publicId },
      "products.list",
    );
    expect(listed.status).toBe(200);
    const items = (
      listed.body as {
        result: { structuredContent: { items: Array<{ schoolId: string }> } };
      }
    ).result.structuredContent.items;
    expect(items?.length).toBeGreaterThan(0);
    expect(items?.every((item) => item.schoolId === world.schoolA.publicId)).toBe(true);

    const readOnly = (
      await createKey(runtime, world, {
        name: "MCP read",
        permissions: ["products:read"],
      })
    ).body as CreatedKey;
    const denied = await call(
      runtime,
      { "x-api-key": readOnly.key },
      "products.delete",
      {
        productId: world.noteA.publicId,
        confirm: true,
      },
    );
    expect(toolErrorCode(denied.body)).toBe("forbidden");

    // Tools without their own permission check are still gated by the
    // operation's required permissions.
    for (const tool of ["contacts.list", "media.list"]) {
      const withoutPermission = await call(
        runtime,
        { "x-api-key": readOnly.key },
        tool,
      );
      expect(toolErrorCode(withoutPermission.body)).toBe("forbidden");
    }

    const bad = await call(
      runtime,
      { "x-api-key": `${readOnly.key}x` },
      "products.list",
    );
    expect(bad.status).toBe(401);
    await runtime.close();
  });

  it("guards every MCP tool with the operation policy", async () => {
    const { runtime } = await setup();
    const tools = mcpFor(runtime).listTools();
    expect(tools.length).toBeGreaterThan(0);
    // Every dedicated tool maps to registered contract operations; the
    // generic api.* tools run operations through the REST dispatcher.
    expect(
      tools.filter(
        (tool) => !MCP_TOOL_OPERATIONS.has(tool.name) && !tool.name.startsWith("api."),
      ),
    ).toEqual([]);
    const context = {
      requestId: "r",
      principalId: "p",
      tenantId: "t",
      credential: { kind: "api_key" as const, credentialId: "k" },
      permissions: new Set(),
      publicSchoolId: "s",
    };
    // A tool whose operation is not API-key reachable (or is unmapped) is refused.
    const keyManagement = guardMcpTool({
      name: "api_keys.create",
      description: "not a real tool",
      risk: "write",
      inputSchema: tools[0]!.inputSchema,
      handler: async () => ({ created: true }),
    });
    const result = (await keyManagement.handler({
      context: context as never,
      args: {},
      signal: new AbortController().signal,
    })) as { error?: { code: string } };
    expect(result.error?.code).toBe("forbidden");
    await runtime.close();
  });
});
