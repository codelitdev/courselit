import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.generated.js";
import { schoolAccounts, schools } from "./schools.js";

export type SsoConnectionStatus = "draft" | "active" | "suspended" | "disabled";
export type SsoEnforcement = "optional" | "required_for_domains";

/**
 * One school's connection to its own identity provider. Whoever controls the
 * IdP settings can sign in as every learner linked to the connection, so
 * nothing here is shared between schools.
 */
export const schoolSsoConnections = pgTable(
  "school_sso_connections",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(), // Prefix: 'sso'
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    protocol: text("protocol").$type<"saml" | "oidc">().notNull(),
    /** `suspended` is set and cleared by the system when the plan changes. */
    status: text("status").$type<SsoConnectionStatus>().notNull().default("draft"),
    displayName: text("display_name").notNull(),
    enforcement: text("enforcement")
      .$type<SsoEnforcement>()
      .notNull()
      .default("optional"),
    /** Null means the school session default. */
    maxSessionMinutes: integer("max_session_minutes"),
    idpEntityId: text("idp_entity_id"),
    idpSsoUrl: text("idp_sso_url"),
    idpCertificates: text("idp_certificates")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** The SAML attribute used as the subject when NameID isn't persistent. */
    subjectAttribute: text("subject_attribute"),
    oidcIssuer: text("oidc_issuer"),
    oidcClientId: text("oidc_client_id"),
    /** Encrypted; written but never read back by the API. */
    oidcClientSecret: text("oidc_client_secret"),
    testedAt: timestamp("tested_at", { withTimezone: true }),
    /** Digest of the settings the successful test ran against. */
    testedConfigDigest: text("tested_config_digest"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("school_sso_connections_school_idx").on(table.schoolId),
    uniqueIndex("school_sso_connections_one_active_uidx")
      .on(table.schoolId)
      .where(sql`${table.status} = 'active'`),
    check(
      "school_sso_connections_protocol_check",
      sql`${table.protocol} IN ('saml', 'oidc')`,
    ),
    check(
      "school_sso_connections_status_check",
      sql`${table.status} IN ('draft', 'active', 'suspended', 'disabled')`,
    ),
    check(
      "school_sso_connections_enforcement_check",
      sql`${table.enforcement} IN ('optional', 'required_for_domains')`,
    ),
  ],
);

/** Email domains a connection may link identities for, once DNS-verified. */
export const schoolSsoDomains = pgTable(
  "school_sso_domains",
  {
    id: uuid("id").primaryKey(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => schoolSsoConnections.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    /** Lowercase ASCII (punycode), no leading `@`, no trailing dot. */
    domain: text("domain").notNull(),
    verificationToken: text("verification_token").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    /** Weekly re-checks in a row that found no TXT record; three clear `verified_at`. */
    consecutiveCheckFailures: integer("consecutive_check_failures").notNull().default(0),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("school_sso_domains_school_domain_uidx").on(
      table.schoolId,
      table.domain,
    ),
    index("school_sso_domains_connection_idx").on(table.connectionId),
  ],
);

/** The link between a person at the IdP and one school account. */
export const schoolSsoIdentities = pgTable(
  "school_sso_identities",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => schoolSsoConnections.id, { onDelete: "cascade" }),
    /** The IdP entity ID or OIDC issuer when the identity was linked. */
    issuer: text("issuer").notNull(),
    subject: text("subject").notNull(),
    schoolAccountId: uuid("school_account_id")
      .notNull()
      .references(() => schoolAccounts.id, { onDelete: "cascade" }),
    lastEmail: text("last_email").notNull(),
    lastSignedInAt: timestamp("last_signed_in_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("school_sso_identities_connection_subject_uidx").on(
      table.connectionId,
      table.subject,
    ),
    uniqueIndex("school_sso_identities_connection_account_uidx").on(
      table.connectionId,
      table.schoolAccountId,
    ),
    index("school_sso_identities_account_idx").on(table.schoolAccountId),
  ],
);

/** A sign-in (or test sign-in) started on a school website, open until it returns. */
export const schoolSsoRequests = pgTable(
  "school_sso_requests",
  {
    id: uuid("id").primaryKey(),
    requestDigest: text("request_digest").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => schoolSsoConnections.id, { onDelete: "cascade" }),
    nonceDigest: text("nonce_digest").notNull(),
    returnOrigin: text("return_origin").notNull(),
    nextPath: text("next_path").notNull(),
    /** The SAML AuthnRequest ID, or the OIDC state digest. */
    protocolRequestId: text("protocol_request_id"),
    oidcNonce: text("oidc_nonce"),
    pkceVerifier: text("pkce_verifier"),
    purpose: text("purpose").$type<"sign_in" | "test">().notNull().default("sign_in"),
    /** Only for `test`: the admin who may read the result. */
    startedBySchoolAccountId: uuid("started_by_school_account_id").references(
      () => schoolAccounts.id,
      { onDelete: "set null" },
    ),
    testResult: jsonb("test_result").$type<Record<string, unknown> | null>(),
    testResultExpiresAt: timestamp("test_result_expires_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("school_sso_requests_connection_idx").on(table.connectionId),
    check(
      "school_sso_requests_purpose_check",
      sql`${table.purpose} IN ('sign_in', 'test')`,
    ),
  ],
);

/** SAML assertion IDs already accepted, so a response can't be replayed. */
export const schoolSsoAssertionIds = pgTable(
  "school_sso_assertion_ids",
  {
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => schoolSsoConnections.id, { onDelete: "cascade" }),
    assertionId: text("assertion_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.connectionId, table.assertionId] }),
    index("school_sso_assertion_ids_expires_idx").on(table.expiresAt),
  ],
);

/** Audit log: config changes, activations, domain checks, failure reason codes. */
export const schoolSsoEvents = pgTable(
  "school_sso_events",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id").references(() => schoolSsoConnections.id, {
      onDelete: "set null",
    }),
    actorSchoolAccountId: uuid("actor_school_account_id").references(
      () => schoolAccounts.id,
      { onDelete: "set null" },
    ),
    action: text("action").notNull(),
    /** A reason code only; never assertion XML, attributes or emails. */
    reason: text("reason"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("school_sso_events_school_created_idx").on(table.schoolId, table.createdAt),
  ],
);

/**
 * Users made only to own an SSO-created school account, because
 * `school_accounts.user_id` must point at a `user`. They have no password,
 * no `account` rows and an unreachable `.invalid` address, and Better Auth
 * refuses to start a platform session for them. Kept in its own table so
 * Better Auth's schema stays untouched.
 */
export const ssoShadowUsers = pgTable("sso_shadow_users", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
