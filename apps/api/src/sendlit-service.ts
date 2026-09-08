import {
  type Clock,
  type PlatformError,
  createPlatformError,
  uuidv7,
} from "@codelitdev/platform";

export type Result<T, E = PlatformError> = { ok: true; value: T } | { ok: false; error: E };
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  SendLitApiError,
  addSendLitContactTag,
  addSendLitSequenceEmail,
  createSendLitContact,
  createSendLitSegment,
  createSendLitSequence,
  createSendLitTemplate,
  deleteSendLitContact,
  deleteSendLitSegment,
  deleteSendLitSequence,
  deleteSendLitSequenceEmail,
  deleteSendLitTemplate,
  duplicateSendLitTemplate,
  getSendLitContact,
  getSendLitGeneralSettings,
  getSendLitOverview,
  getSendLitSegment,
  getSendLitSequence,
  getSendLitSequenceStats,
  getSendLitTemplate,
  listSendLitContacts,
  listSendLitSegments,
  listSendLitSequences,
  listSendLitSystemTemplates,
  listSendLitTemplates,
  pauseSendLitSequence,
  provisionSendLitTeam,
  removeSendLitContactTag,
  rotateSendLitTeamKey,
  sendLitConfig,
  startSendLitSequence,
  updateSendLitContact,
  updateSendLitGeneralSettings,
  updateSendLitSegment,
  updateSendLitSequence,
  updateSendLitSequenceEmail,
  updateSendLitTemplate,
  type SendLitConfig,
  type SendLitContact,
  type SendLitGeneralSettings,
  type SendLitOverview,
  type SendLitSegment,
  type SendLitSegmentFilter,
  type SendLitSequence,
  type SendLitSequenceEmail,
  type SendLitSequenceStats,
  type SendLitSystemTemplate,
  type SendLitTemplate,
  type SendLitTemplateContent,
} from "./sendlit-client.js";
import type { AppDb } from "./types.js";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "./utils/integration-secrets.js";

export type SendLitTeamAuth = {
  teamId: string;
  teamApiKey: string;
  server?: string | null;
};


function mapSendLitError(error: unknown): PlatformError {
  if (error instanceof SendLitApiError) {
    if (error.status === 400)
      return createPlatformError("validation_failed", {
        safeDetails: { reason: error.message },
        cause: error,
      });
    if (error.status === 404)
      return createPlatformError("not_found", {
        safeDetails: { reason: error.message },
        cause: error,
      });
    if (error.status === 409)
      return createPlatformError("conflict", {
        safeDetails: { reason: error.message },
        cause: error,
      });
    if (error.status === 403 || error.status === 401)
      return createPlatformError("forbidden", {
        safeDetails: { reason: error.message },
        cause: error,
      });
  }
  return createPlatformError("internal_error", {
    safeDetails: {
      reason: error instanceof Error ? error.message : "Mailing service error",
    },
    cause: error,
  });
}

/**
 * Ensures a SendLit team is provisioned and returns the decrypted team API key.
 * If provisioning hasn't run yet or a key needs rotation, provisions synchronously
 * and persists the encrypted key.
 */
export async function ensureSendLitTeam(
  db: AppDb,
  school: { schoolId: string; publicId: string; name: string },
  clock: Clock,
  config: SendLitConfig = sendLitConfig(),
): Promise<SendLitTeamAuth> {
  const [existing] = await db
    .select()
    .from(schema.schoolIntegrations)
    .where(
      and(
        eq(schema.schoolIntegrations.schoolId, school.schoolId),
        eq(schema.schoolIntegrations.provider, "sendlit"),
      ),
    )
    .limit(1);

  if (existing?.status === "ready" && existing.encryptedTeamKey && existing.remoteTeamId) {
    try {
      const teamApiKey = decryptIntegrationSecret(existing.encryptedTeamKey);
      return { teamId: existing.remoteTeamId, teamApiKey, server: existing.server };
    } catch {
      // Key decryption failed; proceed to rotate
    }
  }

  if (!config.server || !config.provisioningApiKey) {
    throw new SendLitApiError("SendLit is not configured", 503, false);
  }

  const attemptAt = clock.now();
  let remoteTeamId = existing?.remoteTeamId ?? null;
  let teamApiKey: string | null = null;

  if (!remoteTeamId) {
    const provisioned = await provisionSendLitTeam(
      {
        externalId: school.publicId,
        name: school.name,
      },
      { config },
    );
    remoteTeamId = provisioned.teamId;
    teamApiKey = provisioned.apiKey;
  }

  if (!teamApiKey && remoteTeamId) {
    const rotated = await rotateSendLitTeamKey(
      remoteTeamId,
      { name: "courselit-integration" },
      { config },
    );
    teamApiKey = rotated.key;
  }

  if (!teamApiKey || !remoteTeamId) {
    throw new SendLitApiError(
      "SendLit did not return a valid team API key; recovery required",
      502,
      false,
    );
  }

  const encryptedKey = encryptIntegrationSecret(teamApiKey);
  if (existing) {
    await db
      .update(schema.schoolIntegrations)
      .set({
        server: config.server,
        remoteTeamId,
        encryptedTeamKey: encryptedKey,
        status: "ready",
        lastAttemptAt: attemptAt,
        lastSuccessfulSyncAt: attemptAt,
        lastError: null,
        updatedAt: attemptAt,
      })
      .where(
        and(
          eq(schema.schoolIntegrations.schoolId, school.schoolId),
          eq(schema.schoolIntegrations.provider, "sendlit"),
        ),
      );
  } else {
    await db.insert(schema.schoolIntegrations).values({
      id: uuidv7(clock),
      schoolId: school.schoolId,
      provider: "sendlit",
      server: config.server,
      externalId: school.publicId,
      remoteTeamId,
      encryptedTeamKey: encryptedKey,
      status: "ready",
      lastAttemptAt: attemptAt,
      lastSuccessfulSyncAt: attemptAt,
      lastError: null,
      createdAt: attemptAt,
      updatedAt: attemptAt,
    });
  }

  // Mark outbox job as done if pending
  await db
    .update(schema.integrationOutboxJobs)
    .set({ status: "done", updatedAt: clock.now(), lastError: null })
    .where(
      and(
        eq(schema.integrationOutboxJobs.schoolId, school.schoolId),
        eq(schema.integrationOutboxJobs.provider, "sendlit"),
        eq(schema.integrationOutboxJobs.type, "provision_sendlit"),
      ),
    );

  return { teamId: remoteTeamId, teamApiKey, server: config.server };
}

/**
 * Resolves authenticated credentials for a school's SendLit integration.
 */
export async function getSendLitAuthForSchool(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  config: SendLitConfig = sendLitConfig(),
): Promise<Result<SendLitTeamAuth, PlatformError>> {
  const [integration] = await db
    .select()
    .from(schema.schoolIntegrations)
    .where(
      and(
        eq(schema.schoolIntegrations.schoolId, schoolId),
        eq(schema.schoolIntegrations.provider, "sendlit"),
      ),
    )
    .limit(1);

  if (integration?.status === "ready" && integration.encryptedTeamKey && integration.remoteTeamId) {
    try {
      const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
      return { ok: true, value: { teamId: integration.remoteTeamId, teamApiKey, server: integration.server } };
    } catch {
      // Decryption failed; fall back to provisioning
    }
  }

  const [school] = await db
    .select()
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);

  if (!school) {
    return { ok: false, error: createPlatformError("not_found", { safeDetails: { reason: "School not found" } }) };
  }

  if (!config.server || !config.provisioningApiKey) {
    return {
      ok: false,
      error: createPlatformError("conflict", { safeDetails: { reason: "Mailing service integration is not configured" } }),
    };
  }

  try {
    const auth = await ensureSendLitTeam(
      db,
      { schoolId: school.id, publicId: school.publicId, name: school.name },
      clock,
      config,
    );
    return { ok: true, value: auth };
  } catch (error) {
    return {
      ok: false,
      error: createPlatformError(
        "conflict",
        { safeDetails: { reason: error instanceof Error ? error.message : "Failed to connect to mailing service" } },
      ),
    };
  }
}

async function withSendLitAuth<T>(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  fn: (auth: SendLitTeamAuth, config: SendLitConfig) => Promise<T>,
  configOverride?: SendLitConfig,
): Promise<Result<T, PlatformError>> {
  const cfg = configOverride ?? sendLitConfig();
  const authResult = await getSendLitAuthForSchool(db, schoolId, clock, cfg);
  if (!authResult.ok) return authResult;
  const effectiveConfig: SendLitConfig = {
    server: configOverride?.server || authResult.value.server || cfg.server,
    provisioningApiKey: configOverride?.provisioningApiKey || cfg.provisioningApiKey,
  };
  try {
    const val = await fn(authResult.value, effectiveConfig);
    return { ok: true, value: val };
  } catch (error) {
    return { ok: false, error: mapSendLitError(error) };
  }
}

// ---------------------------------------------------------------------------
// Mailing settings
// ---------------------------------------------------------------------------

export async function getMailingSettings(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  config?: SendLitConfig,
): Promise<Result<SendLitGeneralSettings, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => getSendLitGeneralSettings(auth.teamApiKey, { config: cfg }),
    config,
  );
}

export async function updateMailingSettings(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  input: { mailingAddress: string },
  config?: SendLitConfig,
): Promise<Result<SendLitGeneralSettings, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => updateSendLitGeneralSettings(auth.teamApiKey, input, { config: cfg }),
    config,
  );
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------


export async function addTagToContact(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  contactId: string,
  tag: string,
  config?: SendLitConfig,
): Promise<Result<SendLitContact, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => addSendLitContactTag(auth.teamApiKey, contactId, tag, { config: cfg }),
    config,
  );
}

export async function removeTagFromContact(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  contactId: string,
  tag: string,
  config?: SendLitConfig,
): Promise<Result<SendLitContact, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => removeSendLitContactTag(auth.teamApiKey, contactId, tag, { config: cfg }),
    config,
  );
}

// ---------------------------------------------------------------------------
// Subscribers / Contacts
// ---------------------------------------------------------------------------

export async function listSubscribers(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  query: { offset?: number; limit?: number; search?: string; tag?: string; status?: string; cursor?: string } = {},
  config?: SendLitConfig,
): Promise<Result<{ items: SendLitContact[]; total: number }, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) =>
      listSendLitContacts(
        auth.teamApiKey,
        {
          offset: query.offset,
          rowsPerPage: query.limit,
          q: query.search,
          tag: query.tag,
          filter: query.status,
        },
        { config: cfg },
      ),
    config,
  );
}

export async function createSubscriber(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  input: { email: string; name?: string; tags?: string[]; customFields?: Record<string, unknown> },
  config?: SendLitConfig,
): Promise<Result<SendLitContact, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => createSendLitContact(auth.teamApiKey, input, { config: cfg }),
    config,
  );
}

export async function getSubscriber(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  contactId: string,
  config?: SendLitConfig,
): Promise<Result<SendLitContact, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => getSendLitContact(auth.teamApiKey, contactId, { config: cfg }),
    config,
  );
}

export async function updateSubscriber(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  contactId: string,
  input: {
    email?: string;
    name?: string;
    subscribed?: boolean;
    tags?: string[];
    customFields?: Record<string, unknown>;
  },
  config?: SendLitConfig,
): Promise<Result<SendLitContact, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => updateSendLitContact(auth.teamApiKey, contactId, input, { config: cfg }),
    config,
  );
}

export async function deleteSubscriber(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  contactId: string,
  config?: SendLitConfig,
): Promise<Result<void, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => deleteSendLitContact(auth.teamApiKey, contactId, { config: cfg }),
    config,
  );
}

// ---------------------------------------------------------------------------
// Segments
// ---------------------------------------------------------------------------

export async function listSegments(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  query: { search?: string; cursor?: string; limit?: number } = {},
  config?: SendLitConfig,
): Promise<Result<{ items: SendLitSegment[] }, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => listSendLitSegments(auth.teamApiKey, { config: cfg }),
    config,
  );
}

export async function createSegment(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  input: { name: string; filter: SendLitSegmentFilter },
  config?: SendLitConfig,
): Promise<Result<SendLitSegment, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => createSendLitSegment(auth.teamApiKey, input, { config: cfg }),
    config,
  );
}

export async function getSegment(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  segmentId: string,
  config?: SendLitConfig,
): Promise<Result<SendLitSegment, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => getSendLitSegment(auth.teamApiKey, segmentId, { config: cfg }),
    config,
  );
}

export async function updateSegment(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  segmentId: string,
  input: { name?: string; filter?: SendLitSegmentFilter },
  config?: SendLitConfig,
): Promise<Result<SendLitSegment, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => updateSendLitSegment(auth.teamApiKey, segmentId, input, { config: cfg }),
    config,
  );
}

export async function deleteSegment(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  segmentId: string,
  config?: SendLitConfig,
): Promise<Result<void, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => deleteSendLitSegment(auth.teamApiKey, segmentId, { config: cfg }),
    config,
  );
}

// ---------------------------------------------------------------------------
// Sequences & Broadcasts
// ---------------------------------------------------------------------------

export async function listSequences(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  query: {
    type?: "broadcast" | "sequence" | string;
    status?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  } = {},
  config?: SendLitConfig,
): Promise<Result<{ items: SendLitSequence[]; total: number }, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    async (auth, cfg) => {
      const res = await listSendLitSequences(
        auth.teamApiKey,
        {
          type: query.type === "broadcast" || query.type === "sequence" ? query.type : undefined,
          itemsPerPage: query.limit,
        },
        { config: cfg },
      );
      let items = res.items;
      if (query.type === "broadcast" || query.type === "sequence") {
        const matchingType = query.type.toLowerCase();
        const hasTypeProperty = items.some((item) => Boolean(item.type));
        if (hasTypeProperty) {
          items = items.filter(
            (item) => !item.type || item.type.toLowerCase() === matchingType,
          );
        }
      }
      if (query.status) {
        items = items.filter((item) => item.status === query.status);
      }
      if (query.search?.trim()) {
        const searchLower = query.search.trim().toLowerCase();
        items = items.filter((item) =>
          item.title?.toLowerCase().includes(searchLower),
        );
      }
      return { items, total: items.length < res.total ? items.length : res.total };
    },
    config,
  );
}

export async function createSequence(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  input: {
    type: "broadcast" | "sequence";
    title?: string;
    templateId?: string;
    deliverySource?: unknown;
  },
  config?: SendLitConfig,
): Promise<Result<SendLitSequence, PlatformError>> {
  const defaultTitle = input.type === "sequence" ? "Untitled Sequence" : "Untitled broadcast";
  const normalizedInput = {
    ...input,
    title: input.title?.trim() || defaultTitle,
    templateId: input.templateId || "system:blank",
  };
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    async (auth, cfg) => {
      let created = await createSendLitSequence(auth.teamApiKey, normalizedInput, { config: cfg });
      if (normalizedInput.title && created.title !== normalizedInput.title) {
        try {
          const updated = await updateSendLitSequence(
            auth.teamApiKey,
            created.sequenceId,
            { title: normalizedInput.title },
            { config: cfg },
          );
          created = { ...created, ...updated, title: normalizedInput.title };
        } catch {
          created.title = normalizedInput.title;
        }
      }
      // If SendLit does not create an initial email, create one so the editor and broadcast have an email
      if (!created.emails || created.emails.length === 0) {
        try {
          const email = await addSendLitSequenceEmail(
            auth.teamApiKey,
            created.sequenceId,
            {
              subject: normalizedInput.title || defaultTitle,
              templateId: normalizedInput.templateId,
            },
            { config: cfg },
          );
          created.emails = [email];
        } catch {
          // Non-fatal if SendLit handles emails separately
        }
      }
      return created;
    },
    config,
  );
}

export async function getSequence(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  sequenceId: string,
  config?: SendLitConfig,
): Promise<Result<SendLitSequence, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => getSendLitSequence(auth.teamApiKey, sequenceId, { config: cfg }),
    config,
  );
}

export async function updateSequence(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  sequenceId: string,
  input: { title?: string; templateId?: string; scheduledFor?: string; segmentId?: string },
  config?: SendLitConfig,
): Promise<Result<SendLitSequence, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => updateSendLitSequence(auth.teamApiKey, sequenceId, input, { config: cfg }),
    config,
  );
}

export async function deleteSequence(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  sequenceId: string,
  config?: SendLitConfig,
): Promise<Result<void, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => deleteSendLitSequence(auth.teamApiKey, sequenceId, { config: cfg }),
    config,
  );
}

export async function addSequenceEmail(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  sequenceId: string,
  input: { subject: string; templateId?: string; delayHours?: number },
  config?: SendLitConfig,
): Promise<Result<SendLitSequenceEmail, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => addSendLitSequenceEmail(auth.teamApiKey, sequenceId, input, { config: cfg }),
    config,
  );
}

export async function updateSequenceEmail(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  sequenceId: string,
  emailId: string,
  input: {
    subject?: string;
    templateId?: string;
    delayHours?: number;
    delayInMillis?: number;
    content?: unknown;
    published?: boolean;
  },
  config?: SendLitConfig,
): Promise<Result<SendLitSequenceEmail, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) =>
      updateSendLitSequenceEmail(auth.teamApiKey, sequenceId, emailId, input, { config: cfg }),
    config,
  );
}

export async function deleteSequenceEmail(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  sequenceId: string,
  emailId: string,
  config?: SendLitConfig,
): Promise<Result<void, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => deleteSendLitSequenceEmail(auth.teamApiKey, sequenceId, emailId, { config: cfg }),
    config,
  );
}

export async function startSequence(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  sequenceId: string,
  config?: SendLitConfig,
): Promise<Result<SendLitSequence, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => startSendLitSequence(auth.teamApiKey, sequenceId, { config: cfg }),
    config,
  );
}

export async function pauseSequence(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  sequenceId: string,
  config?: SendLitConfig,
): Promise<Result<SendLitSequence, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => pauseSendLitSequence(auth.teamApiKey, sequenceId, { config: cfg }),
    config,
  );
}

export async function getSequenceStats(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  sequenceId: string,
  config?: SendLitConfig,
): Promise<Result<SendLitSequenceStats, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => getSendLitSequenceStats(auth.teamApiKey, sequenceId, { config: cfg }),
    config,
  );
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function listSystemTemplates(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  config?: SendLitConfig,
): Promise<Result<{ items: SendLitSystemTemplate[] }, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => listSendLitSystemTemplates(auth.teamApiKey, { config: cfg }),
    config,
  );
}

export async function listTemplates(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  query: { search?: string; cursor?: string; limit?: number } = {},
  config?: SendLitConfig,
): Promise<Result<{ items: SendLitTemplate[] }, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => listSendLitTemplates(auth.teamApiKey, {}, { config: cfg }),
    config,
  );
}

export async function createTemplate(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  input: { name?: string; title?: string; content?: SendLitTemplateContent; thumbnail?: string; purpose?: "marketing" | "transactional" },
  config?: SendLitConfig,
): Promise<Result<SendLitTemplate, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) =>
      createSendLitTemplate(
        auth.teamApiKey,
        {
          title: input.title ?? input.name ?? "Untitled Template",
          content: input.content ?? { content: { html: "" } },
          purpose: input.purpose,
        },
        { config: cfg },
      ),
    config,
  );
}

export async function getTemplate(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  templateId: string,
  config?: SendLitConfig,
): Promise<Result<SendLitTemplate, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => getSendLitTemplate(auth.teamApiKey, templateId, { config: cfg }),
    config,
  );
}

export async function updateTemplate(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  templateId: string,
  input: { name?: string; title?: string; content?: SendLitTemplateContent; thumbnail?: string; purpose?: "marketing" | "transactional" },
  config?: SendLitConfig,
): Promise<Result<SendLitTemplate, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) =>
      updateSendLitTemplate(
        auth.teamApiKey,
        templateId,
        {
          title: input.title ?? input.name,
          content: input.content,
          purpose: input.purpose,
        },
        { config: cfg },
      ),
    config,
  );
}

export async function duplicateTemplate(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  templateId: string,
  config?: SendLitConfig,
): Promise<Result<SendLitTemplate, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => duplicateSendLitTemplate(auth.teamApiKey, templateId, { config: cfg }),
    config,
  );
}

export async function deleteTemplate(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  templateId: string,
  config?: SendLitConfig,
): Promise<Result<void, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => deleteSendLitTemplate(auth.teamApiKey, templateId, { config: cfg }),
    config,
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export async function getOverview(
  db: AppDb,
  schoolId: string,
  clock: Clock,
  config?: SendLitConfig,
): Promise<Result<SendLitOverview, PlatformError>> {
  return withSendLitAuth(
    db,
    schoolId,
    clock,
    (auth, cfg) => getSendLitOverview(auth.teamApiKey, {}, { config: cfg }),
    config,
  );
}
