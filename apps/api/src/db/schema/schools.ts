import {
  boolean,
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
  loginMethods: text("login_methods").array().notNull().default(["email"]),
  ssoConfig: jsonb("sso_config").$type<{
    idpMetadata?: string;
    entryPoint?: string;
    cert?: string;
  } | null>(),
  googleConfig: jsonb("google_config").$type<{
    clientId?: string;
    clientSecret?: string;
  } | null>(),
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

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    isOwner: boolean("is_owner").notNull().default(false),
    permissions: text("permissions").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolUser: uniqueIndex("memberships_school_user_uidx").on(
      table.schoolId,
      table.userId,
    ),
  }),
);

export const selectedSchools = pgTable("selected_schools", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
});

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull(),
  permissions: text("permissions").notNull(),
  tokenDigest: text("token_digest").notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => user.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  digest: text("digest").notNull(),
  permissions: text("permissions").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
