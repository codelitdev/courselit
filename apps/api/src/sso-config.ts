import { createHash } from "node:crypto";
import { and, eq, isNotNull } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { normalizeCertificate } from "./sso-protocol/certificates.js";
import { isSafeIdpUrl } from "./sso-protocol/url.js";
import type { SamlConnectionConfig } from "./sso-protocol/index.js";
import type { AppDb } from "./types.js";

export type SsoConnectionRow = typeof schema.schoolSsoConnections.$inferSelect;

/** The plan feature learner SSO is gated behind. */
export const SSO_FEATURE = "learner_sso";

/**
 * Where a school's IdP sends people and metadata is read from. Both live on
 * the API host and are unique per connection, so a school changing its custom
 * domain never breaks its IdP setup, and a response meant for one connection
 * fails the audience check of every other.
 */
export function ssoServiceProviderUrls(publicApiUrl: string, connectionPublicId: string) {
  const id = encodeURIComponent(connectionPublicId);
  const metadataUrl = new URL(`/learner-login/sso/${id}/metadata`, publicApiUrl).toString();
  return {
    entityId: metadataUrl,
    metadataUrl,
    acsUrl: new URL(`/learner-login/sso/${id}/acs`, publicApiUrl).toString(),
  };
}

/**
 * A stable hash of what a connection trusts: entity ID, SSO URL, certificates
 * (order and PEM armour ignored) and the subject attribute. A test sign-in
 * records it, and activation requires it to still match, so a draft can't be
 * tested with one certificate and activated with another.
 */
export function ssoConfigDigest(config: {
  idpEntityId: string | null;
  idpSsoUrl: string | null;
  idpCertificates: readonly string[];
  subjectAttribute: string | null;
}): string {
  const certificates = [
    ...new Set(config.idpCertificates.map((value) => normalizeCertificate(value) ?? value)),
  ].sort();
  return createHash("sha256")
    .update(
      JSON.stringify([
        config.idpEntityId ?? "",
        config.idpSsoUrl ?? "",
        certificates,
        config.subjectAttribute ?? "",
      ]),
    )
    .digest("hex");
}

export function connectionConfigDigest(connection: SsoConnectionRow): string {
  return ssoConfigDigest(connection);
}

export function samlConfigFor(
  connection: SsoConnectionRow,
  publicApiUrl: string,
): SamlConnectionConfig {
  const urls = ssoServiceProviderUrls(publicApiUrl, connection.publicId);
  return {
    spEntityId: urls.entityId,
    acsUrl: urls.acsUrl,
    idpEntityId: connection.idpEntityId ?? "",
    idpSsoUrl: connection.idpSsoUrl ?? "",
    idpCertificates: connection.idpCertificates,
    subjectAttribute: connection.subjectAttribute,
  };
}

export type ActivationBlocker =
  | "incomplete_configuration"
  | "no_verified_domain"
  | "not_tested";

/**
 * The activation rules that don't depend on the plan: a complete SAML
 * configuration, at least one verified domain, and a successful test against
 * exactly the current settings. Null when all hold.
 */
export async function activationBlocker(
  db: AppDb,
  connection: SsoConnectionRow,
): Promise<ActivationBlocker | null> {
  if (
    connection.protocol !== "saml" ||
    !connection.idpEntityId ||
    !connection.idpSsoUrl ||
    !isSafeIdpUrl(connection.idpSsoUrl) ||
    connection.idpCertificates.length === 0
  ) {
    return "incomplete_configuration";
  }
  const [domain] = await db
    .select({ id: schema.schoolSsoDomains.id })
    .from(schema.schoolSsoDomains)
    .where(
      and(
        eq(schema.schoolSsoDomains.connectionId, connection.id),
        isNotNull(schema.schoolSsoDomains.verifiedAt),
      ),
    )
    .limit(1);
  if (!domain) return "no_verified_domain";
  if (
    !connection.testedAt ||
    connection.testedConfigDigest !== connectionConfigDigest(connection)
  ) {
    return "not_tested";
  }
  return null;
}
