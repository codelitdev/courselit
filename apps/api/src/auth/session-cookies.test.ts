import { describe, expect, it } from "bun:test";
import { dispatch } from "../dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "../runtime.js";
import { seedWorld } from "../seed.js";
import {
  adminSessionCookieName,
  authCookieAdvancedOptions,
  buildBetterAuthOptions,
} from "./options.js";

const SECRET = "test-secret-that-is-at-least-thirty-two-characters";

describe("platform session cookie options", () => {
  it("keeps the plain names over http", () => {
    const options = buildBetterAuthOptions({
      publicApiUrl: "http://127.0.0.1:4000",
      secret: SECRET,
    });
    expect(options.advanced.cookiePrefix).toBe("courselit");
    expect("useSecureCookies" in options.advanced).toBe(false);
    expect(adminSessionCookieName("http://127.0.0.1:4000")).toBe(
      "courselit.session_token",
    );
  });

  it("uses __Host- names, Secure and Path=/ over https, with no Domain", () => {
    const advanced = authCookieAdvancedOptions("https://api.example.com");
    expect(advanced.cookiePrefix).toBe("__Host-courselit");
    // Better Auth must not add its own `__Secure-` in front of `__Host-`.
    expect((advanced as { useSecureCookies?: boolean }).useSecureCookies).toBe(false);
    expect(
      (advanced as { defaultCookieAttributes?: object }).defaultCookieAttributes,
    ).toEqual({ secure: true, path: "/" });
    expect("crossSubDomainCookies" in advanced).toBe(false);
    expect(adminSessionCookieName("https://api.example.com")).toBe(
      "__Host-courselit.session_token",
    );
  });

  it("disables the session cookie cache", () => {
    const options = buildBetterAuthOptions({
      publicApiUrl: "https://api.example.com",
      secret: SECRET,
    });
    expect(options.session.cookieCache.enabled).toBe(false);
  });
});

async function signInOtp(
  runtime: Awaited<ReturnType<typeof createPgliteRuntime>>,
  email: string,
) {
  const otp = await runtime.auth.auth.api.createVerificationOTP({
    body: { email, type: "sign-in" },
  });
  return runtime.auth.auth.api.signInEmailOTP({
    body: { email, otp, name: "Cookie Tester" },
    asResponse: true,
  });
}

describe.serial("platform session cookies in a live runtime", () => {
  it("sets a Secure Path=/ __Host- cookie over https and accepts it", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({
      clock,
      publicApiUrl: "https://api.example.com",
    });
    try {
      const response = await signInOtp(runtime, "https@example.com");
      expect(response.ok).toBe(true);
      const setCookies = response.headers.getSetCookie();
      expect(setCookies.length).toBeGreaterThan(0);
      for (const cookie of setCookies) {
        expect(cookie.startsWith("__Host-courselit.")).toBe(true);
        expect(cookie).not.toContain("__Secure-");
        expect(cookie).toContain("Secure");
        expect(cookie).toContain("Path=/");
        expect(cookie).not.toMatch(/Domain=/i);
      }
      const session = setCookies
        .map((c) => c.split(";", 1)[0]!)
        .find((c) => c.startsWith("__Host-courselit.session_token="));
      expect(session).toBeDefined();
      // Better Auth itself reads the __Host- cookie back.
      const resolved = await runtime.auth.auth.api.getSession({
        headers: new Headers({ cookie: session! }),
      });
      expect(resolved?.user.email).toBe("https@example.com");
      // A plain-name cookie planted over https is not a session.
      const planted = await runtime.auth.auth.api.getSession({
        headers: new Headers({
          cookie: session!.replace("__Host-courselit.", "courselit."),
        }),
      });
      expect(planted).toBeNull();
    } finally {
      await runtime.close();
    }
  });

  it("keeps the plain cookie name over http", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    try {
      const response = await signInOtp(runtime, "http@example.com");
      const names = response.headers
        .getSetCookie()
        .map((c) => c.split("=", 1)[0]);
      expect(names).toContain("courselit.session_token");
      expect(names.some((n) => n!.startsWith("__"))).toBe(false);
      expect(names).not.toContain("courselit.session_data");
    } finally {
      await runtime.close();
    }
  });

  it("rejects a revoked session on the very next request", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    try {
      const world = await seedWorld(runtime, clock);
      const request = () =>
        dispatch(runtime, {
          method: "GET",
          path: "/v1/school/team",
          headers: {
            cookie: world.owner.sessionCookie,
            "x-school-id": world.schoolA.publicId,
          },
        });
      expect((await request()).status).toBe(200);
      await runtime.auth.auth.api.signOut({
        headers: new Headers({ cookie: world.owner.sessionCookie }),
      });
      expect((await request()).status).toBe(401);
    } finally {
      await runtime.close();
    }
  });
});
