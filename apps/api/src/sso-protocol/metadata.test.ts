import { describe, expect, it } from "bun:test";
import { parseSamlIdpMetadata } from "./metadata.js";
import { attackerKeys, idpKeys, rotatedKeys } from "./test-idp.js";
import { isSafeIdpUrl } from "./url.js";

const bare = (pem: string) => pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
const MD = "urn:oasis:names:tc:SAML:2.0:metadata";
const REDIRECT = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect";
const POST = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST";

const key = (cert: string, use?: string) =>
  `<md:KeyDescriptor${use ? ` use="${use}"` : ""}><ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:X509Data><ds:X509Certificate>${cert}</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor>`;

const okta = (sso = "https://dev-1.okta.com/app/abc/sso/saml") =>
  `<?xml version="1.0" encoding="UTF-8"?><md:EntityDescriptor xmlns:md="${MD}" entityID="http://www.okta.com/exk1">` +
  `<md:IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">` +
  key(`\n${bare(idpKeys.cert).match(/.{1,64}/g)?.join("\n")}\n`, "signing") +
  `<md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>` +
  `<md:SingleSignOnService Binding="${POST}" Location="https://dev-1.okta.com/app/abc/sso/saml"/>` +
  `<md:SingleSignOnService Binding="${REDIRECT}" Location="${sso}"/>` +
  `</md:IDPSSODescriptor></md:EntityDescriptor>`;

const entra =
  `<EntityDescriptor xmlns="${MD}" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" ID="_x" entityID="https://sts.windows.net/tenant/">` +
  `<ds:Signature><ds:SignedInfo/></ds:Signature>` +
  `<IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">` +
  `<KeyDescriptor use="signing"><ds:KeyInfo><ds:X509Data><ds:X509Certificate>${bare(idpKeys.cert)}</ds:X509Certificate></ds:X509Data></ds:KeyInfo></KeyDescriptor>` +
  `<KeyDescriptor use="signing"><ds:KeyInfo><ds:X509Data><ds:X509Certificate>${bare(rotatedKeys.cert)}</ds:X509Certificate></ds:X509Data></ds:KeyInfo></KeyDescriptor>` +
  `<KeyDescriptor use="signing"><ds:KeyInfo><ds:X509Data><ds:X509Certificate>${bare(idpKeys.cert)}</ds:X509Certificate></ds:X509Data></ds:KeyInfo></KeyDescriptor>` +
  `<SingleLogoutService Binding="${REDIRECT}" Location="https://login.microsoftonline.com/tenant/saml2"/>` +
  `<SingleSignOnService Binding="${REDIRECT}" Location="https://login.microsoftonline.com/tenant/saml2"/>` +
  `<SingleSignOnService Binding="${POST}" Location="https://login.microsoftonline.com/tenant/saml2"/>` +
  `</IDPSSODescriptor></EntityDescriptor>`;

describe("parseSamlIdpMetadata", () => {
  it("reads Okta-shaped metadata and strips certificate whitespace", () => {
    expect(parseSamlIdpMetadata(okta())).toEqual({
      ok: true,
      entityId: "http://www.okta.com/exk1",
      ssoUrl: "https://dev-1.okta.com/app/abc/sso/saml",
      signingCertificates: [bare(idpKeys.cert)],
    });
  });

  it("reads Entra-shaped default-namespace metadata, with several keys deduplicated", () => {
    expect(parseSamlIdpMetadata(entra)).toEqual({
      ok: true,
      entityId: "https://sts.windows.net/tenant/",
      ssoUrl: "https://login.microsoftonline.com/tenant/saml2",
      signingCertificates: [bare(idpKeys.cert), bare(rotatedKeys.cert)],
    });
  });

  it("accepts an EntitiesDescriptor holding one entity", () => {
    const inner = okta().replace(/^<\?xml[^>]*\?>/, "");
    const result = parseSamlIdpMetadata(`<md:EntitiesDescriptor xmlns:md="${MD}">${inner}</md:EntitiesDescriptor>`);
    expect(result.ok).toBe(true);
  });

  it("ignores encryption-only certificates", () => {
    const xml = okta().replace(
      key(`\n${bare(idpKeys.cert).match(/.{1,64}/g)?.join("\n")}\n`, "signing"),
      key(bare(attackerKeys.cert), "encryption") + key(bare(rotatedKeys.cert)),
    );
    const result = parseSamlIdpMetadata(xml);
    expect(result.ok && result.signingCertificates).toEqual([bare(rotatedKeys.cert)]);
  });

  it("reports no signing certificate when only encryption keys exist", () => {
    const xml = okta().replace(/use="signing"/, 'use="encryption"');
    expect(parseSamlIdpMetadata(xml)).toEqual({ ok: false, reason: "no_signing_certificate" });
  });

  it("drops certificates that do not parse", () => {
    const xml = okta().replace(/<ds:X509Certificate>[\s\S]*<\/ds:X509Certificate>/, "<ds:X509Certificate>AAAA</ds:X509Certificate>");
    expect(parseSamlIdpMetadata(xml)).toEqual({ ok: false, reason: "no_signing_certificate" });
  });

  it("refuses an http SSO URL", () => {
    expect(parseSamlIdpMetadata(okta("http://dev-1.okta.com/sso"))).toEqual({ ok: false, reason: "unsafe_sso_url" });
  });

  it("refuses an SSO URL with credentials", () => {
    expect(parseSamlIdpMetadata(okta("https://user:pw@idp.example/sso"))).toEqual({ ok: false, reason: "unsafe_sso_url" });
  });

  it("requires the HTTP-Redirect binding", () => {
    const xml = okta().replace(REDIRECT, POST);
    expect(parseSamlIdpMetadata(xml)).toEqual({ ok: false, reason: "no_redirect_binding" });
  });

  it("refuses DTDs and entities", () => {
    expect(parseSamlIdpMetadata(`<!DOCTYPE x [<!ENTITY e "v">]>${okta()}`)).toEqual({ ok: false, reason: "dtd_not_allowed" });
    expect(parseSamlIdpMetadata(okta().replace("<md:IDPSSODescriptor", '<!ENTITY e "v"><md:IDPSSODescriptor'))).toEqual({ ok: false, reason: "dtd_not_allowed" });
  });

  it("refuses oversize metadata", () => {
    expect(parseSamlIdpMetadata(`${okta()}<!--${"a".repeat(600 * 1024)}-->`)).toEqual({ ok: false, reason: "too_large" });
  });

  it("refuses malformed or unrelated documents", () => {
    for (const xml of ["", "   ", "<a", "<root/>", `<md:EntityDescriptor xmlns:md="${MD}"/>`, `<md:EntityDescriptor xmlns:md="${MD}" entityID="x"/>`]) {
      expect(parseSamlIdpMetadata(xml)).toEqual({ ok: false, reason: "invalid" });
    }
  });
});

describe("isSafeIdpUrl", () => {
  it("accepts absolute https URLs", () => {
    expect(isSafeIdpUrl("https://idp.example/sso")).toBe(true);
    expect(isSafeIdpUrl("https://idp.example:8443/sso?x=1")).toBe(true);
  });

  it("refuses everything else", () => {
    for (const value of [
      "http://idp.example/sso",
      "https://user@idp.example/sso",
      "https://user:pw@idp.example/sso",
      "//idp.example/sso",
      "/sso",
      "javascript:alert(1)",
      "file:///etc/passwd",
      "https://",
      "https://idp.example/ sso",
      "https://idp.example/sso\n",
      "",
      "not a url",
    ]) {
      expect(isSafeIdpUrl(value)).toBe(false);
    }
    expect(isSafeIdpUrl(undefined as unknown as string)).toBe(false);
    expect(isSafeIdpUrl(`https://idp.example/${"a".repeat(3000)}`)).toBe(false);
  });
});
