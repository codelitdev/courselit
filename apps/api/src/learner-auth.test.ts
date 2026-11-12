import { describe, expect, it } from "bun:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createExpressApp } from "./express-app.js";
import {
  finishLearnerGoogleSignIn,
  requestLearnerEmailCode,
  startLearnerGoogleSignIn,
  verifyLearnerEmailCode,
} from "./learner-sign-in.js";
import { learnerNameIsPlaceholder } from "./learners.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe.serial("learner authentication", () => {
  it("does not expose legacy unauthenticated learner OTP endpoints", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    for (const path of [
      "/v1/learner/auth/request-otp",
      "/v1/learner/auth/verify-otp",
    ]) {
      const response = await dispatch(runtime, {
        method: "POST",
        path,
        headers: { "x-school-id": world.schoolA.publicId },
        body: { email: "learner@example.com", otp: "000000" },
      });
      expect(response.status).toBe(401);
    }

    await runtime.close();
  });

  it("handles school login methods querying", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    // Public endpoint returns computed login methods from env vars
    const pubRes = await dispatch(runtime, {
      method: "GET",
      path: `/v1/public/${world.schoolA.publicId}/login-methods`,
      headers: { host: "courselit-api:4000" },
    });
    expect(pubRes.status).toBe(200);
    expect(pubRes.body).toMatchObject({
      schoolId: world.schoolA.publicId,
      loginMethods: expect.arrayContaining(["email"]),
      hasGoogle: false,
    });

    // A school host does not stand in for the school id in the path.
    const hostRes = await dispatch(runtime, {
      method: "GET",
      path: "/v1/public/school/login-methods",
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
    });
    expect(hostRes.status).toBe(404);

    const unknownSchoolRes = await dispatch(runtime, {
      method: "GET",
      path: "/v1/public/sch_unknown/login-methods",
      headers: {},
    });
    expect(unknownSchoolRes.status).toBe(404);

    // Admin login-methods endpoint no longer exists, and routes outside the
    // contract are closed to every credential.
    const adminRes = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/login-methods",
      headers: {
        "x-school-id": world.schoolA.publicId,
        cookie: world.owner.sessionCookie,
      },
    });
    expect(adminRes.status).toBe(403);

    await runtime.close();
  });

  it("emails the sign-in code in the school's name", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const requested = await requestLearnerEmailCode(
      runtime.db,
      { schoolPublicId: world.schoolA.publicId, email: "brand@example.com" },
      clock,
    );
    expect(requested.ok).toBe(true);

    const jobs = await runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(eq(schema.integrationOutboxJobs.schoolId, world.schoolA.id));
    const email = jobs
      .map((job) => job.payload as { to?: string; subject?: string; text?: string })
      .find((payload) => payload.to === "brand@example.com");
    expect(email?.subject).toBe("Sign in to School A");
    expect(email?.text).toContain("Enter this code to sign in to School A:");
    expect(email?.text).toContain("expires in 10 minutes");
    expect(`${email?.subject} ${email?.text}`).not.toContain("CourseLit");

    await runtime.close();
  });

  it("signs a learner in to one school with an emailed code", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const email = "code-learner@example.com";
    const sent: string[] = [];
    const deliver = async (message: { otp: string }) => {
      sent.push(message.otp);
    };

    const requested = await requestLearnerEmailCode(
      runtime.db,
      { schoolPublicId: world.schoolA.publicId, email },
      clock,
      deliver,
    );
    expect(requested.ok).toBe(true);
    expect(sent).toHaveLength(1);
    const code = sent[0]!;

    // Asking again straight away is refused.
    const again = await requestLearnerEmailCode(
      runtime.db,
      { schoolPublicId: world.schoolA.publicId, email },
      clock,
      deliver,
    );
    expect(again.ok).toBe(false);

    // The code only works for the school it was sent for.
    const otherSchool = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/email-code/verify",
      headers: { "x-school-id": world.schoolB.publicId },
      body: { email, code },
    });
    expect(otherSchool.status).toBe(401);

    const signedIn = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/email-code/verify",
      headers: { "x-school-id": world.schoolA.publicId },
      body: { email, code },
    });
    expect(signedIn.status).toBe(200);
    expect(signedIn.body).toMatchObject({ email, schoolId: world.schoolA.publicId });
    // A brand-new learner's name is made from their email, so the site asks.
    expect(signedIn.body).toMatchObject({ needsName: true });
    expect(signedIn.headers?.["Set-Cookie"]).toContain("courselit.learner.session=");
    expect(signedIn.headers?.["Set-Cookie"]).not.toContain("courselit.session_token");

    // A used code can't sign anyone in again.
    const reused = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/email-code/verify",
      headers: { "x-school-id": world.schoolA.publicId },
      body: { email, code },
    });
    expect(reused.status).toBe(401);

    await runtime.close();
  });

  it("stops accepting a code after five wrong guesses", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const email = "guessed@example.com";
    let code = "";
    await requestLearnerEmailCode(
      runtime.db,
      { schoolPublicId: world.schoolA.publicId, email },
      clock,
      async (message) => {
        code = message.otp;
      },
    );
    const wrong = code === "000000" ? "111111" : "000000";
    for (let attempt = 0; attempt < 5; attempt++) {
      const guess = await verifyLearnerEmailCode(
        runtime.db,
        { schoolPublicId: world.schoolA.publicId, email, code: wrong },
        clock,
      );
      expect(guess.ok).toBe(false);
    }
    const right = await verifyLearnerEmailCode(
      runtime.db,
      { schoolPublicId: world.schoolA.publicId, email, code },
      clock,
    );
    expect(right.ok).toBe(false);

    await runtime.close();
  });

  it("no longer turns a CourseLit session into a school session", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const email = "platform-session@example.com";
    const otp = await runtime.auth.auth.api.createVerificationOTP({
      body: { email, type: "sign-in" },
    });
    const signedIn = await runtime.auth.auth.api.signInEmailOTP({
      body: { email, otp, name: "Platform Session" },
      asResponse: true,
    });
    expect(signedIn.status).toBe(200);
    const sessionCookie = signedIn.headers.get("set-cookie")?.split(";", 1)[0];
    expect(sessionCookie).toBeTruthy();

    const whoami = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/me",
      headers: { "x-school-id": world.schoolA.publicId, cookie: sessionCookie! },
    });
    expect(whoami.status).toBe(401);
    expect(whoami.headers?.["Set-Cookie"]).toBeUndefined();
    const accounts = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, world.schoolA.id),
          eq(schema.schoolAccounts.email, email),
        ),
      );
    expect(accounts).toHaveLength(0);

    await runtime.close();
  });

  it("no longer serves sign-in or sign-up without proof of the email", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    for (const path of ["/v1/learner/auth/sign-up", "/v1/learner/auth/sign-in"]) {
      const response = await dispatch(runtime, {
        method: "POST",
        path,
        headers: { "x-school-id": world.schoolA.publicId },
        body: {
          email: "victim@example.com",
          password: "anything-at-all",
          name: "Victim",
          schoolId: world.schoolA.publicId,
        },
      });
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(201);
      expect(response.headers?.["Set-Cookie"]).toBeUndefined();
    }
    await runtime.close();
  });

  it("redeems a Google sign-in ticket once, for its school and browser only", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-03T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const savedEnv = {
      id: process.env.GOOGLE_CLIENT_ID,
      secret: process.env.GOOGLE_CLIENT_SECRET,
    };
    process.env.GOOGLE_CLIENT_ID = "test-google-client";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
    try {
      const host = "school-a.localhost:3001";
      const nonce = "n".repeat(43);

      // A host that belongs to another school can't start a sign-in.
      const wrongHost = await startLearnerGoogleSignIn(
        runtime.db,
        {
          schoolPublicId: world.schoolB.publicId,
          host,
          nonce,
          publicApiUrl: "http://api.localhost:4000",
        },
        clock,
      );
      expect(wrongHost.ok).toBe(false);

      const started = await startLearnerGoogleSignIn(
        runtime.db,
        {
          schoolPublicId: world.schoolA.publicId,
          host,
          nonce,
          next: "//evil.example/steal",
          publicApiUrl: "http://api.localhost:4000",
        },
        clock,
      );
      expect(started.ok).toBe(true);
      if (!started.ok) return;
      const begin = new URL(started.value.url);
      expect(begin.origin).toBe("http://api.localhost:4000");
      const requestToken = begin.searchParams.get("request")!;

      const user = await runtime.auth.auth.api.signUpEmail({
        body: {
          name: "Ticket User",
          email: "ticket-user@example.com",
          password: "password123",
        },
      });
      const finished = await finishLearnerGoogleSignIn(
        runtime.db,
        {
          requestToken,
          user: { id: user.user.id, email: user.user.email, name: user.user.name },
        },
        clock,
      );
      expect(finished.ok).toBe(true);
      if (!finished.ok) return;
      const landing = new URL(finished.value.redirectUrl);
      expect(landing.origin).toBe(`http://${host}`);
      expect(landing.pathname).toBe("/auth/complete");
      expect(landing.searchParams.get("next")).toBe("/dashboard");
      const ticket = new URLSearchParams(landing.hash.slice(1)).get("ticket")!;
      expect(ticket).toBeTruthy();

      // The request is used up.
      const replayed = await finishLearnerGoogleSignIn(
        runtime.db,
        { requestToken, user: { id: user.user.id, email: user.user.email } },
        clock,
      );
      expect(replayed.ok).toBe(false);

      const consume = (headers: Record<string, string>) =>
        dispatch(runtime, {
          method: "POST",
          path: "/v1/auth/tickets/consume",
          headers,
          body: { ticket },
        });
      const nonceCookie = `courselit.login.nonce=${nonce}`;

      // Another browser (no nonce, or a different one) can't redeem it.
      expect((await consume({ "x-school-id": world.schoolA.publicId })).status).toBe(
        401,
      );
      expect(
        (
          await consume({
            "x-school-id": world.schoolA.publicId,
            cookie: `courselit.login.nonce=${"x".repeat(43)}`,
          })
        ).status,
      ).toBe(401);
      // Nor can another school's website.
      expect(
        (await consume({ "x-school-id": world.schoolB.publicId, cookie: nonceCookie }))
          .status,
      ).toBe(401);

      // Two requests at once: exactly one gets a session.
      const results = await Promise.all([
        consume({ "x-school-id": world.schoolA.publicId, cookie: nonceCookie }),
        consume({ "x-school-id": world.schoolA.publicId, cookie: nonceCookie }),
      ]);
      expect(results.map((result) => result.status).sort()).toEqual([200, 401]);
      const winner = results.find((result) => result.status === 200)!;
      expect(winner.body).toMatchObject({ email: "ticket-user@example.com" });
      expect(winner.headers?.["Set-Cookie"]).toContain("courselit.learner.session=");

      const reuse = await consume({
        "x-school-id": world.schoolA.publicId,
        cookie: nonceCookie,
      });
      expect(reuse.status).toBe(401);
    } finally {
      if (savedEnv.id === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = savedEnv.id;
      if (savedEnv.secret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
      else process.env.GOOGLE_CLIENT_SECRET = savedEnv.secret;
      await runtime.close();
    }
  });

  it("runs Google sign-in on the API host and sends failures back to the school", async () => {
    const savedEnv = {
      id: process.env.GOOGLE_CLIENT_ID,
      secret: process.env.GOOGLE_CLIENT_SECRET,
    };
    process.env.GOOGLE_CLIENT_ID = "test-google-client";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
    const clock = freezeRuntimeClock(new Date("2026-03-03T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const app = createExpressApp(runtime);
    const server = await new Promise<Server>((resolve) => {
      const listening = app.listen(0, () => resolve(listening));
    });
    try {
      const world = await seedWorld(runtime, clock);
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const started = await startLearnerGoogleSignIn(
        runtime.db,
        {
          schoolPublicId: world.schoolA.publicId,
          host: "school-a.localhost:3001",
          nonce: "n".repeat(43),
          next: "/products",
          publicApiUrl: runtime.auth.publicApiUrl,
        },
        clock,
      );
      expect(started.ok).toBe(true);
      if (!started.ok) return;
      const requestToken = new URL(started.value.url).searchParams.get("request")!;

      const begin = await fetch(
        `${base}/learner-login/google?request=${requestToken}`,
        {
          redirect: "manual",
        },
      );
      expect(begin.status).toBe(302);
      const google = new URL(begin.headers.get("location")!);
      expect(google.hostname).toBe("accounts.google.com");
      expect(google.searchParams.get("prompt")).toBe("select_account");
      expect(google.searchParams.get("redirect_uri")).toBe(
        `${runtime.auth.publicApiUrl}/api/auth/callback/google`,
      );

      // Coming back without a Google session lands on the school's login page.
      const failed = await fetch(
        `${base}/learner-login/google/finish?request=${requestToken}&error=1`,
        { redirect: "manual" },
      );
      expect(failed.status).toBe(302);
      const failure = new URL(failed.headers.get("location")!);
      expect(failure.origin).toBe("http://school-a.localhost:3001");
      expect(failure.pathname).toBe("/login");
      expect(failure.searchParams.get("error")).toBe("google");
      expect(failure.searchParams.get("next")).toBe("/products");

      const unknown = await fetch(`${base}/learner-login/google?request=nope`, {
        redirect: "manual",
      });
      expect(unknown.status).toBe(400);
    } finally {
      server.close();
      await runtime.close();
      if (savedEnv.id === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = savedEnv.id;
      if (savedEnv.secret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
      else process.env.GOOGLE_CLIENT_SECRET = savedEnv.secret;
    }
  });
});

describe("learnerNameIsPlaceholder", () => {
  it("is true for the name made from the email address, or no name", () => {
    expect(learnerNameIsPlaceholder("ada", "Ada@Example.com")).toBe(true);
    expect(learnerNameIsPlaceholder("  ", "ada@example.com")).toBe(true);
  });

  it("is false once the learner has a name of their own", () => {
    expect(learnerNameIsPlaceholder("Ada Lovelace", "ada@example.com")).toBe(false);
  });
});
