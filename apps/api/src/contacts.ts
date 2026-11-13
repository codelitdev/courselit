import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import {
  type Contact,
  type ContactFilterSet,
  type ContactSegment,
  type CreateContactBody,
  type MediaRef,
  type UpdateContactBody,
  type UpdateContactMarketingBody,
} from "@courselit/api-contract";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { ActivityType, recordActivity } from "./activities.js";
import {
  activeCommunitySubscriptions,
  cancelCommunitySubscriptionsAtProvider,
  markCommunitySubscriptionsCancelled,
} from "./community-billing.js";
import { fromSendLitFilter, toSendLitFilter } from "./contact-filters.js";
import * as schema from "./db/schema/index.js";
import { normalizeEmail } from "./invitations.js";
import { getConfiguredPaymentProvider, type PaymentProvider } from "./payments.js";
import type { CourseLitPermission } from "./permissions.js";
import { CONTACT_PUBLIC_ID_PREFIX } from "./public-id-prefixes.js";
import {
  createSendLitContact,
  createSendLitSegment,
  deleteSendLitSegment,
  deleteSendLitTag,
  getSendLitContact,
  getSendLitSegment,
  getSendLitTagReferences,
  listSendLitContacts,
  listSendLitSegments,
  listSendLitTags,
  renameSendLitTag,
  SendLitApiError,
  type SendLitConfig,
  type SendLitContact,
  type SendLitDeleteTagResult,
  type SendLitRenameTagResult,
  type SendLitTagReferences,
  type SendLitTagSummary,
  sendLitConfig,
  updateSendLitContact,
  updateSendLitSegment,
} from "./sendlit-client.js";
import type { AppDb } from "./types.js";
import { decryptIntegrationSecret } from "./utils/integration-secrets.js";

export type AdminContactContext = {
  schoolId?: string | null;
  tenantId?: string | null;
  publicSchoolId: string;
  principalId: string;
  requestId: string;
  permissions: ReadonlySet<CourseLitPermission>;
};

function getSchoolId(ctx: AdminContactContext): string | null {
  return ctx.schoolId ?? ctx.tenantId ?? null;
}

export type SyncSendLitContactPayload = {
  schoolAccountId: string;
  ensureSubscribed?: boolean;
  /** Explicit marketing subscription the contact must end up with. */
  subscribed?: boolean;
  reason?: string;
};

function mergeContactSyncPayload(
  existing: Record<string, unknown>,
  input: {
    schoolAccountId: string;
    ensureSubscribed?: boolean;
    subscribed?: boolean;
    reason?: string;
  },
): Record<string, unknown> {
  const next: Record<string, unknown> = {
    ...existing,
    schoolAccountId: input.schoolAccountId,
    reason: input.reason ?? existing.reason,
  };
  if (typeof input.subscribed === "boolean") {
    // The latest explicit choice wins over earlier queued intents.
    next.subscribed = input.subscribed;
    next.ensureSubscribed = input.subscribed;
  } else {
    next.ensureSubscribed = Boolean(
      existing.ensureSubscribed || input.ensureSubscribed,
    );
    if (input.ensureSubscribed && existing.subscribed === false) {
      next.subscribed = true;
    }
  }
  return next;
}

export type EraseSendLitContactPayload = {
  schoolAccountId: string;
  sendlitContactId?: string;
};

/**
 * Coalescing outbox enqueue helper for SendLit contact sync.
 * If a pending job for the same contact already exists, increments revision
 * and merges the requested subscription intent (an explicit `subscribed`
 * wins over `ensureSubscribed`).
 */
export async function queueSendLitContactSync(
  db: AppDb,
  input: {
    schoolId: string;
    schoolAccountId: string;
    ensureSubscribed?: boolean;
    subscribed?: boolean;
    reason?: string;
    clock: Clock;
  },
): Promise<void> {
  const now = input.clock.now();
  const existing = await db
    .select({
      id: schema.integrationOutboxJobs.id,
      revision: schema.integrationOutboxJobs.revision,
      payload: schema.integrationOutboxJobs.payload,
    })
    .from(schema.integrationOutboxJobs)
    .where(
      and(
        eq(schema.integrationOutboxJobs.schoolId, input.schoolId),
        eq(schema.integrationOutboxJobs.provider, "sendlit"),
        eq(schema.integrationOutboxJobs.type, "sync_sendlit_contact"),
        eq(schema.integrationOutboxJobs.status, "pending"),
        sql`(${schema.integrationOutboxJobs.payload}->>'schoolAccountId') = ${input.schoolAccountId}`,
      ),
    )
    .limit(1);

  if (existing[0]) {
    const existingPayload = (existing[0].payload ?? {}) as Record<string, unknown>;
    await db
      .update(schema.integrationOutboxJobs)
      .set({
        revision: existing[0].revision + 1,
        payload: mergeContactSyncPayload(existingPayload, input),
        nextAttemptAt: now,
        updatedAt: now,
      })
      .where(eq(schema.integrationOutboxJobs.id, existing[0].id));
  } else {
    try {
      await db.insert(schema.integrationOutboxJobs).values({
        id: uuidv7(input.clock),
        schoolId: input.schoolId,
        provider: "sendlit",
        type: "sync_sendlit_contact",
        payload: {
          schoolAccountId: input.schoolAccountId,
          ensureSubscribed: input.ensureSubscribed,
          ...(typeof input.subscribed === "boolean"
            ? { subscribed: input.subscribed }
            : {}),
          reason: input.reason,
        },
        status: "pending",
        attempts: 0,
        revision: 1,
        nextAttemptAt: now,
        createdAt: now,
        updatedAt: now,
      });
    } catch {
      // Catch race conditions handled by unique index
      const conflict = await db
        .select({
          id: schema.integrationOutboxJobs.id,
          revision: schema.integrationOutboxJobs.revision,
          payload: schema.integrationOutboxJobs.payload,
        })
        .from(schema.integrationOutboxJobs)
        .where(
          and(
            eq(schema.integrationOutboxJobs.schoolId, input.schoolId),
            eq(schema.integrationOutboxJobs.provider, "sendlit"),
            eq(schema.integrationOutboxJobs.type, "sync_sendlit_contact"),
            eq(schema.integrationOutboxJobs.status, "pending"),
            sql`(${schema.integrationOutboxJobs.payload}->>'schoolAccountId') = ${input.schoolAccountId}`,
          ),
        )
        .limit(1);
      if (conflict[0]) {
        const existingPayload = (conflict[0].payload ?? {}) as Record<string, unknown>;
        await db
          .update(schema.integrationOutboxJobs)
          .set({
            revision: conflict[0].revision + 1,
            payload: mergeContactSyncPayload(existingPayload, input),
            nextAttemptAt: now,
            updatedAt: now,
          })
          .where(eq(schema.integrationOutboxJobs.id, conflict[0].id));
      }
    }
  }
}

/**
 * Enqueue outbox job to erase contact from SendLit and purge CourseLit record.
 */
export async function queueSendLitContactErase(
  db: AppDb,
  input: {
    schoolId: string;
    schoolAccountId: string;
    sendlitContactId?: string | null;
    clock: Clock;
  },
): Promise<void> {
  const now = input.clock.now();
  // Cancel any pending sync jobs for this account
  await db
    .update(schema.integrationOutboxJobs)
    .set({
      status: "failed",
      lastError: "contact_erased",
      updatedAt: now,
    })
    .where(
      and(
        eq(schema.integrationOutboxJobs.schoolId, input.schoolId),
        eq(schema.integrationOutboxJobs.provider, "sendlit"),
        eq(schema.integrationOutboxJobs.type, "sync_sendlit_contact"),
        eq(schema.integrationOutboxJobs.status, "pending"),
        sql`(${schema.integrationOutboxJobs.payload}->>'schoolAccountId') = ${input.schoolAccountId}`,
      ),
    );

  await db.insert(schema.integrationOutboxJobs).values({
    id: uuidv7(input.clock),
    schoolId: input.schoolId,
    provider: "sendlit",
    type: "erase_sendlit_contact",
    payload: {
      schoolAccountId: input.schoolAccountId,
      sendlitContactId: input.sendlitContactId ?? undefined,
    },
    status: "pending",
    attempts: 0,
    revision: 1,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Helper to fetch SendLit team API key for a school.
 */
export async function getSendLitTeamApiKey(
  db: AppDb,
  schoolId: string,
): Promise<string | null> {
  const [integration] = await db
    .select()
    .from(schema.schoolIntegrations)
    .where(
      and(
        eq(schema.schoolIntegrations.schoolId, schoolId),
        eq(schema.schoolIntegrations.provider, "sendlit"),
        eq(schema.schoolIntegrations.status, "ready"),
      ),
    )
    .limit(1);
  if (!integration?.encryptedTeamKey) return null;
  try {
    return decryptIntegrationSecret(integration.encryptedTeamKey);
  } catch {
    return null;
  }
}

function toContactDto(
  account: typeof schema.schoolAccounts.$inferSelect,
  publicSchoolId: string,
  marketing: { subscribed: boolean; tags: string[] } = { subscribed: false, tags: [] },
): Contact {
  return {
    id: account.publicId,
    schoolId: publicSchoolId,
    email: account.email,
    name: account.displayName,
    bio: account.bio,
    avatar: account.avatar ?? null,
    status: account.status as "active" | "deactivated" | "deletion_pending",
    registrationStatus: account.learnerRegisteredAt ? "registered" : "newsletter_only",
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    lastActiveAt: account.lastActiveAt ? account.lastActiveAt.toISOString() : null,
    marketing,
  };
}

/**
 * Public newsletter signup. Finds or creates canonical user identity and
 * school account (with learnerRegisteredAt = null), activates contact,
 * enqueues sync with ensureSubscribed = true, and records activity.
 */
export async function subscribeNewsletter(
  db: AppDb,
  input: {
    schoolId: string;
    email: string;
    name?: string;
    clock: Clock;
  },
): Promise<
  | { ok: true; value: { id: string; email: string } }
  | { ok: false; error: PlatformError }
> {
  const email = normalizeEmail(input.email);
  const now = input.clock.now();

  // Find or create global user
  let user = (
    await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1)
  )[0];
  if (!user) {
    const created = await db
      .insert(schema.user)
      .values({
        id: uuidv7(input.clock),
        name: input.name?.trim() || email.split("@", 1)[0] || "Subscriber",
        email,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    user = created[0];
  }

  // Find existing school account
  let account = (
    await db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, input.schoolId),
          eq(schema.schoolAccounts.email, email),
        ),
      )
      .limit(1)
  )[0];

  let newlyCreated = false;
  if (account) {
    if (account.status === "deletion_pending") {
      return { ok: false, error: createPlatformError("validation_failed") };
    }
    // Set contactActivatedAt if null
    if (!account.contactActivatedAt) {
      const updated = await db
        .update(schema.schoolAccounts)
        .set({
          contactActivatedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.schoolAccounts.id, account.id))
        .returning();
      account = updated[0];
    }
  } else {
    newlyCreated = true;
    const publicId = createPublicId(CONTACT_PUBLIC_ID_PREFIX, input.clock);
    const created = await db
      .insert(schema.schoolAccounts)
      .values({
        id: uuidv7(input.clock),
        publicId,
        schoolId: input.schoolId,
        userId: user.id,
        email,
        displayName: input.name?.trim() || email.split("@", 1)[0] || "Subscriber",
        bio: "",
        avatar: null,
        status: "active",
        learnerRegisteredAt: null,
        contactActivatedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    account = created[0];
  }

  // Enqueue idempotent contact sync with ensureSubscribed: true
  await queueSendLitContactSync(db, {
    schoolId: input.schoolId,
    schoolAccountId: account.id,
    ensureSubscribed: true,
    reason: "newsletter_signup",
    clock: input.clock,
  });

  if (newlyCreated) {
    await recordActivity(
      db,
      {
        schoolId: input.schoolId,
        actorId: account.publicId,
        type: ActivityType.USER_CREATED,
        entityId: account.publicId,
        metadata: { email: account.email },
      },
      input.clock,
    );
  }

  await recordActivity(
    db,
    {
      schoolId: input.schoolId,
      actorId: account.publicId,
      type: ActivityType.NEWSLETTER_SUBSCRIBED,
      entityId: account.publicId,
      metadata: { email: account.email },
    },
    input.clock,
  );

  return { ok: true, value: { id: account.publicId, email: account.email } };
}

/**
 * List contacts for a school.
 */
export async function listContacts(
  db: AppDb,
  ctx: AdminContactContext,
  query: {
    q?: string;
    segmentId?: string;
    filter?: string;
    page: number;
    rowsPerPage: number;
  },
  clock: Clock,
  options: { config?: SendLitConfig } = {},
): Promise<{ items: Contact[]; total: number }> {
  const schoolId = getSchoolId(ctx);
  if (!schoolId) {
    return { items: [], total: 0 };
  }

  const teamApiKey = await getSendLitTeamApiKey(db, schoolId);
  const cfg = options.config ?? sendLitConfig();

  // If SendLit is ready, query SendLit for filtered/segmented contacts
  if (teamApiKey && cfg.server) {
    let wireFilterString: string | undefined;
    if (query.filter) {
      try {
        const parsed = JSON.parse(query.filter);
        const sendLitWire = toSendLitFilter(parsed);
        wireFilterString = JSON.stringify(sendLitWire);
      } catch {
        // Fall back without filter if invalid
      }
    }

    try {
      const sendlitResult = await listSendLitContacts(
        teamApiKey,
        {
          q: query.q,
          segmentId: query.segmentId,
          filter: wireFilterString,
          // SendLit's `offset` is the 1-based page number, not a row offset.
          offset: query.page,
          rowsPerPage: query.rowsPerPage,
        },
        { config: cfg },
      );

      if (sendlitResult.items.length === 0) {
        return { items: [], total: sendlitResult.total };
      }

      const sendlitContactIds = sendlitResult.items.map((i) => i.contactId);
      const accounts = await db
        .select()
        .from(schema.schoolAccounts)
        .where(
          and(
            eq(schema.schoolAccounts.schoolId, schoolId),
            inArray(schema.schoolAccounts.sendlitContactId, sendlitContactIds),
          ),
        );

      const accountBySendLitId = new Map(accounts.map((a) => [a.sendlitContactId, a]));

      const items: Contact[] = [];
      for (const item of sendlitResult.items) {
        const account = accountBySendLitId.get(item.contactId);
        if (account) {
          if (account.status !== "deletion_pending") {
            items.push(
              toContactDto(account, ctx.publicSchoolId, {
                subscribed: item.subscribed,
                tags: item.tags ?? [],
              }),
            );
          }
        } else {
          // Gracefully omit unmapped record, could queue diagnostic reconciliation
        }
      }

      return { items, total: sendlitResult.total };
    } catch {
      // If SendLit call fails, fall back to local query
    }
  }

  // Local query fallback when SendLit is offline/not configured
  const offset = (query.page - 1) * query.rowsPerPage;
  const conditions = [
    eq(schema.schoolAccounts.schoolId, schoolId),
    sql`${schema.schoolAccounts.status} != 'deletion_pending'`,
  ];
  if (query.q) {
    const term = `%${query.q}%`;
    conditions.push(
      sql`(${schema.schoolAccounts.email} ILIKE ${term} OR ${schema.schoolAccounts.displayName} ILIKE ${term})`,
    );
  }

  const [totalRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.schoolAccounts)
    .where(and(...conditions));
  const total = totalRes?.count ?? 0;

  const accounts = await db
    .select()
    .from(schema.schoolAccounts)
    .where(and(...conditions))
    .orderBy(desc(schema.schoolAccounts.createdAt))
    .limit(query.rowsPerPage)
    .offset(offset);

  const items = accounts.map((acc) => toContactDto(acc, ctx.publicSchoolId));
  return { items, total };
}

/**
 * Get single contact by publicId (prefixed cnt_...) or UUID.
 */
export async function getContact(
  db: AppDb,
  ctx: AdminContactContext,
  contactId: string,
  options: { config?: SendLitConfig } = {},
): Promise<{ ok: true; value: Contact } | { ok: false; error: PlatformError }> {
  const schoolId = getSchoolId(ctx);
  if (!schoolId) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }

  const [account] = await db
    .select()
    .from(schema.schoolAccounts)
    .where(
      and(
        eq(schema.schoolAccounts.schoolId, schoolId),
        sql`(${schema.schoolAccounts.publicId} = ${contactId} OR ${schema.schoolAccounts.id}::text = ${contactId})`,
        sql`${schema.schoolAccounts.status} != 'deletion_pending'`,
      ),
    )
    .limit(1);

  if (!account) {
    return { ok: false, error: createPlatformError("not_found") };
  }

  let marketing = { subscribed: false, tags: [] as string[] };
  if (account.sendlitContactId) {
    const teamApiKey = await getSendLitTeamApiKey(db, schoolId);
    const cfg = options.config ?? sendLitConfig();
    if (teamApiKey && cfg.server) {
      try {
        const sendlitContact = await getSendLitContact(
          teamApiKey,
          account.sendlitContactId,
          { config: cfg },
        );
        marketing = {
          subscribed: sendlitContact.subscribed,
          tags: sendlitContact.tags ?? [],
        };
      } catch {
        // Fall back to empty marketing
      }
    }
  }

  return { ok: true, value: toContactDto(account, ctx.publicSchoolId, marketing) };
}

/**
 * Admin contact creation. Mirrors the legacy `POST /api/user` upsert: a new
 * email creates the canonical user identity (when missing) and a
 * newsletter-only school account, queues the mailing sync and returns 201.
 * An email the school already knows returns that contact unchanged with 200.
 */
export async function createContact(
  db: AppDb,
  ctx: AdminContactContext,
  body: CreateContactBody,
  clock: Clock,
): Promise<
  | { ok: true; value: { contact: Contact; created: boolean } }
  | { ok: false; error: PlatformError }
> {
  const schoolId = getSchoolId(ctx);
  if (!schoolId) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }

  const email = normalizeEmail(body.email);
  const [existing] = await db
    .select()
    .from(schema.schoolAccounts)
    .where(
      and(
        eq(schema.schoolAccounts.schoolId, schoolId),
        eq(schema.schoolAccounts.email, email),
      ),
    )
    .limit(1);
  if (existing) {
    if (existing.status === "deletion_pending") {
      return {
        ok: false,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "contact_deletion_pending" },
        }),
      };
    }
    return {
      ok: true,
      value: { contact: toContactDto(existing, ctx.publicSchoolId), created: false },
    };
  }

  const now = clock.now();
  const name = body.name?.trim() || email.split("@", 1)[0] || "Subscriber";
  let [user] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);
  if (!user) {
    [user] = await db
      .insert(schema.user)
      .values({
        id: uuidv7(clock),
        name,
        email,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
  }

  const [account] = await db
    .insert(schema.schoolAccounts)
    .values({
      id: uuidv7(clock),
      publicId: createPublicId(CONTACT_PUBLIC_ID_PREFIX, clock),
      schoolId,
      userId: user!.id,
      email,
      displayName: name,
      bio: "",
      avatar: null,
      status: "active",
      learnerRegisteredAt: null,
      contactActivatedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await queueSendLitContactSync(db, {
    schoolId,
    schoolAccountId: account!.id,
    ensureSubscribed: body.subscribedToUpdates,
    reason: "admin_created",
    clock,
  });

  await recordActivity(
    db,
    {
      schoolId,
      actorId: ctx.principalId,
      type: ActivityType.USER_CREATED,
      entityId: account!.publicId,
      metadata: { email: account!.email, source: "admin" },
    },
    clock,
  );

  await db.insert(schema.auditEvents).values({
    id: uuidv7(clock),
    schoolId,
    actorId: ctx.principalId,
    action: "contact.created",
    resourceType: "contact",
    resourceId: account!.publicId,
    requestId: ctx.requestId,
    createdAt: now,
  });

  return {
    ok: true,
    value: {
      contact: toContactDto(account!, ctx.publicSchoolId, {
        subscribed: body.subscribedToUpdates,
        tags: [],
      }),
      created: true,
    },
  };
}

/**
 * Update contact core profile (name, bio, avatar, status).
 */
export async function updateContact(
  db: AppDb,
  ctx: AdminContactContext,
  contactId: string,
  body: UpdateContactBody,
  clock: Clock,
): Promise<{ ok: true; value: Contact } | { ok: false; error: PlatformError }> {
  const schoolId = getSchoolId(ctx);
  if (!schoolId) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }

  const [account] = await db
    .select()
    .from(schema.schoolAccounts)
    .where(
      and(
        eq(schema.schoolAccounts.schoolId, schoolId),
        sql`(${schema.schoolAccounts.publicId} = ${contactId} OR ${schema.schoolAccounts.id}::text = ${contactId})`,
      ),
    )
    .limit(1);

  if (!account) {
    return { ok: false, error: createPlatformError("not_found") };
  }

  const now = clock.now();
  const updates: Partial<typeof schema.schoolAccounts.$inferInsert> = {
    updatedAt: now,
  };
  if (body.name !== undefined) updates.displayName = body.name.trim();
  if (body.bio !== undefined) updates.bio = body.bio.trim();
  if (body.avatar !== undefined) updates.avatar = body.avatar;
  if (body.status !== undefined) updates.status = body.status;

  const [updated] = await db
    .update(schema.schoolAccounts)
    .set(updates)
    .where(eq(schema.schoolAccounts.id, account.id))
    .returning();

  if (body.status !== undefined && body.status !== account.status) {
    if (body.status === "deactivated") {
      await db
        .delete(schema.schoolSessions)
        .where(eq(schema.schoolSessions.schoolAccountId, account.id));
    }
    await db.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId,
      actorId: ctx.principalId,
      action: body.status === "active" ? "learner.restored" : "learner.deactivated",
      resourceType: "learner",
      resourceId: account.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
  }

  // If displayName changed, re-sync to SendLit
  if (body.name !== undefined && body.name.trim() !== account.displayName) {
    await queueSendLitContactSync(db, {
      schoolId,
      schoolAccountId: account.id,
      reason: "profile_updated",
      clock,
    });
  }

  return { ok: true, value: toContactDto(updated, ctx.publicSchoolId) };
}

/**
 * Update contact marketing state (subscribed, tags) in SendLit.
 */
export async function updateContactMarketing(
  db: AppDb,
  ctx: AdminContactContext,
  contactId: string,
  body: UpdateContactMarketingBody,
  clock: Clock,
  options: { config?: SendLitConfig } = {},
): Promise<
  | { ok: true; value: { subscribed: boolean; tags: string[] } }
  | { ok: false; error: PlatformError }
> {
  const schoolId = getSchoolId(ctx);
  if (!schoolId) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }

  const [account] = await db
    .select()
    .from(schema.schoolAccounts)
    .where(
      and(
        eq(schema.schoolAccounts.schoolId, schoolId),
        sql`(${schema.schoolAccounts.publicId} = ${contactId} OR ${schema.schoolAccounts.id}::text = ${contactId})`,
      ),
    )
    .limit(1);

  if (!account) {
    return { ok: false, error: createPlatformError("not_found") };
  }

  return setContactMarketingSubscription(db, {
    schoolId,
    account,
    subscribed: body.subscribed,
    tags: body.tags,
    clock,
    config: options.config,
  });
}

/**
 * Applies a contact's marketing subscription (and optionally tags) to the
 * school's mailing service. Updates the remote contact directly when it is
 * already linked; otherwise queues a contact sync carrying the explicit
 * subscription so the mailing service converges on it.
 */
export async function setContactMarketingSubscription(
  db: AppDb,
  input: {
    schoolId: string;
    account: Pick<typeof schema.schoolAccounts.$inferSelect, "id" | "sendlitContactId">;
    subscribed?: boolean;
    tags?: string[];
    reason?: string;
    clock: Clock;
    config?: SendLitConfig;
  },
): Promise<
  | { ok: true; value: { subscribed: boolean; tags: string[] } }
  | { ok: false; error: PlatformError }
> {
  const teamApiKey = await getSendLitTeamApiKey(db, input.schoolId);
  const cfg = input.config ?? sendLitConfig();

  if (teamApiKey && cfg.server && input.account.sendlitContactId) {
    try {
      const updated = await updateSendLitContact(
        teamApiKey,
        input.account.sendlitContactId,
        {
          subscribed: input.subscribed,
          tags: input.tags,
        },
        { config: cfg },
      );
      return {
        ok: true,
        value: {
          subscribed: updated.subscribed,
          tags: updated.tags ?? [],
        },
      };
    } catch (err) {
      if (!(err instanceof SendLitApiError && err.status === 404)) {
        return { ok: false, error: createPlatformError("internal_error") };
      }
      // The linked contact is gone; fall through and let the sync recreate it.
    }
  }

  // Not linked yet (or mailing service unavailable): queue a contact sync.
  await queueSendLitContactSync(db, {
    schoolId: input.schoolId,
    schoolAccountId: input.account.id,
    subscribed: input.subscribed,
    reason: input.reason,
    clock: input.clock,
  });

  return {
    ok: true,
    value: {
      subscribed: input.subscribed ?? false,
      tags: input.tags ?? [],
    },
  };
}

/**
 * Coordinated 2-stage deletion:
 * 1. Synchronously marks status = 'deletion_pending'
 * 2. Enqueues erase_sendlit_contact outbox job to delete from SendLit then purge CourseLit
 */
export async function deleteContact(
  db: AppDb,
  ctx: AdminContactContext,
  contactId: string,
  clock: Clock,
  paymentProviderOverride?: PaymentProvider,
): Promise<
  { ok: true; value: { success: true } } | { ok: false; error: PlatformError }
> {
  const schoolId = getSchoolId(ctx);
  if (!schoolId) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }

  const [account] = await db
    .select()
    .from(schema.schoolAccounts)
    .where(
      and(
        eq(schema.schoolAccounts.schoolId, schoolId),
        sql`(${schema.schoolAccounts.publicId} = ${contactId} OR ${schema.schoolAccounts.id}::text = ${contactId})`,
      ),
    )
    .limit(1);

  if (!account) {
    return { ok: false, error: createPlatformError("not_found") };
  }

  // Reject deletion of a school owner until ownership has been transferred
  const [ownerMembership] = await db
    .select({ id: schema.memberships.id })
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.schoolId, schoolId),
        eq(schema.memberships.schoolAccountId, account.id),
        eq(schema.memberships.isOwner, true),
      ),
    )
    .limit(1);

  if (ownerMembership) {
    return {
      ok: false,
      error: createPlatformError("forbidden", {
        safeDetails: { reason: "cannot_delete_school_owner" },
      }),
    };
  }

  // Stop community billing at the payment provider before anything changes,
  // so a failed cancellation leaves the contact untouched.
  const communitySubscriptions = await activeCommunitySubscriptions(db, {
    schoolId,
    schoolAccountId: account.id,
  });
  const cancelled = await cancelCommunitySubscriptionsAtProvider(
    db,
    schoolId,
    communitySubscriptions,
    paymentProviderOverride,
  );
  if (!cancelled.ok) return cancelled;
  // Stop product subscriptions with the provider before changing anything,
  // so a failed cancel never leaves a deleted contact still being billed.
  const liveProductSubscriptions = await db
    .select({
      providerSubscriptionId: schema.storefrontSubscriptions.providerSubscriptionId,
      provider: schema.storefrontCheckoutAttempts.provider,
    })
    .from(schema.storefrontSubscriptions)
    .innerJoin(
      schema.storefrontCheckoutAttempts,
      eq(
        schema.storefrontCheckoutAttempts.id,
        schema.storefrontSubscriptions.checkoutId,
      ),
    )
    .where(
      and(
        eq(schema.storefrontCheckoutAttempts.schoolId, schoolId),
        eq(schema.storefrontCheckoutAttempts.schoolAccountId, account.id),
        inArray(schema.storefrontSubscriptions.status, ["active", "past_due"]),
      ),
    );
  for (const subscription of liveProductSubscriptions) {
    const provider =
      subscription.provider === "free"
        ? null
        : await getConfiguredPaymentProvider(
            db,
            schoolId,
            subscription.provider,
            paymentProviderOverride,
          );
    try {
      if (!provider?.cancelSubscription) throw new Error("provider_unavailable");
      await provider.cancelSubscription(subscription.providerSubscriptionId);
    } catch {
      return {
        ok: false,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "provider_unavailable" },
        }),
      };
    }
  }

  const now = clock.now();

  // Atomically update status to deletion_pending
  await db
    .update(schema.schoolAccounts)
    .set({
      status: "deletion_pending",
      updatedAt: now,
    })
    .where(eq(schema.schoolAccounts.id, account.id));

  // Revoke all active sessions linked to this school account
  await db
    .delete(schema.schoolSessions)
    .where(eq(schema.schoolSessions.schoolAccountId, account.id));

  // Cancel any active storefront subscriptions
  const storefrontCheckouts = await db
    .select({ id: schema.storefrontCheckoutAttempts.id })
    .from(schema.storefrontCheckoutAttempts)
    .where(
      and(
        eq(schema.storefrontCheckoutAttempts.schoolId, schoolId),
        eq(schema.storefrontCheckoutAttempts.schoolAccountId, account.id),
      ),
    );
  if (storefrontCheckouts.length > 0) {
    const checkoutIds = storefrontCheckouts.map((c) => c.id);
    await db
      .update(schema.storefrontSubscriptions)
      .set({
        status: "cancelled",
        cancelAt: now,
        cancelAtPeriodEnd: false,
        updatedAt: now,
      })
      .where(
        and(
          inArray(schema.storefrontSubscriptions.checkoutId, checkoutIds),
          inArray(schema.storefrontSubscriptions.status, ["active", "past_due"]),
        ),
      );
  }

  // Record the community subscriptions cancelled at the provider above
  await markCommunitySubscriptionsCancelled(db, communitySubscriptions, now);

  await queueSendLitContactErase(db, {
    schoolId,
    schoolAccountId: account.id,
    sendlitContactId: account.sendlitContactId,
    clock,
  });

  return { ok: true, value: { success: true } };
}

/**
 * Filter preview contacts.
 */
export async function filterPreviewContacts(
  db: AppDb,
  ctx: AdminContactContext,
  filter: ContactFilterSet,
  clock: Clock,
  options: { config?: SendLitConfig } = {},
): Promise<
  | {
      ok: true;
      value: { filter: ContactFilterSet; totalCount: number; contacts: Contact[] };
    }
  | { ok: false; error: PlatformError }
> {
  const schoolId = getSchoolId(ctx);
  if (!schoolId) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }

  const teamApiKey = await getSendLitTeamApiKey(db, schoolId);
  const cfg = options.config ?? sendLitConfig();

  if (!teamApiKey || !cfg.server) {
    return {
      ok: true,
      value: { filter, totalCount: 0, contacts: [] },
    };
  }

  try {
    const wireFilter = toSendLitFilter(filter);
    const sendlitResult = await listSendLitContacts(
      teamApiKey,
      {
        filter: JSON.stringify(wireFilter),
        rowsPerPage: 20,
      },
      { config: cfg },
    );

    if (sendlitResult.items.length === 0) {
      return {
        ok: true,
        value: { filter, totalCount: sendlitResult.total, contacts: [] },
      };
    }

    const sendlitContactIds = sendlitResult.items.map((i) => i.contactId);
    const accounts = await db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, schoolId),
          inArray(schema.schoolAccounts.sendlitContactId, sendlitContactIds),
          sql`${schema.schoolAccounts.status} != 'deletion_pending'`,
        ),
      );

    const accountBySendLitId = new Map(accounts.map((a) => [a.sendlitContactId, a]));
    const contacts: Contact[] = [];
    for (const item of sendlitResult.items) {
      const account = accountBySendLitId.get(item.contactId);
      if (account) {
        contacts.push(
          toContactDto(account, ctx.publicSchoolId, {
            subscribed: item.subscribed,
            tags: item.tags ?? [],
          }),
        );
      }
    }

    return {
      ok: true,
      value: { filter, totalCount: sendlitResult.total, contacts },
    };
  } catch (err) {
    return { ok: false, error: createPlatformError("internal_error") };
  }
}

/**
 * List contact segments from SendLit.
 */
export async function listContactSegments(
  db: AppDb,
  ctx: AdminContactContext,
  options: { config?: SendLitConfig } = {},
): Promise<
  | { ok: true; value: { items: ContactSegment[]; unsupportedCount: number } }
  | { ok: false; error: PlatformError }
> {
  const schoolId = getSchoolId(ctx);
  if (!schoolId) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }

  const teamApiKey = await getSendLitTeamApiKey(db, schoolId);
  const cfg = options.config ?? sendLitConfig();

  if (!teamApiKey || !cfg.server) {
    return { ok: true, value: { items: [], unsupportedCount: 0 } };
  }

  try {
    const rawSegments = await listSendLitSegments(teamApiKey, { config: cfg });
    const items: ContactSegment[] = [];
    let unsupportedCount = 0;

    for (const seg of rawSegments.items) {
      const translated = fromSendLitFilter(seg.filter);
      if (translated.ok) {
        items.push({
          id: seg.segmentId,
          name: seg.name,
          filter: translated.value,
          createdAt: seg.createdAt,
          updatedAt: seg.updatedAt,
        });
      } else {
        unsupportedCount++;
      }
    }

    return { ok: true, value: { items, unsupportedCount } };
  } catch (err) {
    return { ok: false, error: createPlatformError("internal_error") };
  }
}

/**
 * Create a saved contact segment in SendLit.
 */
export async function createContactSegment(
  db: AppDb,
  ctx: AdminContactContext,
  body: { name: string; filter: ContactFilterSet },
  options: { config?: SendLitConfig } = {},
): Promise<{ ok: true; value: ContactSegment } | { ok: false; error: PlatformError }> {
  const schoolId = getSchoolId(ctx);
  if (!schoolId) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }

  const teamApiKey = await getSendLitTeamApiKey(db, schoolId);
  const cfg = options.config ?? sendLitConfig();
  if (!teamApiKey || !cfg.server) {
    return { ok: false, error: createPlatformError("internal_error") };
  }

  let wireFilter: ReturnType<typeof toSendLitFilter>;
  try {
    wireFilter = toSendLitFilter(body.filter);
  } catch {
    return { ok: false, error: createPlatformError("validation_failed") };
  }

  try {
    const created = await createSendLitSegment(
      teamApiKey,
      {
        name: body.name,
        filter: wireFilter,
      },
      { config: cfg },
    );

    return {
      ok: true,
      value: {
        id: created.segmentId,
        name: created.name,
        filter: body.filter,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
    };
  } catch (err) {
    return { ok: false, error: createPlatformError("internal_error") };
  }
}

/**
 * Get a saved contact segment by segmentId.
 */
export async function getContactSegment(
  db: AppDb,
  ctx: AdminContactContext,
  segmentId: string,
  options: { config?: SendLitConfig } = {},
): Promise<{ ok: true; value: ContactSegment } | { ok: false; error: PlatformError }> {
  const schoolId = getSchoolId(ctx);
  if (!schoolId) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }

  const teamApiKey = await getSendLitTeamApiKey(db, schoolId);
  const cfg = options.config ?? sendLitConfig();
  if (!teamApiKey || !cfg.server) {
    return { ok: false, error: createPlatformError("internal_error") };
  }

  try {
    const seg = await getSendLitSegment(teamApiKey, segmentId, { config: cfg });
    const translated = fromSendLitFilter(seg.filter);
    if (!translated.ok) {
      return { ok: false, error: createPlatformError("validation_failed") };
    }

    return {
      ok: true,
      value: {
        id: seg.segmentId,
        name: seg.name,
        filter: translated.value,
        createdAt: seg.createdAt,
        updatedAt: seg.updatedAt,
      },
    };
  } catch (err) {
    if (err instanceof SendLitApiError && err.status === 404) {
      return { ok: false, error: createPlatformError("not_found") };
    }
    return { ok: false, error: createPlatformError("internal_error") };
  }
}

/**
 * Update a saved contact segment.
 */
export async function updateContactSegment(
  db: AppDb,
  ctx: AdminContactContext,
  segmentId: string,
  body: { name?: string; filter?: ContactFilterSet },
  options: { config?: SendLitConfig } = {},
): Promise<{ ok: true; value: ContactSegment } | { ok: false; error: PlatformError }> {
  const schoolId = getSchoolId(ctx);
  if (!schoolId) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }

  const teamApiKey = await getSendLitTeamApiKey(db, schoolId);
  const cfg = options.config ?? sendLitConfig();
  if (!teamApiKey || !cfg.server) {
    return { ok: false, error: createPlatformError("internal_error") };
  }

  const updateInput: { name?: string; filter?: ReturnType<typeof toSendLitFilter> } =
    {};
  if (body.name !== undefined) updateInput.name = body.name;
  if (body.filter !== undefined) {
    try {
      updateInput.filter = toSendLitFilter(body.filter);
    } catch {
      return { ok: false, error: createPlatformError("validation_failed") };
    }
  }

  try {
    const updated = await updateSendLitSegment(teamApiKey, segmentId, updateInput, {
      config: cfg,
    });
    const translated = fromSendLitFilter(updated.filter);
    if (!translated.ok) {
      return { ok: false, error: createPlatformError("validation_failed") };
    }

    return {
      ok: true,
      value: {
        id: updated.segmentId,
        name: updated.name,
        filter: translated.value,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    };
  } catch (err) {
    if (err instanceof SendLitApiError && err.status === 404) {
      return { ok: false, error: createPlatformError("not_found") };
    }
    return { ok: false, error: createPlatformError("internal_error") };
  }
}

/**
 * Delete a saved contact segment.
 */
export async function deleteContactSegment(
  db: AppDb,
  ctx: AdminContactContext,
  segmentId: string,
  options: { config?: SendLitConfig } = {},
): Promise<
  { ok: true; value: { success: true } } | { ok: false; error: PlatformError }
> {
  const schoolId = getSchoolId(ctx);
  if (!schoolId) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }

  const teamApiKey = await getSendLitTeamApiKey(db, schoolId);
  const cfg = options.config ?? sendLitConfig();
  if (!teamApiKey || !cfg.server) {
    return { ok: false, error: createPlatformError("internal_error") };
  }

  try {
    await deleteSendLitSegment(teamApiKey, segmentId, { config: cfg });
    return { ok: true, value: { success: true } };
  } catch (err) {
    if (err instanceof SendLitApiError && err.status === 404) {
      return { ok: false, error: createPlatformError("not_found") };
    }
    return { ok: false, error: createPlatformError("internal_error") };
  }
}

/**
 * Get contacts belonging to a saved segment.
 */
export async function getContactSegmentMembers(
  db: AppDb,
  ctx: AdminContactContext,
  segmentId: string,
  query: { page: number; rowsPerPage: number },
  options: { config?: SendLitConfig } = {},
): Promise<
  | {
      ok: true;
      value: { segment: ContactSegment; totalCount: number; contacts: Contact[] };
    }
  | { ok: false; error: PlatformError }
> {
  const segRes = await getContactSegment(db, ctx, segmentId, options);
  if (!segRes.ok) return segRes;

  const schoolId = getSchoolId(ctx);
  if (!schoolId) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }

  const teamApiKey = await getSendLitTeamApiKey(db, schoolId);
  const cfg = options.config ?? sendLitConfig();
  if (!teamApiKey || !cfg.server) {
    return {
      ok: true,
      value: { segment: segRes.value, totalCount: 0, contacts: [] },
    };
  }

  try {
    const sendlitResult = await listSendLitContacts(
      teamApiKey,
      {
        segmentId,
        // SendLit's `offset` is the 1-based page number, not a row offset.
        offset: query.page,
        rowsPerPage: query.rowsPerPage,
      },
      { config: cfg },
    );

    if (sendlitResult.items.length === 0) {
      return {
        ok: true,
        value: {
          segment: segRes.value,
          totalCount: sendlitResult.total,
          contacts: [],
        },
      };
    }

    const sendlitContactIds = sendlitResult.items.map((i) => i.contactId);
    const accounts = await db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, schoolId),
          inArray(schema.schoolAccounts.sendlitContactId, sendlitContactIds),
          sql`${schema.schoolAccounts.status} != 'deletion_pending'`,
        ),
      );

    const accountBySendLitId = new Map(accounts.map((a) => [a.sendlitContactId, a]));
    const contacts: Contact[] = [];
    for (const item of sendlitResult.items) {
      const account = accountBySendLitId.get(item.contactId);
      if (account) {
        contacts.push(
          toContactDto(account, ctx.publicSchoolId, {
            subscribed: item.subscribed,
            tags: item.tags ?? [],
          }),
        );
      }
    }

    return {
      ok: true,
      value: {
        segment: segRes.value,
        totalCount: sendlitResult.total,
        contacts,
      },
    };
  } catch (err) {
    return { ok: false, error: createPlatformError("internal_error") };
  }
}

type TagResult<T> = { ok: true; value: T } | { ok: false; error: PlatformError };

/**
 * Resolves the school's SendLit credentials for a tag call. `null` means the
 * school has no SendLit integration configured.
 */
async function resolveTagSendLit(
  db: AppDb,
  ctx: AdminContactContext,
  options: { config?: SendLitConfig },
): Promise<
  | { ok: true; teamApiKey: string | null; cfg: SendLitConfig }
  | { ok: false; error: PlatformError }
> {
  const schoolId = getSchoolId(ctx);
  if (!schoolId) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }
  const teamApiKey = await getSendLitTeamApiKey(db, schoolId);
  const cfg = options.config ?? sendLitConfig();
  return { ok: true, teamApiKey: cfg.server ? teamApiKey : null, cfg };
}

function mapTagError(err: unknown): PlatformError {
  if (err instanceof SendLitApiError) {
    if (err.status === 404) return createPlatformError("not_found");
    if (err.status === 400) {
      return createPlatformError(
        "validation_failed",
        err.detail === "tag_unchanged"
          ? { safeDetails: { reason: "tag_unchanged" } }
          : undefined,
      );
    }
  }
  return createPlatformError("internal_error");
}

/** Lists the tags carried by the school's contacts (proxied to SendLit). */
export async function listContactTags(
  db: AppDb,
  ctx: AdminContactContext,
  options: { config?: SendLitConfig } = {},
): Promise<TagResult<{ items: SendLitTagSummary[] }>> {
  const resolved = await resolveTagSendLit(db, ctx, options);
  if (!resolved.ok) return resolved;
  if (!resolved.teamApiKey) return { ok: true, value: { items: [] } };
  try {
    const result = await listSendLitTags(resolved.teamApiKey, {
      config: resolved.cfg,
    });
    return { ok: true, value: { items: result.items } };
  } catch (err) {
    return { ok: false, error: mapTagError(err) };
  }
}

/** Where a tag is used (segments, sequences, signup forms). */
export async function getContactTagReferences(
  db: AppDb,
  ctx: AdminContactContext,
  tag: string,
  options: { config?: SendLitConfig } = {},
): Promise<TagResult<SendLitTagReferences>> {
  const resolved = await resolveTagSendLit(db, ctx, options);
  if (!resolved.ok) return resolved;
  if (!resolved.teamApiKey) {
    return { ok: false, error: createPlatformError("internal_error") };
  }
  try {
    return {
      ok: true,
      value: await getSendLitTagReferences(resolved.teamApiKey, tag, {
        config: resolved.cfg,
      }),
    };
  } catch (err) {
    return { ok: false, error: mapTagError(err) };
  }
}

/** Renames a tag everywhere SendLit knows it. */
export async function renameContactTag(
  db: AppDb,
  ctx: AdminContactContext,
  tag: string,
  body: { name: string },
  options: { config?: SendLitConfig } = {},
): Promise<TagResult<SendLitRenameTagResult>> {
  const resolved = await resolveTagSendLit(db, ctx, options);
  if (!resolved.ok) return resolved;
  if (!resolved.teamApiKey) {
    return { ok: false, error: createPlatformError("internal_error") };
  }
  try {
    return {
      ok: true,
      value: await renameSendLitTag(resolved.teamApiKey, tag, body, {
        config: resolved.cfg,
      }),
    };
  } catch (err) {
    return { ok: false, error: mapTagError(err) };
  }
}

/** Removes a tag from every contact. */
export async function deleteContactTag(
  db: AppDb,
  ctx: AdminContactContext,
  tag: string,
  options: { config?: SendLitConfig } = {},
): Promise<TagResult<SendLitDeleteTagResult>> {
  const resolved = await resolveTagSendLit(db, ctx, options);
  if (!resolved.ok) return resolved;
  if (!resolved.teamApiKey) {
    return { ok: false, error: createPlatformError("internal_error") };
  }
  try {
    return {
      ok: true,
      value: await deleteSendLitTag(resolved.teamApiKey, tag, {
        config: resolved.cfg,
      }),
    };
  } catch (err) {
    return { ok: false, error: mapTagError(err) };
  }
}
