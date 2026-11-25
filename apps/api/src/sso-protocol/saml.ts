import { randomBytes } from "node:crypto";
import { SAML, SamlStatusError, ValidateInResponseTo } from "@node-saml/node-saml";
import { normalizeCertificate, toPem } from "./certificates.js";
import { type XmlDocument, type XmlNode, parseXmlDocument } from "./dom.js";
import { isSafeIdpUrl } from "./url.js";
import type {
  SamlAssertion,
  SamlConnectionConfig,
  SamlFailureReason,
  SamlServiceProvider,
} from "./types.js";
import {
  NS,
  attribute,
  childElements,
  descendantElements,
  escapeXml,
  hasDtdOrEntity,
  parseDateTime,
  text,
} from "./xml.js";

export const MAX_SAML_RESPONSE_BASE64_LENGTH = 256 * 1024;
export const CLOCK_SKEW_MS = 120_000;

const PERSISTENT = "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent";
const BEARER = "urn:oasis:names:tc:SAML:2.0:cm:bearer";
const STATUS_SUCCESS = "urn:oasis:names:tc:SAML:2.0:status:Success";

/** Anything not listed here (SHA-1, MD5, HMAC, unknown) is refused. */
const ALLOWED_SIGNATURE_ALGORITHMS = new Set([
  "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
  "http://www.w3.org/2001/04/xmldsig-more#rsa-sha512",
]);
const ALLOWED_DIGEST_ALGORITHMS = new Set([
  "http://www.w3.org/2001/04/xmlenc#sha256",
  "http://www.w3.org/2001/04/xmlenc#sha512",
]);

const EMAIL_ATTRIBUTES = [
  "email",
  "mail",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
];
const DISPLAY_NAME_ATTRIBUTES = [
  "displayName",
  "name",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
];
const GIVEN_NAME_ATTRIBUTES = [
  "givenName",
  "firstName",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
];
const SURNAME_ATTRIBUTES = [
  "surname",
  "sn",
  "lastName",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
];

type Fail = { ok: false; reason: SamlFailureReason };
const fail = (reason: SamlFailureReason): Fail => ({ ok: false, reason });

function createSaml(
  config: SamlConnectionConfig,
  certificates: string[],
  generateUniqueId?: () => string,
): SAML {
  return new SAML({
    callbackUrl: config.acsUrl,
    entryPoint: config.idpSsoUrl,
    issuer: config.spEntityId,
    audience: config.spEntityId,
    idpIssuer: config.idpEntityId,
    idpCert: certificates.map(toPem),
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    signatureAlgorithm: "sha256",
    digestAlgorithm: "sha256",
    acceptedClockSkewMs: CLOCK_SKEW_MS,
    identifierFormat: PERSISTENT,
    disableRequestedAuthnContext: true,
    // InResponseTo is bound to our own stores and checked in this module,
    // against the signed SubjectConfirmationData.
    validateInResponseTo: ValidateInResponseTo.never,
    rejectReplayedAssertions: false,
    ...(generateUniqueId ? { generateUniqueId } : {}),
  });
}

function usableCertificates(config: SamlConnectionConfig): string[] {
  const out: string[] = [];
  for (const raw of config.idpCertificates ?? []) {
    const bare = normalizeCertificate(raw);
    if (bare && !out.includes(bare)) {
      out.push(bare);
    }
  }
  return out;
}

function decodeResponse(samlResponse: unknown): { xml: string } | Fail {
  if (typeof samlResponse !== "string" || samlResponse.length === 0) {
    return fail("invalid_response");
  }
  if (samlResponse.length > MAX_SAML_RESPONSE_BASE64_LENGTH) {
    return fail("response_too_large");
  }
  if (!/^[A-Za-z0-9+/=\s]+$/.test(samlResponse)) {
    return fail("invalid_response");
  }
  const xml = Buffer.from(samlResponse, "base64").toString("utf8");
  // Only plain UTF-8 XML. A UTF-16 (or otherwise encoded) document would hide
  // a DOCTYPE from the check below, so anything with NUL bytes or not
  // starting with markup is refused outright.
  if (xml.includes("\u0000") || !/^﻿?\s*</.test(xml)) {
    return fail("invalid_response");
  }
  if (hasDtdOrEntity(xml)) {
    return fail("dtd_not_allowed");
  }
  return { xml };
}

/** Every signature in the message must use SHA-2 for both signing and digest. */
function hasWeakAlgorithm(document: XmlDocument): boolean {
  for (const signature of descendantElements(document.documentElement, "Signature", NS.dsig)) {
    const signedInfo = childElements(signature, "SignedInfo", NS.dsig)[0];
    if (!signedInfo) {
      return true;
    }
    const method = childElements(signedInfo, "SignatureMethod", NS.dsig)[0];
    if (!method || !ALLOWED_SIGNATURE_ALGORITHMS.has(attribute(method, "Algorithm") ?? "")) {
      return true;
    }
    const references = childElements(signedInfo, "Reference", NS.dsig);
    if (references.length === 0) {
      return true;
    }
    for (const reference of references) {
      const digest = childElements(reference, "DigestMethod", NS.dsig)[0];
      if (!digest || !ALLOWED_DIGEST_ALGORITHMS.has(attribute(digest, "Algorithm") ?? "")) {
        return true;
      }
    }
  }
  return false;
}

function mapLibraryError(error: unknown): SamlFailureReason {
  if (error instanceof SamlStatusError) {
    return "status_not_success";
  }
  const message = error instanceof Error ? error.message : "";
  if (/not yet valid/i.test(message)) return "not_yet_valid";
  if (/expired|too old|No valid subject confirmation/i.test(message)) return "expired";
  if (/audience/i.test(message)) return "wrong_audience";
  if (/issuer/i.test(message)) return "wrong_issuer";
  if (/signature/i.test(message)) return "signature_invalid";
  return "invalid_response";
}

function readAttributes(assertion: XmlNode): Record<string, string[]> {
  const merged = new Map<string, string[]>();
  for (const statement of childElements(assertion, "AttributeStatement", NS.assertion)) {
    for (const attr of childElements(statement, "Attribute", NS.assertion)) {
      const name = attribute(attr, "Name");
      if (!name) {
        continue;
      }
      const values = merged.get(name) ?? [];
      for (const value of childElements(attr, "AttributeValue", NS.assertion)) {
        const content = text(value);
        if (content) {
          values.push(content);
        }
      }
      merged.set(name, values);
    }
  }
  return Object.fromEntries(merged);
}

function firstSingle(attributes: Record<string, string[]>, names: string[]): string | null {
  for (const name of names) {
    if (Object.hasOwn(attributes, name) && attributes[name].length === 1) {
      return attributes[name][0];
    }
  }
  return null;
}

function readName(attributes: Record<string, string[]>): string | null {
  const display = firstSingle(attributes, DISPLAY_NAME_ATTRIBUTES);
  if (display) {
    return display;
  }
  const given = firstSingle(attributes, GIVEN_NAME_ATTRIBUTES);
  const surname = firstSingle(attributes, SURNAME_ATTRIBUTES);
  const joined = [given, surname].filter(Boolean).join(" ");
  return joined || null;
}

type Checked = {
  assertion: XmlNode;
  assertionId: string;
  issuer: string;
  replayExpiresAt: Date;
  sessionNotOnOrAfter: Date | null;
};

/**
 * Checks on the signed assertion (the bytes the signature covers, not the
 * received document), plus the few unsigned Response attributes that are
 * checked as defence in depth.
 */
function checkSignedAssertion(
  config: SamlConnectionConfig,
  received: XmlDocument,
  assertionXml: string,
  requestId: string,
  now: Date,
): Checked | Fail {
  const root = received.documentElement;
  if (root.localName !== "Response" || root.namespaceURI !== NS.protocol) {
    return fail("invalid_response");
  }

  const status = childElements(root, "Status", NS.protocol)[0];
  const statusCode = status ? childElements(status, "StatusCode", NS.protocol)[0] : undefined;
  if (!statusCode) {
    return fail("invalid_response");
  }
  if (attribute(statusCode, "Value") !== STATUS_SUCCESS) {
    return fail("status_not_success");
  }

  const destination = attribute(root, "Destination");
  if (destination !== null && destination !== config.acsUrl) {
    return fail("wrong_destination");
  }

  const document = parseXmlDocument(assertionXml);
  const assertion = document?.documentElement;
  if (assertion?.localName !== "Assertion" || assertion.namespaceURI !== NS.assertion) {
    return fail("invalid_response");
  }
  const assertionId = attribute(assertion, "ID");
  if (!assertionId) {
    return fail("invalid_response");
  }

  const issuers = childElements(assertion, "Issuer", NS.assertion);
  if (issuers.length !== 1 || text(issuers[0]) !== config.idpEntityId) {
    return fail("wrong_issuer");
  }

  const nowMs = now.getTime();
  const conditionsList = childElements(assertion, "Conditions", NS.assertion);
  if (conditionsList.length !== 1) {
    return fail("wrong_audience");
  }
  const conditions = conditionsList[0];
  const restrictions = childElements(conditions, "AudienceRestriction", NS.assertion);
  const audienceOk =
    restrictions.length > 0 &&
    restrictions.every((restriction) =>
      childElements(restriction, "Audience", NS.assertion).some(
        (audience) => text(audience) === config.spEntityId,
      ),
    );
  if (!audienceOk) {
    return fail("wrong_audience");
  }
  let conditionsNotOnOrAfter: Date | null = null;
  const conditionsNotBefore = attribute(conditions, "NotBefore");
  if (conditionsNotBefore !== null) {
    const notBefore = parseDateTime(conditionsNotBefore);
    if (!notBefore) return fail("invalid_response");
    if (nowMs + CLOCK_SKEW_MS < notBefore.getTime()) return fail("not_yet_valid");
  }
  const conditionsEnd = attribute(conditions, "NotOnOrAfter");
  if (conditionsEnd !== null) {
    conditionsNotOnOrAfter = parseDateTime(conditionsEnd);
    if (!conditionsNotOnOrAfter) return fail("invalid_response");
    if (nowMs - CLOCK_SKEW_MS >= conditionsNotOnOrAfter.getTime()) return fail("expired");
  }

  const subjects = childElements(assertion, "Subject", NS.assertion);
  if (subjects.length !== 1) {
    return fail("missing_subject");
  }
  let firstRejection: SamlFailureReason | null = null;
  let confirmedUntil: Date | null = null;
  for (const confirmation of childElements(subjects[0], "SubjectConfirmation", NS.assertion)) {
    if (attribute(confirmation, "Method") !== BEARER) {
      continue;
    }
    const data = childElements(confirmation, "SubjectConfirmationData", NS.assertion)[0];
    if (!data || attribute(data, "Recipient") !== config.acsUrl) {
      firstRejection ??= "wrong_recipient";
      continue;
    }
    const end = parseDateTime(attribute(data, "NotOnOrAfter"));
    if (!end) {
      firstRejection ??= "invalid_response";
      continue;
    }
    if (nowMs - CLOCK_SKEW_MS >= end.getTime()) {
      firstRejection ??= "expired";
      continue;
    }
    const start = attribute(data, "NotBefore");
    if (start !== null) {
      const notBefore = parseDateTime(start);
      if (!notBefore || nowMs + CLOCK_SKEW_MS < notBefore.getTime()) {
        firstRejection ??= notBefore ? "not_yet_valid" : "invalid_response";
        continue;
      }
    }
    if (attribute(data, "InResponseTo") !== requestId) {
      firstRejection ??= "in_response_to_mismatch";
      continue;
    }
    confirmedUntil = end;
    break;
  }
  if (!confirmedUntil) {
    return fail(firstRejection ?? "wrong_recipient");
  }
  // The Response's own InResponseTo is unsigned; it can only add a refusal.
  const responseInResponseTo = attribute(root, "InResponseTo");
  if (responseInResponseTo !== null && responseInResponseTo !== requestId) {
    return fail("in_response_to_mismatch");
  }

  let sessionNotOnOrAfter: Date | null = null;
  const authnStatements = childElements(assertion, "AuthnStatement", NS.assertion);
  const sessionEnd = authnStatements[0] ? attribute(authnStatements[0], "SessionNotOnOrAfter") : null;
  if (sessionEnd !== null) {
    sessionNotOnOrAfter = parseDateTime(sessionEnd);
    if (!sessionNotOnOrAfter) return fail("invalid_response");
  }

  const latest =
    conditionsNotOnOrAfter && conditionsNotOnOrAfter.getTime() > confirmedUntil.getTime()
      ? conditionsNotOnOrAfter
      : confirmedUntil;
  return {
    assertion,
    assertionId,
    issuer: text(issuers[0]),
    // Keep the ID on record for as long as the assertion could still be accepted.
    replayExpiresAt: new Date(latest.getTime() + CLOCK_SKEW_MS),
    sessionNotOnOrAfter,
  };
}

function readSubject(
  config: SamlConnectionConfig,
  assertion: XmlNode,
  attributes: Record<string, string[]>,
): { subject: string } | Fail {
  if (config.subjectAttribute) {
    const values = Object.hasOwn(attributes, config.subjectAttribute)
      ? attributes[config.subjectAttribute]
      : [];
    return values.length === 1 && values[0] ? { subject: values[0] } : fail("missing_subject");
  }
  const subject = childElements(assertion, "Subject", NS.assertion)[0];
  const nameIds = subject ? childElements(subject, "NameID", NS.assertion) : [];
  if (nameIds.length !== 1 || !text(nameIds[0])) {
    return fail("missing_subject");
  }
  if (attribute(nameIds[0], "Format") !== PERSISTENT) {
    return fail("unstable_subject");
  }
  return { subject: text(nameIds[0]) };
}

export function createSamlServiceProvider(
  config: SamlConnectionConfig,
  options: { now?: () => Date } = {},
): SamlServiceProvider {
  const now = options.now ?? (() => new Date());

  return {
    async buildAuthnRequestUrl({ relayState }) {
      if (!isSafeIdpUrl(config.idpSsoUrl)) {
        throw new Error("The identity provider SSO URL is not a safe https URL");
      }
      const certificates = usableCertificates(config);
      if (certificates.length === 0) {
        throw new Error("The connection has no usable identity provider certificate");
      }
      const requestId = `_${randomBytes(20).toString("hex")}`;
      const saml = createSaml(config, certificates, () => requestId);
      const url = await saml.getAuthorizeUrlAsync(relayState, undefined, {});
      return { url, requestId };
    },

    async validatePostResponse({ samlResponse, relayState, requests, replay, checkConnection }) {
      // 1. size, encoding, DTD
      const decoded = decodeResponse(samlResponse);
      if ("ok" in decoded) {
        return decoded;
      }

      // 2. the request this response answers
      if (typeof relayState !== "string" || relayState.length === 0) {
        return fail("request_not_found");
      }
      const open = await requests.findOpen(relayState);
      if (!open) {
        return fail("request_not_found");
      }

      // 3. the connection is still usable
      if (checkConnection && !(await checkConnection())) {
        return fail("connection_unavailable");
      }
      const certificates = usableCertificates(config);
      if (certificates.length === 0) {
        return fail("connection_unavailable");
      }

      // 4. signature and the checks node-saml makes
      const received = parseXmlDocument(decoded.xml);
      if (!received) {
        return fail("invalid_response");
      }
      const receivedRoot = received.documentElement;
      if (receivedRoot.localName !== "Response" || receivedRoot.namespaceURI !== NS.protocol) {
        return fail("invalid_response");
      }
      if (hasWeakAlgorithm(received)) {
        return fail("weak_algorithm");
      }
      let assertionXml: string;
      try {
        const { profile } = await createSaml(config, certificates).validatePostResponseAsync({
          SAMLResponse: samlResponse.replace(/\s+/g, ""),
        });
        if (!profile) {
          return fail("status_not_success");
        }
        if (typeof profile.getAssertionXml !== "function") {
          return fail("invalid_response");
        }
        assertionXml = profile.getAssertionXml();
      } catch (error) {
        return fail(mapLibraryError(error));
      }

      // 5. our own checks, on the signed assertion only
      const checked = checkSignedAssertion(config, received, assertionXml, open.requestId, now());
      if ("ok" in checked) {
        return checked;
      }
      const attributes = readAttributes(checked.assertion);
      const subject = readSubject(config, checked.assertion, attributes);
      if ("ok" in subject) {
        return subject;
      }

      // 6. use up the request, 7. remember the assertion
      if (!(await requests.consume(relayState, open.requestId))) {
        return fail("request_already_used");
      }
      if (!(await replay.remember(checked.assertionId, checked.replayExpiresAt))) {
        return fail("replayed_assertion");
      }

      const assertion: SamlAssertion = {
        issuer: checked.issuer,
        assertionId: checked.assertionId,
        subject: subject.subject,
        email: firstSingle(attributes, EMAIL_ATTRIBUTES),
        name: readName(attributes),
        attributes,
        sessionNotOnOrAfter: checked.sessionNotOnOrAfter,
      };
      return { ok: true, assertion };
    },

    serviceProviderMetadata() {
      return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<md:EntityDescriptor xmlns:md="${NS.metadata}" entityID="${escapeXml(config.spEntityId)}">`,
        `<md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="${NS.protocol}">`,
        `<md:NameIDFormat>${PERSISTENT}</md:NameIDFormat>`,
        `<md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${escapeXml(config.acsUrl)}" index="0" isDefault="true"/>`,
        "</md:SPSSODescriptor>",
        "</md:EntityDescriptor>",
      ].join("");
    },
  };
}
