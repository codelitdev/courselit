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
  COURSELIT_FRONTLIT_PROVISION_PAGES,
  FrontLitApiError,
  type FrontLitConfig,
  type FrontLitContentSummary,
  frontLitConfig,
  listFrontLitPages,
  provisionFrontLitTeam,
  setFrontLitSubdomain,
} from "./frontlit-client.js";
import { ensureSalesPageJobs, provisionSalesPageJob } from "./frontlit-sales-pages.js";
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
  updateSendLitContact,
} from "./sendlit-client.js";
import type { AppDb } from "./types.js";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "./utils/integration-secrets.js";

// These are the only system pages CourseLit requires for a school. FrontLit
// owns the page content and blog posts. CourseLit builds its dynamic index
// routes from the homepage chrome in the storefront app, so only these three
// pages are persisted in FrontLit.
const REQUIRED_FRONTLIT_SLUGS = ["", "terms", "privacy"] as const;
const MAX_ERROR_LENGTH = 2000;

export type FrontLitOperations = {
  provisionTeam: typeof provisionFrontLitTeam;
  setSubdomain: typeof setFrontLitSubdomain;
  listPages: typeof listFrontLitPages;
};

const defaultOperations: FrontLitOperations = {
  provisionTeam: provisionFrontLitTeam,
  setSubdomain: setFrontLitSubdomain,
  listPages: listFrontLitPages,
};

export type SendLitOperations = {
  provisionTeam: typeof provisionSendLitTeam;
  rotateKey: typeof rotateSendLitTeamKey;
  createContact?: typeof createSendLitContact;
  getContact?: typeof getSendLitContact;
  updateContact?: typeof updateSendLitContact;
  deleteContact?: typeof deleteSendLitContact;
  listContacts?: typeof listSendLitContacts;
  addContactTag?: typeof addSendLitContactTag;
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

function asPayload(job: IntegrationJob): {
  externalId: string;
  ownerEmail: string;
  name: string;
  subdomain: string;
  pages: typeof COURSELIT_FRONTLIT_PROVISION_PAGES;
} {
  const payload = job.payload;
  if (
    typeof payload.externalId !== "string" ||
    typeof payload.ownerEmail !== "string" ||
    typeof payload.name !== "string" ||
    typeof payload.subdomain !== "string"
  ) {
    throw new IntegrationActionRequiredError("Invalid FrontLit provisioning payload");
  }
  return {
    externalId: payload.externalId,
    ownerEmail: payload.ownerEmail,
    name: payload.name,
    subdomain: payload.subdomain,
    pages: COURSELIT_FRONTLIT_PROVISION_PAGES,
  };
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim().slice(0, MAX_ERROR_LENGTH);
}

function isActionRequired(error: unknown): boolean {
  return (
    error instanceof IntegrationActionRequiredError ||
    (error instanceof FrontLitApiError && !error.retryable) ||
    (error instanceof SendLitApiError && !error.retryable)
  );
}

function missingMandatoryPages(pages: FrontLitContentSummary[]): string[] {
  const slugs = new Set(pages.map((page) => page.slug));
  return REQUIRED_FRONTLIT_SLUGS.filter((slug) => !slugs.has(slug)).map((slug) =>
    slug ? `/${slug}` : "/",
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

async function provisionOneFrontLitSchool(
  db: AppDb,
  job: IntegrationJob,
  clock: Clock,
  operations: FrontLitOperations,
  config: FrontLitConfig,
): Promise<void> {
  const payload = asPayload(job);
  if (!payload.ownerEmail) {
    throw new IntegrationActionRequiredError("School owner email is missing");
  }

  if (!config.server || !config.provisioningSecret) {
    await updateIntegration(db, job.schoolId, "frontlit", {
      status: "action_required",
      server: config.server ?? "",
      lastError: "FRONTLIT_CONFIGURATION_MISSING",
      updatedAt: clock.now(),
    });
    throw new IntegrationActionRequiredError("FrontLit configuration is missing");
  }

  const attemptAt = clock.now();
  await updateIntegration(db, job.schoolId, "frontlit", {
    status: "provisioning",
    server: config.server,
    lastAttemptAt: attemptAt,
    lastError: null,
    updatedAt: attemptAt,
  });

  const integration = await getIntegration(db, job.schoolId, "frontlit");
  if (!integration) {
    throw new IntegrationActionRequiredError("FrontLit integration mapping is missing");
  }

  let teamId = integration.remoteTeamId;
  let teamApiKey = integration.encryptedTeamKey
    ? decryptIntegrationSecret(integration.encryptedTeamKey)
    : null;

  if (!teamId || !teamApiKey) {
    const provisioned = await operations.provisionTeam(payload, { config });
    teamId = provisioned.teamId;
    teamApiKey = provisioned.apiKey ?? teamApiKey;
    if (!teamId || !teamApiKey) {
      throw new IntegrationActionRequiredError(
        "FrontLit did not return a team API key; key recovery is required",
      );
    }

    await updateIntegration(db, job.schoolId, "frontlit", {
      remoteTeamId: teamId,
      encryptedTeamKey: encryptIntegrationSecret(teamApiKey),
      status: "provisioning",
      updatedAt: clock.now(),
    });
  }

  await operations.setSubdomain(teamApiKey, payload.subdomain, { config });

  const pages = await operations.listPages(teamApiKey, { config });
  const missing = missingMandatoryPages(pages);
  if (missing.length > 0) {
    throw new IntegrationActionRequiredError(
      `FrontLit mandatory pages are missing: ${missing.join(", ")}`,
    );
  }

  const syncedAt = clock.now();
  await updateIntegration(db, job.schoolId, "frontlit", {
    remoteTeamId: teamId,
    status: "ready",
    lastSuccessfulSyncAt: syncedAt,
    lastError: null,
    updatedAt: syncedAt,
  });
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
  allowedProviders: schema.IntegrationProvider[] = ["frontlit", "sendlit"],
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
        inArray(schema.integrationOutboxJobs.provider, ["frontlit", "sendlit"]),
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
  if (job.type === "provision_frontlit" || job.type === "provision_sendlit") {
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
  operations: FrontLitOperations = defaultOperations,
  config: FrontLitConfig = frontLitConfig(),
  sendLitOperations: SendLitOperations = defaultSendLitOperations,
  sendLitCfg: SendLitConfig = sendLitConfig(),
): Promise<boolean> {
  const allowedProviders: schema.IntegrationProvider[] = [];
  if (config.server) {
    allowedProviders.push("frontlit");
  }
  if (sendLitCfg.server) {
    allowedProviders.push("sendlit");
  }
  if (allowedProviders.length === 0) return false;

  const job = await claimNextJob(db, clock.now(), allowedProviders);
  if (!job) return false;

  if (job.provider === "frontlit") {
    try {
      if (job.type === "provision_sales_page") {
        await provisionSalesPageJob(db, job, clock, config);
      } else if (job.type === "provision_frontlit") {
        await provisionOneFrontLitSchool(db, job, clock, operations, config);
      } else {
        throw new IntegrationActionRequiredError(
          `Unknown FrontLit job type: ${job.type}`,
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
        "FrontLit integration job failed",
      );
    }
    return true;
  }

  if (job.provider === "sendlit") {
    try {
      if (job.type === "provision_sendlit") {
        await provisionOneSendLitSchool(db, job, clock, sendLitOperations, sendLitCfg);
      } else if (job.type === "sync_sendlit_contact") {
        await syncSendLitContactJob(db, job, clock, sendLitOperations, sendLitCfg);
      } else if (job.type === "erase_sendlit_contact") {
        await eraseSendLitContactJob(db, job, clock, sendLitOperations, sendLitCfg);
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
    operations?: FrontLitOperations;
    sendLitOperations?: SendLitOperations;
  } = {},
): () => void {
  const intervalMs = options.intervalMs ?? 5000;
  let stopped = false;

  async function tick() {
    if (stopped) return;
    try {
      await ensureSalesPageJobs(db, clock);
      let processed = await processNextIntegrationJob(
        db,
        clock,
        logger,
        options.operations,
        frontLitConfig(),
        options.sendLitOperations,
        sendLitConfig(),
      );
      while (processed && !stopped) {
        processed = await processNextIntegrationJob(
          db,
          clock,
          logger,
          options.operations,
          frontLitConfig(),
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
