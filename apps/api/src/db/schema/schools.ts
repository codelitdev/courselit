import { sql } from "drizzle-orm";
import {
  boolean,
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
  currency: text("currency").notNull().default("USD"),
  /** Encrypted provider credentials and the school's selected checkout gateway. */
  paymentSettingsEncrypted: text("payment_settings_encrypted"),
  codeInjectionHead: text("code_injection_head").notNull().default(""),
  codeInjectionBody: text("code_injection_body").notNull().default(""),
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
    verificationTokenDigest: text("verification_token_digest"),
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
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    image: text("image"),
    status: text("status")
      .$type<"active" | "deactivated">()
      .notNull()
      .default("active"),
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
      .$type<"email" | "google">()
      .notNull(),
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
      .$type<"email" | "google">()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
);

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
  membershipId: uuid("membership_id").references(() => memberships.id, {
    onDelete: "cascade",
  }),
  createdBySchoolAccountId: uuid("created_by_school_account_id").references(
    () => schoolAccounts.id,
    { onDelete: "set null" },
  ),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
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
