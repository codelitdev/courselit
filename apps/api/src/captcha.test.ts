import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createAdminAuth } from "./auth/better-auth.js";
import { publicCaptchaConfig, verifyCaptcha } from "./captcha.js";
import { dispatch } from "./dispatch.js";
import { createExpressApp } from "./express-app.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

const KEYS = { TURNSTILE_SITE_KEY: "site-key", TURNSTILE_SECRET_KEY: "secret-key" };

/** Answers Cloudflare's siteverify: only the token "human" passes. */
function siteverify(calls: string[] = []): typeof fetch {
  return (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { secret: string; response: string };
    calls.push(body.response);
    return Response.json({
      success: body.secret === "secret-key" && body.response === "human",
    });
  }) as typeof fetch;
}

describe("verifyCaptcha", () => {
  it("passes when captcha is not configured", async () => {
    expect(await verifyCaptcha({}, { env: {} })).toEqual({ ok: true });
    expect(publicCaptchaConfig({})).toEqual({ provider: null, siteKey: null });
  });

  it("requires a token Cloudflare accepts", async () => {
    const options = { env: KEYS, fetchImpl: siteverify() };
    expect(await verifyCaptcha({}, options)).toMatchObject({
      ok: false,
      error: { code: "forbidden", safeDetails: { reason: "captcha_required" } },
    });
    expect(await verifyCaptcha({ "x-captcha-response": "bot" }, options)).toMatchObject(
      {
        ok: false,
        error: { safeDetails: { reason: "captcha_failed" } },
      },
    );
    expect(await verifyCaptcha({ "x-captcha-response": "human" }, options)).toEqual({
      ok: true,
    });
  });

  it("fails closed when Cloudflare cannot be reached", async () => {
    const result = await verifyCaptcha(
      { "x-captcha-response": "human" },
      {
        env: KEYS,
        fetchImpl: (async () => {
          throw new Error("offline");
        }) as unknown as typeof fetch,
      },
    );
    expect(result).toMatchObject({ ok: false, error: { code: "internal_error" } });
  });

  it("gives browsers the site key and never the secret", () => {
    expect(publicCaptchaConfig(KEYS)).toEqual({
      provider: "turnstile",
      siteKey: "site-key",
    });
  });
});

describe("captcha on public forms", () => {
  const saved = { ...process.env };
  const originalFetch = globalThis.fetch;
  let calls: string[];

  beforeEach(() => {
    Object.assign(process.env, KEYS);
    calls = [];
    const verify = siteverify(calls);
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : String((input as Request).url ?? input);
      return url.startsWith("https://challenges.cloudflare.com/")
        ? verify(input, init)
        : originalFetch(input, init);
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(KEYS)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("guards the newsletter, lead magnets and learner sign-in codes", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    try {
      const school = world.schoolA.publicId;
      const post = (path: string, body: unknown, token?: string) =>
        dispatch(runtime, {
          method: "POST",
          path,
          headers: token ? { "x-captcha-response": token } : {},
          body,
        });

      const config = await dispatch(runtime, {
        method: "GET",
        path: "/v1/public/captcha",
        headers: {},
      });
      expect(config.body).toEqual({ provider: "turnstile", siteKey: "site-key" });

      const newsletter = `/v1/public/${school}/newsletter/subscribe`;
      const subscriber = { email: "reader@example.com" };
      expect((await post(newsletter, subscriber)).body).toMatchObject({
        code: "forbidden",
        details: { reason: "captcha_required" },
      });
      expect((await post(newsletter, subscriber, "bot")).body).toMatchObject({
        details: { reason: "captcha_failed" },
      });
      expect((await post(newsletter, subscriber, "human")).status).toBe(200);

      const leadMagnet = await post(`/v1/public/${school}/lead-magnets`, {
        productId: world.noteA.publicId,
        email: "reader@example.com",
      });
      expect(leadMagnet.body).toMatchObject({
        details: { reason: "captcha_required" },
      });

      // Learners ask their school for a sign-in code; checking the code is
      // not guarded, since the code itself limits guesses.
      const emailCode = (token?: string) =>
        dispatch(runtime, {
          method: "POST",
          path: "/v1/learner/auth/email-code",
          headers: {
            "x-school-id": school,
            ...(token ? { "x-captcha-response": token } : {}),
          },
          body: { email: "learner@example.com" },
        });
      expect((await emailCode()).body).toMatchObject({
        details: { reason: "captcha_required" },
      });
      expect((await emailCode("human")).status).toBe(204);
      const verify = await dispatch(runtime, {
        method: "POST",
        path: "/v1/learner/auth/email-code/verify",
        headers: { "x-school-id": school },
        body: { email: "learner@example.com", code: "000000" },
      });
      expect(verify.body).toMatchObject({ code: "unauthenticated" });
      expect(calls).toEqual(["bot", "human", "human"]);
    } finally {
      await runtime.close();
    }
  }, 60_000);

  it("guards sending a sign-in code but not verifying one", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    try {
      const { auth } = createAdminAuth({
        db: runtime.db,
        publicApiUrl: "http://127.0.0.1:4999",
        secret: "test-secret-that-is-at-least-thirty-two-characters",
      });
      const send = (path: string, token?: string) =>
        auth.handler(
          new Request(`http://127.0.0.1:4999/api/auth${path}`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              origin: "http://127.0.0.1:4999",
              ...(token ? { "x-captcha-response": token } : {}),
            },
            body: JSON.stringify({
              email: "owner@example.com",
              type: "sign-in",
              otp: "000000",
            }),
          }),
        );
      expect((await send("/email-otp/send-verification-otp")).status).toBe(400);
      expect((await send("/email-otp/send-verification-otp", "bot")).status).toBe(403);
      expect((await send("/email-otp/send-verification-otp", "human")).status).toBe(
        200,
      );
      // A wrong code is the code check failing, not the captcha.
      const verify = await send("/sign-in/email-otp");
      expect(verify.status).not.toBe(403);
      expect(await verify.text()).not.toContain("captcha");
    } finally {
      await runtime.close();
    }
  }, 60_000);

  it("shows the Turnstile widget on the hosted login page", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const app = createExpressApp(runtime);
    const server = await new Promise<Server>((resolve) => {
      const listening = app.listen(0, () => resolve(listening));
    });
    try {
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const page = await (await originalFetch(`${base}/login`)).text();
      expect(page).toContain('data-sitekey="site-key"');
      expect(page).toContain("challenges.cloudflare.com/turnstile");
      expect(page).not.toContain("secret-key");
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await runtime.close();
    }
  }, 60_000);
});
