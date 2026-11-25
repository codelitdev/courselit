import { describe, expect, it } from "bun:test";
import {
  activationBlockers,
  buildUpdateBody,
  changesTrust,
  domainStatus,
  errorReason,
  formFromConnection,
  methodsAfterToggle,
  parseSsoTestReturn,
  primarySsoConnection,
  sessionMinutesError,
  showUpgradePrompt,
  splitCertificates,
  ssoErrorMessage,
  testAvailability,
  testFailureHint,
  txtRecordDisplay,
  wouldLeaveNoMethod,
  type SchoolLoginMethods,
  type SsoConnection,
  type SsoDomain,
} from "./sso";

const domain = (overrides: Partial<SsoDomain> = {}): SsoDomain => ({
  domain: "acme.com",
  verified: false,
  verifiedAt: null,
  verificationRecord: { type: "TXT", name: "_courselit-verification.acme.com", value: "tok_123" },
  consecutiveCheckFailures: 0,
  lastCheckedAt: null,
  ...overrides,
});

const connection = (overrides: Partial<SsoConnection> = {}): SsoConnection => ({
  id: "sso_1",
  protocol: "saml",
  status: "draft",
  displayName: "Acme",
  enforcement: "optional",
  maxSessionMinutes: null,
  idpEntityId: "https://idp.acme.com",
  idpSsoUrl: "https://idp.acme.com/sso",
  idpCertificates: ["-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----"],
  subjectAttribute: null,
  serviceProvider: { entityId: "e", acsUrl: "a", metadataUrl: "m" },
  domains: [],
  testedAt: null,
  testedCurrentConfiguration: false,
  planAvailable: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

const methods = (overrides: Partial<SchoolLoginMethods> = {}): SchoolLoginMethods => ({
  loginMethods: ["email", "google"],
  googleAvailable: true,
  sso: { active: false, displayName: null, planAvailable: true },
  usable: ["email", "google"],
  ...overrides,
});

describe("parseSsoTestReturn", () => {
  const id = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b";
  it("reads the request id the API adds on return", () => {
    expect(parseSsoTestReturn(`?ssoTest=${id}`)).toBe(id);
    expect(parseSsoTestReturn(`a=1&ssoTest=${id}`)).toBe(id);
  });
  it("ignores missing or malformed ids", () => {
    expect(parseSsoTestReturn("")).toBeNull();
    expect(parseSsoTestReturn("?ssoTest=nope")).toBeNull();
    expect(parseSsoTestReturn("?ssoTest=../x")).toBeNull();
  });
});

describe("errors", () => {
  it("reads the reason from an error body", () => {
    expect(errorReason({ code: "forbidden", details: { reason: "plan_required" } })).toBe("plan_required");
    expect(errorReason(null)).toBeNull();
    expect(errorReason({ details: { reason: 3 } })).toBeNull();
  });
  it("maps reasons to plain messages", () => {
    expect(ssoErrorMessage({ details: { reason: "unsafe_sso_url" } }, "x")).toContain("https://");
    expect(ssoErrorMessage({ details: { reason: "metadata_invalid_xml" } }, "x")).toContain("metadata");
    expect(ssoErrorMessage({ details: { reason: "unknown" } }, "fallback")).toBe("fallback");
  });
});

describe("testAvailability", () => {
  const editable = { readOnly: false, dirty: false };
  it("allows tests on draft and active connections", () => {
    expect(testAvailability(connection({ status: "draft" }), editable)).toEqual({ canTest: true, note: null });
    expect(testAvailability(connection({ status: "active" }), editable)).toEqual({ canTest: true, note: null });
  });
  it("refuses turned-off and paused connections with a note, matching the API", () => {
    const off = testAvailability(connection({ status: "disabled" }), editable);
    expect(off.canTest).toBe(false);
    expect(off.note).toContain("change its provider settings");
    expect(testAvailability(connection({ status: "suspended" }), editable).canTest).toBe(false);
  });
  it("waits for saved, complete settings", () => {
    expect(testAvailability(connection(), { readOnly: false, dirty: true })).toEqual({ canTest: false, note: null });
    expect(testAvailability(connection(), { readOnly: true, dirty: false }).canTest).toBe(false);
    expect(testAvailability(connection({ idpCertificates: [] }), editable).canTest).toBe(false);
  });
});

describe("testFailureHint", () => {
  it("explains the provider settings behind fixable failures", () => {
    expect(testFailureHint("signature_invalid")).toContain("sign the assertion itself");
    expect(testFailureHint("weak_algorithm")).toContain("RSA-SHA256");
    expect(testFailureHint("unstable_subject")).toContain("persistent");
  });
  it("has nothing to add for other or missing reasons", () => {
    expect(testFailureHint("request_already_used")).toBeNull();
    expect(testFailureHint(null)).toBeNull();
    expect(testFailureHint("toString")).toBeNull();
  });
});

describe("activationBlockers", () => {
  const ready = connection({
    domains: [domain({ verified: true })],
    testedAt: "2026-01-02T00:00:00Z",
    testedCurrentConfiguration: true,
  });

  it("is empty when everything is in place or already active", () => {
    expect(activationBlockers(ready, { billingAvailable: true })).toEqual([]);
    expect(activationBlockers(connection({ status: "active" }), { billingAvailable: true })).toEqual([]);
  });
  it("lists what is missing, in order", () => {
    const codes = activationBlockers(connection({ idpCertificates: [] }), { billingAvailable: true }).map(
      (b) => b.code,
    );
    expect(codes).toEqual(["incomplete", "no_verified_domain", "not_tested"]);
  });
  it("says the settings changed when the test is stale", () => {
    const [blocker] = activationBlockers(
      { ...ready, testedCurrentConfiguration: false },
      { billingAvailable: true },
    );
    expect(blocker.code).toBe("not_tested");
    expect(blocker.message).toContain("changed");
  });
  it("puts the plan first, and words it for self-hosted schools", () => {
    const noPlan = { ...ready, planAvailable: false };
    expect(activationBlockers(noPlan, { billingAvailable: true })[0].message).toContain("Business");
    expect(activationBlockers(noPlan, { billingAvailable: false })[0].message).not.toContain("Business");
  });
  it("blocks a suspended connection", () => {
    expect(activationBlockers({ ...ready, status: "suspended" }, { billingAvailable: true })[0].code).toBe(
      "suspended",
    );
  });
});

describe("showUpgradePrompt", () => {
  it("only shows when billing exists and the plan lacks SSO", () => {
    expect(showUpgradePrompt({ planAvailable: false, status: "draft" }, true)).toBe(true);
    expect(showUpgradePrompt({ planAvailable: false, status: "draft" }, false)).toBe(false);
    expect(showUpgradePrompt({ planAvailable: true, status: "draft" }, true)).toBe(false);
  });
});

describe("domains", () => {
  it("shows the TXT record to publish", () => {
    expect(txtRecordDisplay(domain())).toEqual({
      type: "TXT",
      name: "_courselit-verification.acme.com",
      value: "tok_123",
    });
  });
  it("describes the state", () => {
    expect(domainStatus(domain()).label).toBe("Not verified");
    expect(domainStatus(domain({ verified: true })).tone).toBe("success");
    expect(domainStatus(domain({ verified: true, consecutiveCheckFailures: 1 })).tone).toBe("warning");
  });
});

describe("primarySsoConnection", () => {
  it("prefers an active connection, then the newest", () => {
    const a = connection({ id: "a", status: "draft" });
    const b = connection({ id: "b", status: "active" });
    const c = connection({ id: "c", status: "disabled" });
    expect(primarySsoConnection([a, b, c])?.id).toBe("b");
    expect(primarySsoConnection([a, c])?.id).toBe("c");
    expect(primarySsoConnection([])).toBeNull();
  });
});

describe("certificates and changes", () => {
  it("splits several PEM blocks", () => {
    const text =
      "-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----\n\n-----BEGIN CERTIFICATE-----\nBBBB\n-----END CERTIFICATE-----";
    expect(splitCertificates(text)).toHaveLength(2);
    expect(splitCertificates("  ")).toEqual([]);
  });

  it("does not flag a trust change when nothing changed", () => {
    const c = connection();
    expect(changesTrust(c, formFromConnection(c))).toBe(false);
    expect(buildUpdateBody(c, formFromConnection(c))).toEqual({});
  });

  it("flags changes to URL, certificates, subject attribute and pasted metadata", () => {
    const c = connection();
    const base = formFromConnection(c);
    expect(changesTrust(c, { ...base, idpSsoUrl: "https://other/sso" })).toBe(true);
    expect(changesTrust(c, { ...base, certificates: "" })).toBe(true);
    expect(changesTrust(c, { ...base, subjectAttribute: "oid" })).toBe(true);
    expect(changesTrust(c, { ...base, metadataXml: "<xml/>" })).toBe(true);
  });

  it("does not flag the name, or session length", () => {
    const c = connection();
    const base = formFromConnection(c);
    expect(changesTrust(c, { ...base, displayName: "New", maxSessionMinutes: "60" })).toBe(false);
  });

  it("sends only the changed fields", () => {
    const c = connection();
    const base = formFromConnection(c);
    expect(buildUpdateBody(c, { ...base, displayName: "Acme staff", maxSessionMinutes: "60" })).toEqual({
      displayName: "Acme staff",
      maxSessionMinutes: 60,
    });
    expect(buildUpdateBody(c, { ...base, subjectAttribute: " oid " })).toEqual({ subjectAttribute: "oid" });
    expect(buildUpdateBody(c, { ...base, subjectAttribute: "" })).toEqual({});
  });

  it("sends pasted metadata instead of the manual fields", () => {
    const c = connection();
    const base = formFromConnection(c);
    expect(buildUpdateBody(c, { ...base, metadataXml: " <xml/> ", idpSsoUrl: "https://x/sso" })).toEqual({
      metadataXml: "<xml/>",
    });
  });

  it("validates the session length", () => {
    expect(sessionMinutesError("")).toBeNull();
    expect(sessionMinutesError("60")).toBeNull();
    expect(sessionMinutesError("3")).not.toBeNull();
    expect(sessionMinutesError("1.5")).not.toBeNull();
    expect(sessionMinutesError("abc")).not.toBeNull();
  });
});

describe("sign-in method toggles", () => {
  it("computes the methods left", () => {
    expect(methodsAfterToggle(methods(), "email", false)).toEqual(["google"]);
    expect(methodsAfterToggle(methods({ loginMethods: ["email"] }), "google", true)).toEqual(["email", "google"]);
  });
  it("refuses to turn off the last usable method", () => {
    expect(wouldLeaveNoMethod(methods({ loginMethods: ["email"] }), "email")).toBe(true);
    expect(wouldLeaveNoMethod(methods(), "email")).toBe(false);
  });
  it("counts an active SSO connection", () => {
    const m = methods({ loginMethods: ["email"], sso: { active: true, displayName: "Acme", planAvailable: true } });
    expect(wouldLeaveNoMethod(m, "email")).toBe(false);
  });
  it("does not count Google when the platform has no keys", () => {
    const m = methods({ loginMethods: ["email", "google"], googleAvailable: false });
    expect(wouldLeaveNoMethod(m, "email")).toBe(true);
  });
});
