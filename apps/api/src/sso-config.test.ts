import { describe, expect, it } from "bun:test";
import { ssoConfigDigest, ssoServiceProviderUrls } from "./sso-config.js";
import { idpKeys, rotatedKeys } from "./sso-protocol/test-idp.js";

const bare = (pem: string) => pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
const base = {
  idpEntityId: "https://idp.example/entity",
  idpSsoUrl: "https://idp.example/sso",
  idpCertificates: [bare(idpKeys.cert)],
  subjectAttribute: null,
};

describe("ssoConfigDigest", () => {
  it("ignores certificate order, PEM armour and duplicates", () => {
    const one = ssoConfigDigest({ ...base, idpCertificates: [bare(idpKeys.cert), bare(rotatedKeys.cert)] });
    const two = ssoConfigDigest({ ...base, idpCertificates: [rotatedKeys.cert, idpKeys.cert, bare(idpKeys.cert)] });
    expect(one).toBe(two);
  });
  it("changes with the entity ID, SSO URL, certificates and subject attribute", () => {
    const digest = ssoConfigDigest(base);
    const variants = [
      { ...base, idpEntityId: "https://other/entity" },
      { ...base, idpSsoUrl: "https://idp.example/other" },
      { ...base, idpCertificates: [bare(rotatedKeys.cert)] },
      { ...base, subjectAttribute: "oid" },
    ];
    for (const variant of variants) expect(ssoConfigDigest(variant)).not.toBe(digest);
    expect(new Set(variants.map(ssoConfigDigest)).size).toBe(variants.length);
  });
});

describe("ssoServiceProviderUrls", () => {
  it("puts the ACS and metadata on the API host, per connection", () => {
    expect(ssoServiceProviderUrls("https://api.example.com/", "sso_abc")).toEqual({
      entityId: "https://api.example.com/learner-login/sso/sso_abc/metadata",
      metadataUrl: "https://api.example.com/learner-login/sso/sso_abc/metadata",
      acsUrl: "https://api.example.com/learner-login/sso/sso_abc/acs",
    });
  });
});
