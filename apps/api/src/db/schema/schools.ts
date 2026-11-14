import type { MediaRef } from "@courselit/api-contract";
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.generated.js";
import { schoolSsoConnections } from "./school-sso.js";

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  status: text("status")
    .$type<"active" | "read_only" | "maintenance" | "migrating" | "deleted">()
    .notNull()
    .default("active"),
  locale: text("locale").notNull().default("en"),
  /**
   * Sign-in methods the school has turned on. SSO isn't listed: it is on
   * exactly when the school has an active connection.
   */
  loginMethods: text("login_methods")
    .array()
    .$type<("email" | "google")[]>()
    .notNull()
    .default(sql`'{email}'::text[]`),
  currency: text("currency").notNull().default("USD"),
  /** Encrypted provider credentials and the school's selected checkout gateway. */
  paymentSettingsEncrypted: text("payment_settings_encrypted"),
  codeInjectionHead: text("code_injection_head").notNull().default(""),
  codeInjectionBody: text("code_injection_body").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [
  check(
    "schools_login_methods_check",
    sql`${table.loginMethods} <@ ARRAY['email', 'google']::text[]`,
  ),
]);

/** Setup wizard progress and onboarding checklist state, one row per school. */
export const schoolOnboarding = pgTable("school_onboarding", {
  schoolId: uuid("school_id")
    .primaryKey()
    .references(() => schools.id, { onDelete: "cascade" }),
  status: text("status")
    .$type<"in_progress" | "complete">()
    .notNull()
    .default("in_progress"),
  step: text("step").notNull().default("school"),
  draft: jsonb("draft")
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  checklistHidden: boolean("checklist_hidden").notNull().default(false),
  resumePromptHidden: boolean("resume_prompt_hidden").notNull().default(false),
  manualDone: text("manual_done")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const schoolHosts = pgTable(
  "school_hosts",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    hostname: text("hostname").notNull().unique(),
    kind: text("kind").$type<"subdomain" | "custom">().notNull(),
    verificationStatus: text("verification_status")
      .$type<"verified" | "unverified">()
      .notNull()
      .default("unverified"),
    /** Public DNS TXT value issued for custom domain ownership checks. */
    verificationToken: text("verification_token"),
    txtSatisfied: boolean("txt_satisfied"),
    routingSatisfied: boolean("routing_satisfied"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolHostname: uniqueIndex("school_hosts_school_hostname_uidx").on(
      table.schoolId,
      table.hostname,
    ),
  }),
);

export const schoolAccounts = pgTable(
  "school_accounts",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(), // Prefix: 'cnt' to match unified contacts aggregate
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull().default(""),
    avatar: jsonb("avatar").$type<MediaRef | null>(),
    status: text("status")
      .$type<"active" | "deactivated" | "deletion_pending">()
      .notNull()
      .default("active"),
    learnerRegisteredAt: timestamp("learner_registered_at", { withTimezone: true }),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    contactActivatedAt: timestamp("contact_activated_at", { withTimezone: true }),
    sendlitContactId: text("sendlit_contact_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolUser: uniqueIndex("school_accounts_school_user_uidx").on(
      table.schoolId,
      table.userId,
    ),
    schoolEmail: uniqueIndex("school_accounts_school_email_uidx").on(
      table.schoolId,
      table.email,
    ),
    schoolSendLitContact: uniqueIndex("school_accounts_school_sendlit_contact_uidx")
      .on(table.schoolId, table.sendlitContactId)
      .where(sql`${table.sendlitContactId} IS NOT NULL`),
    contactActivatedCheck: check(
      "school_accounts_contact_activated_check",
      sql`${table.sendlitContactId} IS NULL OR ${table.contactActivatedAt} IS NOT NULL`,
    ),
    statusCheck: check(
      "school_accounts_status_check",
      sql`${table.status} IN ('active', 'deactivated', 'deletion_pending')`,
    ),
  }),
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    schoolAccountId: uuid("school_account_id")
      .notNull()
      .references(() => schoolAccounts.id, { onDelete: "cascade" }),
    isOwner: boolean("is_owner").notNull().default(false),
    permissions: text("permissions").array().notNull().default([]),
    presetId: text("preset_id"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolAccount: uniqueIndex("memberships_school_account_uidx").on(
      table.schoolId,
      table.schoolAccountId,
    ),
    singleOwner: uniqueIndex("memberships_school_single_owner_uidx")
      .on(table.schoolId)
      .where(sql`${table.isOwner} = true`),
    schoolAccountIdx: index("memberships_school_account_idx").on(
      table.schoolAccountId,
    ),
  }),
);

export const schoolSessions = pgTable(
  "school_sessions",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    schoolAccountId: uuid("school_account_id")
      .notNull()
      .references(() => schoolAccounts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tokenDigest: text("token_digest").notNull().unique(),
    authenticationMethod: text("authentication_method")
      .$type<"email" | "google" | "sso">()
      .notNull(),
    /** Set for `sso` sessions: ending the connection ends the session. */
    ssoConnectionId: uuid("sso_connection_id").references(
      (): AnyPgColumn => schoolSsoConnections.id,
      { onDelete: "cascade" },
    ),
    authenticatedAt: timestamp("authenticated_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolAccount: index("school_sessions_school_account_idx").on(
      table.schoolId,
      table.schoolAccountId,
    ),
  }),
);

export const schoolAuthTickets = pgTable(
  "school_auth_tickets",
  {
    id: uuid("id").primaryKey(),
    ticketDigest: text("ticket_digest").notNull().unique(),
    // Digest of the nonce cookie the browser got when it started signing in;
    // the ticket is redeemable only alongside that cookie.
    nonceDigest: text("nonce_digest").notNull(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    schoolAccountId: uuid("school_account_id")
      .notNull()
      .references(() => schoolAccounts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    authenticationMethod: text("authentication_method")
      .$type<"email" | "google" | "sso">()
      .notNull(),
    /** Set for `sso` tickets: the connection the session will belong to. */
    ssoConnectionId: uuid("sso_connection_id").references(
      (): AnyPgColumn => schoolSsoConnections.id,
      { onDelete: "cascade" },
    ),
    /** Set for `sso` tickets: when the IdP session ends, if earlier than the default. */
    sessionExpiresAt: timestamp("session_expires_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
);

/** Six-digit email sign-in codes, each valid for one school only. */
export const schoolLoginCodes = pgTable(
  "school_login_codes",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    codeDigest: text("code_digest").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("school_login_codes_school_email_idx").on(
      table.schoolId,
      table.email,
      table.createdAt,
    ),
  ],
);

/** A "Sign in with Google" started on a school website, open until it returns. */
export const schoolLoginRequests = pgTable("school_login_requests", {
  id: uuid("id").primaryKey(),
  requestDigest: text("request_digest").notNull().unique(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  nonceDigest: text("nonce_digest").notNull(),
  returnOrigin: text("return_origin").notNull(),
  nextPath: text("next_path").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const selectedSchools = pgTable("selected_schools", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
});

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    permissions: text("permissions").array().notNull().default([]),
    presetId: text("preset_id"),
    tokenDigest: text("token_digest").notNull(),
    invitedBySchoolAccountId: uuid("invited_by_school_account_id").references(
      () => schoolAccounts.id,
      { onDelete: "set null" },
    ),
    inviterId: text("inviter_id").references(() => user.id, {
      onDelete: "set null",
    }),
    status: text("status")
      .$type<"pending" | "accepted" | "rejected" | "revoked" | "expired">()
      .notNull()
      .default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedBySchoolAccountId: uuid("accepted_by_school_account_id").references(
      () => schoolAccounts.id,
      { onDelete: "set null" },
    ),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolEmail: index("invitations_school_email_idx").on(
      table.schoolId,
      table.email,
    ),
    pendingEmail: uniqueIndex("invitations_school_pending_email_uidx")
      .on(table.schoolId, table.normalizedEmail)
      .where(sql`${table.status} = 'pending'`),
  }),
);

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  // Creator attribution only. Keys belong to the school, so removing the
  // creator (membership, school account, or user) must not delete the key.
  membershipId: uuid("membership_id").references(() => memberships.id, {
    onDelete: "set null",
  }),
  createdBySchoolAccountId: uuid("created_by_school_account_id").references(
    () => schoolAccounts.id,
    { onDelete: "set null" },
  ),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  name: text("name").notNull().default("Default"),
  digest: text("digest").notNull(),
  permissions: text("permissions").array().notNull().default([]),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
