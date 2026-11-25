import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { attackerKeys, iso } from "./sso-protocol/test-idp.js";
import { NONCE, ownerHeaders, ssoSetup, ticketFrom } from "./test-sso-flow.js";

const count = async (runtime: Awaited<ReturnType<typeof ssoSetup>>["runtime"], table: any) =>
  (await runtime.db.select().from(table)).length;

describe.serial("learner SSO sign-in flow", () => {
  it("signs a learner in from the storefront start to an sso school session", async () => {
    const t = await ssoSetup({ maxSessionMinutes: 5 });
    try {
      const { started, token, requestId, redirect } = await t.startSignIn("/dashboard/courses");
      expect(started.status).toBe(200);
      expect(redirect!.status).toBe(302);
      const idp = new URL(redirect!.headers.get("location")!);
      expect(idp.origin + idp.pathname).toBe("https://idp.example/sso");
      expect(idp.searchParams.get("RelayState")).toBe(token!);
      expect(requestId).toBeTruthy();

      const acs = await t.acs(t.response(requestId!, { sessionNotOnOrAfter: iso(3_600_000) }), token!);
      expect(acs.status).toBe(302);
      const location = new URL(acs.headers.get("location")!);
      expect(location.origin).toBe("http://school-a.localhost:3001");
      expect(location.pathname).toBe("/auth/complete");
      expect(location.searchParams.get("next")).toBe("/dashboard/courses");
      const ticket = ticketFrom(location.toString())!;
      expect(ticket).toBeTruthy();

      // Only the browser that started it (the nonce cookie) can redeem it.
      expect((await t.redeem(ticket, "x".repeat(43))).status).toBe(401);
      const redeemed = await t.redeem(ticket);
      expect(redeemed.status).toBe(200);
      expect(redeemed.body).toMatchObject({ email: "alice@acme.com" });
      const [session] = await t.runtime.db.select().from(schema.schoolSessions)
        .where(eq(schema.schoolSessions.authenticationMethod, "sso"));
      expect(session!.ssoConnectionId).toBe(t.connection.id);
      // max_session_minutes (5) is earlier than SessionNotOnOrAfter (1 hour).
      const minutes = (session!.expiresAt.getTime() - t.clock.now().getTime()) / 60_000;
      expect(minutes).toBeGreaterThan(4);
      expect(minutes).toBeLessThanOrEqual(5);
      // A ticket works once.
      expect((await t.redeem(ticket)).status).toBe(401);
    } finally {
      await t.close();
    }
  });

  it("honours the IdP's SessionNotOnOrAfter when it is the earliest", async () => {
    const t = await ssoSetup({ maxSessionMinutes: 600 });
    try {
      const { token, requestId } = await t.startSignIn();
      const acs = await t.acs(t.response(requestId!, { sessionNotOnOrAfter: iso(10 * 60_000) }), token!);
      const ticket = ticketFrom(acs.headers.get("location"))!;
      expect((await t.redeem(ticket)).status).toBe(200);
      const [session] = await t.runtime.db.select().from(schema.schoolSessions)
        .where(eq(schema.schoolSessions.authenticationMethod, "sso"));
      const minutes = (session!.expiresAt.getTime() - t.clock.now().getTime()) / 60_000;
      expect(minutes).toBeGreaterThan(9);
      expect(minutes).toBeLessThanOrEqual(10.1);
    } finally {
      await t.close();
    }
  });

  it("does not use up the request on a forged POST that carries a valid RelayState", async () => {
    const t = await ssoSetup();
    try {
      const { token, requestId } = await t.startSignIn();
      const forged = await t.acs(
        t.response(requestId!, {}, {}, { keys: attackerKeys }),
        token!,
      );
      expect(forged.status).toBe(302);
      expect(forged.headers.get("location")).toContain("/login?error=sso");
      expect(ticketFrom(forged.headers.get("location"))).toBeNull();
      const [row] = await t.runtime.db.select().from(schema.schoolSsoRequests);
      expect(row!.consumedAt).toBeNull();
      const events = await t.runtime.db.select().from(schema.schoolSsoEvents);
      expect(events.some((event) => event.action === "sign_in.failed" && event.reason === "signature_invalid")).toBe(true);
      // The real response for the same request still works.
      const real = await t.acs(t.response(requestId!), token!);
      expect(ticketFrom(real.headers.get("location"))).toBeTruthy();
    } finally {
      await t.close();
    }
  });

  it("rejects a replayed response and an unknown RelayState", async () => {
    const t = await ssoSetup();
    try {
      const { token, requestId } = await t.startSignIn();
      const xml = t.response(requestId!);
      expect(ticketFrom((await t.acs(xml, token!)).headers.get("location"))).toBeTruthy();
      const replay = await t.acs(xml, token!);
      expect(ticketFrom(replay.headers.get("location"))).toBeNull();
      const unknown = await t.acs(xml, "nope");
      expect(unknown.status).toBe(404);
      expect(await t.runtime.db.select().from(schema.schoolSessions).then((r) => r.length)).toBe(0);
    } finally {
      await t.close();
    }
  });

  it("opening the start link twice can't replace the AuthnRequest ID", async () => {
    const t = await ssoSetup();
    try {
      const { started } = await t.startSignIn();
      const url = new URL((started.body as { url: string }).url);
      const again = await fetch(`${t.appBase}${url.pathname}${url.search}`, { redirect: "manual" });
      expect(again.status).toBe(404);
    } finally {
      await t.close();
    }
  });

  it("never logs or returns assertion contents on failure", async () => {
    const t = await ssoSetup();
    try {
      const { token, requestId } = await t.startSignIn();
      const body = await (await t.acs(t.response(requestId!, { audience: "https://other/entity" }), token!)).text();
      expect(body).not.toContain("alice@acme.com");
      const events = await t.runtime.db.select().from(schema.schoolSsoEvents);
      expect(JSON.stringify(events)).not.toContain("alice@acme.com");
    } finally {
      await t.close();
    }
  });

  it("answers identically for unknown, disabled and suspended connections", async () => {
    const answers: string[] = [];
    for (const status of ["disabled", "suspended"] as const) {
      const t = await ssoSetup({ status });
      try {
        const path = t.connectionPath;
        for (const [method, suffix] of [["GET", "/start?request=abc"], ["GET", "/metadata"], ["POST", "/acs"]] as const) {
          const r = await fetch(`${t.appBase}${path}${suffix}`, { method, redirect: "manual", ...(method === "POST" ? { headers: { "content-type": "application/x-www-form-urlencoded" }, body: "SAMLResponse=x&RelayState=y" } : {}) });
          answers.push(`${r.status}:${await r.text()}`);
        }
        const missing = await fetch(`${t.appBase}/learner-login/sso/sso_missing/metadata`, { redirect: "manual" });
        answers.push(`${missing.status}:${await missing.text()}`);
        // And a start from the storefront is refused.
        const started = await t.startSignIn();
        expect(started.started.status).toBe(403);
      } finally {
        await t.close();
      }
    }
    expect(new Set(answers).size).toBe(1);
    expect(answers[0]!.startsWith("404:")).toBe(true);
  });

  it("serves SP metadata whose entity ID and ACS URL are the per-connection ones", async () => {
    const t = await ssoSetup();
    try {
      const response = await fetch(`${t.appBase}${t.connectionPath}/metadata`);
      expect(response.status).toBe(200);
      const xml = await response.text();
      expect(xml).toContain(t.urls.entityId);
      expect(xml).toContain(t.urls.acsUrl);
      expect(t.urls.acsUrl).toBe(`${t.runtime.auth.publicApiUrl}/learner-login/sso/${t.connection.publicId}/acs`);
    } finally {
      await t.close();
    }
  });

  it("refuses a body over 256 KB at the ACS", async () => {
    const t = await ssoSetup();
    try {
      const big = await fetch(`${t.appBase}${t.connectionPath}/acs`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: `SAMLResponse=${"A".repeat(300 * 1024)}&RelayState=x`,
      });
      expect(big.status).toBe(413);
    } finally {
      await t.close();
    }
  });

  it("refuses at the ACS when the connection is disabled mid-flight, and ends its sessions", async () => {
    const t = await ssoSetup();
    try {
      const { token, requestId } = await t.startSignIn();
      const ticket = ticketFrom((await t.acs(t.response(requestId!), token!)).headers.get("location"))!;
      expect((await t.redeem(ticket)).status).toBe(200);
      const second = await t.startSignIn();
      const disable = await dispatch(t.runtime, {
        method: "POST",
        path: `/v1/sso/connections/${t.connection.publicId}/disable`,
        headers: ownerHeaders(t.world),
        body: {},
      });
      expect(disable.status).toBe(200);
      expect(await t.runtime.db.select().from(schema.schoolSessions).then((r) => r.filter((s) => s.authenticationMethod === "sso").length)).toBe(0);
      const late = await t.acs(t.response(second.requestId!), second.token!);
      expect(late.status).toBe(404);
      expect(await count(t.runtime, schema.schoolAuthTickets)).toBe(1);
    } finally {
      await t.close();
    }
  });

  it("changing the certificate mid-flight refuses the response", async () => {
    const t = await ssoSetup();
    try {
      const { token, requestId } = await t.startSignIn();
      await t.runtime.db.update(schema.schoolSsoConnections).set({ subjectAttribute: "objectidentifier" }).where(eq(schema.schoolSsoConnections.id, t.connection.id));
      const response = await t.acs(t.response(requestId!), token!);
      expect(ticketFrom(response.headers.get("location"))).toBeNull();
    } finally {
      await t.close();
    }
  });

  it("a test sign-in issues no ticket, account or identity and stores its result for its starter only", async () => {
    const t = await ssoSetup({ status: "draft", tested: false });
    try {
      const accounts = await count(t.runtime, schema.schoolAccounts);
      const start = await dispatch(t.runtime, {
        method: "POST",
        path: `/v1/sso/connections/${t.connection.publicId}/test`,
        headers: ownerHeaders(t.world),
        body: { returnUrl: `${t.runtime.auth.webOrigin}/settings/sso/${t.connection.publicId}` },
      });
      expect(start.status).toBe(200);
      const url = new URL((start.body as { url: string }).url);
      const redirect = await fetch(`${t.appBase}${url.pathname}${url.search}`, { redirect: "manual" });
      expect(redirect.status).toBe(302);
      const [request] = await t.runtime.db.select().from(schema.schoolSsoRequests);
      const acs = await t.acs(t.response(request!.protocolRequestId!, { attributes: { email: ["alice@acme.com"], displayName: ["Alice"], secretish: ["x"] } }), url.searchParams.get("request")!);
      expect(acs.status).toBe(302);
      const back = new URL(acs.headers.get("location")!);
      expect(back.origin).toBe(new URL(t.runtime.auth.webOrigin).origin);
      expect(back.searchParams.get("ssoTest")).toBe(request!.id);
      // Only the request id is in the URL: no attributes, subject or email.
      expect(acs.headers.get("location")).not.toContain("alice");
      expect(acs.headers.get("location")).not.toContain("secretish");
      expect(await count(t.runtime, schema.schoolAuthTickets)).toBe(0);
      expect(await count(t.runtime, schema.schoolSessions)).toBe(0);
      expect(await count(t.runtime, schema.schoolSsoIdentities)).toBe(0);
      expect(await count(t.runtime, schema.schoolAccounts)).toBe(accounts);
      const [connection] = await t.runtime.db.select().from(schema.schoolSsoConnections);
      expect(connection!.testedAt).not.toBeNull();
      expect(connection!.testedConfigDigest).toBeTruthy();

      const result = await dispatch(t.runtime, {
        method: "GET",
        path: `/v1/sso/connections/${t.connection.publicId}/test-results/${request!.id}`,
        headers: ownerHeaders(t.world),
      });
      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({
        ok: true,
        email: "alice@acme.com",
        subject: "subject-1",
        emailDomainVerified: true,
        attributes: { secretish: ["x"] },
      });
      // Another admin, a member, an API key and a wrong id all get nothing.
      for (const headers of [
        { cookie: t.world.member.sessionCookie, "x-school-id": t.world.schoolA.publicId },
        { "x-api-key": t.world.apiKeyA.raw, "x-school-id": t.world.schoolA.publicId },
      ]) {
        const denied = await dispatch(t.runtime, {
          method: "GET",
          path: `/v1/sso/connections/${t.connection.publicId}/test-results/${request!.id}`,
          headers,
        });
        expect([401, 403]).toContain(denied.status);
      }
      // The same request can't be used for a sign-in.
      expect(
        (await t.acs(t.response(request!.protocolRequestId!), url.searchParams.get("request")!)).headers.get("location"),
      ).not.toContain("ticket");
      // The result expires after 15 minutes.
      await t.runtime.db.update(schema.schoolSsoRequests).set({ testResultExpiresAt: new Date(t.clock.now().getTime() - 1000) });
      expect(
        (await dispatch(t.runtime, {
          method: "GET",
          path: `/v1/sso/connections/${t.connection.publicId}/test-results/${request!.id}`,
          headers: ownerHeaders(t.world),
        })).status,
      ).toBe(404);
    } finally {
      await t.close();
    }
  });

  it("a failed test shows its reason to the starter", async () => {
    const t = await ssoSetup({ status: "draft", tested: false });
    try {
      const start = await dispatch(t.runtime, {
        method: "POST",
        path: `/v1/sso/connections/${t.connection.publicId}/test`,
        headers: ownerHeaders(t.world),
        body: { returnUrl: `${t.runtime.auth.webOrigin}/settings/sso` },
      });
      const url = new URL((start.body as { url: string }).url);
      await fetch(`${t.appBase}${url.pathname}${url.search}`, { redirect: "manual" });
      const [request] = await t.runtime.db.select().from(schema.schoolSsoRequests);
      const acs = await t.acs(t.response(request!.protocolRequestId!, { audience: "https://other/entity" }), url.searchParams.get("request")!);
      expect(new URL(acs.headers.get("location")!).searchParams.get("ssoTest")).toBe(request!.id);
      const result = await dispatch(t.runtime, {
        method: "GET",
        path: `/v1/sso/connections/${t.connection.publicId}/test-results/${request!.id}`,
        headers: ownerHeaders(t.world),
      });
      expect(result.body).toMatchObject({ ok: false, reason: "wrong_audience" });
      const [connection] = await t.runtime.db.select().from(schema.schoolSsoConnections);
      expect(connection!.testedAt).toBeNull();
    } finally {
      await t.close();
    }
  });

  it("limits SSO starts per IP and school, and ACS posts per IP", async () => {
    const t = await ssoSetup();
    try {
      let last = 200;
      for (let i = 0; i < 31 && last === 200; i += 1) {
        last = (await t.startSignIn()).started.status;
      }
      expect(last).toBe(429);
      // A different client address has its own allowance.
      const other = await dispatch(t.runtime, {
        method: "POST",
        path: "/v1/learner/auth/sso",
        headers: { "x-school-id": t.world.schoolA.publicId, "x-courselit-client-ip": "203.0.113.9" },
        body: { host: "school-a.localhost:3001", nonce: NONCE },
      });
      expect(other.status).toBe(200);

      await t.runtime.db.delete(schema.rateLimitEvents);
      const statuses: number[] = [];
      for (let i = 0; i < 62; i += 1) statuses.push((await t.acs("x", "y")).status);
      expect(statuses.slice(0, 60).every((status) => status === 404)).toBe(true);
      expect(statuses[61]).toBe(429);
    } finally {
      await t.close();
    }
  });
});
