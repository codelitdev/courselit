import { describe, expect, it } from "bun:test";
import { createPublicId, uuidv7 } from "@codelitdev/platform";
import { and, eq, like, sql } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { learnerCookie, seedRealLearner, seedSsoConnection } from "./test-sso.js";
import { linkSsoIdentity } from "./learner-sso.js";
import {
  authenticateLearner,
  findOrCreateVerifiedUser,
  issueSchoolSession,
  signInLearnerWithIdentity,
} from "./learners.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { staffSpaceIds } from "./space-access.js";
import { createShadowUser, isShadowUser } from "./shadow-users.js";
import { parseSsoEmail } from "./sso-email.js";

const clockAt = () => freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));

async function setup() {
  const clock = clockAt();
  const runtime = await createPgliteRuntime({ clock });
  const world = await seedWorld(runtime, clock);
  const connection = await seedSsoConnection(runtime.db, clock, {
    schoolId: world.schoolA.id,
    domains: ["acme.com", "xn--bcher-kva.example"],
    unverifiedDomains: ["pending.com"],
  });
  const link = (
    over: Partial<{ subject: string; email: string; name: string | null; issuer: string }>,
  ) =>
    linkSsoIdentity(
      runtime.db,
      {
        connection,
        issuer: over.issuer ?? connection.idpEntityId!,
        subject: over.subject ?? "subject-1",
        email: over.email ?? "alice@acme.com",
        name: over.name === undefined ? "Alice" : over.name,
      },
      clock,
    );
  const count = async (table: Parameters<typeof runtime.db.select>[0] extends never ? never : any) =>
    (await runtime.db.select({ n: sql<number>`count(*)::int` }).from(table))[0]!.n;
  return { clock, runtime, world, connection, link, count };
}

describe.serial("linkSsoIdentity", () => {
  it("creates a shadow user, account and identity in a verified domain, once", async () => {
    const { runtime, world, link, count } = await setup();
    const users = await count(schema.user);
    const first = await link({});
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error();
    expect(first.created).toBe(true);
    expect(first.value.email).toBe("alice@acme.com");
    expect(await count(schema.user)).toBe(users + 1);
    const [user] = await runtime.db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, first.value.userId));
    expect(user!.email).toMatch(/^sso-.+@users\.invalid$/);
    expect(user!.emailVerified).toBe(false);
    expect(await isShadowUser(runtime.db, user!.id)).toBe(true);
    const credentials = await runtime.db
      .select()
      .from(schema.account)
      .where(eq(schema.account.userId, user!.id));
    expect(credentials).toHaveLength(0);

    const second = await link({});
    expect(second.ok && !second.created && second.value.id === first.value.id).toBe(true);
    expect(await count(schema.user)).toBe(users + 1);
    expect(await count(schema.schoolSsoIdentities)).toBe(1);
    // Marketing email stays off for an SSO-created account.
    const jobs = await runtime.db.select().from(schema.integrationOutboxJobs);
    const sync = jobs.find(
      (job) =>
        job.type === "sync_sendlit_contact" &&
        (job.payload as Record<string, unknown>).schoolAccountId === first.value.id,
    );
    expect(sync).toBeDefined();
    expect((sync!.payload as Record<string, unknown>).subscribed).toBe(false);
    expect(world.schoolA.id).toBe(first.value.schoolId);
    await runtime.close();
  });

  it("records a learner_signed_in activity with method sso", async () => {
    const { runtime, link } = await setup();
    const linked = await link({});
    if (!linked.ok) throw new Error();
    const rows = await runtime.db
      .select()
      .from(schema.activities)
      .where(eq(schema.activities.type, "learner_signed_in"));
    expect(rows).toHaveLength(1);
    expect((rows[0]!.metadata as { method: string }).method).toBe("sso");
    await runtime.close();
  });

  it("rejects an unverified domain and creates nothing", async () => {
    const { runtime, link, count } = await setup();
    const users = await count(schema.user);
    const accounts = await count(schema.schoolAccounts);
    for (const email of ["bob@pending.com", "bob@other.org", "bob@sub.acme.com", "bob@acme.com.evil.org"]) {
      const result = await link({ email });
      expect(result).toEqual({ ok: false, reason: "sso_domain_not_verified" });
    }
    expect(await count(schema.user)).toBe(users);
    expect(await count(schema.schoolAccounts)).toBe(accounts);
    expect(await count(schema.schoolSsoIdentities)).toBe(0);
    await runtime.close();
  });

  it("links to an existing learner and never changes the platform user", async () => {
    const { runtime, clock, world, link, count } = await setup();
    const real = await seedRealLearner(
      runtime.db,
      clock,
      world.schoolA.publicId,
      "carol@acme.com",
      "Carol Real",
    );
    const before = (
      await runtime.db.select().from(schema.user).where(eq(schema.user.id, real.user.id))
    )[0]!;
    const users = await count(schema.user);
    const result = await link({ subject: "carol", email: "carol@acme.com", name: "Carol From IdP" });
    expect(result.ok && !result.created && result.value.userId === real.user.id).toBe(true);
    expect(await count(schema.user)).toBe(users);
    const after = (
      await runtime.db.select().from(schema.user).where(eq(schema.user.id, real.user.id))
    )[0]!;
    expect(after).toEqual(before);
    if (result.ok) expect(result.value.displayName).toBe("Carol Real");

    // A later email change at the IdP doesn't touch a real user's account.
    const changed = await link({ subject: "carol", email: "carol.new@acme.com", name: "Other" });
    expect(changed.ok && changed.value.email === "carol@acme.com").toBe(true);
    await runtime.close();
  });

  it("never touches an unverified platform user with the same address", async () => {
    const { runtime, clock, link } = await setup();
    const now = clock.now();
    await runtime.db.insert(schema.user).values({
      id: uuidv7(clock),
      name: "Squatter",
      email: "dave@acme.com",
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });
    const result = await link({ subject: "dave", email: "dave@acme.com" });
    expect(result.ok).toBe(true);
    const [squatter] = await runtime.db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, "dave@acme.com"));
    expect(squatter!.emailVerified).toBe(false);
    expect(squatter!.name).toBe("Squatter");
    await runtime.close();
  });

  it("a found identity wins over email, and follows email changes only for shadow-backed accounts in verified domains", async () => {
    const { runtime, clock, world, link } = await setup();
    const first = await link({ subject: "erin", email: "erin@acme.com", name: "Erin" });
    if (!first.ok) throw new Error();
    // Another account already has the new address: identity still wins, email stays.
    await seedRealLearner(runtime.db, clock, world.schoolA.publicId, "taken@acme.com");
    const blocked = await link({ subject: "erin", email: "taken@acme.com" });
    expect(blocked.ok && blocked.value.id === first.value.id && blocked.value.email === "erin@acme.com").toBe(true);
    // Outside a verified domain: no change.
    const outside = await link({ subject: "erin", email: "erin@other.org" });
    expect(outside.ok && outside.value.email === "erin@acme.com").toBe(true);
    // Verified domain, free address: followed.
    const moved = await link({ subject: "erin", email: "erin.renamed@acme.com", name: "Erin R" });
    expect(moved.ok && moved.value.id === first.value.id).toBe(true);
    if (moved.ok) {
      expect(moved.value.email).toBe("erin.renamed@acme.com");
      expect(moved.value.displayName).toBe("Erin R");
    }
    const [identity] = await runtime.db.select().from(schema.schoolSsoIdentities);
    expect(identity!.lastEmail).toBe("erin.renamed@acme.com");
    await runtime.close();
  });

  it("never matches an identity from another issuer", async () => {
    const { runtime, connection, link, count } = await setup();
    const first = await link({ subject: "frank", email: "frank@acme.com" });
    expect(first.ok).toBe(true);
    // The assertion names a different issuer than the connection's.
    expect(await link({ subject: "frank", issuer: "https://evil.example/entity" })).toEqual({
      ok: false,
      reason: "sso_issuer_mismatch",
    });
    // A stored identity from an older issuer is not matched or re-linked either.
    await runtime.db
      .update(schema.schoolSsoIdentities)
      .set({ issuer: "https://old.example/entity" })
      .where(eq(schema.schoolSsoIdentities.connectionId, connection.id));
    const users = await count(schema.user);
    expect(await link({ subject: "frank", email: "frank@acme.com" })).toEqual({
      ok: false,
      reason: "sso_issuer_mismatch",
    });
    expect(await count(schema.user)).toBe(users);
    await runtime.close();
  });

  it("refuses a team member on every sign-in, including after the first", async () => {
    const { runtime, clock, world, link } = await setup();
    // A team member's account with an address in a verified domain.
    const staff = await seedRealLearner(runtime.db, clock, world.schoolA.publicId, "staff@acme.com");
    await runtime.db.insert(schema.memberships).values({
      id: uuidv7(clock),
      publicId: createPublicId("mbr", clock),
      schoolId: world.schoolA.id,
      schoolAccountId: staff.session.schoolAccount.id,
      isOwner: false,
      permissions: ["products:write"],
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    expect(await link({ subject: "staff", email: "staff@acme.com" })).toEqual({
      ok: false,
      reason: "sso_account_is_team_member",
    });
    // Linked first, joined the team afterwards: the next sign-in is refused.
    const learner = await link({ subject: "grace", email: "grace@acme.com" });
    if (!learner.ok) throw new Error();
    await runtime.db.insert(schema.memberships).values({
      id: uuidv7(clock),
      publicId: createPublicId("mbr", clock),
      schoolId: world.schoolA.id,
      schoolAccountId: learner.value.id,
      isOwner: false,
      permissions: [],
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    expect(await link({ subject: "grace", email: "grace@acme.com" })).toEqual({
      ok: false,
      reason: "sso_account_is_team_member",
    });
    await runtime.close();
  });

  it("refuses inactive accounts and inactive connections", async () => {
    const { runtime, connection, link } = await setup();
    const learner = await link({ subject: "hank", email: "hank@acme.com" });
    if (!learner.ok) throw new Error();
    await runtime.db
      .update(schema.schoolAccounts)
      .set({ status: "deactivated" })
      .where(eq(schema.schoolAccounts.id, learner.value.id));
    expect(await link({ subject: "hank", email: "hank@acme.com" })).toEqual({
      ok: false,
      reason: "sso_account_inactive",
    });
    await runtime.db
      .update(schema.schoolSsoConnections)
      .set({ status: "suspended" })
      .where(eq(schema.schoolSsoConnections.id, connection.id));
    expect(await link({ subject: "ivy", email: "ivy@acme.com" })).toEqual({
      ok: false,
      reason: "sso_connection_inactive",
    });
    await runtime.close();
  });

  it("parses emails strictly and matches IDN domains by punycode", async () => {
    const { runtime, link, count } = await setup();
    const users = await count(schema.user);
    for (const email of [
      '"alice"@acme.com',
      'a"b@acme.com',
      "alice@acme.com@evil.org",
      "alice@@acme.com",
      " alice@acme.com",
      "alice@acme.com ",
      "ali ce@acme.com",
      "alice@acme.com\n",
      "(c)alice@acme.com",
      "alice@",
      "@acme.com",
      "alice..x@acme.com",
      ".alice@acme.com",
      "alice@[127.0.0.1]",
      "alice@acme",
      "alice\u0000@acme.com",
      "alice@https://acme.com",
      "alice@acme.com/",
      "alice@acme.com:443",
      "",
    ]) {
      expect(await link({ subject: `s-${email}`, email })).toEqual({
        ok: false,
        reason: "sso_invalid_email",
      });
    }
    expect(await count(schema.user)).toBe(users);
    // The domain is stored as punycode and matched exactly.
    const idn = await link({ subject: "idn", email: "Jörg@Bücher.example" });
    expect(parseSsoEmail("Jörg@Bücher.example")).toBeNull(); // non-ASCII local part
    expect(idn.ok).toBe(false);
    const ok = await link({ subject: "idn", email: "Joerg@Bücher.example" });
    expect(ok.ok && ok.value.email).toBe("joerg@xn--bcher-kva.example");
    // A look-alike domain isn't a verified one.
    expect(await link({ subject: "cyr", email: "x@аcme.com" })).toEqual({
      ok: false,
      reason: "sso_domain_not_verified",
    });
    await runtime.close();
  });
});

describe.serial("account races", () => {
  it("never moves a real user's account onto a shadow user when it wins the race", async () => {
    const { runtime, clock, world, connection } = await setup();
    const racing = new Proxy(runtime.db, {
      get(target, prop) {
        const value = (target as any)[prop];
        if (prop === "transaction") {
          return async (...args: unknown[]) => {
            // The email-code sign-in lands between SSO's lookup and its insert.
            racing_hook.fire && (await racing_hook.fire());
            racing_hook.fire = null;
            return (value as (...a: unknown[]) => unknown).apply(target, args);
          };
        }
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const racing_hook: { fire: null | (() => Promise<void>) } = {
      fire: async () => {
        await seedRealLearner(runtime.db, clock, world.schoolA.publicId, "race@acme.com", "Racer");
      },
    };
    const result = await linkSsoIdentity(
      racing,
      {
        connection,
        issuer: connection.idpEntityId!,
        subject: "race",
        email: "race@acme.com",
        name: "Racer",
      },
      clock,
    );
    expect(result.ok && !result.created).toBe(true);
    const [real] = await runtime.db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, "race@acme.com"));
    expect(real!.emailVerified).toBe(true);
    const accounts = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.email, "race@acme.com"));
    expect(accounts).toHaveLength(1);
    expect(accounts[0]!.userId).toBe(real!.id);
    const shadows = await runtime.db.select().from(schema.ssoShadowUsers);
    expect(shadows).toHaveLength(0);
    const users = await runtime.db
      .select()
      .from(schema.user)
      .where(like(schema.user.email, "%@users.invalid"));
    expect(users).toHaveLength(0);
    await runtime.close();
  });

  it("moves a shadow-backed account to the real user on an email sign-in and deletes the shadow user", async () => {
    const { runtime, clock, world, link } = await setup();
    const created = await link({ subject: "judy", email: "judy@acme.com", name: "Judy" });
    if (!created.ok) throw new Error();
    const shadowId = created.value.userId;
    // The SSO learner signs in, then proves the address by email code.
    const real = await seedRealLearner(runtime.db, clock, world.schoolA.publicId, "judy@acme.com");
    expect(real.session.schoolAccount.id).toBe(created.value.id);
    expect(real.session.schoolAccount.userId).toBe(real.user.id);
    expect(await isShadowUser(runtime.db, shadowId)).toBe(false);
    const gone = await runtime.db.select().from(schema.user).where(eq(schema.user.id, shadowId));
    expect(gone).toHaveLength(0);
    const identities = await runtime.db.select().from(schema.schoolSsoIdentities);
    expect(identities).toHaveLength(1);
    expect(identities[0]!.schoolAccountId).toBe(created.value.id);
    await runtime.close();
  });

  it("deletes a shadow user together with its last school account", async () => {
    const { runtime, link } = await setup();
    const created = await link({ subject: "ken", email: "ken@acme.com" });
    if (!created.ok) throw new Error();
    const { deleteShadowUserIfOrphaned } = await import("./shadow-users.js");
    // Still owns an account: kept.
    expect(await deleteShadowUserIfOrphaned(runtime.db, created.value.userId)).toBe(false);
    await runtime.db
      .delete(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.id, created.value.id));
    expect(await deleteShadowUserIfOrphaned(runtime.db, created.value.userId)).toBe(true);
    expect(await isShadowUser(runtime.db, created.value.userId)).toBe(false);
    await runtime.close();
  });
});

describe.serial("shadow users", () => {
  it("findOrCreateVerifiedUser never returns or modifies a shadow user", async () => {
    const { runtime, clock, world } = await setup();
    const shadow = await createShadowUser(
      runtime.db,
      { schoolId: world.schoolA.id, name: "Shadow" },
      clock,
    );
    await expect(findOrCreateVerifiedUser(runtime.db, shadow.email, clock)).rejects.toThrow(
      "shadow_user_email",
    );
    await expect(
      findOrCreateVerifiedUser(runtime.db, "SSO-anything@Users.Invalid", clock),
    ).rejects.toThrow("shadow_user_email");
    const [after] = await runtime.db.select().from(schema.user).where(eq(schema.user.id, shadow.id));
    expect(after!.emailVerified).toBe(false);
    const real = await findOrCreateVerifiedUser(runtime.db, "someone@example.com", clock);
    expect(real.id).not.toBe(shadow.id);
    await runtime.close();
  });

  it("Better Auth refuses to create a session for a shadow user", async () => {
    const { runtime, clock, world } = await setup();
    const shadow = await createShadowUser(
      runtime.db,
      { schoolId: world.schoolA.id, name: "Shadow" },
      clock,
    );
    const ctx = await runtime.auth.auth.$context;
    // Control: a normal user still gets a session.
    const normal = await ctx.internalAdapter.createSession(world.member.id);
    expect(normal).toBeTruthy();
    const refused = await ctx.internalAdapter.createSession(shadow.id).catch(() => null);
    expect(refused).toBeFalsy();
    const sessions = await runtime.db
      .select()
      .from(schema.session)
      .where(eq(schema.session.userId, shadow.id));
    expect(sessions).toHaveLength(0);
    await runtime.close();
  });

  it("the API rejects a Better Auth session that resolves to a shadow user", async () => {
    const { runtime, clock, world } = await setup();
    const shadow = await createShadowUser(
      runtime.db,
      { schoolId: world.schoolA.id, name: "Shadow" },
      clock,
    );
    const headers = { cookie: world.owner.sessionCookie, "x-school-id": world.schoolA.publicId };
    const ok = await dispatch(runtime, { method: "GET", path: "/v1/school/team", headers });
    expect(ok.status).toBe(200);
    // Point the (valid, signed) session at the shadow user behind the hook's back.
    await runtime.db
      .update(schema.session)
      .set({ userId: shadow.id })
      .where(eq(schema.session.userId, world.owner.id));
    const refused = await dispatch(runtime, { method: "GET", path: "/v1/school/team", headers });
    expect(refused.status).toBe(401);
    await runtime.close();
  });
});

describe.serial("team guards", () => {
  it("refuses invitations and acceptance for SSO-linked and shadow-backed accounts", async () => {
    const { runtime, clock, world, link } = await setup();
    const headers = { cookie: world.owner.sessionCookie, "x-school-id": world.schoolA.publicId };
    // A shadow-backed SSO account: not invitable.
    const sso = await link({ subject: "liam", email: "liam@acme.com" });
    expect(sso.ok).toBe(true);
    const refused = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/team/invitations",
      headers,
      body: { email: "liam@acme.com", permissions: ["products:read"] },
    });
    expect(refused.status).toBe(409);
    expect((refused.body as { error?: { details?: { reason?: string } } }).error?.details?.reason ?? JSON.stringify(refused.body)).toContain("sso_linked_account");

    // Invite first, then the address becomes SSO-linked: accepting is refused,
    // and the existing account isn't moved onto the accepting user.
    const invite = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/team/invitations",
      headers,
      body: { email: world.outsider.email, permissions: ["products:read"] },
    });
    expect(invite.status).toBe(201);
    const body = invite.body as { id: string; token: string };
    const linked = await seedRealLearner(runtime.db, clock, world.schoolA.publicId, world.outsider.email);
    // Link SSO on that account: verify the outsider's domain for the connection.
    await runtime.db.insert(schema.schoolSsoDomains).values({
      id: uuidv7(clock),
      connectionId: (await runtime.db.select().from(schema.schoolSsoConnections))[0]!.id,
      schoolId: world.schoolA.id,
      domain: "example.com",
      verificationToken: "v".repeat(32),
      verifiedAt: clock.now(),
      createdAt: clock.now(),
    });
    const l2 = await link({ subject: "outsider", email: world.outsider.email });
    expect(l2.ok && l2.value.id === linked.session.schoolAccount.id).toBe(true);
    const accept = await dispatch(runtime, {
      method: "POST",
      path: "/v1/team-invitations/accept",
      headers: { cookie: world.outsider.sessionCookie },
      body: { invitationId: body.id, token: body.token },
    });
    expect(accept.status).toBe(409);
    const memberships = await runtime.db
      .select()
      .from(schema.memberships)
      .where(eq(schema.memberships.schoolAccountId, linked.session.schoolAccount.id));
    expect(memberships).toHaveLength(0);
    await runtime.close();
  });
});

describe.serial("sso sessions", () => {
  async function ssoSession() {
    const ctx = await setup();
    const created = await ctx.link({ subject: "mia", email: "mia@acme.com" });
    if (!created.ok) throw new Error();
    const [school] = await ctx.runtime.db
      .select()
      .from(schema.schools)
      .where(eq(schema.schools.id, ctx.world.schoolA.id));
    const issued = await issueSchoolSession(ctx.runtime.db, {
      school: school!,
      schoolAccount: created.value,
      userId: created.value.userId,
      authenticationMethod: "sso",
      ssoConnectionId: ctx.connection.id,
      clock: ctx.clock,
    });
    if (!issued.ok) throw new Error("issue_failed");
    return { ...ctx, school: school!, account: created.value, token: issued.value.token, issued: issued.value };
  }
  const authenticate = (c: Awaited<ReturnType<typeof ssoSession>>) =>
    authenticateLearner(c.runtime.db, learnerCookie(c.token), c.clock);

  it("works while the connection is active and stops the moment it is not", async () => {
    const c = await ssoSession();
    expect((await authenticate(c)).kind).toBe("authenticated");
    for (const status of ["suspended", "disabled", "draft"] as const) {
      await c.runtime.db
        .update(schema.schoolSsoConnections)
        .set({ status })
        .where(eq(schema.schoolSsoConnections.id, c.connection.id));
      expect((await authenticate(c)).kind).toBe("rejected");
    }
    await c.runtime.db
      .update(schema.schoolSsoConnections)
      .set({ status: "active" })
      .where(eq(schema.schoolSsoConnections.id, c.connection.id));
    expect((await authenticate(c)).kind).toBe("authenticated");
    await c.runtime.close();
  });

  it("is rejected when its account joins the team, and never reads team powers", async () => {
    const c = await ssoSession();
    await c.runtime.db.insert(schema.memberships).values({
      id: uuidv7(c.clock),
      publicId: createPublicId("mbr", c.clock),
      schoolId: c.world.schoolA.id,
      schoolAccountId: c.account.id,
      isOwner: false,
      permissions: ["products:write", "communities:moderate"],
      createdAt: c.clock.now(),
      updatedAt: c.clock.now(),
    });
    expect((await authenticate(c)).kind).toBe("rejected");
    await c.runtime.close();
  });

  it("gets no staff spaces even for a team account, while other methods do", async () => {
    const { runtime, clock, world } = await setup();
    const owner = await seedRealLearner(runtime.db, clock, world.schoolA.publicId, "owner-staff@example.com");
    await runtime.db.insert(schema.memberships).values({
      id: uuidv7(clock),
      publicId: createPublicId("mbr", clock),
      schoolId: world.schoolA.id,
      schoolAccountId: owner.session.schoolAccount.id,
      isOwner: false,
      permissions: ["communities:moderate"],
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    // A live community space the owner reaches as staff.
    const now = clock.now();
    await runtime.db
      .update(schema.communities)
      .set({ enabled: true })
      .where(eq(schema.communities.schoolId, world.schoolA.id));
    const spaceId = uuidv7(clock);
    await runtime.db.insert(schema.spaces).values({
      id: spaceId,
      publicId: createPublicId("spc", clock),
      schoolId: world.schoolA.id,
      name: "Space",
      slug: "space",
      position: 1,
      createdAt: now,
      updatedAt: now,
    });
    const viaEmail = await staffSpaceIds(
      runtime.db,
      world.schoolA.id,
      owner.session.schoolAccount.id,
      "email",
    );
    const viaSso = await staffSpaceIds(
      runtime.db,
      world.schoolA.id,
      owner.session.schoolAccount.id,
      "sso",
    );
    expect(viaSso.size).toBe(0);
    expect(viaEmail.has(spaceId)).toBe(true);
    await runtime.close();
  });

  it("honours an earlier expiry and never a later one", async () => {
    const c = await ssoSession();
    const sooner = new Date(c.clock.now().getTime() + 60_000);
    const later = new Date(c.clock.now().getTime() + 90 * 24 * 3600_000);
    const a = await issueSchoolSession(c.runtime.db, {
      school: c.school,
      schoolAccount: c.account,
      userId: c.account.userId,
      authenticationMethod: "sso",
      ssoConnectionId: c.connection.id,
      expiresAt: sooner,
      clock: c.clock,
    });
    const b = await issueSchoolSession(c.runtime.db, {
      school: c.school,
      schoolAccount: c.account,
      userId: c.account.userId,
      authenticationMethod: "sso",
      ssoConnectionId: c.connection.id,
      expiresAt: later,
      clock: c.clock,
    });
    const expiry = async (token: string) =>
      (
        await authenticateLearner(c.runtime.db, learnerCookie(token), c.clock)
      );
    if (!a.ok || !b.ok) throw new Error();
    const rows = await c.runtime.db.select().from(schema.schoolSessions);
    const byDigest = (t: string) => rows.find((r) => r.id === (t === "a" ? a.value.session.sessionId : b.value.session.sessionId))!;
    expect(byDigest("a").expiresAt.getTime()).toBe(sooner.getTime());
    expect(byDigest("b").expiresAt.getTime()).toBeLessThan(later.getTime());
    expect((await expiry(a.value.token)).kind).toBe("authenticated");
    // An sso session needs a connection; other methods can't carry one.
    const missing = await issueSchoolSession(c.runtime.db, {
      school: c.school,
      schoolAccount: c.account,
      userId: c.account.userId,
      authenticationMethod: "sso",
      clock: c.clock,
    });
    expect(missing.ok).toBe(false);
    const stray = await issueSchoolSession(c.runtime.db, {
      school: c.school,
      schoolAccount: c.account,
      userId: c.account.userId,
      authenticationMethod: "email",
      ssoConnectionId: c.connection.id,
      clock: c.clock,
    });
    expect(stray.ok).toBe(false);
    await c.runtime.close();
  });

  it("an sso session is deleted with its connection", async () => {
    const c = await ssoSession();
    await c.runtime.db
      .delete(schema.schoolSsoConnections)
      .where(and(eq(schema.schoolSsoConnections.id, c.connection.id)));
    const rows = await c.runtime.db.select().from(schema.schoolSessions);
    expect(rows.filter((r) => r.authenticationMethod === "sso")).toHaveLength(0);
    await c.runtime.close();
  });
});

void signInLearnerWithIdentity;
