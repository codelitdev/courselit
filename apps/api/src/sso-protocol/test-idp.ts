// Fixture identity provider for the sso-protocol tests. Its key pairs are
// made fresh for each test run with openssl, so no private key is committed
// and none is trusted anywhere outside these tests.
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SignedXml } from "xml-crypto";
import type {
  AssertionReplayStore,
  SamlConnectionConfig,
  SsoRequestStore,
} from "./types.js";

export type KeyPair = { key: string; cert: string };

/** A self-signed RSA-2048 key pair, like the certificates IdPs publish. */
function generateKeyPair(commonName: string): KeyPair {
  const dir = mkdtempSync(join(tmpdir(), "courselit-test-idp-"));
  try {
    const key = join(dir, "key.pem");
    const cert = join(dir, "cert.pem");
    const result = Bun.spawnSync(
      ["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256", "-days", "2",
        "-subj", `/CN=${commonName}`, "-keyout", key, "-out", cert],
      { stdout: "ignore", stderr: "pipe" },
    );
    if (!result.success) {
      throw new Error(`openssl couldn't make a test key pair: ${result.stderr.toString()}`);
    }
    return { key: readFileSync(key, "utf8"), cert: readFileSync(cert, "utf8") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export const idpKeys = generateKeyPair("test-idp.example");
export const rotatedKeys = generateKeyPair("test-idp-rotated.example");
export const attackerKeys = generateKeyPair("test-attacker.example");

export const SIG_RSA_SHA256 = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
export const SIG_RSA_SHA1 = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
export const DIGEST_SHA256 = "http://www.w3.org/2001/04/xmlenc#sha256";
export const DIGEST_SHA1 = "http://www.w3.org/2000/09/xmldsig#sha1";
export const PERSISTENT = "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent";
export const TRANSIENT = "urn:oasis:names:tc:SAML:2.0:nameid-format:transient";
export const EMAIL_FORMAT = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress";

export const SP_ENTITY_ID = "https://school.example/learner-login/sso/conn_1/metadata";
export const OTHER_SP_ENTITY_ID = "https://school.example/learner-login/sso/conn_2/metadata";
export const ACS_URL = "https://school.example/learner-login/sso/conn_1/acs";
export const IDP_ENTITY_ID = "https://idp.example/entity";
export const IDP_SSO_URL = "https://idp.example/sso";

export const baseConfig = (overrides: Partial<SamlConnectionConfig> = {}): SamlConnectionConfig => ({
  spEntityId: SP_ENTITY_ID,
  acsUrl: ACS_URL,
  idpEntityId: IDP_ENTITY_ID,
  idpSsoUrl: IDP_SSO_URL,
  idpCertificates: [idpKeys.cert],
  subjectAttribute: null,
  ...overrides,
});

export const iso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString();
export const newId = () => `_${randomBytes(12).toString("hex")}`;

export type SigningOptions = {
  keys: KeyPair;
  signatureAlgorithm?: string;
  digestAlgorithm?: string;
  /** Put this certificate in the signature's KeyInfo. */
  keyInfoCert?: string;
};

export type AssertionOptions = {
  id?: string;
  issuer?: string;
  audience?: string;
  nameId?: string;
  nameIdFormat?: string;
  inResponseTo?: string | null;
  recipient?: string;
  bearer?: boolean;
  notBefore?: string | null;
  notOnOrAfter?: string;
  scdNotOnOrAfter?: string;
  sessionNotOnOrAfter?: string | null;
  attributes?: Record<string, string[]>;
};

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function assertionXml(requestId: string, options: AssertionOptions = {}): string {
  const id = options.id ?? newId();
  const attributes = options.attributes ?? {
    email: ["learner@example.com"],
    displayName: ["Lena Learner"],
  };
  const inResponseTo =
    options.inResponseTo === undefined ? requestId : options.inResponseTo;
  const notBefore = options.notBefore === undefined ? iso(-60_000) : options.notBefore;
  const attributeXml = Object.entries(attributes)
    .map(
      ([name, values]) =>
        `<saml:Attribute Name="${esc(name)}">${values
          .map((value) => `<saml:AttributeValue>${esc(value)}</saml:AttributeValue>`)
          .join("")}</saml:Attribute>`,
    )
    .join("");
  const session =
    options.sessionNotOnOrAfter === null
      ? ""
      : ` SessionNotOnOrAfter="${options.sessionNotOnOrAfter ?? iso(3_600_000)}"`;
  return (
    `<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${id}" Version="2.0" IssueInstant="${iso()}">` +
    `<saml:Issuer>${options.issuer ?? IDP_ENTITY_ID}</saml:Issuer>` +
    `<saml:Subject><saml:NameID Format="${options.nameIdFormat ?? PERSISTENT}">${esc(options.nameId ?? "subject-123")}</saml:NameID>` +
    `<saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:${options.bearer === false ? "holder-of-key" : "bearer"}">` +
    `<saml:SubjectConfirmationData Recipient="${options.recipient ?? ACS_URL}" NotOnOrAfter="${options.scdNotOnOrAfter ?? iso(300_000)}"${inResponseTo === null ? "" : ` InResponseTo="${inResponseTo}"`}/>` +
    `</saml:SubjectConfirmation></saml:Subject>` +
    `<saml:Conditions${notBefore === null ? "" : ` NotBefore="${notBefore}"`} NotOnOrAfter="${options.notOnOrAfter ?? iso(300_000)}">` +
    `<saml:AudienceRestriction><saml:Audience>${options.audience ?? SP_ENTITY_ID}</saml:Audience></saml:AudienceRestriction></saml:Conditions>` +
    `<saml:AuthnStatement AuthnInstant="${iso(-5_000)}"${session}><saml:AuthnContext><saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef></saml:AuthnContext></saml:AuthnStatement>` +
    `<saml:AttributeStatement>${attributeXml}</saml:AttributeStatement>` +
    `</saml:Assertion>`
  );
}

/** Enveloped signature over the document's root element, placed after its Issuer. */
export function signRoot(xml: string, signing: SigningOptions, rootName: string): string {
  const sig = new SignedXml({
    privateKey: signing.keys.key,
    signatureAlgorithm: signing.signatureAlgorithm ?? SIG_RSA_SHA256,
    canonicalizationAlgorithm: "http://www.w3.org/2001/10/xml-exc-c14n#",
    ...(signing.keyInfoCert ? { publicCert: signing.keyInfoCert } : {}),
  });
  sig.addReference({
    xpath: `/*[local-name(.)='${rootName}']`,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/2001/10/xml-exc-c14n#",
    ],
    digestAlgorithm: signing.digestAlgorithm ?? DIGEST_SHA256,
  });
  sig.computeSignature(xml, {
    location: { reference: `/*[local-name(.)='${rootName}']/*[local-name(.)='Issuer']`, action: "after" },
  });
  return sig.getSignedXml();
}

export type ResponseOptions = {
  requestId: string;
  destination?: string | null;
  responseInResponseTo?: string | null;
  statusValue?: string;
  /** The assertion markup placed inside the Response. */
  assertion?: string;
  extensions?: string;
};

export function responseXml(options: ResponseOptions): string {
  const destination = options.destination === undefined ? ACS_URL : options.destination;
  const inResponseTo =
    options.responseInResponseTo === undefined ? options.requestId : options.responseInResponseTo;
  return (
    `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${newId()}" Version="2.0" IssueInstant="${iso()}"` +
    `${destination === null ? "" : ` Destination="${destination}"`}${inResponseTo === null ? "" : ` InResponseTo="${inResponseTo}"`}>` +
    `<saml:Issuer>${IDP_ENTITY_ID}</saml:Issuer>` +
    `<samlp:Status><samlp:StatusCode Value="${options.statusValue ?? "urn:oasis:names:tc:SAML:2.0:status:Success"}"/></samlp:Status>` +
    `${options.extensions ?? ""}${options.assertion ?? ""}` +
    `</samlp:Response>`
  );
}

export const b64 = (xml: string) => Buffer.from(xml, "utf8").toString("base64");

/** A fully valid, correctly signed response; tweak through the options. */
export function signedResponse(
  requestId: string,
  assertion: AssertionOptions = {},
  response: Partial<ResponseOptions> = {},
  signing: SigningOptions = { keys: idpKeys },
): string {
  const signed = signRoot(assertionXml(requestId, assertion), signing, "Assertion");
  return b64(responseXml({ requestId, assertion: signed, ...response }));
}

export class MemoryRequestStore implements SsoRequestStore {
  private readonly requests = new Map<string, { requestId: string; used: boolean }>();
  consumeCalls = 0;
  add(relayState: string, requestId: string) {
    this.requests.set(relayState, { requestId, used: false });
  }
  async findOpen(relayState: string) {
    const entry = this.requests.get(relayState);
    return entry && !entry.used ? { requestId: entry.requestId } : null;
  }
  async consume(relayState: string, inResponseTo: string) {
    this.consumeCalls++;
    const entry = this.requests.get(relayState);
    if (!entry || entry.used || entry.requestId !== inResponseTo) {
      return false;
    }
    entry.used = true;
    return true;
  }
}

export class MemoryReplayStore implements AssertionReplayStore {
  readonly seen = new Map<string, Date>();
  async remember(assertionId: string, expiresAt: Date) {
    if (this.seen.has(assertionId)) {
      return false;
    }
    this.seen.set(assertionId, expiresAt);
    return true;
  }
}
