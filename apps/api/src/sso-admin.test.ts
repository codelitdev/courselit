import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { idpKeys, rotatedKeys } from "./sso-protocol/test-idp.js";
import { bareCertificate, ownerHeaders, ssoSetup, type SsoSetup } from "./test-sso-flow.js";
import { seedRealLearner } from "./test-sso.js";

const MD = "urn:oasis:names:tc:SAML:2.0:metadata";
const metadata = (entity = "https://idp.example/entity", sso = "https://idp.example/sso", cert = idpKeys.cert) =>
  `<?xml version="1.0"?><md:EntityDescriptor xmlns:md="${MD}" entityID="${entity}"><md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"><md:KeyDescriptor use="signing"><ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:X509Data><ds:X509Certificate>${bareCertificate(cert)}</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor><md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${sso}"/></md:IDPSSODescriptor></md:EntityDescriptor>`;

const call = (t: SsoSetup, method: string, path: string, body?: unknown, headers: Record<string, string> = ownerHeaders(t.world)) =>
  dispatch(t.runtime, { method, path, headers, ...(body === undefined ? {} : { body }) });

async function ssoSession(t: SsoSetup, email: string, method: "sso" | "email") {
  const learner = await seedRealLearner(t.runtime.db, t.clock, t.world.schoolA.publicId, email);
  if (method === "sso") {
    await t.runtime.db
      .update(schema.schoolSessions)
      .set({ authenticationMethod: "sso", ssoConnectionId: t.connection.id })
      .where(eq(schema.schoolSessions.id, learner.session.sessionId));
  }
  return learner;
}
const sessionCount = async (t: SsoSetup, method?: string) =>
  (await t.runtime.db.select().from(schema.schoolSessions)).filter(
    (row) => !method || row.authenticationMethod === method,
  ).length;

describe.serial("SSO management operations", () => {
  it("refuses every write to API keys, OAuth clients, non-owners and stale sessions", async () => {
    const t = await ssoSetup();
    try {
      const path = `/v1/sso/connections/${t.connection.publicId}`;
      const writes: Array<[string, string, unknown]> = [
        ["POST", "/v1/sso/connections", { displayName: "x", idpEntityId: "e" }],
        ["PATCH", path, { displayName: "y" }],
        ["POST", `${path}/domains`, { domain: "other.com" }],
        ["POST", `${path}/domains/acme.com/verify`, {}],
        ["DELETE", `${path}/domains/acme.com`, undefined],
        ["POST", `${path}/test`, { returnUrl: `${t.runtime.auth.webOrigin}/x` }],
        ["POST", `${path}/activate`, {}],
        ["POST", `${path}/disable`, {}],
        ["DELETE", path, undefined],
        ["DELETE", "/v1/sso/identities/cnt_x", undefined],
      ];
      const credentials: Record<string, Record<string, string>> = {
        apiKey: { "x-api-key": t.world.apiKeyA.raw, "x-school-id": t.world.schoolA.publicId },
        oauth: { authorization: `Bearer ${t.world.owner.oauthToken}`, "x-school-id": t.world.schoolA.publicId },
        member: { cookie: t.world.member.sessionCookie, "x-school-id": t.world.schoolA.publicId },
      };
      for (const [kind, headers] of Object.entries(credentials)) {
        for (const [method, route, body] of writes) {
          const response = await call(t, method, route, body, headers);
          expect([kind, method, route, response.status]).toEqual([kind, method, route, 403]);
        }
      }
      // The owner's session works, but not once it is no longer a recent sign-in.
      await t.runtime.db
        .update(schema.session)
        .set({ createdAt: new Date(t.clock.now().getTime() - 60 * 60 * 1000) })
        .where(eq(schema.session.userId, t.world.owner.id));
      for (const [method, route, body] of writes) {
        const response = await call(t, method, route, body);
        expect(response.status).toBe(403);
        expect(response.body).toMatchObject({ details: { reason: "recent_authentication_required" } });
      }
      const [still] = await t.runtime.db.select().from(schema.schoolSsoConnections);
      expect(still!.displayName).toBe("Acme employees");
    } finally {
      await t.close();
    }
  });

  it("lets every credential read connections, and reads never carry secrets or test attributes", async () => {
    const t = await ssoSetup();
    try {
      await t.runtime.db
        .update(schema.schoolSsoConnections)
        .set({ oidcClientSecret: "ENCRYPTED-SECRET", oidcClientId: "client" });
      await t.runtime.db.insert(schema.schoolSsoRequests).values({
        id: crypto.randomUUID(),
        requestDigest: "d",
        schoolId: t.world.schoolA.id,
        connectionId: t.connection.id,
        nonceDigest: "n",
        returnOrigin: "http://x",
        nextPath: "/",
        purpose: "test",
        testResult: { ok: true, email: "leak@acme.com", attributes: { secret: ["leak-me"] } },
        testResultExpiresAt: new Date(t.clock.now().getTime() + 60_000),
        expiresAt: new Date(t.clock.now().getTime() + 60_000),
        createdAt: t.clock.now(),
      });
      for (const headers of [
        ownerHeaders(t.world),
        { authorization: `Bearer ${t.world.owner.oauthToken}`, "x-school-id": t.world.schoolA.publicId },
      ]) {
        const list = await call(t, "GET", "/v1/sso/connections", undefined, headers);
        const one = await call(t, "GET", `/v1/sso/connections/${t.connection.publicId}`, undefined, headers);
        expect([list.status, one.status]).toEqual([200, 200]);
        const text = JSON.stringify([list.body, one.body]);
        expect(text).not.toContain("ENCRYPTED-SECRET");
        expect(text).not.toContain("leak");
        expect(text.toLowerCase()).not.toContain("clientsecret");
        expect(one.body).toMatchObject({
          id: t.connection.publicId,
          status: "active",
          testedCurrentConfiguration: true,
          planAvailable: true,
          serviceProvider: { acsUrl: t.urls.acsUrl, entityId: t.urls.entityId, metadataUrl: t.urls.metadataUrl },
        });
        const domain = (one.body as { domains: Array<{ verificationRecord: { name: string } }> }).domains[0]!;
        expect(domain.verificationRecord.name).toBe("_courselit-verification.acme.com");
      }
    } finally {
      await t.close();
    }
  });

  it("creates a draft from pasted metadata, checks URLs, and keeps the entity ID immutable", async () => {
    const t = await ssoSetup({ noConnection: true });
    try {
      const created = await call(t, "POST", "/v1/sso/connections", { displayName: "Acme", metadataXml: metadata() });
      expect(created.status).toBe(201);
      const connection = created.body as { id: string; status: string; idpEntityId: string; idpSsoUrl: string; idpCertificates: string[] };
      expect(connection).toMatchObject({
        status: "draft",
        idpEntityId: "https://idp.example/entity",
        idpSsoUrl: "https://idp.example/sso",
        idpCertificates: [bareCertificate(idpKeys.cert)],
      });
      const path = `/v1/sso/connections/${connection.id}`;
      expect((await call(t, "PATCH", path, { idpSsoUrl: "http://idp.example/sso" })).body).toMatchObject({ details: { reason: "unsafe_sso_url" } });
      expect((await call(t, "PATCH", path, { idpSsoUrl: "javascript:alert(1)" })).status).toBe(400);
      expect((await call(t, "PATCH", path, { idpCertificates: ["not a cert"] })).status).toBe(400);
      expect((await call(t, "PATCH", path, { idpEntityId: "https://evil/entity" })).body).toMatchObject({ details: { reason: "idp_entity_id_immutable" } });
      expect((await call(t, "PATCH", path, { metadataXml: metadata("https://evil/entity") })).body).toMatchObject({ details: { reason: "idp_entity_id_immutable" } });
      // The same entity ID in new metadata is fine.
      expect((await call(t, "PATCH", path, { metadataXml: metadata("https://idp.example/entity", "https://idp.example/sso2") })).status).toBe(200);
      expect((await call(t, "POST", "/v1/sso/connections", { displayName: "No IdP" })).status).toBe(400);
      expect((await call(t, "POST", "/v1/sso/connections", { displayName: "Bad", metadataXml: "<!DOCTYPE x [<!ENTITY a 'b'>]><x/>" })).status).toBe(400);
    } finally {
      await t.close();
    }
  });

  it("sends an active connection back to draft when what it trusts changes, and ends its sessions", async () => {
    const t = await ssoSetup();
    try {
      await ssoSession(t, "ssoer@acme.com", "sso");
      const emailer = await ssoSession(t, "emailer@acme.com", "email");
      expect(await sessionCount(t, "sso")).toBe(1);
      const path = `/v1/sso/connections/${t.connection.publicId}`;
      // Changing only the display name keeps it active.
      expect((await call(t, "PATCH", path, { displayName: "Renamed" })).body).toMatchObject({ status: "active" });
      expect(await sessionCount(t, "sso")).toBe(1);
      for (const change of [
        { idpCertificates: [bareCertificate(idpKeys.cert), bareCertificate(rotatedKeys.cert)] },
        { idpSsoUrl: "https://idp.example/other" },
        { subjectAttribute: "objectidentifier" },
      ]) {
        await t.runtime.db.update(schema.schoolSsoConnections).set({
          status: "active", testedAt: t.clock.now(), testedConfigDigest: "x",
        });
        await ssoSession(t, `again-${Math.random()}@acme.com`, "sso");
        const updated = await call(t, "PATCH", path, change);
        expect(updated.body).toMatchObject({ status: "draft", testedAt: null, testedCurrentConfiguration: false });
        expect(await sessionCount(t, "sso")).toBe(0);
        const [row] = await t.runtime.db.select().from(schema.schoolSsoConnections);
        expect(row!.testedConfigDigest).toBeNull();
        // The learner's non-SSO session is untouched.
        expect(await sessionCount(t, "email")).toBeGreaterThan(0);
      }
      expect(emailer.session.sessionId).toBeTruthy();
    } finally {
      await t.close();
    }
  });

  it("sends a turned-off connection back to draft when what it trusts changes, so it can be tested and turned on again", async () => {
    const t = await ssoSetup();
    try {
      const path = `/v1/sso/connections/${t.connection.publicId}`;
      expect((await call(t, "POST", `${path}/disable`, {})).status).toBe(200);
      // Unchanged settings: the earlier test still counts, so it turns straight back on.
      expect((await call(t, "POST", `${path}/activate`, {})).body).toMatchObject({ status: "active" });
      expect((await call(t, "POST", `${path}/disable`, {})).status).toBe(200);
      // A display name change keeps it off.
      expect((await call(t, "PATCH", path, { displayName: "Renamed" })).body).toMatchObject({ status: "disabled" });
      // A trust change makes it a draft that can be tested again.
      const updated = await call(t, "PATCH", path, { idpSsoUrl: "https://idp.example/other" });
      expect(updated.body).toMatchObject({ status: "draft", testedAt: null });
      const test = await call(t, "POST", `${path}/test`, { returnUrl: `${t.runtime.auth.webOrigin}/x` });
      expect(test.status).toBe(200);
    } finally {
      await t.close();
    }
  });

  it("turning enforcement on ends non-SSO sessions of enforced domains only", async () => {
    const t = await ssoSetup();
    try {
      await ssoSession(t, "inside@acme.com", "email");
      await ssoSession(t, "outside@example.org", "email");
      const updated = await call(t, "PATCH", `/v1/sso/connections/${t.connection.publicId}`, { enforcement: "required_for_domains" });
      expect(updated.body).toMatchObject({ enforcement: "required_for_domains", status: "active" });
      const remaining = await t.runtime.db
        .select({ email: schema.schoolAccounts.email })
        .from(schema.schoolSessions)
        .innerJoin(schema.schoolAccounts, eq(schema.schoolAccounts.id, schema.schoolSessions.schoolAccountId));
      expect(remaining.map((row) => row.email)).toEqual(["outside@example.org"]);
    } finally {
      await t.close();
    }
  });

  it("verifies domains through DNS with a per-domain token, rejects bad ones, and rate limits verification", async () => {
    const t = await ssoSetup({ status: "draft", tested: false, domains: [] });
    try {
      const txt = new Map<string, string[][]>();
      t.runtime.dnsResolver = {
        resolveTxt: async (name) => txt.get(name) ?? [],
        resolveCname: async () => [],
        resolve4: async () => [],
      };
      const path = `/v1/sso/connections/${t.connection.publicId}`;
      const added = await call(t, "POST", `${path}/domains`, { domain: "@Acme.COM" });
      expect(added.status).toBe(201);
      const first = added.body as { domain: string; verified: boolean; verificationRecord: { type: string; name: string; value: string } };
      expect(first).toMatchObject({ domain: "acme.com", verified: false });
      expect(first.verificationRecord).toMatchObject({ type: "TXT", name: "_courselit-verification.acme.com" });
      const other = (await call(t, "POST", `${path}/domains`, { domain: "other.com" })).body as typeof first;
      expect(other.verificationRecord.value).not.toBe(first.verificationRecord.value);
      expect(first.verificationRecord.value).toMatch(/^[0-9a-f]{32}$/);

      for (const bad of ["localhost", "1.2.3.4", "com", "co.uk", "https://acme.com/x", "a b.com"]) {
        expect([bad, (await call(t, "POST", `${path}/domains`, { domain: bad })).status]).toEqual([bad, 400]);
      }
      expect((await call(t, "POST", `${path}/domains`, { domain: "acme.com" })).status).toBe(409);

      // Not published yet; another domain's token doesn't count.
      expect((await call(t, "POST", `${path}/domains/acme.com/verify`, {})).body).toMatchObject({ verified: false });
      txt.set("_courselit-verification.acme.com", [[other.verificationRecord.value]]);
      expect((await call(t, "POST", `${path}/domains/acme.com/verify`, {})).body).toMatchObject({ verified: false });
      txt.set("_courselit-verification.acme.com", [[first.verificationRecord.value.slice(0, 10), first.verificationRecord.value.slice(10)]]);
      expect((await call(t, "POST", `${path}/domains/acme.com/verify`, {})).body).toMatchObject({ verified: true });
      expect((await call(t, "DELETE", `${path}/domains/other.com`)).status).toBe(204);
      expect((await call(t, "DELETE", `${path}/domains/other.com`)).status).toBe(404);

      let status = 200;
      for (let i = 0; i < 40 && status !== 429; i += 1) {
        status = (await call(t, "POST", `${path}/domains/acme.com/verify`, {})).status;
      }
      expect(status).toBe(429);
    } finally {
      await t.close();
    }
  });

  it("activates only with a verified domain, a test of the current settings, and the plan", async () => {
    const t = await ssoSetup({ status: "draft", tested: false, domains: [] });
    try {
      const path = `/v1/sso/connections/${t.connection.publicId}`;
      const activate = async () => call(t, "POST", `${path}/activate`, {});
      expect((await activate()).body).toMatchObject({ details: { reason: "no_verified_domain" } });
      await t.runtime.db.insert(schema.schoolSsoDomains).values({
        id: crypto.randomUUID(), connectionId: t.connection.id, schoolId: t.world.schoolA.id,
        domain: "acme.com", verificationToken: "t", verifiedAt: t.clock.now(), createdAt: t.clock.now(),
      });
      expect((await activate()).body).toMatchObject({ details: { reason: "not_tested" } });
      const { connectionConfigDigest } = await import("./sso-config.js");
      const [row] = await t.runtime.db.select().from(schema.schoolSsoConnections);
      await t.runtime.db.update(schema.schoolSsoConnections).set({ testedAt: t.clock.now(), testedConfigDigest: "stale" });
      expect((await activate()).body).toMatchObject({ details: { reason: "not_tested" } });
      await t.runtime.db.update(schema.schoolSsoConnections).set({ testedConfigDigest: connectionConfigDigest(row!) });
      const activated = await activate();
      expect(activated.status).toBe(200);
      expect(activated.body).toMatchObject({ status: "active" });
      expect((await call(t, "POST", `${path}/disable`, {})).body).toMatchObject({ status: "disabled" });
      // Re-activation after disabling works while the rules hold.
      expect((await activate()).body).toMatchObject({ status: "active" });
    } finally {
      await t.close();
    }
  });

  it("refuses activation without the plan, while drafts can be prepared on any plan", async () => {
    const t = await ssoSetup({ billingMode: "cloud", status: "draft", tested: true });
    try {
      const path = `/v1/sso/connections/${t.connection.publicId}`;
      // School A is on Pro, which doesn't include SSO.
      const refused = await call(t, "POST", `${path}/activate`, {});
      expect(refused.status).toBe(403);
      expect(refused.body).toMatchObject({ details: { reason: "plan_required" } });
      expect((await call(t, "GET", path)).body).toMatchObject({ planAvailable: false, status: "draft" });
      expect((await call(t, "PATCH", path, { displayName: "Prepared" })).status).toBe(200);
      expect((await call(t, "POST", `${path}/domains`, { domain: "prep.com" })).status).toBe(201);
    } finally {
      await t.close();
    }
  });

  it("allows only one active connection per school", async () => {
    const t = await ssoSetup();
    try {
      const second = await call(t, "POST", "/v1/sso/connections", { displayName: "Second", metadataXml: metadata("https://idp2.example/entity") });
      const id = (second.body as { id: string }).id;
      await t.runtime.db.update(schema.schoolSsoConnections).set({ testedAt: t.clock.now() }).where(eq(schema.schoolSsoConnections.publicId, id));
      await t.runtime.db.insert(schema.schoolSsoDomains).values({
        id: crypto.randomUUID(), connectionId: (await t.runtime.db.select().from(schema.schoolSsoConnections).where(eq(schema.schoolSsoConnections.publicId, id)))[0]!.id,
        schoolId: t.world.schoolA.id, domain: "second.com", verificationToken: "t", verifiedAt: t.clock.now(), createdAt: t.clock.now(),
      });
      const [row] = await t.runtime.db.select().from(schema.schoolSsoConnections).where(eq(schema.schoolSsoConnections.publicId, id));
      const { connectionConfigDigest } = await import("./sso-config.js");
      await t.runtime.db.update(schema.schoolSsoConnections).set({ testedConfigDigest: connectionConfigDigest(row!) }).where(eq(schema.schoolSsoConnections.id, row!.id));
      const result = await call(t, "POST", `/v1/sso/connections/${id}/activate`, {});
      expect(result.status).toBe(409);
      expect(result.body).toMatchObject({ details: { reason: "another_connection_active" } });
    } finally {
      await t.close();
    }
  });

  it("only returns to the admin app from a test sign-in", async () => {
    const t = await ssoSetup({ status: "draft", tested: false });
    try {
      const path = `/v1/sso/connections/${t.connection.publicId}/test`;
      for (const returnUrl of ["https://evil.example/x", "https://user:pw@evil.example/", "javascript:alert(1)", `${t.runtime.auth.webOrigin}.evil.example/x`]) {
        const response = await call(t, "POST", path, { returnUrl });
        expect([returnUrl, response.status]).toEqual([returnUrl, 400]);
      }
      expect((await call(t, "POST", path, { returnUrl: `${t.runtime.auth.webOrigin}/settings` })).status).toBe(200);
    } finally {
      await t.close();
    }
  });

  it("disables and deletes connections, ending sessions, and unlinks identities", async () => {
    const t = await ssoSetup();
    try {
      const learner = await ssoSession(t, "linked@acme.com", "sso");
      const [account] = await t.runtime.db.select().from(schema.schoolAccounts).where(eq(schema.schoolAccounts.email, "linked@acme.com"));
      await t.runtime.db.insert(schema.schoolSsoIdentities).values({
        id: crypto.randomUUID(), schoolId: t.world.schoolA.id, connectionId: t.connection.id,
        issuer: "https://idp.example/entity", subject: "s-1", schoolAccountId: account!.id,
        lastEmail: "linked@acme.com", createdAt: t.clock.now(),
      });
      expect((await call(t, "DELETE", `/v1/sso/identities/${account!.publicId}`)).status).toBe(204);
      expect(await sessionCount(t, "sso")).toBe(0);
      expect(await t.runtime.db.select().from(schema.schoolSsoIdentities)).toHaveLength(0);
      expect((await call(t, "DELETE", `/v1/sso/identities/${account!.publicId}`)).status).toBe(404);

      await ssoSession(t, "second@acme.com", "sso");
      expect((await call(t, "POST", `/v1/sso/connections/${t.connection.publicId}/disable`, {})).body).toMatchObject({ status: "disabled" });
      expect(await sessionCount(t, "sso")).toBe(0);
      expect((await call(t, "DELETE", `/v1/sso/connections/${t.connection.publicId}`)).status).toBe(204);
      expect((await call(t, "GET", `/v1/sso/connections/${t.connection.publicId}`)).status).toBe(404);
      expect(learner.token).toBeTruthy();
    } finally {
      await t.close();
    }
  });

  it("audits every write and emails the owner what changed", async () => {
    const t = await ssoSetup({ status: "draft", tested: false, domains: [] });
    try {
      const path = `/v1/sso/connections/${t.connection.publicId}`;
      await call(t, "PATCH", path, { displayName: "New name", subjectAttribute: "oid" });
      await call(t, "POST", `${path}/domains`, { domain: "audit.com" });
      await call(t, "POST", `${path}/disable`, {});
      const events = await t.runtime.db.select().from(schema.schoolSsoEvents);
      expect(events.map((event) => event.action).sort()).toEqual(["connection.disabled", "connection.updated", "domain.added"]);
      expect(events.every((event) => event.actorSchoolAccountId)).toBe(true);
      const mails = (await t.runtime.db.select().from(schema.integrationOutboxJobs)).filter(
        (job) => job.type === "send_system_email" || job.type === "send_school_email",
      );
      expect(mails).toHaveLength(3);
      const payloads = mails.map((job) => job.payload as { to: string; text: string });
      expect(payloads.every((payload) => payload.to === "owner@example.com")).toBe(true);
      expect(payloads.some((payload) => payload.text.includes("name") && payload.text.includes("subject attribute"))).toBe(true);
    } finally {
      await t.close();
    }
  });
});
