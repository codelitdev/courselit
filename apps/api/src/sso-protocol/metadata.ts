import { parseXmlDocument } from "./dom.js";
import { normalizeCertificate } from "./certificates.js";
import { isSafeIdpUrl } from "./url.js";
import { NS, attribute, childElements, hasDtdOrEntity, text } from "./xml.js";

export const MAX_IDP_METADATA_BYTES = 512 * 1024;

const REDIRECT_BINDING = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect";

export type SamlIdpMetadataResult =
  | { ok: true; entityId: string; ssoUrl: string; signingCertificates: string[] }
  | {
      ok: false;
      reason:
        | "too_large"
        | "dtd_not_allowed"
        | "invalid"
        | "no_redirect_binding"
        | "unsafe_sso_url"
        | "no_signing_certificate";
    };

/**
 * Reads the entity id, HTTP-Redirect SSO URL and signing certificates from IdP
 * metadata. The metadata itself is not signature-checked: the admin supplies
 * it, and the certificates it names become pinned only once saved.
 */
export function parseSamlIdpMetadata(xml: string): SamlIdpMetadataResult {
  if (typeof xml !== "string" || xml.trim().length === 0) {
    return { ok: false, reason: "invalid" };
  }
  if (Buffer.byteLength(xml, "utf8") > MAX_IDP_METADATA_BYTES) {
    return { ok: false, reason: "too_large" };
  }
  if (hasDtdOrEntity(xml)) {
    return { ok: false, reason: "dtd_not_allowed" };
  }
  const document = parseXmlDocument(xml);
  if (!document) {
    return { ok: false, reason: "invalid" };
  }

  let entity = document.documentElement;
  if (entity.localName === "EntitiesDescriptor" && entity.namespaceURI === NS.metadata) {
    const entities = childElements(entity, "EntityDescriptor", NS.metadata);
    if (entities.length !== 1) {
      return { ok: false, reason: "invalid" };
    }
    entity = entities[0];
  }
  if (entity.localName !== "EntityDescriptor" || entity.namespaceURI !== NS.metadata) {
    return { ok: false, reason: "invalid" };
  }
  const entityId = (attribute(entity, "entityID") ?? "").trim();
  if (!entityId) {
    return { ok: false, reason: "invalid" };
  }
  const idp = childElements(entity, "IDPSSODescriptor", NS.metadata)[0];
  if (!idp) {
    return { ok: false, reason: "invalid" };
  }

  const redirects = childElements(idp, "SingleSignOnService", NS.metadata).filter(
    (service) => attribute(service, "Binding") === REDIRECT_BINDING,
  );
  if (redirects.length === 0) {
    return { ok: false, reason: "no_redirect_binding" };
  }
  const ssoUrl = (attribute(redirects[0], "Location") ?? "").trim();
  if (!isSafeIdpUrl(ssoUrl)) {
    return { ok: false, reason: "unsafe_sso_url" };
  }

  const certificates: string[] = [];
  for (const descriptor of childElements(idp, "KeyDescriptor", NS.metadata)) {
    const use = attribute(descriptor, "use");
    if (use !== null && use !== "signing") {
      continue; // encryption-only keys never verify assertions
    }
    for (const keyInfo of childElements(descriptor, "KeyInfo", NS.dsig)) {
      for (const data of childElements(keyInfo, "X509Data", NS.dsig)) {
        for (const cert of childElements(data, "X509Certificate", NS.dsig)) {
          const normalized = normalizeCertificate(text(cert));
          if (normalized && !certificates.includes(normalized)) {
            certificates.push(normalized);
          }
        }
      }
    }
  }
  if (certificates.length === 0) {
    return { ok: false, reason: "no_signing_certificate" };
  }
  return { ok: true, entityId, ssoUrl, signingCertificates: certificates };
}
