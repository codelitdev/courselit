import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { ownerHeaders, ssoSetup, type SsoSetup } from "./test-sso-flow.js";
import { seedRealLearner } from "./test-sso.js";

const patch = (t: SsoSetup, loginMethods: string[], headers: Record<string, string> = ownerHeaders(t.world)) =>
  dispatch(t.runtime, { method: "PATCH", path: "/v1/school/login-methods", headers, body: { loginMethods } });

async function withGoogleKeys<T>(run: () => Promise<T>): Promise<T> {
  const saved = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET];
  process.env.GOOGLE_CLIENT_ID = "id";
  process.env.GOOGLE_CLIENT_SECRET = "secret";
  try {
    return await run();
  } finally {
    if (saved[0] === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = saved[0];
    if (saved[1] === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = saved[1];
  }
}


// These tests decide for themselves whether Google keys exist. Bun loads the
// developer's .env, so start each test without them and restore them after.
const savedGoogleKeys = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET];
beforeEach(() => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
});
afterAll(() => {
  if (savedGoogleKeys[0] !== undefined) process.env.GOOGLE_CLIENT_ID = savedGoogleKeys[0];
  if (savedGoogleKeys[1] !== undefined) process.env.GOOGLE_CLIENT_SECRET = savedGoogleKeys[1];
});

describe.serial("school login methods", () => {
  it("won't turn off the last method, but allows it while SSO is active", async () => {
    const t = await ssoSetup({ noConnection: true });
    try {
      const refused = await patch(t, []);
      expect(refused.status).toBe(400);
      expect(refused.body).toMatchObject({ details: { reason: "last_sign_in_method" } });
      expect((await dispatch(t.runtime, { method: "GET", path: "/v1/school/login-methods", headers: ownerHeaders(t.world) })).body).toMatchObject({ loginMethods: ["email"] });
    } finally {
      await t.close();
    }
    const withSso = await ssoSetup();
    try {
      const response = await patch(withSso, []);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ loginMethods: [], sso: { active: true, displayName: "Acme employees" }, usable: ["sso"] });
    } finally {
      await withSso.close();
    }
  });

  it("falls back to email codes when every method that is on is unusable", async () => {
    const t = await ssoSetup({ noConnection: true });
    try {
      await t.runtime.db.update(schema.schools).set({ loginMethods: ["google"] });
      const methods = await dispatch(t.runtime, { method: "GET", path: `/v1/public/${t.world.schoolA.publicId}/login-methods`, headers: {} });
      expect(methods.body).toMatchObject({ loginMethods: ["email"], hasGoogle: false });
    } finally {
      await t.close();
    }
  });

  it("turns Google on only when the platform has Google keys", async () => {
    const t = await ssoSetup({ noConnection: true });
    try {
      const refused = await patch(t, ["email", "google"]);
      expect(refused.status).toBe(400);
      expect(refused.body).toMatchObject({ details: { reason: "google_unavailable" } });
      await withGoogleKeys(async () => {
        const accepted = await patch(t, ["email", "google"]);
        expect(accepted.status).toBe(200);
        expect(accepted.body).toMatchObject({ loginMethods: ["email", "google"], googleAvailable: true, usable: ["email", "google"] });
      });
    } finally {
      await t.close();
    }
  });

  it("turning a method off ends the sessions made with it and refuses it at its start", async () => {
    const t = await ssoSetup({ noConnection: true });
    try {
      await withGoogleKeys(async () => {
        await patch(t, ["email", "google"]);
        const learner = await seedRealLearner(t.runtime.db, t.clock, t.world.schoolA.publicId, "someone@example.org");
        expect(learner.token).toBeTruthy();
        await t.runtime.db.update(schema.schoolSessions).set({ authenticationMethod: "google" });
        const other = await seedRealLearner(t.runtime.db, t.clock, t.world.schoolA.publicId, "other@example.org");
        expect(other.token).toBeTruthy();
        expect((await t.runtime.db.select().from(schema.schoolSessions)).length).toBe(2);
        // Email stays on, Google goes off: the Google session ends, the email one stays.
        expect((await patch(t, ["email"])).status).toBe(200);
        const remaining = await t.runtime.db.select().from(schema.schoolSessions);
        expect(remaining.map((row) => row.authenticationMethod)).toEqual(["email"]);
        const start = await dispatch(t.runtime, {
          method: "POST",
          path: "/v1/learner/auth/google",
          headers: { "x-school-id": t.world.schoolA.publicId },
          body: { host: "school-a.localhost:3001", nonce: "n".repeat(43) },
        });
        expect(start.status).toBe(403);
      });
    } finally {
      await t.close();
    }
  });

  it("requires the settings permission and is reachable by OAuth and API credentials", async () => {
    const t = await ssoSetup({ noConnection: true });
    try {
      expect((await patch(t, ["email"], { cookie: t.world.member.sessionCookie, "x-school-id": t.world.schoolA.publicId })).status).toBe(403);
      expect((await patch(t, ["email"], { authorization: `Bearer ${t.world.owner.oauthToken}`, "x-school-id": t.world.schoolA.publicId })).status).toBe(200);
      const read = await dispatch(t.runtime, { method: "GET", path: "/v1/school/login-methods", headers: { "x-api-key": t.world.apiKeyA.raw } });
      expect([200, 403]).toContain(read.status);
    } finally {
      await t.close();
    }
  });

  it("is an MCP tool that needs confirmation", async () => {
    const t = await ssoSetup({ noConnection: true });
    try {
      const headers = { authorization: `Bearer ${t.world.owner.oauthToken}`, "x-school-id": t.world.schoolA.publicId };
      const call = (args: Record<string, unknown>) =>
        dispatch(t.runtime, {
          method: "POST",
          path: "/mcp",
          headers,
          body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "update_school_login_methods", arguments: args } },
        });
      const unconfirmed = await call({ loginMethods: ["email"] });
      expect((unconfirmed.body as any).result.isError).toBe(true);
      const confirmed = await call({ loginMethods: ["email"], confirm: true });
      expect((confirmed.body as any).result.isError).toBeFalsy();
      const read = await dispatch(t.runtime, {
        method: "POST", path: "/mcp", headers,
        body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_sso_connections", arguments: {} } },
      });
      expect((read.body as any).result.isError).toBeFalsy();
    } finally {
      await t.close();
    }
  });

  it("lists SSO in the public methods with its display name only when usable", async () => {
    const t = await ssoSetup();
    try {
      const url = `/v1/public/${t.world.schoolA.publicId}/login-methods`;
      expect((await dispatch(t.runtime, { method: "GET", path: url, headers: {} })).body).toMatchObject({
        loginMethods: ["email", "sso"], hasSso: true, ssoDisplayName: "Acme employees",
      });
      await t.runtime.db.update(schema.schoolSsoConnections).set({ status: "disabled" }).where(eq(schema.schoolSsoConnections.id, t.connection.id));
      expect((await dispatch(t.runtime, { method: "GET", path: url, headers: {} })).body).toMatchObject({
        loginMethods: ["email"], hasSso: false, ssoDisplayName: null,
      });
    } finally {
      await t.close();
    }
  });
});
