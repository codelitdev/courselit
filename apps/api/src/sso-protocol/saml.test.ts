import { describe, expect, it } from "bun:test";
import { createSamlServiceProvider } from "./saml.js";
import type { SamlConnectionConfig, SamlFailureReason } from "./types.js";
import {
  ACS_URL,
  DIGEST_SHA1,
  EMAIL_FORMAT,
  MemoryReplayStore,
  MemoryRequestStore,
  OTHER_SP_ENTITY_ID,
  PERSISTENT,
  SIG_RSA_SHA1,
  SP_ENTITY_ID,
  TRANSIENT,
  assertionXml,
  attackerKeys,
  b64,
  baseConfig,
  idpKeys,
  iso,
  newId,
  responseXml,
  rotatedKeys,
  signRoot,
  signedResponse,
} from "./test-idp.js";

const RELAY = "relay-token-1";

async function run(
  buildResponse: (requestId: string) => string,
  options: {
    config?: SamlConnectionConfig;
    requests?: MemoryRequestStore;
    replay?: MemoryReplayStore;
    relayState?: string;
    checkConnection?: () => Promise<boolean>;
    now?: () => Date;
    requestId?: string;
  } = {},
) {
  const requestId = options.requestId ?? newId();
  const requests = options.requests ?? new MemoryRequestStore();
  if (!options.requests) {
    requests.add(RELAY, requestId);
  }
  const replay = options.replay ?? new MemoryReplayStore();
  const provider = createSamlServiceProvider(options.config ?? baseConfig(), {
    now: options.now,
  });
  const result = await provider.validatePostResponse({
    samlResponse: buildResponse(requestId),
    relayState: options.relayState ?? RELAY,
    requests,
    replay,
    checkConnection: options.checkConnection,
  });
  return { result, requests, replay, requestId };
}

async function expectReason(
  reason: SamlFailureReason,
  buildResponse: (requestId: string) => string,
  options: Parameters<typeof run>[1] = {},
) {
  const { result, requests, replay } = await run(buildResponse, options);
  expect(result).toEqual({ ok: false, reason });
  return { requests, replay };
}

describe("validatePostResponse: accepted responses", () => {
  it("accepts a signed assertion with a persistent NameID", async () => {
    const { result, replay } = await run((id) =>
      signedResponse(id, { nameId: "abc-123", attributes: {
        email: ["Learner@Example.com"],
        givenName: ["Lena"],
        surname: ["Learner"],
        groups: ["a", "b"],
      } }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.assertion.subject).toBe("abc-123");
    expect(result.assertion.issuer).toBe("https://idp.example/entity");
    expect(result.assertion.email).toBe("Learner@Example.com");
    expect(result.assertion.name).toBe("Lena Learner");
    expect(result.assertion.attributes.groups).toEqual(["a", "b"]);
    expect(result.assertion.sessionNotOnOrAfter).toBeInstanceOf(Date);
    expect(replay.seen.has(result.assertion.assertionId)).toBe(true);
  });

  it("uses the configured subject attribute instead of a transient NameID", async () => {
    const { result } = await run(
      (id) =>
        signedResponse(id, {
          nameIdFormat: TRANSIENT,
          attributes: { employeeId: ["E-42"], mail: ["x@example.com"] },
        }),
      { config: baseConfig({ subjectAttribute: "employeeId" }) },
    );
    expect(result.ok && result.assertion.subject).toBe("E-42");
    expect(result.ok && result.assertion.email).toBe("x@example.com");
  });

  it("reads the email and name claims Entra uses", async () => {
    const claims = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims";
    const { result } = await run((id) =>
      signedResponse(id, {
        attributes: { [`${claims}/emailaddress`]: ["e@example.com"], [`${claims}/name`]: ["E Name"] },
      }),
    );
    expect(result.ok && result.assertion.email).toBe("e@example.com");
    expect(result.ok && result.assertion.name).toBe("E Name");
  });

  it("returns a null email when the attribute is multi-valued", async () => {
    const { result } = await run((id) =>
      signedResponse(id, { attributes: { email: ["a@example.com", "b@example.com"] } }),
    );
    expect(result.ok && result.assertion.email).toBeNull();
  });

  it("accepts a rotated certificate when several are pinned", async () => {
    const { result } = await run(
      (id) => signedResponse(id, {}, {}, { keys: rotatedKeys }),
      { config: baseConfig({ idpCertificates: [idpKeys.cert, rotatedKeys.cert] }) },
    );
    expect(result.ok).toBe(true);
  });

  it("accepts bare base64 certificates", async () => {
    const bare = idpKeys.cert.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
    const { result } = await run((id) => signedResponse(id), {
      config: baseConfig({ idpCertificates: [bare] }),
    });
    expect(result.ok).toBe(true);
  });

  it("accepts a response whose Destination is absent", async () => {
    const { result } = await run((id) => signedResponse(id, {}, { destination: null }));
    expect(result.ok).toBe(true);
  });

  it("reports a null SessionNotOnOrAfter when the IdP sends none", async () => {
    const { result } = await run((id) => signedResponse(id, { sessionNotOnOrAfter: null }));
    expect(result.ok && result.assertion.sessionNotOnOrAfter).toBeNull();
  });
});

describe("validatePostResponse: signature", () => {
  it("rejects an unsigned assertion", async () => {
    await expectReason("signature_invalid", (id) =>
      b64(responseXml({ requestId: id, assertion: assertionXml(id) })),
    );
  });

  it("rejects an assertion signed by the wrong certificate", async () => {
    await expectReason("signature_invalid", (id) =>
      signedResponse(id, {}, {}, { keys: attackerKeys }),
    );
  });

  it("never trusts a certificate carried in KeyInfo", async () => {
    await expectReason("signature_invalid", (id) =>
      signedResponse(id, {}, {}, { keys: attackerKeys, keyInfoCert: attackerKeys.cert }),
    );
  });

  it("rejects an assertion tampered with after signing", async () => {
    await expectReason("signature_invalid", (id) => {
      const signed = signRoot(assertionXml(id, { nameId: "victim" }), { keys: idpKeys }, "Assertion");
      return b64(responseXml({ requestId: id, assertion: signed.replace("victim", "attacker") }));
    });
  });

  it("rejects a signed Response that wraps an unsigned assertion", async () => {
    await expectReason("signature_invalid", (id) => {
      const unsigned = responseXml({ requestId: id, assertion: assertionXml(id) });
      return b64(signRoot(unsigned, { keys: idpKeys }, "Response"));
    });
  });

  it("rejects a SHA-1 signature even from the trusted key", async () => {
    await expectReason("weak_algorithm", (id) =>
      signedResponse(id, {}, {}, { keys: idpKeys, signatureAlgorithm: SIG_RSA_SHA1 }),
    );
  });

  it("rejects a SHA-1 digest even from the trusted key", async () => {
    await expectReason("weak_algorithm", (id) =>
      signedResponse(id, {}, {}, { keys: idpKeys, digestAlgorithm: DIGEST_SHA1 }),
    );
  });

  describe("signature wrapping", () => {
    const evil = (id: string) => assertionXml(id, { nameId: "attacker-subject" });
    const signedGood = (id: string) =>
      signRoot(assertionXml(id, { nameId: "victim-subject" }), { keys: idpKeys }, "Assertion");

    it("rejects an unsigned assertion placed next to a signed one", async () => {
      await expectReason("signature_invalid", (id) =>
        b64(responseXml({ requestId: id, assertion: evil(id) + signedGood(id) })),
      );
      await expectReason("signature_invalid", (id) =>
        b64(responseXml({ requestId: id, assertion: signedGood(id) + evil(id) })),
      );
    });

    it("rejects a signed assertion moved into Extensions behind an unsigned one", async () => {
      await expectReason("signature_invalid", (id) =>
        b64(
          responseXml({
            requestId: id,
            extensions: `<samlp:Extensions>${signedGood(id)}</samlp:Extensions>`,
            assertion: evil(id),
          }),
        ),
      );
    });

    it("rejects an unsigned assertion that wraps the signed one in Advice", async () => {
      await expectReason("signature_invalid", (id) => {
        const wrapper = evil(id).replace(
          "</saml:Issuer>",
          `</saml:Issuer><saml:Advice>${signedGood(id)}</saml:Advice>`,
        );
        return b64(responseXml({ requestId: id, assertion: wrapper }));
      });
    });

    it("rejects an unsigned assertion that reuses the signed assertion's ID", async () => {
      await expectReason("signature_invalid", (id) => {
        const good = assertionXml(id, { nameId: "victim-subject", id: "_sharedid" });
        const signed = signRoot(good, { keys: idpKeys }, "Assertion");
        const forged = assertionXml(id, { nameId: "attacker-subject", id: "_sharedid" });
        return b64(responseXml({ requestId: id, extensions: `<samlp:Extensions>${signed}</samlp:Extensions>`, assertion: forged }));
      });
    });

    it("rejects a signature lifted onto a forged assertion", async () => {
      await expectReason("signature_invalid", (id) => {
        const signed = signedGood(id);
        const signature = signed.match(/<ds:Signature[\s\S]*<\/ds:Signature>/)?.[0] ?? "";
        const forged = evil(id).replace("</saml:Issuer>", `</saml:Issuer>${signature}`);
        return b64(responseXml({ requestId: id, assertion: forged }));
      });
    });
  });
});

describe("validatePostResponse: assertion checks", () => {
  it("rejects another connection's audience", async () => {
    await expectReason("wrong_audience", (id) =>
      signedResponse(id, { audience: OTHER_SP_ENTITY_ID }),
    );
  });

  it("rejects the wrong Destination", async () => {
    await expectReason("wrong_destination", (id) =>
      signedResponse(id, {}, { destination: "https://school.example/learner-login/sso/conn_2/acs" }),
    );
  });

  it("rejects the wrong Recipient", async () => {
    await expectReason("wrong_recipient", (id) =>
      signedResponse(id, { recipient: "https://evil.example/acs" }),
    );
  });

  it("rejects a non-bearer subject confirmation", async () => {
    await expectReason("wrong_recipient", (id) => signedResponse(id, { bearer: false }));
  });

  it("rejects an expired subject confirmation", async () => {
    await expectReason("expired", (id) =>
      signedResponse(id, { scdNotOnOrAfter: iso(-600_000) }),
    );
  });

  it("rejects a subject confirmation that expires within the same assertion window only", async () => {
    // Conditions still valid, confirmation expired: delivery window is bounded separately.
    await expectReason("expired", (id) =>
      signedResponse(id, { scdNotOnOrAfter: iso(-300_000), notOnOrAfter: iso(300_000) }),
    );
  });

  it("rejects the wrong issuer", async () => {
    await expectReason("wrong_issuer", (id) =>
      signedResponse(id, { issuer: "https://evil.example/entity" }),
    );
  });

  it("rejects an expired assertion", async () => {
    await expectReason("expired", (id) =>
      signedResponse(id, { notOnOrAfter: iso(-600_000), scdNotOnOrAfter: iso(-600_000) }),
    );
  });

  it("tolerates two minutes of clock skew", async () => {
    const { result } = await run((id) =>
      signedResponse(id, { notOnOrAfter: iso(-60_000), scdNotOnOrAfter: iso(-60_000) }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects an assertion whose NotBefore is in the future", async () => {
    await expectReason("not_yet_valid", (id) =>
      signedResponse(id, { notBefore: iso(600_000) }),
    );
  });

  it("applies the injected clock to its own checks", async () => {
    await expectReason("expired", (id) => signedResponse(id), {
      now: () => new Date(Date.now() + 3_600_000),
    });
  });

  it("rejects a Response that reports a failed status, with or without an assertion", async () => {
    const responder = "urn:oasis:names:tc:SAML:2.0:status:Responder";
    await expectReason("status_not_success", (id) =>
      b64(responseXml({ requestId: id, statusValue: responder })),
    );
    await expectReason("status_not_success", (id) =>
      signedResponse(id, {}, { statusValue: responder }),
    );
  });

  it("rejects an assertion whose InResponseTo names another request", async () => {
    await expectReason("in_response_to_mismatch", (id) =>
      signedResponse(id, { inResponseTo: newId() }),
    );
  });

  it("rejects a Response whose InResponseTo names another request", async () => {
    await expectReason("in_response_to_mismatch", (id) =>
      signedResponse(id, {}, { responseInResponseTo: newId() }),
    );
  });

  it("rejects an IdP-initiated response with no InResponseTo", async () => {
    await expectReason("in_response_to_mismatch", (id) =>
      signedResponse(id, { inResponseTo: null }, { responseInResponseTo: null }),
    );
  });

  it("rejects an EncryptedAssertion it cannot read", async () => {
    await expectReason("invalid_response", (id) =>
      b64(
        responseXml({
          requestId: id,
          assertion: "<saml:EncryptedAssertion><xenc:EncryptedData xmlns:xenc=\"http://www.w3.org/2001/04/xmlenc#\"/></saml:EncryptedAssertion>",
        }),
      ),
    );
  });
});

describe("validatePostResponse: request, replay and input handling", () => {
  it("rejects an unknown RelayState before looking at the response", async () => {
    const requests = new MemoryRequestStore();
    await expectReason("request_not_found", (id) => signedResponse(id), { requests });
  });

  it("rejects an empty RelayState", async () => {
    await expectReason("request_not_found", (id) => signedResponse(id), { relayState: "" });
  });

  it("rejects a request that was already used and leaves it unusable", async () => {
    const requests = new MemoryRequestStore();
    const requestId = newId();
    requests.add(RELAY, requestId);
    const replay = new MemoryReplayStore();
    const first = await run((id) => signedResponse(id), { requests, replay, requestId });
    expect(first.result.ok).toBe(true);
    // The store no longer reports it open, so a second delivery stops at lookup.
    const second = await run((id) => signedResponse(id), { requests, replay, requestId });
    expect(second.result).toEqual({ ok: false, reason: "request_not_found" });
  });

  it("maps a lost race on the request to request_already_used", async () => {
    const requestId = newId();
    const racing = {
      async findOpen() {
        return { requestId };
      },
      async consume() {
        return false;
      },
    };
    const provider = createSamlServiceProvider(baseConfig());
    const replay = new MemoryReplayStore();
    const result = await provider.validatePostResponse({
      samlResponse: signedResponse(requestId),
      relayState: RELAY,
      requests: racing,
      replay,
    });
    expect(result).toEqual({ ok: false, reason: "request_already_used" });
    expect(replay.seen.size).toBe(0);
  });

  it("rejects a replayed assertion ID", async () => {
    const requestId = newId();
    const replay = new MemoryReplayStore();
    const response = signedResponse(requestId, { id: "_fixedassertion" });
    const a = new MemoryRequestStore();
    a.add(RELAY, requestId);
    const b = new MemoryRequestStore();
    b.add(RELAY, requestId);
    const first = await run(() => response, { requests: a, replay, requestId });
    expect(first.result.ok).toBe(true);
    const second = await run(() => response, { requests: b, replay, requestId });
    expect(second.result).toEqual({ ok: false, reason: "replayed_assertion" });
  });

  it("does not use up the request when the signature is invalid", async () => {
    const requests = new MemoryRequestStore();
    const requestId = newId();
    requests.add(RELAY, requestId);
    await run((id) => signedResponse(id, {}, {}, { keys: attackerKeys }), { requests, requestId });
    expect(requests.consumeCalls).toBe(0);
    expect(await requests.findOpen(RELAY)).toEqual({ requestId });
  });

  it("rejects a DOCTYPE or entity declaration", async () => {
    await expectReason("dtd_not_allowed", (id) =>
      b64(`<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>${responseXml({ requestId: id })}`),
    );
    await expectReason("dtd_not_allowed", (id) =>
      b64(responseXml({ requestId: id }).replace("<samlp:Status>", '<!ENTITY a "b"><samlp:Status>')),
    );
  });

  it("rejects a UTF-16 document that would hide a DOCTYPE from the check", async () => {
    await expectReason("invalid_response", (id) =>
      Buffer.from(
        `﻿<!DOCTYPE foo [<!ENTITY x "y">]>${responseXml({ requestId: id })}`,
        "utf16le",
      ).toString("base64"),
    );
  });

  it("rejects a body over 256 KB before decoding it", async () => {
    await expectReason("response_too_large", () => "A".repeat(256 * 1024 + 1));
  });

  it("rejects malformed input without throwing", async () => {
    await expectReason("invalid_response", () => "");
    await expectReason("invalid_response", () => "not base64 !!!");
    await expectReason("invalid_response", () => b64("<not-closed"));
    await expectReason("invalid_response", () => b64("<a/>"));
  });

  it("rejects when the connection is no longer usable, before validating the signature", async () => {
    let called = 0;
    await expectReason("connection_unavailable", (id) => signedResponse(id), {
      checkConnection: async () => {
        called++;
        return false;
      },
    });
    expect(called).toBe(1);
  });

  it("does not call checkConnection when the request is unknown", async () => {
    let called = 0;
    await expectReason("request_not_found", (id) => signedResponse(id), {
      requests: new MemoryRequestStore(),
      checkConnection: async () => {
        called++;
        return true;
      },
    });
    expect(called).toBe(0);
  });

  it("treats a connection with no usable certificate as unavailable", async () => {
    await expectReason("connection_unavailable", (id) => signedResponse(id), {
      config: baseConfig({ idpCertificates: ["not a certificate"] }),
    });
  });
});

describe("validatePostResponse: subject", () => {
  it("rejects a transient NameID without a subject attribute", async () => {
    await expectReason("unstable_subject", (id) => signedResponse(id, { nameIdFormat: TRANSIENT }));
  });

  it("rejects an email NameID without a subject attribute", async () => {
    await expectReason("unstable_subject", (id) =>
      signedResponse(id, { nameIdFormat: EMAIL_FORMAT, nameId: "x@example.com" }),
    );
  });

  it("ignores the NameID when a subject attribute is configured but absent", async () => {
    await expectReason("missing_subject", (id) => signedResponse(id), {
      config: baseConfig({ subjectAttribute: "employeeId" }),
    });
  });

  it("rejects a subject attribute with several values", async () => {
    await expectReason("missing_subject", (id) => signedResponse(id, { attributes: { employeeId: ["a", "b"] } }), {
      config: baseConfig({ subjectAttribute: "employeeId" }),
    });
  });

  it("rejects an empty persistent NameID", async () => {
    await expectReason("missing_subject", (id) => signedResponse(id, { nameId: "  ", nameIdFormat: PERSISTENT }));
  });

  it("does not consume the request or record the assertion when the subject is unusable", async () => {
    const { requests, replay } = await expectReason("unstable_subject", (id) =>
      signedResponse(id, { nameIdFormat: TRANSIENT }),
    );
    expect(requests.consumeCalls).toBe(0);
    expect(replay.seen.size).toBe(0);
  });
});

describe("buildAuthnRequestUrl", () => {
  it("builds a redirect to the IdP carrying the RelayState and a fresh request id", async () => {
    const provider = createSamlServiceProvider(baseConfig());
    const a = await provider.buildAuthnRequestUrl({ relayState: "tok-1" });
    const b = await provider.buildAuthnRequestUrl({ relayState: "tok-2" });
    const url = new URL(a.url);
    expect(url.origin + url.pathname).toBe("https://idp.example/sso");
    expect(url.searchParams.get("RelayState")).toBe("tok-1");
    expect(url.searchParams.get("SAMLRequest")).toBeTruthy();
    expect(a.requestId).toMatch(/^_[0-9a-f]{40}$/);
    expect(a.requestId).not.toBe(b.requestId);
    const inflated = (await import("node:zlib"))
      .inflateRawSync(Buffer.from(url.searchParams.get("SAMLRequest") ?? "", "base64"))
      .toString("utf8");
    expect(inflated).toContain(`ID="${a.requestId}"`);
    expect(inflated).toContain(ACS_URL);
    expect(inflated).toContain(SP_ENTITY_ID);
  });

  it("refuses an unsafe IdP URL", async () => {
    const provider = createSamlServiceProvider(baseConfig({ idpSsoUrl: "http://idp.example/sso" }));
    await expect(provider.buildAuthnRequestUrl({ relayState: "x" })).rejects.toThrow();
  });
});

describe("serviceProviderMetadata", () => {
  it("names the entity id and the ACS URL, escaped", () => {
    const xml = createSamlServiceProvider(
      baseConfig({ acsUrl: "https://school.example/acs?a=1&b=2" }),
    ).serviceProviderMetadata();
    expect(xml).toContain(`entityID="${SP_ENTITY_ID}"`);
    expect(xml).toContain('Location="https://school.example/acs?a=1&amp;b=2"');
    expect(xml).toContain('WantAssertionsSigned="true"');
    expect(xml).toContain(PERSISTENT);
  });
});
