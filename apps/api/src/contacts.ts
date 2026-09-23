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
  type MediaRef,
  type UpdateContactBody,
  type UpdateContactMarketingBody,
} from "@courselit/api-contract";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { ActivityType, recordActivity } from "./activities.js";
import {
  fromSendLitFilter,
  toSendLitFilter,
} from "./contact-filters.js";
import * as schema from "./db/schema/index.js";
import { normalizeEmail } from "./invitations.js";
import type { CourseLitPermission } from "./permissions.js";
import { CONTACT_PUBLIC_ID_PREFIX } from "./public-id-prefixes.js";
import {
  createSendLitContact,
  createSendLitSegment,
  deleteSendLitSegment,
  getSendLitContact,
  getSendLitSegment,
  listSendLitContacts,
  listSendLitSegments,
  SendLitApiError,
  type SendLitConfig,
  type SendLitContact,
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
  reason?: string;
};

export type EraseSendLitContactPayload = {
  schoolAccountId: string;
  sendlitContactId?: string;
};

/**
 * Coalescing outbox enqueue helper for SendLit contact sync.
 * If a pending job for the same contact already exists, increments revision
 * and updates ensureSubscribed if requested.
 */
export async function queueSendLitContactSync(
  db: AppDb,
  input: {
    schoolId: string;
    schoolAccountId: string;
    ensureSubscribed?: boolean;
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
    const mergedEnsureSubscribed = Boolean(
      existingPayload.ensureSubscribed || input.ensureSubscribed,
    );
    await db
      .update(schema.integrationOutboxJobs)
      .set({
        revision: existing[0].revision + 1,
        payload: {
          ...existingPayload,
          schoolAccountId: input.schoolAccountId,
          ensureSubscribed: mergedEnsureSubscribed,
          reason: input.reason ?? existingPayload.reason,
        },
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
            payload: {
              ...existingPayload,
              schoolAccountId: input.schoolAccountId,
              ensureSubscribed: Boolean(
                existingPayload.ensureSubscribed || input.ensureSubscribed,
              ),
              reason: input.reason ?? existingPayload.reason,
            },
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
          offset: (query.page - 1) * query.rowsPerPage + 1,
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

      const accountBySendLitId = new Map(
        accounts.map((a) => [a.sendlitContactId, a]),
      );

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

  const teamApiKey = await getSendLitTeamApiKey(db, schoolId);
  const cfg = options.config ?? sendLitConfig();

  if (teamApiKey && cfg.server && account.sendlitContactId) {
    try {
      const updated = await updateSendLitContact(
        teamApiKey,
        account.sendlitContactId,
        {
          subscribed: body.subscribed,
          tags: body.tags,
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
      if (err instanceof SendLitApiError && err.status === 404) {
        // Enqueue sync
      } else {
        return { ok: false, error: createPlatformError("internal_error") };
      }
    }
  }

  // Fallback / if not synced yet: queue sync job
  await queueSendLitContactSync(db, {
    schoolId,
    schoolAccountId: account.id,
    ensureSubscribed: body.subscribed,
    clock,
  });

  return {
    ok: true,
    value: {
      subscribed: body.subscribed ?? false,
      tags: body.tags ?? [],
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
): Promise<{ ok: true; value: { success: true } } | { ok: false; error: PlatformError }> {
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
      .set({ status: "cancelled", updatedAt: now })
      .where(
        and(
          inArray(schema.storefrontSubscriptions.checkoutId, checkoutIds),
          eq(schema.storefrontSubscriptions.status, "active"),
        ),
      );
  }

  // Cancel any active community subscriptions
  const communityCheckouts = await db
    .select({ id: schema.communityCheckoutAttempts.id })
    .from(schema.communityCheckoutAttempts)
    .where(
      and(
        eq(schema.communityCheckoutAttempts.schoolId, schoolId),
        eq(schema.communityCheckoutAttempts.schoolAccountId, account.id),
      ),
    );
  if (communityCheckouts.length > 0) {
    const commCheckoutIds = communityCheckouts.map((c) => c.id);
    await db
      .update(schema.communitySubscriptions)
      .set({ status: "cancelled", updatedAt: now })
      .where(
        and(
          inArray(schema.communitySubscriptions.checkoutId, commCheckoutIds),
          eq(schema.communitySubscriptions.status, "active"),
        ),
      );
  }

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

  const updateInput: { name?: string; filter?: ReturnType<typeof toSendLitFilter> } = {};
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
): Promise<{ ok: true; value: { success: true } } | { ok: false; error: PlatformError }> {
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
        offset: (query.page - 1) * query.rowsPerPage + 1,
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
