import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { schools } from "./schools.js";

export const integrationProviders = ["frontlit", "sendlit", "medialit"] as const;
export type IntegrationProvider = (typeof integrationProviders)[number];

export const integrationStatuses = [
  "pending",
  "provisioning",
  "ready",
  "action_required",
] as const;
export type IntegrationStatus = (typeof integrationStatuses)[number];

export const integrationJobStatuses = [
  "pending",
  "processing",
  "done",
  "failed",
] as const;
export type IntegrationJobStatus = (typeof integrationJobStatuses)[number];

export const integrationJobTypes = [
  "provision_frontlit",
  "provision_sales_page",
  "provision_sendlit",
  "sync_sendlit_contact",
  "erase_sendlit_contact",
] as const;
export type IntegrationJobType = (typeof integrationJobTypes)[number];

export type SyncSendLitContactPayload = {
  schoolAccountId: string;
  ensureSubscribed?: boolean;
  reason?: string;
};

export type EraseSendLitContactPayload = {
  schoolAccountId: string;
  sendlitContactId?: string;
};

/** One mapping per CourseLit school and sister-product provider. Secrets are
 * encrypted before they reach this table; plaintext team keys are never
 * returned by an API or written to an audit event. */
export const schoolIntegrations = pgTable(
  "school_integrations",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    provider: text("provider").$type<IntegrationProvider>().notNull(),
    server: text("server").notNull(),
    externalId: text("external_id").notNull(),
    remoteTeamId: text("remote_team_id"),
    encryptedTeamKey: text("encrypted_team_key"),
    status: text("status").$type<IntegrationStatus>().notNull().default("pending"),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    lastSuccessfulSyncAt: timestamp("last_successful_sync_at", {
      withTimezone: true,
    }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolProvider: uniqueIndex("school_integrations_school_provider_uidx").on(
      table.schoolId,
      table.provider,
    ),
    providerExternal: uniqueIndex("school_integrations_provider_external_uidx").on(
      table.provider,
      table.externalId,
    ),
  }),
);

/** Transactional outbox for sister-product provisioning and reconciliation.
 * The unique key makes school creation idempotent even if its request is
 * retried after the local transaction committed. */
export const integrationOutboxJobs = pgTable(
  "integration_outbox_jobs",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    provider: text("provider").$type<IntegrationProvider>().notNull(),
    type: text("type").$type<IntegrationJobType>().notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").$type<IntegrationJobStatus>().notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    revision: integer("revision").notNull().default(1),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    provisionIdentity: uniqueIndex("integration_outbox_jobs_provision_uidx")
      .on(table.schoolId, table.provider, table.type)
      .where(sql`type IN ('provision_frontlit', 'provision_sendlit')`),
    salesPageIdentity: uniqueIndex("integration_outbox_jobs_sales_page_uidx")
      .on(
        table.schoolId,
        sql`(${table.payload}->>'resourceType')`,
        sql`(${table.payload}->>'resourceId')`,
      )
      .where(sql`type = 'provision_sales_page'`),
    contactSyncCoalesce: uniqueIndex("integration_outbox_jobs_contact_sync_uidx")
      .on(
        table.schoolId,
        table.provider,
        table.type,
        sql`(${table.payload}->>'schoolAccountId')`,
      )
      .where(sql`status = 'pending' AND type = 'sync_sendlit_contact'`),
    pending: index("integration_outbox_jobs_pending_idx").on(
      table.status,
      table.nextAttemptAt,
    ),
  }),
);
