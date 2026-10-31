import { describe, expect, it } from "bun:test";
import { COURSELIT_PERMISSIONS, contract } from "@courselit/api-contract";
import { eq } from "drizzle-orm";
import {
  getOperationPolicy,
  operationPermissionsAllow,
  resolveOperationId,
  type TeamOperationPolicy,
} from "./auth/operation-policy.js";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock, type Runtime } from "./runtime.js";
import { type SeededWorld, seedWorld } from "./seed.js";

type Route = { method: string; path: string };
const routes = contract as unknown as Record<string, Route>;

async function setup() {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock });
  const world = await seedWorld(runtime, clock);
  return { runtime, world };
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
  permissions: readonly string[],
) {
  const created = await dispatch(runtime, {
    method: "POST",
    path: "/v1/api-keys",
    headers: ownerHeaders(world),
    body: { name: permissions.join(" ").slice(0, 60) || "none", permissions },
  });
  return created.body as { id: string; key: string };
}

function schoolPolicies() {
  return Object.keys(routes).flatMap((operationId) => {
    const policy = getOperationPolicy(operationId);
    return policy?.audience === "school"
      ? [{ operationId, policy: policy as TeamOperationPolicy }]
      : [];
  });
}

describe("operation permissions", () => {
  it("allows a caller only with every permission the policy requires", () => {
    const all = new Set<string>(COURSELIT_PERMISSIONS);
    for (const { operationId, policy } of schoolPolicies()) {
      const required = policy.requiredPermissions ?? [];
      const owner = !policy.ownerOnly;
      expect(
        operationPermissionsAllow(operationId, {
          permissions: new Set(required),
          isOwner: true,
        }),
      ).toBe(true);
      for (const missing of required) {
        const without = new Set(all);
        without.delete(missing);
        expect(
          operationPermissionsAllow(operationId, {
            permissions: without,
            isOwner: true,
          }),
        ).toBe(false);
      }
      // Ownership is separate from permissions.
      expect(
        operationPermissionsAllow(operationId, { permissions: all, isOwner: false }),
      ).toBe(owner);
    }
  });

  it("enforces the policy over REST before the handler runs", async () => {
    const { runtime, world } = await setup();
    const call = async (permissions: string[], method: string, path: string) => {
      const key = await createKey(runtime, world, permissions);
      return dispatch(runtime, {
        method,
        path,
        headers: { "x-api-key": key.key },
        body: method === "GET" ? undefined : {},
      });
    };
    const forbidden = (response: { status: number; body: unknown }) =>
      response.status === 403 &&
      (response.body as { code?: string }).code === "forbidden";

    // The dashboard and product analytics belong to analytics:read.
    expect((await call(["analytics:read"], "GET", "/v1/school/overview")).status).toBe(
      200,
    );
    expect(forbidden(await call(["contacts:read"], "GET", "/v1/school/overview"))).toBe(
      true,
    );
    const analytics = `/v1/products/${world.noteA.publicId}/analytics`;
    expect((await call(["analytics:read"], "GET", analytics)).status).toBe(200);
    expect(forbidden(await call(["products:read"], "GET", analytics))).toBe(true);

    // Moderating a community membership is a moderation permission.
    const membership = "/v1/community-memberships/missing";
    expect(forbidden(await call(["communities:write"], "PATCH", membership))).toBe(
      true,
    );
    expect(forbidden(await call(["communities:moderate"], "PATCH", membership))).toBe(
      false,
    );
    await runtime.close();
  }, 60_000);

  it("never forbids a key holding exactly the permissions an operation requires", async () => {
    // Guards the other direction: a handler must not ask for more than the
    // policy declares. Operations that fail on missing data before reaching
    // their permission check are not covered.
    const { runtime, world } = await setup();
    const [community] = await runtime.db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.schoolId, world.schoolA.id));
    const ids: Record<string, string> = {
      productId: world.noteA.publicId,
      communityId: community!.publicId,
      schoolId: world.schoolA.publicId,
    };
    const candidates = schoolPolicies()
      .filter(({ policy }) => !policy.ownerOnly)
      .filter(({ policy }) => policy.allowedCredentials.includes("api_key"))
      // Deletes last, so they cannot remove what other operations read.
      .sort(
        (a, b) =>
          Number(routes[a.operationId]!.method === "DELETE") -
          Number(routes[b.operationId]!.method === "DELETE"),
      );
    const refused: string[] = [];
    for (const { operationId, policy } of candidates) {
      const route = routes[operationId]!;
      const required = policy.requiredPermissions ?? [];
      const key = await createKey(
        runtime,
        world,
        required.length ? required : ["school:read"],
      );
      const method = route.method.toUpperCase();
      const path = route.path.replace(
        /:([A-Za-z0-9_]+)/g,
        (_, name: string) => ids[name] ?? `missing_${name}`,
      );
      const response = await dispatch(runtime, {
        method,
        path,
        headers: { "x-api-key": key.key },
        body: method === "GET" ? undefined : {},
      });
      if (
        response.status === 403 &&
        (response.body as { code?: string }).code === "forbidden"
      ) {
        refused.push(`${operationId} [${required.join(",")}]`);
      }
      await dispatch(runtime, {
        method: "DELETE",
        path: `/v1/api-keys/${key.id}`,
        headers: ownerHeaders(world),
      });
    }
    expect(candidates.length).toBeGreaterThan(100);
    expect(refused).toEqual([]);
    await runtime.close();
  }, 600_000);
});

describe("routes outside the contract", () => {
  it("are closed to every credential", async () => {
    const { runtime, world } = await setup();
    for (const path of ["/v1/school/segments", "/v1/school/mails/overview"]) {
      const session = await dispatch(runtime, {
        method: "GET",
        path,
        headers: ownerHeaders(world),
      });
      expect(session.status).toBe(403);
      expect(session.body).toMatchObject({
        code: "forbidden",
        details: { reason: "credential_not_allowed" },
      });
      const oauth = await dispatch(runtime, {
        method: "GET",
        path,
        headers: {
          authorization: `Bearer ${world.owner.oauthToken}`,
          "x-school-id": world.schoolA.publicId,
        },
      });
      expect(oauth.status).toBe(403);
    }
    await runtime.close();
  });

  it("do not exist: every route the dispatcher handles is a contract operation", async () => {
    const source = await Bun.file(new URL("./dispatch.ts", import.meta.url)).text();
    const paths = new Set<string>();
    for (const match of source.matchAll(/path === "(\/(?:v1|api)\/[^"]+)"/g)) {
      paths.add(match[1]!);
    }
    for (const match of source.matchAll(/\/\^((?:\\\/[^/$]+)+)\$\/\.exec\(path\)/g)) {
      paths.add(match[1]!.replace(/\\\//g, "/").replace(/\(\[\^\/\]\+\)/g, "x"));
    }
    // Handled before authentication, or by their own protocol.
    const outside = new Set([
      "/api/school/select",
      "/v1/auth/tickets/consume",
      "/v1/storefront/webhooks/(stripe|lemonsqueezy|razorpay)",
    ]);
    const unknown = [...paths]
      .filter((path) => !outside.has(path))
      .filter((path) =>
        ["GET", "POST", "PATCH", "PUT", "DELETE"].every(
          (method) => resolveOperationId(method, path) === null,
        ),
      );
    expect(paths.size).toBeGreaterThan(50);
    expect(unknown).toEqual([]);
  });
});

describe("mail operations", () => {
  it("apply the policy before reaching the mailing service", async () => {
    const { runtime, world } = await setup();
    const readKey = await createKey(runtime, world, ["contacts:read"]);
    const writeKey = await createKey(runtime, world, ["contacts:write"]);
    const otherKey = await createKey(runtime, world, ["media:write"]);
    const call = (key: string, method: string, path: string, body?: unknown) =>
      dispatch(runtime, { method, path, headers: { "x-api-key": key }, body });

    // Reading needs contacts:read; changing needs contacts:write.
    expect(
      (
        await call(readKey.key, "POST", "/v1/school/mails/sequences", {
          type: "broadcast",
        })
      ).body,
    ).toMatchObject({ code: "forbidden" });
    expect(
      (
        await call(readKey.key, "PATCH", "/v1/school/mails/settings", {
          mailingAddress: "x",
        })
      ).body,
    ).toMatchObject({ code: "forbidden" });
    for (const path of ["/v1/school/mails/templates", "/v1/school/mails/settings"]) {
      expect((await call(otherKey.key, "GET", path)).body).toMatchObject({
        code: "forbidden",
      });
    }

    // Sending is not available to API keys at all.
    for (const path of [
      "/v1/school/mails/sequences/seq_1/start",
      "/v1/school/mails/sequences/seq_1/emails/em_1/test",
    ]) {
      expect((await call(writeKey.key, "POST", path, {})).body).toMatchObject({
        code: "forbidden",
        details: { reason: "credential_not_allowed" },
      });
    }

    // Bodies are validated by the contract schemas.
    const invalid = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/mails/sequences",
      headers: ownerHeaders(world),
      body: {},
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({ code: "validation_failed" });
    await runtime.close();
  }, 60_000);
});
