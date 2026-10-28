import type { Clock } from "@codelitdev/platform";
import { and, asc, eq, inArray, lt, lte, sql } from "drizzle-orm";
import type { Logger } from "pino";
import * as schema from "./db/schema/index.js";
import {
  COURSELIT_IS_COMMUNITY_MEMBER_FIELD,
  COURSELIT_LAST_ACTIVE_FIELD,
  COURSELIT_PRODUCT_IDS_FIELD,
  COURSELIT_SIGNED_UP_FIELD,
} from "./contact-filters.js";
import {
  addSendLitContactTag,
  createSendLitContact,
  deleteSendLitContact,
  getSendLitContact,
  listSendLitContacts,
  provisionSendLitTeam,
  rotateSendLitTeamKey,
  SendLitApiError,
  type SendLitConfig,
  type SendLitContact,
  sendLitConfig,
  sendSendLitTransactionalEmail,
  trackSendLitEvent,
  updateSendLitContact,
} from "./sendlit-client.js";
import type { TrackSendLitEventPayload } from "./membership-events.js";
import type { SendSchoolEmailPayload } from "./school-emails.js";
import type { AppDb } from "./types.js";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "./utils/integration-secrets.js";

const MAX_ERROR_LENGTH = 2000;

export type SendLitOperations = {
  provisionTeam: typeof provisionSendLitTeam;
  rotateKey: typeof rotateSendLitTeamKey;
  createContact?: typeof createSendLitContact;
  getContact?: typeof getSendLitContact;
  updateContact?: typeof updateSendLitContact;
  deleteContact?: typeof deleteSendLitContact;
  listContacts?: typeof listSendLitContacts;
  addContactTag?: typeof addSendLitContactTag;
  trackEvent?: typeof trackSendLitEvent;
  sendEmail?: typeof sendSendLitTransactionalEmail;
};

const defaultSendLitOperations: SendLitOperations = {
  provisionTeam: provisionSendLitTeam,
  rotateKey: rotateSendLitTeamKey,
  createContact: createSendLitContact,
  getContact: getSendLitContact,
  updateContact: updateSendLitContact,
  deleteContact: deleteSendLitContact,
  listContacts: listSendLitContacts,
  addContactTag: addSendLitContactTag,
};

type IntegrationJob = typeof schema.integrationOutboxJobs.$inferSelect;
type IntegrationRow = typeof schema.schoolIntegrations.$inferSelect;

class IntegrationActionRequiredError extends Error {}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim().slice(0, MAX_ERROR_LENGTH);
}

function isActionRequired(error: unknown): boolean {
  return (
    error instanceof IntegrationActionRequiredError ||
    (error instanceof SendLitApiError && !error.retryable)
  );
}

async function getIntegration(
  db: AppDb,
  schoolId: string,
  provider: schema.IntegrationProvider,
): Promise<IntegrationRow | null> {
  const [row] = await db
    .select()
    .from(schema.schoolIntegrations)
    .where(
      and(
        eq(schema.schoolIntegrations.schoolId, schoolId),
        eq(schema.schoolIntegrations.provider, provider),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function updateIntegration(
  db: AppDb,
  schoolId: string,
  provider: schema.IntegrationProvider,
  values: Partial<typeof schema.schoolIntegrations.$inferInsert>,
) {
  await db
    .update(schema.schoolIntegrations)
    .set(values)
    .where(
      and(
        eq(schema.schoolIntegrations.schoolId, schoolId),
        eq(schema.schoolIntegrations.provider, provider),
      ),
    );
}

async function provisionOneSendLitSchool(
  db: AppDb,
  job: IntegrationJob,
  clock: Clock,
  operations: SendLitOperations,
  config: SendLitConfig,
): Promise<void> {
  const payload = job.payload as {
    externalId?: string;
    name?: string;
    mailingAddress?: string;
  };
  if (typeof payload.externalId !== "string" || typeof payload.name !== "string") {
    throw new IntegrationActionRequiredError("Invalid SendLit provisioning payload");
  }

  if (!config.server || !config.provisioningApiKey) {
    await updateIntegration(db, job.schoolId, "sendlit", {
      status: "action_required",
      server: config.server ?? "",
      lastError: "SENDLIT_CONFIGURATION_MISSING",
      updatedAt: clock.now(),
    });
    throw new IntegrationActionRequiredError("SendLit configuration is missing");
  }

  const attemptAt = clock.now();
  await updateIntegration(db, job.schoolId, "sendlit", {
    status: "provisioning",
    server: config.server,
    lastAttemptAt: attemptAt,
    lastError: null,
    updatedAt: attemptAt,
  });

  const integration = await getIntegration(db, job.schoolId, "sendlit");
  if (!integration) {
    throw new IntegrationActionRequiredError("SendLit integration mapping is missing");
  }

  let teamId = integration.remoteTeamId;
  let teamApiKey = integration.encryptedTeamKey
    ? decryptIntegrationSecret(integration.encryptedTeamKey)
    : null;

  if (!teamId || !teamApiKey) {
    const provisioned = await operations.provisionTeam(
      {
        externalId: payload.externalId,
        name: payload.name,
        mailingAddress: payload.mailingAddress,
      },
      { config },
    );
    teamId = provisioned.teamId;
    teamApiKey = provisioned.apiKey ?? teamApiKey;

    if (!teamApiKey && teamId) {
      const rotated = await operations.rotateKey(
        teamId,
        { name: "courselit-integration" },
        { config },
      );
      teamApiKey = rotated.key;
    }

    if (!teamId || !teamApiKey) {
      throw new IntegrationActionRequiredError(
        "SendLit did not return a team API key; key recovery is required",
      );
    }

    await updateIntegration(db, job.schoolId, "sendlit", {
      remoteTeamId: teamId,
      encryptedTeamKey: encryptIntegrationSecret(teamApiKey),
      status: "ready",
      lastSuccessfulSyncAt: clock.now(),
      lastError: null,
      updatedAt: clock.now(),
    });
  } else {
    await updateIntegration(db, job.schoolId, "sendlit", {
      remoteTeamId: teamId,
      status: "ready",
      lastSuccessfulSyncAt: clock.now(),
      lastError: null,
      updatedAt: clock.now(),
    });
  }
}

async function syncSendLitContactJob(
  db: AppDb,
  job: IntegrationJob,
  clock: Clock,
  operations: SendLitOperations,
  config: SendLitConfig,
): Promise<void> {
  const payload = job.payload as {
    schoolAccountId?: string;
    email?: string;
    ensureSubscribed?: boolean;
    reason?: string;
  };

  let schoolAccountId = payload.schoolAccountId;
  if (!schoolAccountId && payload.email) {
    const [acc] = await db
      .select({ id: schema.schoolAccounts.id })
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, job.schoolId),
          eq(schema.schoolAccounts.email, payload.email),
        ),
      )
      .limit(1);
    schoolAccountId = acc?.id;
  }

  if (!schoolAccountId) {
    throw new IntegrationActionRequiredError(
      "Invalid contact sync payload: missing schoolAccountId",
    );
  }

  const lockKey = "contact_sync:" + schoolAccountId;
  const lockRes = await db.execute(
    sql`SELECT pg_try_advisory_lock(hashtext(${lockKey})) as locked`,
  );
  const locked = (lockRes as any)[0]?.locked ?? (lockRes as any).rows?.[0]?.locked;
  if (locked === false) {
    throw new SendLitApiError(
      "Contact sync currently locked by another worker",
      undefined,
      true,
    );
  }

  try {
    const [schoolAccount] = await db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.id, schoolAccountId),
          eq(schema.schoolAccounts.schoolId, job.schoolId),
        ),
      )
      .limit(1);

    if (!schoolAccount || schoolAccount.status === "deletion_pending") {
      return;
    }

    const integration = await getIntegration(db, job.schoolId, "sendlit");
    if (!integration || !integration.encryptedTeamKey || integration.status !== "ready") {
      throw new SendLitApiError(
        "SendLit is not provisioned or ready yet",
        undefined,
        true,
      );
    }

    const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
    const doCreateContact = operations.createContact ?? createSendLitContact;
    const doGetContact = operations.getContact ?? getSendLitContact;
    const doUpdateContact = operations.updateContact ?? updateSendLitContact;
    const doListContacts = operations.listContacts ?? listSendLitContacts;

    let sendlitContactId = schoolAccount.sendlitContactId;
    let currentContact: SendLitContact | null = null;

    if (sendlitContactId) {
      try {
        currentContact = await doGetContact(teamApiKey, sendlitContactId, { config });
      } catch (err) {
        if (err instanceof SendLitApiError && err.status === 404) {
          sendlitContactId = null;
        } else {
          throw err;
        }
      }
    }

    if (!sendlitContactId) {
      const searchRes = await doListContacts(
        teamApiKey,
        { q: schoolAccount.email, rowsPerPage: 50 },
        { config },
      );
      const existing = searchRes.items.find(
        (c) => c.email.toLowerCase() === schoolAccount.email.toLowerCase(),
      );
      if (existing) {
        sendlitContactId = existing.contactId;
        currentContact = existing;
      } else {
        const created = await doCreateContact(
          teamApiKey,
          {
            email: schoolAccount.email,
            name: schoolAccount.displayName || undefined,
          },
          { config },
        );
        sendlitContactId = created.contactId;
        currentContact = created;
      }

      await db
        .update(schema.schoolAccounts)
        .set({
          sendlitContactId,
          contactActivatedAt: schoolAccount.contactActivatedAt ?? clock.now(),
          updatedAt: clock.now(),
        })
        .where(eq(schema.schoolAccounts.id, schoolAccount.id));
    }

    // Compute CourseLit custom fields
    const activeMemberships = await db
      .select({
        productId: schema.learnerMemberships.entityId,
      })
      .from(schema.learnerMemberships)
      .where(
        and(
          eq(schema.learnerMemberships.schoolId, job.schoolId),
          eq(schema.learnerMemberships.schoolAccountId, schoolAccount.id),
          eq(schema.learnerMemberships.entityType, "product"),
          eq(schema.learnerMemberships.status, "active"),
        ),
      );
    const productIds = activeMemberships.map((m) => m.productId);

    const activeCommunity = await db
      .select({ id: schema.learnerMemberships.id })
      .from(schema.learnerMemberships)
      .where(
        and(
          eq(schema.learnerMemberships.schoolId, job.schoolId),
          eq(schema.learnerMemberships.schoolAccountId, schoolAccount.id),
          eq(schema.learnerMemberships.entityType, "community"),
          eq(schema.learnerMemberships.isIncludedInPlan, false),
          eq(schema.learnerMemberships.status, "active"),
        ),
      )
      .limit(1);
    const isCommunityMember = activeCommunity.length > 0;

    const lastActive = schoolAccount.lastActiveAt
      ? schoolAccount.lastActiveAt.toISOString()
      : undefined;
    const signedUp = (
      schoolAccount.learnerRegisteredAt ?? schoolAccount.createdAt
    ).toISOString();

    const mergedCustomFields: Record<string, unknown> = {
      ...(currentContact?.customFields ?? {}),
      [COURSELIT_PRODUCT_IDS_FIELD]: productIds,
      [COURSELIT_IS_COMMUNITY_MEMBER_FIELD]: isCommunityMember ? "true" : "false",
      ...(lastActive ? { [COURSELIT_LAST_ACTIVE_FIELD]: lastActive } : {}),
      [COURSELIT_SIGNED_UP_FIELD]: signedUp,
    };

    const updateBody: {
      name: string;
      customFields: Record<string, unknown>;
      subscribed?: boolean;
    } = {
      name: schoolAccount.displayName,
      customFields: mergedCustomFields,
    };

    if (payload.ensureSubscribed === true) {
      updateBody.subscribed = true;
    }

    await doUpdateContact(teamApiKey, sendlitContactId, updateBody, { config });

    if (!schoolAccount.contactActivatedAt) {
      await db
        .update(schema.schoolAccounts)
        .set({
          contactActivatedAt: clock.now(),
          updatedAt: clock.now(),
        })
        .where(eq(schema.schoolAccounts.id, schoolAccount.id));
    }
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(hashtext(${lockKey}))`);
  }
}

async function sendSchoolEmailJob(
  db: AppDb,
  job: IntegrationJob,
  operations: SendLitOperations,
  config: SendLitConfig,
): Promise<void> {
  const payload = job.payload as Partial<SendSchoolEmailPayload>;
  if (!payload.to || !payload.subject || !payload.html) {
    throw new IntegrationActionRequiredError("Invalid email payload");
  }
  const integration = await getIntegration(db, job.schoolId, "sendlit");
  if (!integration || !integration.encryptedTeamKey || integration.status !== "ready") {
    throw new SendLitApiError("SendLit is not provisioned or ready yet", undefined, true);
  }
  const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
  const send = operations.sendEmail ?? sendSendLitTransactionalEmail;
  await send(
    teamApiKey,
    {
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      idempotencyKey: payload.idempotencyKey ?? job.id,
    },
    { config: { ...config, server: integration.server || config.server } },
  );
}

/** How long an event waits for its learner to become a contact. Past this,
 * a sequence email would arrive too late to make sense. */
const EVENT_CONTACT_WAIT_MS = 7 * 24 * 60 * 60 * 1000;

/** Reports a CourseLit activity event for a learner who is already a contact.
 * Events never create contacts: that would subscribe learners who never opted
 * in. A learner whose contact hasn't synced yet is retried until it has, for
 * up to a week. */
async function trackSendLitEventJob(
  db: AppDb,
  job: IntegrationJob,
  operations: SendLitOperations,
  config: SendLitConfig,
  now: Date,
): Promise<void> {
  const payload = job.payload as Partial<TrackSendLitEventPayload>;
  if (!payload.schoolAccountId || !payload.eventName) {
    throw new IntegrationActionRequiredError("Invalid event payload");
  }

  const [schoolAccount] = await db
    .select({
      status: schema.schoolAccounts.status,
      sendlitContactId: schema.schoolAccounts.sendlitContactId,
    })
    .from(schema.schoolAccounts)
    .where(
      and(
        eq(schema.schoolAccounts.id, payload.schoolAccountId),
        eq(schema.schoolAccounts.schoolId, job.schoolId),
      ),
    )
    .limit(1);
  if (!schoolAccount || schoolAccount.status === "deletion_pending") return;
  if (!schoolAccount.sendlitContactId) {
    if (now.getTime() - job.createdAt.getTime() > EVENT_CONTACT_WAIT_MS) return;
    throw new SendLitApiError("Contact has not synced yet", undefined, true);
  }

  const integration = await getIntegration(db, job.schoolId, "sendlit");
  if (!integration || !integration.encryptedTeamKey || integration.status !== "ready") {
    throw new SendLitApiError("SendLit is not provisioned or ready yet", undefined, true);
  }
  const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
  const doTrackEvent = operations.trackEvent ?? trackSendLitEvent;
  try {
    await doTrackEvent(
      teamApiKey,
      {
        contactId: schoolAccount.sendlitContactId,
        eventName: payload.eventName,
        properties: payload.properties ?? {},
        occurredAt: payload.occurredAt,
        idempotencyKey: job.id,
      },
      { config },
    );
  } catch (error) {
    if (error instanceof SendLitApiError && error.status === 404) {
      // The contact was removed in SendLit; the next contact sync recreates it.
      throw new SendLitApiError(error.message, 404, true);
    }
    throw error;
  }
}

async function eraseSendLitContactJob(
  db: AppDb,
  job: IntegrationJob,
  clock: Clock,
  operations: SendLitOperations,
  config: SendLitConfig,
): Promise<void> {
  const payload = job.payload as {
    schoolAccountId?: string;
    sendlitContactId?: string;
  };

  if (!payload.schoolAccountId) {
    throw new IntegrationActionRequiredError(
      "Invalid contact erase payload: missing schoolAccountId",
    );
  }

  const lockKey = "contact_sync:" + payload.schoolAccountId;
  const lockRes = await db.execute(
    sql`SELECT pg_try_advisory_lock(hashtext(${lockKey})) as locked`,
  );
  const locked = (lockRes as any)[0]?.locked ?? (lockRes as any).rows?.[0]?.locked;
  if (locked === false) {
    throw new SendLitApiError(
      "Contact erase currently locked by another worker",
      undefined,
      true,
    );
  }

  try {
    const integration = await getIntegration(db, job.schoolId, "sendlit");
    let contactId = payload.sendlitContactId;
    if (!contactId) {
      const [acc] = await db
        .select({ sendlitContactId: schema.schoolAccounts.sendlitContactId })
        .from(schema.schoolAccounts)
        .where(eq(schema.schoolAccounts.id, payload.schoolAccountId))
        .limit(1);
      contactId = acc?.sendlitContactId ?? undefined;
    }

    if (integration?.encryptedTeamKey && integration.status === "ready" && contactId) {
      const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
      const doDeleteContact = operations.deleteContact ?? deleteSendLitContact;
      try {
        await doDeleteContact(teamApiKey, contactId, { config });
      } catch (err) {
        if (!(err instanceof SendLitApiError && err.status === 404)) {
          throw err;
        }
      }
    }

    await db
      .delete(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.id, payload.schoolAccountId),
          eq(schema.schoolAccounts.schoolId, job.schoolId),
        ),
      );
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(hashtext(${lockKey}))`);
  }
}

function backoffMs(attempts: number): number {
  return Math.min(1000 * 2 ** attempts, 60 * 60 * 1000);
}

async function claimNextJob(
  db: AppDb,
  now: Date,
  allowedProviders: schema.IntegrationProvider[] = ["sendlit"],
): Promise<IntegrationJob | null> {
  const [candidate] = await db
    .select()
    .from(schema.integrationOutboxJobs)
    .where(
      and(
        inArray(schema.integrationOutboxJobs.provider, allowedProviders),
        eq(schema.integrationOutboxJobs.status, "pending"),
        lte(schema.integrationOutboxJobs.nextAttemptAt, now),
      ),
    )
    .orderBy(asc(schema.integrationOutboxJobs.nextAttemptAt))
    .limit(1);
  if (!candidate) return null;

  const [claimed] = await db
    .update(schema.integrationOutboxJobs)
    .set({ status: "processing", updatedAt: now })
    .where(
      and(
        eq(schema.integrationOutboxJobs.id, candidate.id),
        eq(schema.integrationOutboxJobs.status, "pending"),
      ),
    )
    .returning();
  return claimed ?? null;
}

export async function requeueStaleJobs(db: AppDb, now: Date): Promise<number> {
  const staleBefore = new Date(now.getTime() - 15 * 60 * 1000);
  const rows = await db
    .update(schema.integrationOutboxJobs)
    .set({
      status: "pending",
      nextAttemptAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(schema.integrationOutboxJobs.provider, "sendlit"),
        eq(schema.integrationOutboxJobs.status, "processing"),
        lt(schema.integrationOutboxJobs.updatedAt, staleBefore),
      ),
    )
    .returning({ id: schema.integrationOutboxJobs.id });
  return rows.length;
}

async function finishJob(db: AppDb, job: IntegrationJob, clock: Clock): Promise<void> {
  await db
    .update(schema.integrationOutboxJobs)
    .set({ status: "done", updatedAt: clock.now(), lastError: null })
    .where(
      and(
        eq(schema.integrationOutboxJobs.id, job.id),
        eq(schema.integrationOutboxJobs.revision, job.revision),
      ),
    );
}

async function failJob(
  db: AppDb,
  job: IntegrationJob,
  clock: Clock,
  error: unknown,
  actionRequired: boolean,
): Promise<void> {
  const now = clock.now();
  let message = safeError(error);
  if (
    error instanceof SendLitApiError &&
    (error.status === 402 || error.status === 403 || error.message.includes("plan_limit_exceeded"))
  ) {
    message = "sendlit_quota_exceeded";
    actionRequired = true;
  }
  if (job.type === "provision_sendlit") {
    await updateIntegration(db, job.schoolId, job.provider, {
      status: actionRequired ? "action_required" : "pending",
      lastError: message,
      updatedAt: now,
    });
  }
  await db
    .update(schema.integrationOutboxJobs)
    .set({
      status: actionRequired ? "failed" : "pending",
      attempts: job.attempts + 1,
      lastError: message,
      nextAttemptAt: new Date(now.getTime() + backoffMs(job.attempts)),
      updatedAt: now,
    })
    .where(eq(schema.integrationOutboxJobs.id, job.id));
}

/** Process one ready CourseLit integration job. Exported for focused worker
 * tests and for operator tooling; normal production use is the poll loop. */
export async function processNextIntegrationJob(
  db: AppDb,
  clock: Clock,
  logger: Logger,
  sendLitOperations: SendLitOperations = defaultSendLitOperations,
  sendLitCfg: SendLitConfig = sendLitConfig(),
): Promise<boolean> {
  if (!sendLitCfg.server) return false;

  const job = await claimNextJob(db, clock.now(), ["sendlit"]);
  if (!job) return false;

  if (job.provider === "sendlit") {
    try {
      if (job.type === "provision_sendlit") {
        await provisionOneSendLitSchool(db, job, clock, sendLitOperations, sendLitCfg);
      } else if (job.type === "sync_sendlit_contact") {
        await syncSendLitContactJob(db, job, clock, sendLitOperations, sendLitCfg);
      } else if (job.type === "erase_sendlit_contact") {
        await eraseSendLitContactJob(db, job, clock, sendLitOperations, sendLitCfg);
      } else if (job.type === "track_sendlit_event") {
        await trackSendLitEventJob(db, job, sendLitOperations, sendLitCfg, clock.now());
      } else if (job.type === "send_school_email") {
        await sendSchoolEmailJob(db, job, sendLitOperations, sendLitCfg);
      } else {
        throw new IntegrationActionRequiredError(
          `Unknown SendLit job type: ${job.type}`,
        );
      }
      await finishJob(db, job, clock);
    } catch (error) {
      const actionRequired = isActionRequired(error);
      await failJob(db, job, clock, error, actionRequired);
      logger.warn(
        {
          jobId: job.id,
          schoolId: job.schoolId,
          attempts: job.attempts + 1,
          actionRequired,
          error: safeError(error),
        },
        "SendLit integration job failed",
      );
    }
    return true;
  }

  return false;
}

/** Starts the same small in-process retry loop used by the sister products. */
export function startIntegrationWorker(
  db: AppDb,
  clock: Clock,
  logger: Logger,
  options: {
    intervalMs?: number;
    sendLitOperations?: SendLitOperations;
  } = {},
): () => void {
  const intervalMs = options.intervalMs ?? 5000;
  let stopped = false;

  async function tick() {
    if (stopped) return;
    try {
      let processed = await processNextIntegrationJob(
        db,
        clock,
        logger,
        options.sendLitOperations,
        sendLitConfig(),
      );
      while (processed && !stopped) {
        processed = await processNextIntegrationJob(
          db,
          clock,
          logger,
          options.sendLitOperations,
          sendLitConfig(),
        );
      }
    } catch (error) {
      logger.error({ error: safeError(error) }, "Integration worker poll error");
    } finally {
      if (!stopped) {
        timer = setTimeout(tick, intervalMs);
      }
    }
  }

  let timer = setTimeout(tick, 0);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
