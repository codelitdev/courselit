import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  finishLearnerGoogleSignIn,
  requestLearnerEmailCode,
  startLearnerGoogleSignIn,
} from "./learner-sign-in.js";
import { authenticateLearner, issueSchoolSession } from "./learners.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import {
  endNonSsoSessionsForEnforcedDomains,
  endSessionsForMethod,
  sessionMethodAllowed,
} from "./sign-in-policy.js";
import { learnerCookie, seedRealLearner, seedSsoConnection } from "./test-sso.js";
import { linkSsoIdentity } from "./learner-sso.js";

async function setup() {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock });
  const world = await seedWorld(runtime, clock);
  const school = async () =>
    (
      await runtime.db.select().from(schema.schools).where(eq(schema.schools.id, world.schoolA.id))
    )[0]!;
  const setMethods = (loginMethods: ("email" | "google")[]) =>
    runtime.db
      .update(schema.schools)
      .set({ loginMethods })
      .where(eq(schema.schools.id, world.schoolA.id));
  const allowed = async (method: "email" | "google" | "sso", email?: string) =>
    sessionMethodAllowed(runtime.db, { school: await school(), method, email });
  return { clock, runtime, world, school, setMethods, allowed };
}

async function withGoogleKeys<T>(on: boolean, fn: () => Promise<T>): Promise<T> {
  const saved = {
    id: process.env.GOOGLE_CLIENT_ID,
    secret: process.env.GOOGLE_CLIENT_SECRET,
  };
  if (on) {
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
  } else {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  }
  try {
    return await fn();
  } finally {
    if (saved.id === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = saved.id;
    if (saved.secret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = saved.secret;
  }
}

describe.serial("sign-in methods", () => {
  it("defaults to email only and refuses methods that are off", async () => {
    const { runtime, allowed } = await setup();
    await withGoogleKeys(true, async () => {
      expect((await allowed("email")).allowed).toBe(true);
      expect(await allowed("google")).toEqual({ allowed: false, reason: "sign_in_method_disabled" });
      expect(await allowed("sso")).toEqual({ allowed: false, reason: "sign_in_method_disabled" });
    });
    await runtime.close();
  });

  it("turns google on only with school opt-in and platform keys", async () => {
    const { runtime, setMethods, allowed } = await setup();
    await setMethods(["email", "google"]);
    await withGoogleKeys(true, async () => expect((await allowed("google")).allowed).toBe(true));
    await withGoogleKeys(false, async () => expect((await allowed("google")).allowed).toBe(false));
    await runtime.close();
  });

  it("is on for SSO exactly when the school has an active connection", async () => {
    const { runtime, world, clock, allowed } = await setup();
    const connection = await seedSsoConnection(runtime.db, clock, {
      schoolId: world.schoolA.id,
      status: "draft",
    });
    expect((await allowed("sso")).allowed).toBe(false);
    for (const [status, expected] of [
      ["active", true],
      ["suspended", false],
      ["disabled", false],
    ] as const) {
      await runtime.db
        .update(schema.schoolSsoConnections)
        .set({ status })
        .where(eq(schema.schoolSsoConnections.id, connection.id));
      expect((await allowed("sso")).allowed).toBe(expected);
    }
    await runtime.close();
  });

  it("falls back to email when every method that is on is unusable", async () => {
    const { runtime, world, clock, setMethods, allowed } = await setup();
    await setMethods(["google"]);
    await withGoogleKeys(false, async () => {
      expect((await allowed("email")).allowed).toBe(true);
      expect((await allowed("google")).allowed).toBe(false);
    });
    // Google works, so email stays off.
    await withGoogleKeys(true, async () => {
      expect((await allowed("google")).allowed).toBe(true);
      expect((await allowed("email")).allowed).toBe(false);
    });
    // SSO is the only method on and its connection is suspended: email again.
    await setMethods([]);
    const connection = await seedSsoConnection(runtime.db, clock, { schoolId: world.schoolA.id });
    await withGoogleKeys(false, async () => {
      expect((await allowed("email")).allowed).toBe(false);
      await runtime.db
        .update(schema.schoolSsoConnections)
        .set({ status: "suspended" })
        .where(eq(schema.schoolSsoConnections.id, connection.id));
      expect((await allowed("email")).allowed).toBe(true);
    });
    await runtime.close();
  });

  it("the database refuses unknown login methods", async () => {
    const { runtime, world } = await setup();
    await expect(
      (async () => {
        await runtime.db
          .update(schema.schools)
          .set({ loginMethods: ["email", "sso"] as never })
          .where(eq(schema.schools.id, world.schoolA.id));
      })(),
    ).rejects.toThrow();
    await runtime.close();
  });

  it("is enforced at every start endpoint and in issueSchoolSession", async () => {
    const { runtime, world, clock, setMethods, school } = await setup();
    await withGoogleKeys(true, async () => {
      // Email off (google on), so the email code is refused before anything is sent.
      await setMethods(["google"]);
      const sent: string[] = [];
      const code = await requestLearnerEmailCode(
        runtime.db,
        { schoolPublicId: world.schoolA.publicId, email: "x@example.com" },
        clock,
        async ({ email }) => void sent.push(email),
      );
      expect(code.ok).toBe(false);
      expect(sent).toHaveLength(0);
      expect(
        !code.ok && (code.error as { safeDetails?: { reason?: string } }).safeDetails?.reason,
      ).toBe("sign_in_method_disabled");

      // Google off: the start endpoint refuses.
      await setMethods(["email"]);
      const start = await startLearnerGoogleSignIn(
        runtime.db,
        {
          schoolPublicId: world.schoolA.publicId,
          host: "school-a.localhost:3001",
          nonce: "n".repeat(43),
          publicApiUrl: "http://api.localhost:4000",
        },
        clock,
      );
      expect(start.ok).toBe(false);

      // issueSchoolSession is the backstop for any other path.
      const learner = await seedRealLearner(runtime.db, clock, world.schoolA.publicId, "pat@example.com");
      await setMethods(["google"]);
      const issued = await issueSchoolSession(runtime.db, {
        school: await school(),
        schoolAccount: learner.session.schoolAccount,
        userId: learner.user.id,
        authenticationMethod: "email",
        clock,
      });
      expect(issued.ok).toBe(false);
    });
    await runtime.close();
  });

  it("turning a method off deletes that school's sessions made with it", async () => {
    const { runtime, world, clock } = await setup();
    const a = await seedRealLearner(runtime.db, clock, world.schoolA.publicId, "a@example.com");
    const b = await seedRealLearner(runtime.db, clock, world.schoolB.publicId, "b@example.com");
    expect(await endSessionsForMethod(runtime.db, world.schoolA.id, "email")).toBe(1);
    expect((await authenticateLearner(runtime.db, learnerCookie(a.token), clock)).kind).toBe("rejected");
    expect((await authenticateLearner(runtime.db, learnerCookie(b.token), clock)).kind).toBe(
      "authenticated",
    );
    await runtime.close();
  });

  it("existing sessions stop working when their method is switched off", async () => {
    const { runtime, world, clock, setMethods } = await setup();
    const a = await seedRealLearner(runtime.db, clock, world.schoolA.publicId, "a@example.com");
    expect((await authenticateLearner(runtime.db, learnerCookie(a.token), clock)).kind).toBe(
      "authenticated",
    );
    await withGoogleKeys(true, async () => {
      await setMethods(["google"]);
      expect((await authenticateLearner(runtime.db, learnerCookie(a.token), clock)).kind).toBe(
        "rejected",
      );
    });
    await runtime.close();
  });
});

describe.serial("sso enforcement", () => {
  async function enforced() {
    const ctx = await setup();
    const connection = await seedSsoConnection(ctx.runtime.db, ctx.clock, {
      schoolId: ctx.world.schoolA.id,
      enforcement: "required_for_domains",
      domains: ["acme.com"],
      unverifiedDomains: ["pending.com"],
    });
    return { ...ctx, connection };
  }

  it("allows only sso for addresses in verified domains of an enforcing active connection", async () => {
    const { runtime, allowed, connection } = await enforced();
    expect(await allowed("email", "x@acme.com")).toEqual({ allowed: false, reason: "sso_required" });
    expect(await allowed("google", "x@acme.com")).toEqual({ allowed: false, reason: "sso_required" });
    expect((await allowed("sso", "x@acme.com")).allowed).toBe(true);
    // Other domains, unverified domains and subdomains aren't affected.
    expect((await allowed("email", "x@other.org")).allowed).toBe(true);
    expect((await allowed("email", "x@pending.com")).allowed).toBe(true);
    expect((await allowed("email", "x@sub.acme.com")).allowed).toBe(true);
    // Not enforced when optional, or when the connection isn't active.
    await runtime.db
      .update(schema.schoolSsoConnections)
      .set({ enforcement: "optional" })
      .where(eq(schema.schoolSsoConnections.id, connection.id));
    expect((await allowed("email", "x@acme.com")).allowed).toBe(true);
    await runtime.db
      .update(schema.schoolSsoConnections)
      .set({ enforcement: "required_for_domains", status: "suspended" })
      .where(eq(schema.schoolSsoConnections.id, connection.id));
    expect((await allowed("email", "x@acme.com")).allowed).toBe(true);
    await runtime.close();
  });

  it("refuses email codes and google sign-in for enforced domains", async () => {
    const { runtime, world, clock, setMethods } = await enforced();
    await setMethods(["email", "google"]);
    await withGoogleKeys(true, async () => {
      const sent: string[] = [];
      const code = await requestLearnerEmailCode(
        runtime.db,
        { schoolPublicId: world.schoolA.publicId, email: "Zed@Acme.com" },
        clock,
        async ({ email }) => void sent.push(email),
      );
      expect(!code.ok && (code.error as { safeDetails?: { reason?: string } }).safeDetails?.reason).toBe(
        "sso_required",
      );
      expect(sent).toHaveLength(0);
      const ok = await requestLearnerEmailCode(
        runtime.db,
        { schoolPublicId: world.schoolA.publicId, email: "zed@other.org" },
        clock,
        async ({ email }) => void sent.push(email),
      );
      expect(ok.ok).toBe(true);

      // Google: the address is only known on return, before admitting.
      const start = await startLearnerGoogleSignIn(
        runtime.db,
        {
          schoolPublicId: world.schoolA.publicId,
          host: "school-a.localhost:3001",
          nonce: "n".repeat(43),
          publicApiUrl: "http://api.localhost:4000",
        },
        clock,
      );
      expect(start.ok).toBe(true);
      const token = new URL((start as { value: { url: string } }).value.url).searchParams.get("request")!;
      const accountsBefore = await runtime.db.select().from(schema.schoolAccounts);
      const finished = await finishLearnerGoogleSignIn(
        runtime.db,
        { requestToken: token, user: { id: world.member.id, email: "zed@acme.com", name: "Zed" } },
        clock,
      );
      expect(finished.ok).toBe(false);
      expect(await runtime.db.select().from(schema.schoolAccounts)).toHaveLength(accountsBefore.length);
    });
    await runtime.close();
  });

  it("refuses email sessions in issueSchoolSession and authenticateLearner for enforced domains", async () => {
    const { runtime, world, clock, school, connection } = await enforced();
    // A session that predates enforcement.
    await runtime.db
      .update(schema.schoolSsoConnections)
      .set({ enforcement: "optional" })
      .where(eq(schema.schoolSsoConnections.id, connection.id));
    const learner = await seedRealLearner(runtime.db, clock, world.schoolA.publicId, "old@acme.com");
    expect((await authenticateLearner(runtime.db, learnerCookie(learner.token), clock)).kind).toBe(
      "authenticated",
    );
    await runtime.db
      .update(schema.schoolSsoConnections)
      .set({ enforcement: "required_for_domains" })
      .where(eq(schema.schoolSsoConnections.id, connection.id));
    expect((await authenticateLearner(runtime.db, learnerCookie(learner.token), clock)).kind).toBe(
      "rejected",
    );
    const issued = await issueSchoolSession(runtime.db, {
      school: await school(),
      schoolAccount: learner.session.schoolAccount,
      userId: learner.user.id,
      authenticationMethod: "email",
      clock,
    });
    expect(!issued.ok && (issued.error as { safeDetails?: { reason?: string } }).safeDetails?.reason).toBe(
      "sso_required",
    );
    await runtime.close();
  });

  it("turning enforcement on deletes existing non-sso sessions in enforced domains only", async () => {
    const { runtime, world, clock, connection } = await enforced();
    // Sessions that predate enforcement.
    await runtime.db
      .update(schema.schoolSsoConnections)
      .set({ enforcement: "optional" })
      .where(eq(schema.schoolSsoConnections.id, connection.id));
    const inDomain = await seedRealLearner(runtime.db, clock, world.schoolA.publicId, "in@acme.com");
    const outside = await seedRealLearner(runtime.db, clock, world.schoolA.publicId, "out@other.org");
    const otherSchool = await seedRealLearner(runtime.db, clock, world.schoolB.publicId, "in@acme.com");
    const sso = await linkSsoIdentity(
      runtime.db,
      { connection, issuer: connection.idpEntityId!, subject: "s", email: "sso@acme.com" },
      clock,
    );
    if (!sso.ok) throw new Error();
    const [school] = await runtime.db.select().from(schema.schools).where(eq(schema.schools.id, world.schoolA.id));
    const ssoIssued = await issueSchoolSession(runtime.db, {
      school: school!,
      schoolAccount: sso.value,
      userId: sso.value.userId,
      authenticationMethod: "sso",
      ssoConnectionId: connection.id,
      clock,
    });
    if (!ssoIssued.ok) throw new Error();
    await runtime.db
      .update(schema.schoolSsoConnections)
      .set({ enforcement: "required_for_domains" })
      .where(eq(schema.schoolSsoConnections.id, connection.id));
    expect(await endNonSsoSessionsForEnforcedDomains(runtime.db, connection.id)).toBe(1);
    const left = (await runtime.db.select().from(schema.schoolSessions)).map((row) => row.id);
    expect(left).not.toContain(inDomain.session.sessionId);
    expect(left).toContain(outside.session.sessionId);
    expect(left).toContain(otherSchool.session.sessionId);
    expect(left).toContain(ssoIssued.value.session.sessionId);
    await runtime.close();
  });
});
