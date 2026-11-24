/**
 * CourseLit's server-side adapter for SendLit's supported REST API, built on
 * the official `sendlit` SDK. CourseLit never imports SendLit workspace
 * contracts or internal database types; the SDK is the only boundary.
 */

import {
  type AddSequenceEmailInput,
  type Contact,
  type CreateContactInput,
  type CreatedTeamKey,
  type CreateSegmentInput,
  type CreateSequenceInput,
  type CreateTeamKeyInput,
  type CreateTemplateInput,
  type EmailTemplate,
  type GeneralSettings,
  type ListContactsQuery,
  type ListSequencesQuery,
  type PostalAddress,
  type ProvisionedTeamUsage,
  type ProvisionTeamInput,
  type ProvisionTeamResponse,
  type RemoveTagResult,
  type RenameTagInput,
  type RenameTagResult,
  type Segment,
  type SendEmailInput,
  type SendEmailResponse,
  SendLit,
  SendLitError,
  type SendSequenceEmailTestInput,
  type Sequence,
  type SequenceEmailTestResult,
  type SequenceStats,
  type SystemTemplate,
  type Tag,
  type TagReferences,
  type TrackEventInput,
  type TrackEventResponse,
  type UpdateContactInput,
  type UpdateSegmentInput,
  type UpdateSequenceEmailInput,
  type UpdateSequenceInput,
  type UpdateTemplateInput,
} from "sendlit";

export type SendLitConfig = {
  server: string | null;
  provisioningApiKey: string | null;
};

export class SendLitApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable = true,
    /** The service's own error text, safe to show to creators. */
    public readonly detail?: string,
    /** SendLit's machine-readable error code, e.g. `plan_limit_exceeded`. */
    public readonly code?: string,
  ) {
    super(message);
    this.name = "SendLitApiError";
  }
}

/**
 * Whether SendLit refused a send because the team's (or the organization's)
 * sending quota is used up. SendLit answers 429 with
 * `organization_team_quota_exhausted` or `organization_quota_exhausted`.
 */
export function isSendLitQuotaExhausted(error: unknown): boolean {
  return (
    error instanceof SendLitApiError &&
    error.status === 429 &&
    /quota_exhausted/.test(`${error.code ?? ""} ${error.detail ?? ""}`)
  );
}

export function sendLitConfig(
  env: Record<string, string | undefined> = process.env,
): SendLitConfig {
  return {
    server: env.SENDLIT_SERVER?.trim().replace(/\/$/, "") || null,
    provisioningApiKey: env.SENDLIT_ORGANIZATION_API_KEY?.trim() || null,
  };
}

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type SendLitProvisionTeamInput = ProvisionTeamInput;
export type SendLitCustomFields = NonNullable<CreateContactInput["customFields"]>;
export type SendLitUpdateContactInput = UpdateContactInput;
export type SendLitListSequencesQuery = ListSequencesQuery;
export type SendLitCreateSequenceInput = CreateSequenceInput;
export type SendLitUpdateSequenceInput = UpdateSequenceInput;
export type SendLitUpdateSequenceEmailInput = UpdateSequenceEmailInput;
export type SendLitProvisionTeamResult = ProvisionTeamResponse;
export type SendLitContact = Contact;
export type SendLitSegmentFilter = CreateSegmentInput["filter"];
export type SendLitFilterCondition = SendLitSegmentFilter["filters"][number];
export type SendLitSegment = Segment;
export type SendLitTemplateContent = CreateTemplateInput["content"];
export type SendLitTemplate = EmailTemplate;
export type SendLitSystemTemplate = SystemTemplate;
export type SendLitSequence = Sequence;
export type SendLitSequenceEmail = Sequence["emails"][number];
export type SendLitGeneralSettings = GeneralSettings;
/** The mailing address in parts; SendLit formats the footer text. */
export type SendLitGeneralSettingsInput = { postalAddress: SendLitPostalAddress };
export type SendLitPostalAddress = PostalAddress;
export type SendLitSequenceStats = SequenceStats;
export type SendLitEmailTestResult = SequenceEmailTestResult;
export type SendLitTrackEventInput = TrackEventInput;
export type SendLitTrackEventResult = TrackEventResponse;
/** A team's marketing email this month, as SendLit counts it. */
export type SendLitMonthUsage = ProvisionedTeamUsage["month"];
export type SendLitTagSummary = Tag;
export type SendLitTagReferences = TagReferences;
export type SendLitRenameTagResult = RenameTagResult;
export type SendLitDeleteTagResult = RemoveTagResult;

/**
 * `addEmail` and `updateEmail` answer with the whole sequence; pick the
 * email out of it. Without an explicit id, the newest email is the one just
 * added.
 */
function emailFromSequence(
  sequence: Sequence,
  expectedEmailId?: string,
): SendLitSequenceEmail {
  const emailId =
    expectedEmailId || sequence.emailsOrder[sequence.emailsOrder.length - 1];
  const email = sequence.emails.find((item) => item.emailId === emailId);
  if (email) return email;
  throw new Error("SendLit did not include the email in its sequence response.");
}

// ---------------------------------------------------------------------------
// Transport: the official `sendlit` SDK
// ---------------------------------------------------------------------------

/** Each attempt is aborted after this long. */
const REQUEST_TIMEOUT_MS = 15_000;

type SendLitAuth = { teamApiKey?: string; provisioningApiKey?: string };
type SendLitClientOptions = { config?: SendLitConfig; fetcher?: FetchLike };

/**
 * The one place the SDK's `SendLitError` becomes a `SendLitApiError`.
 * `detail` is the response's own `error` text (or its `message`), and `code`
 * is SendLit's machine-readable error code.
 */
function toSendLitApiError(error: unknown): unknown {
  if (!(error instanceof SendLitError)) return error;
  if (error.status === 0) {
    // No response: a timeout, an unreachable server, or a rejected argument.
    if (error.code === "timeout")
      return new SendLitApiError("SendLit request timed out");
    if (error.code === "connection_error")
      return new SendLitApiError("SendLit is unreachable");
    return new SendLitApiError(error.message, undefined, false, undefined, error.code);
  }
  const body =
    error.body && typeof error.body === "object"
      ? (error.body as { error?: unknown; message?: unknown })
      : {};
  const detailText = typeof body.error === "string" ? body.error : body.message;
  const detail =
    typeof detailText === "string" && detailText.trim()
      ? detailText.trim().slice(0, 300)
      : undefined;
  return new SendLitApiError(
    `SendLit API error ${error.status}: ${error.message}`.slice(0, 340),
    error.status,
    error.status >= 500 || error.status === 429,
    detail,
    error.code,
  );
}

/**
 * Runs `call` against a fresh SDK client. The SDK's automatic retries are off
 * because CourseLit's outbox already retries, the timeout matches the old
 * client, and the injected `fetcher` is the SDK's `fetch`.
 */
async function withSendLit<T>(
  config: SendLitConfig,
  auth: SendLitAuth,
  fetcher: FetchLike | undefined,
  call: (sendlit: SendLit) => Promise<T>,
): Promise<T> {
  if (!config.server) {
    throw new SendLitApiError("SENDLIT_SERVER is not configured", undefined, false);
  }
  try {
    const sendlit = new SendLit({
      endpoint: config.server,
      apiKey: auth.teamApiKey ?? auth.provisioningApiKey,
      // Never pick this up from the process environment.
      teamId: "",
      maxRetries: 0,
      timeout: REQUEST_TIMEOUT_MS,
      fetch: fetcher as typeof fetch | undefined,
    });
    return await call(sendlit);
  } catch (error) {
    throw toSendLitApiError(error);
  }
}

function team<T>(
  teamApiKey: string,
  options: SendLitClientOptions,
  call: (sendlit: SendLit) => Promise<T>,
): Promise<T> {
  return withSendLit(
    options.config ?? sendLitConfig(),
    { teamApiKey },
    options.fetcher,
    call,
  );
}

function provisioning<T>(
  options: SendLitClientOptions,
  call: (sendlit: SendLit) => Promise<T>,
): Promise<T> {
  const config = options.config ?? sendLitConfig();
  if (!config.provisioningApiKey) {
    throw new SendLitApiError(
      "SENDLIT_ORGANIZATION_API_KEY is not configured",
      undefined,
      false,
    );
  }
  return withSendLit(
    config,
    { provisioningApiKey: config.provisioningApiKey },
    options.fetcher,
    call,
  );
}

// ---------------------------------------------------------------------------
// Provisioning operations (Organization API key scoped)
// ---------------------------------------------------------------------------

export async function provisionSendLitTeam(
  input: SendLitProvisionTeamInput,
  options: SendLitClientOptions = {},
): Promise<SendLitProvisionTeamResult> {
  return provisioning(options, (s) => s.provisioning.provisionTeam(input));
}

/**
 * Sets a provisioned team's sending quota (`PATCH /provisioning/teams/:id`).
 * Unlike provisioning, this accepts 0, which stops all sending from the team.
 */
export async function updateSendLitTeamQuota(
  teamId: string,
  quota: { monthlyLimit: number | null; dailyLimit?: number | null },
  options: SendLitClientOptions = {},
): Promise<void> {
  await provisioning(options, (s) => s.provisioning.updateTeam(teamId, { quota }));
}

export async function getSendLitTeamUsage(
  teamId: string,
  options: SendLitClientOptions = {},
): Promise<SendLitMonthUsage> {
  const usage = await provisioning(options, (s) => s.provisioning.getTeamUsage(teamId));
  return usage.month;
}

export async function rotateSendLitTeamKey(
  teamId: string,
  input: CreateTeamKeyInput,
  options: SendLitClientOptions = {},
): Promise<CreatedTeamKey> {
  return provisioning(options, (s) => s.provisioning.createTeamKey(teamId, input));
}

// ---------------------------------------------------------------------------
// General Settings operations (Team API key scoped)
// ---------------------------------------------------------------------------

export async function getSendLitGeneralSettings(
  teamApiKey: string,
  options: SendLitClientOptions = {},
): Promise<SendLitGeneralSettings> {
  return team(teamApiKey, options, (s) => s.settings.general.get());
}

export async function updateSendLitGeneralSettings(
  teamApiKey: string,
  input: SendLitGeneralSettingsInput,
  options: SendLitClientOptions = {},
): Promise<SendLitGeneralSettings> {
  return team(teamApiKey, options, (s) => s.settings.general.update(input));
}

// ---------------------------------------------------------------------------
// Contacts operations (Team API key scoped)
// ---------------------------------------------------------------------------

export async function listSendLitContacts(
  teamApiKey: string,
  query: ListContactsQuery = {},
  options: SendLitClientOptions = {},
): Promise<{ items: SendLitContact[]; total: number }> {
  return team(teamApiKey, options, (s) => s.contacts.list(query));
}

export async function createSendLitContact(
  teamApiKey: string,
  input: CreateContactInput,
  options: SendLitClientOptions = {},
): Promise<SendLitContact> {
  return team(teamApiKey, options, (s) => s.contacts.create(input));
}

export async function getSendLitContact(
  teamApiKey: string,
  contactId: string,
  options: SendLitClientOptions = {},
): Promise<SendLitContact> {
  return team(teamApiKey, options, (s) => s.contacts.get(contactId));
}

export async function updateSendLitContact(
  teamApiKey: string,
  contactId: string,
  input: UpdateContactInput,
  options: SendLitClientOptions = {},
): Promise<SendLitContact> {
  return team(teamApiKey, options, (s) => s.contacts.update(contactId, input));
}

export async function deleteSendLitContact(
  teamApiKey: string,
  contactId: string,
  options: SendLitClientOptions = {},
): Promise<void> {
  return team(teamApiKey, options, (s) => s.contacts.remove(contactId));
}

export async function addSendLitContactTag(
  teamApiKey: string,
  contactId: string,
  tag: string,
  options: SendLitClientOptions = {},
): Promise<SendLitContact> {
  return team(teamApiKey, options, (s) => s.contacts.addTag(contactId, tag));
}

export async function removeSendLitContactTag(
  teamApiKey: string,
  contactId: string,
  tag: string,
  options: SendLitClientOptions = {},
): Promise<SendLitContact> {
  return team(teamApiKey, options, (s) => s.contacts.removeTag(contactId, tag));
}

// ---------------------------------------------------------------------------
// Segments operations (Team API key scoped)
// ---------------------------------------------------------------------------

/** SendLit lists segments as a bare array; callers read `{ items }`. */
export async function listSendLitSegments(
  teamApiKey: string,
  options: SendLitClientOptions = {},
): Promise<{ items: SendLitSegment[] }> {
  const items = await team(teamApiKey, options, (s) => s.segments.list());
  return { items };
}

export async function createSendLitSegment(
  teamApiKey: string,
  input: CreateSegmentInput,
  options: SendLitClientOptions = {},
): Promise<SendLitSegment> {
  return team(teamApiKey, options, (s) => s.segments.create(input));
}

export async function getSendLitSegment(
  teamApiKey: string,
  segmentId: string,
  options: SendLitClientOptions = {},
): Promise<SendLitSegment> {
  return team(teamApiKey, options, (s) => s.segments.get(segmentId));
}

export async function updateSendLitSegment(
  teamApiKey: string,
  segmentId: string,
  input: UpdateSegmentInput,
  options: SendLitClientOptions = {},
): Promise<SendLitSegment> {
  return team(teamApiKey, options, (s) => s.segments.update(segmentId, input));
}

export async function deleteSendLitSegment(
  teamApiKey: string,
  segmentId: string,
  options: SendLitClientOptions = {},
): Promise<void> {
  return team(teamApiKey, options, (s) => s.segments.remove(segmentId));
}

// ---------------------------------------------------------------------------
// Tag operations (Team API key scoped). Tags live on SendLit contacts.
// ---------------------------------------------------------------------------

export async function listSendLitTags(
  teamApiKey: string,
  options: SendLitClientOptions = {},
): Promise<{ items: SendLitTagSummary[] }> {
  return team(teamApiKey, options, (s) => s.tags.list());
}

export async function getSendLitTagReferences(
  teamApiKey: string,
  tag: string,
  options: SendLitClientOptions = {},
): Promise<SendLitTagReferences> {
  return team(teamApiKey, options, (s) => s.tags.references(tag));
}

export async function renameSendLitTag(
  teamApiKey: string,
  tag: string,
  input: RenameTagInput,
  options: SendLitClientOptions = {},
): Promise<SendLitRenameTagResult> {
  return team(teamApiKey, options, (s) => s.tags.rename(tag, input));
}

export async function deleteSendLitTag(
  teamApiKey: string,
  tag: string,
  options: SendLitClientOptions = {},
): Promise<SendLitDeleteTagResult> {
  return team(teamApiKey, options, (s) => s.tags.remove(tag));
}

// ---------------------------------------------------------------------------
// Templates operations (Team API key scoped)
// ---------------------------------------------------------------------------

/** SendLit lists templates as a bare array; callers read `{ items, total }`. */
export async function listSendLitTemplates(
  teamApiKey: string,
  query: { purpose?: "marketing" | "transactional" } = {},
  options: SendLitClientOptions = {},
): Promise<{ items: SendLitTemplate[]; total: number }> {
  const items = await team(teamApiKey, options, (s) => s.templates.list(query));
  return { items, total: items.length };
}

export async function createSendLitTemplate(
  teamApiKey: string,
  input: CreateTemplateInput,
  options: SendLitClientOptions = {},
): Promise<SendLitTemplate> {
  return team(teamApiKey, options, (s) => s.templates.create(input));
}

export async function getSendLitTemplate(
  teamApiKey: string,
  templateId: string,
  options: SendLitClientOptions = {},
): Promise<SendLitTemplate> {
  return team(teamApiKey, options, (s) => s.templates.get(templateId));
}

export async function updateSendLitTemplate(
  teamApiKey: string,
  templateId: string,
  input: UpdateTemplateInput,
  options: SendLitClientOptions = {},
): Promise<SendLitTemplate> {
  return team(teamApiKey, options, (s) => s.templates.update(templateId, input));
}

export async function duplicateSendLitTemplate(
  teamApiKey: string,
  templateId: string,
  options: SendLitClientOptions = {},
): Promise<SendLitTemplate> {
  return team(teamApiKey, options, (s) => s.templates.duplicate(templateId));
}

export async function deleteSendLitTemplate(
  teamApiKey: string,
  templateId: string,
  options: SendLitClientOptions = {},
): Promise<void> {
  return team(teamApiKey, options, (s) => s.templates.remove(templateId));
}

export async function listSendLitSystemTemplates(
  teamApiKey: string,
  options: SendLitClientOptions = {},
): Promise<{ items: SendLitSystemTemplate[] }> {
  return team(teamApiKey, options, (s) => s.templates.listSystem());
}

// ---------------------------------------------------------------------------
// Sequences and Broadcasts operations (Team API key scoped)
// ---------------------------------------------------------------------------

export async function listSendLitSequences(
  teamApiKey: string,
  query: ListSequencesQuery,
  options: SendLitClientOptions = {},
): Promise<{ items: SendLitSequence[]; total: number }> {
  return team(teamApiKey, options, (s) => s.sequences.list(query));
}

/**
 * SendLit's create call takes no title, so a given title is set with a
 * follow-up update; if that fails the sequence is still returned with it.
 */
export async function createSendLitSequence(
  teamApiKey: string,
  input: CreateSequenceInput & { title?: string },
  options: SendLitClientOptions = {},
): Promise<SendLitSequence> {
  const { title, ...body } = input;
  let created = await team(teamApiKey, options, (s) => s.sequences.create(body));
  const wanted = title?.trim();
  if (wanted && created.title !== wanted) {
    try {
      const patched = await updateSendLitSequence(
        teamApiKey,
        created.sequenceId,
        { title: wanted },
        options,
      );
      created = { ...created, ...patched, title: wanted };
    } catch {
      created = { ...created, title: wanted };
    }
  }
  return created;
}

export async function getSendLitSequence(
  teamApiKey: string,
  sequenceId: string,
  options: SendLitClientOptions = {},
): Promise<SendLitSequence> {
  return team(teamApiKey, options, (s) => s.sequences.get(sequenceId));
}

export async function updateSendLitSequence(
  teamApiKey: string,
  sequenceId: string,
  input: UpdateSequenceInput,
  options: SendLitClientOptions = {},
): Promise<SendLitSequence> {
  return team(teamApiKey, options, (s) => s.sequences.update(sequenceId, input));
}

export async function deleteSendLitSequence(
  teamApiKey: string,
  sequenceId: string,
  options: SendLitClientOptions = {},
): Promise<void> {
  return team(teamApiKey, options, (s) => s.sequences.remove(sequenceId));
}

export async function addSendLitSequenceEmail(
  teamApiKey: string,
  sequenceId: string,
  input: AddSequenceEmailInput &
    Pick<UpdateSequenceEmailInput, "subject" | "content" | "delayInMillis"> & {
      delayHours?: number;
    },
  options: SendLitClientOptions = {},
): Promise<SendLitSequenceEmail> {
  const sequence = await team(teamApiKey, options, (s) =>
    s.sequences.addEmail(sequenceId, { templateId: input.templateId }),
  );
  const created = emailFromSequence(sequence);
  const delayInMillis =
    input.delayInMillis !== undefined
      ? input.delayInMillis
      : input.delayHours !== undefined
        ? input.delayHours * 3600 * 1000
        : undefined;
  const update: UpdateSequenceEmailInput = {};
  if (input.subject !== created.subject) update.subject = input.subject;
  if (input.content !== undefined) update.content = input.content;
  if (delayInMillis !== undefined && delayInMillis !== created.delayInMillis) {
    update.delayInMillis = delayInMillis;
  }

  if (Object.keys(update).length === 0) return created;
  return updateSendLitSequenceEmail(
    teamApiKey,
    sequenceId,
    created.emailId,
    update,
    options,
  );
}

export async function updateSendLitSequenceEmail(
  teamApiKey: string,
  sequenceId: string,
  emailId: string,
  input: UpdateSequenceEmailInput,
  options: SendLitClientOptions = {},
): Promise<SendLitSequenceEmail> {
  const sequence = await team(teamApiKey, options, (s) =>
    s.sequences.updateEmail(sequenceId, emailId, input),
  );
  return emailFromSequence(sequence, emailId);
}

export async function deleteSendLitSequenceEmail(
  teamApiKey: string,
  sequenceId: string,
  emailId: string,
  options: SendLitClientOptions = {},
): Promise<void> {
  await team(teamApiKey, options, (s) => s.sequences.removeEmail(sequenceId, emailId));
}

export async function startSendLitSequence(
  teamApiKey: string,
  sequenceId: string,
  options: SendLitClientOptions = {},
): Promise<SendLitSequence> {
  return team(teamApiKey, options, (s) => s.sequences.start(sequenceId));
}

export async function pauseSendLitSequence(
  teamApiKey: string,
  sequenceId: string,
  options: SendLitClientOptions = {},
): Promise<SendLitSequence> {
  return team(teamApiKey, options, (s) => s.sequences.pause(sequenceId));
}

export async function getSendLitSequenceStats(
  teamApiKey: string,
  sequenceId: string,
  options: SendLitClientOptions = {},
): Promise<SendLitSequenceStats> {
  return team(teamApiKey, options, (s) => s.sequences.stats(sequenceId));
}

/** The mailing service reports a sequence's recipients as contact ids only. */
export async function listSendLitSequenceSubscribers(
  teamApiKey: string,
  sequenceId: string,
  query: { page?: number; limit?: number } = {},
  options: SendLitClientOptions = {},
): Promise<string[]> {
  return team(teamApiKey, options, (s) => s.sequences.subscribers(sequenceId, query));
}

export async function sendSendLitSequenceEmailTest(
  teamApiKey: string,
  sequenceId: string,
  emailId: string,
  input: SendSequenceEmailTestInput,
  options: SendLitClientOptions = {},
): Promise<SendLitEmailTestResult> {
  return team(teamApiKey, options, (s) =>
    s.sequences.sendEmailTest(sequenceId, emailId, input),
  );
}

// ---------------------------------------------------------------------------
// Custom events (Team API key scoped)
// ---------------------------------------------------------------------------

export async function trackSendLitEvent(
  teamApiKey: string,
  input: SendLitTrackEventInput,
  options: SendLitClientOptions = {},
): Promise<SendLitTrackEventResult> {
  return team(teamApiKey, options, (s) => s.events.track(input));
}

// ---------------------------------------------------------------------------
// Transactional Emails (Team API key scoped)
// ---------------------------------------------------------------------------

export async function sendSendLitTransactionalEmail(
  teamApiKey: string,
  input: SendEmailInput,
  options: SendLitClientOptions = {},
): Promise<SendEmailResponse> {
  return team(teamApiKey, options, (s) => s.emails.send(input));
}
