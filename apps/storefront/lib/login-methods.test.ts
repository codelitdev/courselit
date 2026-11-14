import { describe, expect, it } from "bun:test";
import {
  DEFAULT_LOGIN_OPTIONS,
  SignInRefusedError,
  isSsoRequired,
  loginErrorFromQuery,
  resolveLoginOptions,
  ssoButtonLabel,
} from "./login-methods";

describe("resolveLoginOptions", () => {
  it("falls back to email only for a missing or malformed response", () => {
    for (const data of [null, undefined, {}, { loginMethods: "email" }]) {
      const options = resolveLoginOptions(data);
      expect(options.showEmail).toBe(true);
      expect(options.showGoogle).toBe(false);
      expect(options.showSso).toBe(false);
    }
    expect(DEFAULT_LOGIN_OPTIONS.showEmail).toBe(true);
  });

  it("shows only the listed methods", () => {
    const sso = resolveLoginOptions({ loginMethods: ["sso"], ssoDisplayName: "Acme" });
    expect([sso.showEmail, sso.showGoogle, sso.showSso]).toEqual([false, false, true]);
    const all = resolveLoginOptions({ loginMethods: ["email", "google", "sso"] });
    expect([all.showEmail, all.showGoogle, all.showSso]).toEqual([true, true, true]);
    const google = resolveLoginOptions({ loginMethods: ["google"] });
    expect([google.showEmail, google.showGoogle, google.showSso]).toEqual([false, true, false]);
  });

  it("ignores unknown methods", () => {
    expect(resolveLoginOptions({ loginMethods: ["email", "magic"] }).loginMethods).toEqual([
      "email",
    ]);
  });

  it("labels the SSO button", () => {
    expect(ssoButtonLabel("Acme Corp")).toBe("Sign in with Acme Corp");
    expect(ssoButtonLabel("  ")).toBe("Sign in with SSO");
    expect(ssoButtonLabel(null)).toBe("Sign in with SSO");
    expect(resolveLoginOptions({ loginMethods: ["sso"], ssoDisplayName: "Okta" }).ssoLabel).toBe(
      "Sign in with Okta",
    );
  });
});

describe("login errors", () => {
  it("maps the error query value", () => {
    expect(loginErrorFromQuery("google")).toContain("Google");
    expect(loginErrorFromQuery("sso")).toContain("Single sign-on");
    expect(loginErrorFromQuery("other")).toBeNull();
    expect(loginErrorFromQuery(null)).toBeNull();
  });

  it("recognises an SSO-required refusal", () => {
    expect(isSsoRequired(new SignInRefusedError("sso_required", "x"))).toBe(true);
    expect(isSsoRequired(new SignInRefusedError("sign_in_method_disabled", "x"))).toBe(false);
    expect(isSsoRequired(new Error("x"))).toBe(false);
  });
});
