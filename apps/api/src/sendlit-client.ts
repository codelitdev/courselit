/**
 * CourseLit's server-side adapter for SendLit's supported REST API. Hand-written
 * to maintain strict boundary separation: CourseLit never imports SendLit workspace
 * contracts or internal database types.
 */

export type SendLitConfig = {
  server: string | null;
  provisioningApiKey: string | null;
};

export class SendLitApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable = true,
  ) {
    super(message);
    this.name = "SendLitApiError";
  }
}

export function sendLitConfig(
  env: Record<string, string | undefined> = process.env,
): SendLitConfig {
  const localDefaults = env.NODE_ENV === "development";
  return {
    server:
      env.SENDLIT_SERVER?.trim().replace(/\/$/, "") ||
      (localDefaults ? "http://127.0.0.1:4101" : null),
    provisioningApiKey:
      env.SENDLIT_APIKEY?.trim() ||
      (localDefaults
        ? "sl_org_live_D6NfA32ZPv4ideNpRtdp61N9_JIvbv3-5_0b6ucELfc"
        : null),
  };
}

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type SendLitProvisionTeamInput = {
  externalId: string;
  name: string;
  sender?: {
    fromName?: string;
    replyTo?: string;
  };
  mailingAddress?: string;
  delivery?: {
    source: "organization" | "custom";
    espId?: string;
  };
  quota?: {
    monthly?: number;
    daily?: number;
  };
};

export type SendLitProvisionTeamResult = {
  teamId: string;
  externalId: string;
  name: string;
  deliverySource?: {
    type: string;
    espId?: string;
  };
  created: boolean;
  apiKey: string | null;
};

export type SendLitContact = {
  contactId: string;
  email: string;
  name: string | null;
  subscribed: boolean;
  customFields: Record<string, unknown>;
  tags: string[];
  unsubscribeToken?: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SendLitFilterCondition =
  | { name: "email"; condition: "is" | "contains" | "not_contains"; value: string; valueLabel?: string }
  | { name: "tag"; condition: "is" | "is_not"; value: string; valueLabel?: string }
  | { name: "subscription"; condition: "is"; value: "subscribed" | "unsubscribed"; valueLabel?: string }
  | { name: "signedUp"; condition: "before" | "after" | "on"; value: string; valueLabel?: string }
  | {
      name: "customField";
      key: string;
      condition:
        | "is"
        | "is_not"
        | "contains"
        | "not_contains"
        | "has"
        | "not_has"
        | "before"
        | "after"
        | "on"
        | "exists"
        | "not_exists";
      value?: string;
      valueLabel?: string;
    };

export type SendLitSegmentFilter = {
  aggregator: "and" | "or";
  filters: SendLitFilterCondition[];
};

export type SendLitSegment = {
  segmentId: string;
  name: string;
  filter: SendLitSegmentFilter;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SendLitTemplateContent = {
  style?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  content: unknown;
};

export type SendLitTemplate = {
  templateId: string;
  title: string;
  purpose: "marketing" | "transactional";
  content: SendLitTemplateContent;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SendLitSystemTemplate = {
  templateId: string;
  title: string;
  purpose: "marketing" | "transactional";
  content: SendLitTemplateContent;
};

export type SendLitSequenceEmail = {
  emailId: string;
  id?: string;
  subject: string;
  content: unknown;
  delayInMillis: number;
  published: boolean;
  templateId?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type SendLitSequence = {
  sequenceId: string;
  id?: string;
  title?: string;
  type: "broadcast" | "sequence";
  status?: string;
  templateId?: string;
  emails?: SendLitSequenceEmail[];
  triggerType?: string;
  triggerData?: string;
  filter?: unknown;
  excludeFilter?: unknown;
  emailsOrder?: string[];
  entrantsCount?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export function normalizeSendLitSequenceEmail(raw: any): SendLitSequenceEmail {
  if (!raw || typeof raw !== "object") return raw;
  const emailId = raw.emailId || raw.id || "";
  return {
    ...raw,
    emailId,
    id: emailId,
  };
}

export function normalizeSendLitSequence(raw: any): SendLitSequence {
  if (!raw || typeof raw !== "object") return raw;
  const sequenceId = raw.sequenceId || raw.id || "";
  const emails = Array.isArray(raw.emails)
    ? raw.emails.map(normalizeSendLitSequenceEmail)
    : [];
  return {
    ...raw,
    sequenceId,
    id: sequenceId,
    emails,
  };
}

export function normalizeSendLitTemplate(raw: any): SendLitTemplate {
  if (!raw || typeof raw !== "object") return raw;
  const templateId = raw.templateId || raw.id || "";
  const title = raw.title || raw.name || "Untitled Template";
  return {
    ...raw,
    templateId,
    id: templateId,
    title,
    name: title,
    purpose: raw.purpose || "marketing",
    content: raw.content ?? { content: { html: "" } },
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  };
}

export type SendLitGeneralSettings = {
  mailingAddress: string | null;
  updatedAt?: string | null;
};

export type SendLitSequenceStats = {
  sequenceId: string;
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  bounced?: number;
  complained?: number;
  unsubscribed?: number;
};

export type SendLitOverview = {
  totalSubscribers?: number;
  activeSubscribers?: number;
  contacts?: { total: number; subscribed: number; unsubscribed: number };
  deliveries?: Record<string, unknown>;
  rangeDays?: number;
};

function errorMessage(status: number, body: string): string {
  const detail = body.replace(/\s+/g, " ").trim().slice(0, 300);
  return detail ? `SendLit API error ${status}: ${detail}` : `SendLit API error ${status}`;
}

async function requestJson<T>(
  config: SendLitConfig,
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    teamApiKey?: string;
    provisioningApiKey?: string;
    body?: unknown;
  },
  fetcher: FetchLike = fetch,
): Promise<T> {
  if (!config.server) {
    throw new SendLitApiError("SENDLIT_SERVER is not configured", undefined, false);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    let response: Response;
    try {
      const authHeaders: Record<string, string> = {};
      if (options.teamApiKey) {
        authHeaders["x-sendlit-apikey"] = options.teamApiKey;
      } else if (options.provisioningApiKey) {
        authHeaders.authorization = `Bearer ${options.provisioningApiKey}`;
      }

      response = await fetcher(`${config.server}${path}`, {
        method: options.method ?? "GET",
        headers: {
          accept: "application/json",
          ...(options.body === undefined ? {} : { "content-type": "application/json" }),
          ...authHeaders,
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "SendLit request timed out"
          : "SendLit is unreachable";
      throw new SendLitApiError(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    if (!response.ok) {
      const text = await response.text();
      const retryable = response.status >= 500 || response.status === 429;
      throw new SendLitApiError(errorMessage(response.status, text), response.status, retryable);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Provisioning operations (Organization API key scoped)
// ---------------------------------------------------------------------------

export async function provisionSendLitTeam(
  input: SendLitProvisionTeamInput,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitProvisionTeamResult> {
  const config = options.config ?? sendLitConfig();
  if (!config.provisioningApiKey) {
    throw new SendLitApiError("SENDLIT_APIKEY is not configured", undefined, false);
  }
  return requestJson<SendLitProvisionTeamResult>(
    config,
    "/provisioning/teams",
    {
      method: "POST",
      provisioningApiKey: config.provisioningApiKey,
      body: input,
    },
    options.fetcher,
  );
}

export async function rotateSendLitTeamKey(
  teamId: string,
  input: { name: string },
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<{ keyId: string; key: string }> {
  const config = options.config ?? sendLitConfig();
  if (!config.provisioningApiKey) {
    throw new SendLitApiError("SENDLIT_APIKEY is not configured", undefined, false);
  }
  return requestJson<{ keyId: string; key: string }>(
    config,
    `/provisioning/teams/${encodeURIComponent(teamId)}/keys`,
    {
      method: "POST",
      provisioningApiKey: config.provisioningApiKey,
      body: input,
    },
    options.fetcher,
  );
}

export async function getSendLitProvisionedTeam(
  teamId: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<unknown> {
  const config = options.config ?? sendLitConfig();
  return requestJson(
    config,
    `/provisioning/teams/${encodeURIComponent(teamId)}`,
    {
      method: "GET",
      provisioningApiKey: config.provisioningApiKey ?? undefined,
    },
    options.fetcher,
  );
}

export async function updateSendLitProvisionedTeam(
  teamId: string,
  input: { name?: string; sender?: unknown; mailingAddress?: string },
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<unknown> {
  const config = options.config ?? sendLitConfig();
  return requestJson(
    config,
    `/provisioning/teams/${encodeURIComponent(teamId)}`,
    {
      method: "PATCH",
      provisioningApiKey: config.provisioningApiKey ?? undefined,
      body: input,
    },
    options.fetcher,
  );
}

export async function deleteSendLitProvisionedTeam(
  teamId: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<void> {
  const config = options.config ?? sendLitConfig();
  return requestJson(
    config,
    `/provisioning/teams/${encodeURIComponent(teamId)}`,
    {
      method: "DELETE",
      provisioningApiKey: config.provisioningApiKey ?? undefined,
    },
    options.fetcher,
  );
}

// ---------------------------------------------------------------------------
// General Settings operations (Team API key scoped)
// ---------------------------------------------------------------------------

export async function getSendLitGeneralSettings(
  teamApiKey: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitGeneralSettings> {
  const config = options.config ?? sendLitConfig();
  return requestJson<SendLitGeneralSettings>(
    config,
    "/settings/general",
    { method: "GET", teamApiKey },
    options.fetcher,
  );
}

export async function updateSendLitGeneralSettings(
  teamApiKey: string,
  input: { mailingAddress: string },
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitGeneralSettings> {
  const config = options.config ?? sendLitConfig();
  return requestJson<SendLitGeneralSettings>(
    config,
    "/settings/general",
    { method: "PUT", teamApiKey, body: input },
    options.fetcher,
  );
}

// ---------------------------------------------------------------------------
// Contacts operations (Team API key scoped)
// ---------------------------------------------------------------------------

export async function listSendLitContacts(
  teamApiKey: string,
  query: {
    offset?: number;
    rowsPerPage?: number;
    q?: string;
    segmentId?: string;
    filter?: string;
    tag?: string;
  } = {},
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<{ items: SendLitContact[]; total: number }> {
  const config = options.config ?? sendLitConfig();
  const search = new URLSearchParams();
  if (query.offset !== undefined) search.set("offset", String(query.offset));
  if (query.rowsPerPage !== undefined) search.set("rowsPerPage", String(query.rowsPerPage));
  if (query.q) search.set("q", query.q);
  if (query.segmentId) search.set("segmentId", query.segmentId);
  if (query.filter) search.set("filter", query.filter);
  if (query.tag) search.set("tag", query.tag);

  const qs = search.toString();
  return requestJson<{ items: SendLitContact[]; total: number }>(
    config,
    `/contacts${qs ? `?${qs}` : ""}`,
    { method: "GET", teamApiKey },
    options.fetcher,
  );
}

export async function createSendLitContact(
  teamApiKey: string,
  input: {
    email: string;
    name?: string;
    tags?: string[];
    customFields?: Record<string, unknown>;
  },
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitContact> {
  const config = options.config ?? sendLitConfig();
  return requestJson<SendLitContact>(
    config,
    "/contacts",
    { method: "POST", teamApiKey, body: input },
    options.fetcher,
  );
}

export async function getSendLitContact(
  teamApiKey: string,
  contactId: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitContact> {
  const config = options.config ?? sendLitConfig();
  return requestJson<SendLitContact>(
    config,
    `/contacts/${encodeURIComponent(contactId)}`,
    { method: "GET", teamApiKey },
    options.fetcher,
  );
}

export async function updateSendLitContact(
  teamApiKey: string,
  contactId: string,
  input: {
    email?: string;
    name?: string;
    subscribed?: boolean;
    tags?: string[];
    customFields?: Record<string, unknown>;
  },
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitContact> {
  const config = options.config ?? sendLitConfig();
  return requestJson<SendLitContact>(
    config,
    `/contacts/${encodeURIComponent(contactId)}`,
    { method: "PATCH", teamApiKey, body: input },
    options.fetcher,
  );
}

export async function deleteSendLitContact(
  teamApiKey: string,
  contactId: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<void> {
  const config = options.config ?? sendLitConfig();
  return requestJson<void>(
    config,
    `/contacts/${encodeURIComponent(contactId)}`,
    { method: "DELETE", teamApiKey },
    options.fetcher,
  );
}

export async function addSendLitContactTag(
  teamApiKey: string,
  contactId: string,
  tag: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitContact> {
  const config = options.config ?? sendLitConfig();
  return requestJson<SendLitContact>(
    config,
    `/contacts/${encodeURIComponent(contactId)}/tags/${encodeURIComponent(tag)}`,
    { method: "POST", teamApiKey },
    options.fetcher,
  );
}

export async function removeSendLitContactTag(
  teamApiKey: string,
  contactId: string,
  tag: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitContact> {
  const config = options.config ?? sendLitConfig();
  return requestJson<SendLitContact>(
    config,
    `/contacts/${encodeURIComponent(contactId)}/tags/${encodeURIComponent(tag)}`,
    { method: "DELETE", teamApiKey },
    options.fetcher,
  );
}

// ---------------------------------------------------------------------------
// Segments operations (Team API key scoped)
// ---------------------------------------------------------------------------

export async function listSendLitSegments(
  teamApiKey: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<{ items: SendLitSegment[] }> {
  const config = options.config ?? sendLitConfig();
  return requestJson<{ items: SendLitSegment[] }>(
    config,
    "/segments",
    { method: "GET", teamApiKey },
    options.fetcher,
  );
}

export async function createSendLitSegment(
  teamApiKey: string,
  input: { name: string; filter: SendLitSegmentFilter },
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitSegment> {
  const config = options.config ?? sendLitConfig();
  return requestJson<SendLitSegment>(
    config,
    "/segments",
    { method: "POST", teamApiKey, body: input },
    options.fetcher,
  );
}

export async function getSendLitSegment(
  teamApiKey: string,
  segmentId: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitSegment> {
  const config = options.config ?? sendLitConfig();
  return requestJson<SendLitSegment>(
    config,
    `/segments/${encodeURIComponent(segmentId)}`,
    { method: "GET", teamApiKey },
    options.fetcher,
  );
}

export async function updateSendLitSegment(
  teamApiKey: string,
  segmentId: string,
  input: { name?: string; filter?: SendLitSegmentFilter },
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitSegment> {
  const config = options.config ?? sendLitConfig();
  return requestJson<SendLitSegment>(
    config,
    `/segments/${encodeURIComponent(segmentId)}`,
    { method: "PATCH", teamApiKey, body: input },
    options.fetcher,
  );
}

export async function deleteSendLitSegment(
  teamApiKey: string,
  segmentId: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<void> {
  const config = options.config ?? sendLitConfig();
  return requestJson<void>(
    config,
    `/segments/${encodeURIComponent(segmentId)}`,
    { method: "DELETE", teamApiKey },
    options.fetcher,
  );
}

// ---------------------------------------------------------------------------
// Templates operations (Team API key scoped)
// ---------------------------------------------------------------------------

export async function listSendLitTemplates(
  teamApiKey: string,
  query: { purpose?: "marketing" | "transactional" } = {},
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<{ items: SendLitTemplate[]; total: number }> {
  const config = options.config ?? sendLitConfig();
  const search = new URLSearchParams();
  if (query.purpose) search.set("purpose", query.purpose);
  const qs = search.toString();
  const raw = await requestJson<any>(
    config,
    `/templates${qs ? `?${qs}` : ""}`,
    { method: "GET", teamApiKey },
    options.fetcher,
  );
  const rawList = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.templates)
        ? raw.templates
        : Array.isArray(raw?.data)
          ? raw.data
          : [];
  const normalizedItems = rawList.map(normalizeSendLitTemplate);
  const total = typeof raw?.total === "number" ? raw.total : normalizedItems.length;
  return { items: normalizedItems, total };
}

export async function createSendLitTemplate(
  teamApiKey: string,
  input: {
    title?: string;
    name?: string;
    purpose?: "marketing" | "transactional";
    content: SendLitTemplateContent;
  },
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitTemplate> {
  const config = options.config ?? sendLitConfig();
  const title = input.title ?? input.name ?? "Untitled Template";
  const raw = await requestJson<any>(
    config,
    "/templates",
    { method: "POST", teamApiKey, body: { ...input, title, name: title } },
    options.fetcher,
  );
  return normalizeSendLitTemplate(raw);
}

export async function getSendLitTemplate(
  teamApiKey: string,
  templateId: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitTemplate> {
  const config = options.config ?? sendLitConfig();
  const raw = await requestJson<any>(
    config,
    `/templates/${encodeURIComponent(templateId)}`,
    { method: "GET", teamApiKey },
    options.fetcher,
  );
  return normalizeSendLitTemplate(raw);
}

export async function updateSendLitTemplate(
  teamApiKey: string,
  templateId: string,
  input: {
    title?: string;
    name?: string;
    purpose?: "marketing" | "transactional";
    content?: SendLitTemplateContent;
  },
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitTemplate> {
  const config = options.config ?? sendLitConfig();
  const raw = await requestJson<any>(
    config,
    `/templates/${encodeURIComponent(templateId)}`,
    { method: "PATCH", teamApiKey, body: input },
    options.fetcher,
  );
  return normalizeSendLitTemplate(raw);
}

export async function duplicateSendLitTemplate(
  teamApiKey: string,
  templateId: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitTemplate> {
  const config = options.config ?? sendLitConfig();
  const raw = await requestJson<any>(
    config,
    `/templates/${encodeURIComponent(templateId)}/duplicate`,
    { method: "POST", teamApiKey },
    options.fetcher,
  );
  return normalizeSendLitTemplate(raw);
}

export async function deleteSendLitTemplate(
  teamApiKey: string,
  templateId: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<void> {
  const config = options.config ?? sendLitConfig();
  return requestJson<void>(
    config,
    `/templates/${encodeURIComponent(templateId)}`,
    { method: "DELETE", teamApiKey },
    options.fetcher,
  );
}

export async function listSendLitSystemTemplates(
  teamApiKey: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<{ items: SendLitSystemTemplate[] }> {
  const config = options.config ?? sendLitConfig();
  const raw = await requestJson<any>(
    config,
    "/system-templates",
    { method: "GET", teamApiKey },
    options.fetcher,
  );
  const rawList = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.data)
        ? raw.data
        : [];
  return { items: rawList.map(normalizeSendLitTemplate) };
}

// ---------------------------------------------------------------------------
// Sequences and Broadcasts operations (Team API key scoped)
// ---------------------------------------------------------------------------

export async function listSendLitSequences(
  teamApiKey: string,
  query: {
    type?: "broadcast" | "sequence";
    offset?: number;
    itemsPerPage?: number;
  } = {},
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<{ items: SendLitSequence[]; total: number }> {
  const config = options.config ?? sendLitConfig();
  const search = new URLSearchParams();
  if (query.type) search.set("type", query.type);
  if (query.offset !== undefined) search.set("offset", String(query.offset));
  if (query.itemsPerPage !== undefined) search.set("itemsPerPage", String(query.itemsPerPage));
  const qs = search.toString();
  const raw = await requestJson<any>(
    config,
    `/sequences${qs ? `?${qs}` : ""}`,
    { method: "GET", teamApiKey },
    options.fetcher,
  );
  const rawList: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.sequences)
        ? raw.sequences
        : Array.isArray(raw?.data)
          ? raw.data
          : [];
  const normalizedItems = rawList.map(normalizeSendLitSequence);
  const total = typeof raw?.total === "number" ? raw.total : normalizedItems.length;
  return { items: normalizedItems, total };
}

export async function createSendLitSequence(
  teamApiKey: string,
  input: {
    type: "broadcast" | "sequence";
    title?: string;
    templateId?: string;
    deliverySource?: unknown;
  },
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitSequence> {
  const config = options.config ?? sendLitConfig();
  const raw = await requestJson<any>(
    config,
    "/sequences",
    { method: "POST", teamApiKey, body: input },
    options.fetcher,
  );
  let created = normalizeSendLitSequence(raw);
  if (input.title && input.title.trim() && created.title !== input.title.trim()) {
    try {
      const patched = await updateSendLitSequence(
        teamApiKey,
        created.sequenceId,
        { title: input.title.trim() },
        options,
      );
      created = { ...created, ...patched, title: input.title.trim() };
    } catch {
      created.title = input.title.trim();
    }
  }
  return created;
}

export async function getSendLitSequence(
  teamApiKey: string,
  sequenceId: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitSequence> {
  const config = options.config ?? sendLitConfig();
  const raw = await requestJson<any>(
    config,
    `/sequences/${encodeURIComponent(sequenceId)}`,
    { method: "GET", teamApiKey },
    options.fetcher,
  );
  return normalizeSendLitSequence(raw);
}

export async function updateSendLitSequence(
  teamApiKey: string,
  sequenceId: string,
  input: {
    title?: string;
    triggerType?: string;
    triggerData?: string;
    filter?: unknown;
    excludeFilter?: unknown;
    emailsOrder?: string[];
  },
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitSequence> {
  const config = options.config ?? sendLitConfig();
  const raw = await requestJson<any>(
    config,
    `/sequences/${encodeURIComponent(sequenceId)}`,
    { method: "PATCH", teamApiKey, body: input },
    options.fetcher,
  );
  return normalizeSendLitSequence(raw);
}

export async function deleteSendLitSequence(
  teamApiKey: string,
  sequenceId: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<void> {
  const config = options.config ?? sendLitConfig();
  return requestJson<void>(
    config,
    `/sequences/${encodeURIComponent(sequenceId)}`,
    { method: "DELETE", teamApiKey },
    options.fetcher,
  );
}

export async function addSendLitSequenceEmail(
  teamApiKey: string,
  sequenceId: string,
  input: {
    subject: string;
    content?: unknown;
    delayInMillis?: number;
    delayHours?: number;
    templateId?: string;
  },
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitSequenceEmail> {
  const config = options.config ?? sendLitConfig();
  const delayInMillis =
    input.delayInMillis !== undefined
      ? input.delayInMillis
      : input.delayHours !== undefined
      ? input.delayHours * 3600 * 1000
      : 0;
  const body = {
    subject: input.subject,
    content: input.content ?? { html: "" },
    delayInMillis,
    ...(input.templateId ? { templateId: input.templateId } : {}),
  };
  const raw = await requestJson<any>(
    config,
    `/sequences/${encodeURIComponent(sequenceId)}/emails`,
    { method: "POST", teamApiKey, body },
    options.fetcher,
  );
  return normalizeSendLitSequenceEmail(raw);
}

export async function updateSendLitSequenceEmail(
  teamApiKey: string,
  sequenceId: string,
  emailId: string,
  input: {
    subject?: string;
    content?: unknown;
    delayInMillis?: number;
    published?: boolean;
  },
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitSequenceEmail> {
  const config = options.config ?? sendLitConfig();
  const raw = await requestJson<any>(
    config,
    `/sequences/${encodeURIComponent(sequenceId)}/emails/${encodeURIComponent(emailId)}`,
    { method: "PATCH", teamApiKey, body: input },
    options.fetcher,
  );
  return normalizeSendLitSequenceEmail(raw);
}

export async function deleteSendLitSequenceEmail(
  teamApiKey: string,
  sequenceId: string,
  emailId: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<void> {
  const config = options.config ?? sendLitConfig();
  return requestJson<void>(
    config,
    `/sequences/${encodeURIComponent(sequenceId)}/emails/${encodeURIComponent(emailId)}`,
    { method: "DELETE", teamApiKey },
    options.fetcher,
  );
}

export async function startSendLitSequence(
  teamApiKey: string,
  sequenceId: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitSequence> {
  const config = options.config ?? sendLitConfig();
  const raw = await requestJson<any>(
    config,
    `/sequences/${encodeURIComponent(sequenceId)}/start`,
    { method: "POST", teamApiKey },
    options.fetcher,
  );
  return normalizeSendLitSequence(raw);
}

export async function pauseSendLitSequence(
  teamApiKey: string,
  sequenceId: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitSequence> {
  const config = options.config ?? sendLitConfig();
  const raw = await requestJson<any>(
    config,
    `/sequences/${encodeURIComponent(sequenceId)}/pause`,
    { method: "POST", teamApiKey },
    options.fetcher,
  );
  return normalizeSendLitSequence(raw);
}

export async function getSendLitSequenceStats(
  teamApiKey: string,
  sequenceId: string,
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitSequenceStats> {
  const config = options.config ?? sendLitConfig();
  return requestJson<SendLitSequenceStats>(
    config,
    `/sequences/${encodeURIComponent(sequenceId)}/stats`,
    { method: "GET", teamApiKey },
    options.fetcher,
  );
}

// ---------------------------------------------------------------------------
// Overview / Metrics (Team API key scoped)
// ---------------------------------------------------------------------------

export async function getSendLitOverview(
  teamApiKey: string,
  query: { rangeDays?: number } = {},
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<SendLitOverview> {
  const config = options.config ?? sendLitConfig();
  const search = new URLSearchParams();
  if (query.rangeDays !== undefined) search.set("rangeDays", String(query.rangeDays));
  const qs = search.toString();
  return requestJson<SendLitOverview>(
    config,
    `/overview${qs ? `?${qs}` : ""}`,
    { method: "GET", teamApiKey },
    options.fetcher,
  );
}

// ---------------------------------------------------------------------------
// Transactional Emails (Team API key scoped)
// ---------------------------------------------------------------------------

export async function sendSendLitTransactionalEmail(
  teamApiKey: string,
  input: {
    to: string;
    templateId?: string;
    html?: string;
    variables?: Record<string, unknown>;
    replyTo?: string;
    subject?: string;
    headers?: Record<string, string>;
    idempotencyKey?: string;
  },
  options: { config?: SendLitConfig; fetcher?: FetchLike } = {},
): Promise<{ txeId: string; status?: string }> {
  const config = options.config ?? sendLitConfig();
  return requestJson<{ txeId: string; status?: string }>(
    config,
    "/emails",
    { method: "POST", teamApiKey, body: input },
    options.fetcher,
  );
}
