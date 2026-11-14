import { randomBytes } from "node:crypto";
import type { BillingEngine } from "@codelitdev/billing/workflows";
import {
  type Clock,
  createDnsResolver,
  createDomainVerification,
  createPlatformError,
  createPublicId,
  type DnsResolver,
  issueOwnershipToken,
  normalizeHostname,
  type PlatformError,
  uuidv7,
} from "@codelitdev/platform";
import type { z } from "zod";
import type {
  addSsoDomainBodySchema,
  createSsoConnectionBodySchema,
  ssoConnectionSchema,
  ssoConnectionTestResultSchema,
  ssoDomainSchema,
  startSsoConnectionTestBodySchema,
  updateSsoConnectionBodySchema,
} from "@courselit/api-contract";
import { and, asc, count, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { digestToken } from "./learners.js";
import { schoolHasFeature } from "./plan-features.js";
import { assertRateLimit } from "./rate-limit.js";
import { endNonSsoSessionsForEnforcedDomains } from "./sign-in-policy.js";
import {
  activationBlocker,
  connectionConfigDigest,
  type SsoConnectionRow,
  SSO_FEATURE,
  ssoConfigDigest,
  ssoServiceProviderUrls,
} from "./sso-config.js";
import { notifySsoOwner, recordSsoEvent } from "./sso-events.js";
import { normalizeCertificate } from "./sso-protocol/certificates.js";
import { isSafeIdpUrl, parseSamlIdpMetadata } from "./sso-protocol/index.js";
import type { AppDb } from "./types.js";

export const SSO_DOMAIN_LABEL = "_courselit-verification";
const MAX_CONNECTIONS_PER_SCHOOL = 10;
const MAX_DOMAINS_PER_CONNECTION = 20;
const TEST_REQUEST_TTL_MS = 10 * 60 * 1000;
const VERIFY_WINDOW_MS = 60 * 60 * 1000;
const VERIFY_LIMIT = 30;

type Billing = Pick<BillingEngine, "hasFeature">;
type Result<T> = { ok: true; value: T } | { ok: false; error: PlatformError };
export type SsoConnectionDto = z.infer<typeof ssoConnectionSchema>;
export type SsoDomainDto = z.infer<typeof ssoDomainSchema>;
export type SsoTestResultDto = z.infer<typeof ssoConnectionTestResultSchema>;

export type SsoAdminContext = {
  db: AppDb;
  clock: Clock;
  billing: Billing;
  publicApiUrl: string;
  /** The admin app's origin: the only place a test sign-in may return to. */
  webOrigin: string;
  /** Injectable DNS for tests; defaults to `SSO_DNS_SERVERS` or the system resolver. */
  dnsResolver?: DnsResolver;
  schoolId: string;
  /** The signed-in admin's school account. */
  actorSchoolAccountId: string;
};

const invalid = (reason: string): { ok: false; error: PlatformError } => ({
  ok: false,
  error: createPlatformError("validation_failed", { safeDetails: { reason } }),
});
const conflict = (reason: string): { ok: false; error: PlatformError } => ({
  ok: false,
  error: createPlatformError("conflict", { safeDetails: { reason } }),
});
const notFound = (): { ok: false; error: PlatformError } => ({
  ok: false,
  error: createPlatformError("not_found"),
});

/** `SSO_DNS_SERVERS` as a comma list of trusted recursive resolvers. */
export function ssoDnsResolver(env: NodeJS.ProcessEnv = process.env): DnsResolver {
  const servers = (env.SSO_DNS_SERVERS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return createDnsResolver(servers.length > 0 ? { servers } : {});
}

function domainVerification(resolver?: DnsResolver) {
  return createDomainVerification({
    label: SSO_DOMAIN_LABEL,
    ...(resolver ? { resolver } : {}),
  });
}

const iso = (value: Date | null) => (value ? value.toISOString() : null);

export function toDomainDto(row: typeof schema.schoolSsoDomains.$inferSelect): SsoDomainDto {
  return {
    domain: row.domain,
    verified: row.verifiedAt !== null,
    verifiedAt: iso(row.verifiedAt),
    verificationRecord: domainVerification().ownershipRecord(row.domain, row.verificationToken),
    consecutiveCheckFailures: row.consecutiveCheckFailures,
    lastCheckedAt: iso(row.lastCheckedAt),
  };
}

export async function toConnectionDto(
  ctx: SsoAdminContext,
  connection: SsoConnectionRow,
): Promise<SsoConnectionDto> {
  const domains = await ctx.db
    .select()
    .from(schema.schoolSsoDomains)
    .where(eq(schema.schoolSsoDomains.connectionId, connection.id))
    .orderBy(asc(schema.schoolSsoDomains.createdAt), asc(schema.schoolSsoDomains.domain));
  return {
    id: connection.publicId,
    protocol: connection.protocol,
    status: connection.status,
    displayName: connection.displayName,
    enforcement: connection.enforcement,
    maxSessionMinutes: connection.maxSessionMinutes,
    idpEntityId: connection.idpEntityId,
    idpSsoUrl: connection.idpSsoUrl,
    idpCertificates: connection.idpCertificates,
    subjectAttribute: connection.subjectAttribute,
    serviceProvider: ssoServiceProviderUrls(ctx.publicApiUrl, connection.publicId),
    domains: domains.map(toDomainDto),
    testedAt: iso(connection.testedAt),
    testedCurrentConfiguration:
      connection.testedAt !== null &&
      connection.testedConfigDigest === connectionConfigDigest(connection),
    planAvailable: await schoolHasFeature(ctx.billing, connection.schoolId, SSO_FEATURE),
    createdAt: connection.createdAt.toISOString(),
    updatedAt: connection.updatedAt.toISOString(),
  };
}

async function loadConnection(
  ctx: SsoAdminContext,
  publicId: string,
): Promise<SsoConnectionRow | null> {
  const [row] = await ctx.db
    .select()
    .from(schema.schoolSsoConnections)
    .where(
      and(
        eq(schema.schoolSsoConnections.publicId, publicId),
        eq(schema.schoolSsoConnections.schoolId, ctx.schoolId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Record the change and tell the owner. `what` is a short, secret-free summary. */
async function audit(
  ctx: SsoAdminContext,
  connection: { id: string | null; displayName: string },
  action: string,
  what: string,
  metadata: Record<string, unknown> = {},
) {
  const eventId = await recordSsoEvent(
    ctx.db,
    {
      schoolId: ctx.schoolId,
      connectionId: connection.id,
      actorSchoolAccountId: ctx.actorSchoolAccountId,
      action,
      metadata,
    },
    ctx.clock,
  );
  await notifySsoOwner(
    ctx.db,
    {
      schoolId: ctx.schoolId,
      subject: "Single sign-on settings changed",
      lines: [
        `${what} (${connection.displayName}).`,
        "If you didn't make this change, review your school's sign-in settings right away.",
      ],
      idempotencyKey: `sso-event:${eventId}`,
    },
    ctx.clock,
  );
}

type Settings = {
  idpEntityId?: string;
  idpSsoUrl?: string;
  idpCertificates?: string[];
};

/** Entity ID, SSO URL and certificates from pasted metadata and/or explicit fields. */
function resolveIdpSettings(input: {
  metadataXml?: string;
  idpEntityId?: string;
  idpSsoUrl?: string;
  idpCertificates?: string[];
}): { ok: true; value: Settings } | { ok: false; error: PlatformError } {
  const value: Settings = {};
  if (input.metadataXml !== undefined) {
    const parsed = parseSamlIdpMetadata(input.metadataXml);
    if (!parsed.ok) return invalid(`metadata_${parsed.reason}`);
    value.idpEntityId = parsed.entityId;
    value.idpSsoUrl = parsed.ssoUrl;
    value.idpCertificates = parsed.signingCertificates;
  }
  if (input.idpEntityId !== undefined) value.idpEntityId = input.idpEntityId;
  if (input.idpSsoUrl !== undefined) value.idpSsoUrl = input.idpSsoUrl;
  if (input.idpCertificates !== undefined) {
    const normalized: string[] = [];
    for (const raw of input.idpCertificates) {
      const bare = normalizeCertificate(raw);
      if (!bare) return invalid("invalid_certificate");
      if (!normalized.includes(bare)) normalized.push(bare);
    }
    value.idpCertificates = normalized;
  }
  if (value.idpSsoUrl !== undefined && !isSafeIdpUrl(value.idpSsoUrl)) {
    return invalid("unsafe_sso_url");
  }
  return { ok: true, value };
}

export async function listSsoConnections(
  ctx: SsoAdminContext,
): Promise<Result<{ items: SsoConnectionDto[] }>> {
  const rows = await ctx.db
    .select()
    .from(schema.schoolSsoConnections)
    .where(eq(schema.schoolSsoConnections.schoolId, ctx.schoolId))
    .orderBy(asc(schema.schoolSsoConnections.createdAt));
  return {
    ok: true,
    value: { items: await Promise.all(rows.map((row) => toConnectionDto(ctx, row))) },
  };
}

export async function getSsoConnection(
  ctx: SsoAdminContext,
  publicId: string,
): Promise<Result<SsoConnectionDto>> {
  const connection = await loadConnection(ctx, publicId);
  return connection ? { ok: true, value: await toConnectionDto(ctx, connection) } : notFound();
}

export async function createSsoConnection(
  ctx: SsoAdminContext,
  body: z.infer<typeof createSsoConnectionBodySchema>,
): Promise<Result<SsoConnectionDto>> {
  const settings = resolveIdpSettings(body);
  if (!settings.ok) return settings;
  if (!settings.value.idpEntityId) return invalid("idp_entity_id_required");
  const [existing] = await ctx.db
    .select({ n: count() })
    .from(schema.schoolSsoConnections)
    .where(eq(schema.schoolSsoConnections.schoolId, ctx.schoolId));
  if (Number(existing?.n ?? 0) >= MAX_CONNECTIONS_PER_SCHOOL) {
    return conflict("too_many_connections");
  }
  const now = ctx.clock.now();
  const [created] = await ctx.db
    .insert(schema.schoolSsoConnections)
    .values({
      id: uuidv7(ctx.clock),
      publicId: createPublicId("sso", ctx.clock),
      schoolId: ctx.schoolId,
      protocol: "saml",
      status: "draft",
      displayName: body.displayName,
      enforcement: body.enforcement ?? "optional",
      maxSessionMinutes: body.maxSessionMinutes ?? null,
      idpEntityId: settings.value.idpEntityId,
      idpSsoUrl: settings.value.idpSsoUrl ?? null,
      idpCertificates: settings.value.idpCertificates ?? [],
      subjectAttribute: body.subjectAttribute ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  await audit(ctx, created!, "connection.created", "A single sign-on connection was created");
  return { ok: true, value: await toConnectionDto(ctx, created!) };
}

export async function updateSsoConnection(
  ctx: SsoAdminContext,
  publicId: string,
  body: z.infer<typeof updateSsoConnectionBodySchema>,
): Promise<Result<SsoConnectionDto>> {
  const connection = await loadConnection(ctx, publicId);
  if (!connection) return notFound();
  const settings = resolveIdpSettings(body);
  if (!settings.ok) return settings;
  // Pointing at a different IdP means a new connection, which starts with no
  // identities, so identities can never be inherited by another IdP.
  if (
    settings.value.idpEntityId !== undefined &&
    settings.value.idpEntityId !== connection.idpEntityId
  ) {
    return invalid("idp_entity_id_immutable");
  }
  const next = {
    idpEntityId: connection.idpEntityId,
    idpSsoUrl: settings.value.idpSsoUrl ?? connection.idpSsoUrl,
    idpCertificates: settings.value.idpCertificates ?? connection.idpCertificates,
    subjectAttribute:
      body.subjectAttribute === undefined ? connection.subjectAttribute : body.subjectAttribute,
  };
  const trustChanged = ssoConfigDigest(next) !== connectionConfigDigest(connection);
  const enforcement = body.enforcement ?? connection.enforcement;
  const changed: string[] = [];
  if (body.displayName !== undefined && body.displayName !== connection.displayName) {
    changed.push("name");
  }
  if (next.idpSsoUrl !== connection.idpSsoUrl) changed.push("sign-in URL");
  if (
    ssoConfigDigest({ ...connection, idpCertificates: next.idpCertificates }) !==
    ssoConfigDigest(connection)
  ) {
    changed.push("certificates");
  }
  if (next.subjectAttribute !== connection.subjectAttribute) changed.push("subject attribute");
  if (enforcement !== connection.enforcement) changed.push("enforcement");
  if (
    body.maxSessionMinutes !== undefined &&
    body.maxSessionMinutes !== connection.maxSessionMinutes
  ) {
    changed.push("session length");
  }
  // What the connection trusts changing sends it back to draft: it has to be
  // tested again, and everyone signed in through it signs in again. A turned
  // off connection goes to draft too, because only a draft or active one can
  // be tested: left disabled, it could never be tested or turned back on.
  const backToDraft =
    trustChanged &&
    (connection.status === "active" ||
      connection.status === "suspended" ||
      connection.status === "disabled");
  const [updated] = await ctx.db
    .update(schema.schoolSsoConnections)
    .set({
      displayName: body.displayName ?? connection.displayName,
      enforcement,
      maxSessionMinutes:
        body.maxSessionMinutes === undefined ? connection.maxSessionMinutes : body.maxSessionMinutes,
      idpSsoUrl: next.idpSsoUrl,
      idpCertificates: next.idpCertificates,
      subjectAttribute: next.subjectAttribute,
      ...(trustChanged ? { testedAt: null, testedConfigDigest: null } : {}),
      ...(backToDraft ? { status: "draft" as const } : {}),
      updatedAt: ctx.clock.now(),
    })
    .where(eq(schema.schoolSsoConnections.id, connection.id))
    .returning();
  if (backToDraft) {
    await ctx.db
      .delete(schema.schoolSessions)
      .where(eq(schema.schoolSessions.ssoConnectionId, connection.id));
  }
  if (
    updated!.status === "active" &&
    enforcement === "required_for_domains" &&
    connection.enforcement !== "required_for_domains"
  ) {
    await endNonSsoSessionsForEnforcedDomains(ctx.db, connection.id);
  }
  if (changed.length > 0) {
    await audit(
      ctx,
      updated!,
      "connection.updated",
      `Changed ${changed.join(", ")}${backToDraft ? "; the connection went back to draft and must be tested again" : ""}`,
      { changed, backToDraft },
    );
  }
  return { ok: true, value: await toConnectionDto(ctx, updated!) };
}

export async function deleteSsoConnection(
  ctx: SsoAdminContext,
  publicId: string,
): Promise<Result<null>> {
  const connection = await loadConnection(ctx, publicId);
  if (!connection) return notFound();
  // Sessions, identities, domains and requests go with it (cascade).
  await ctx.db
    .delete(schema.schoolSsoConnections)
    .where(eq(schema.schoolSsoConnections.id, connection.id));
  // The connection row is gone, so the event can't point at it.
  await audit(ctx, { id: null, displayName: connection.displayName }, "connection.deleted", "The connection was deleted", {
    connection: connection.publicId,
  });
  return { ok: true, value: null };
}

export async function addSsoDomain(
  ctx: SsoAdminContext,
  publicId: string,
  body: z.infer<typeof addSsoDomainBodySchema>,
): Promise<Result<SsoDomainDto>> {
  const connection = await loadConnection(ctx, publicId);
  if (!connection) return notFound();
  const domain = normalizeHostname(body.domain.replace(/^@/, ""));
  if (!domain) return invalid("invalid_domain");
  const [existing] = await ctx.db
    .select({ n: count() })
    .from(schema.schoolSsoDomains)
    .where(eq(schema.schoolSsoDomains.connectionId, connection.id));
  if (Number(existing?.n ?? 0) >= MAX_DOMAINS_PER_CONNECTION) return conflict("too_many_domains");
  const [duplicate] = await ctx.db
    .select({ id: schema.schoolSsoDomains.id })
    .from(schema.schoolSsoDomains)
    .where(
      and(
        eq(schema.schoolSsoDomains.schoolId, ctx.schoolId),
        eq(schema.schoolSsoDomains.domain, domain),
      ),
    )
    .limit(1);
  if (duplicate) return conflict("domain_already_added");
  const [row] = await ctx.db
    .insert(schema.schoolSsoDomains)
    .values({
      id: uuidv7(ctx.clock),
      connectionId: connection.id,
      schoolId: ctx.schoolId,
      domain,
      // Random for each (school, domain) pair and never derived from another token.
      verificationToken: issueOwnershipToken(),
      createdAt: ctx.clock.now(),
    })
    .returning();
  await audit(ctx, connection, "domain.added", `The domain ${domain} was added`, { domain });
  return { ok: true, value: toDomainDto(row!) };
}

async function loadDomain(ctx: SsoAdminContext, connection: SsoConnectionRow, rawDomain: string) {
  const domain = normalizeHostname(rawDomain);
  if (!domain) return null;
  const [row] = await ctx.db
    .select()
    .from(schema.schoolSsoDomains)
    .where(
      and(
        eq(schema.schoolSsoDomains.connectionId, connection.id),
        eq(schema.schoolSsoDomains.domain, domain),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function verifySsoDomain(
  ctx: SsoAdminContext,
  publicId: string,
  rawDomain: string,
): Promise<Result<SsoDomainDto>> {
  const connection = await loadConnection(ctx, publicId);
  if (!connection) return notFound();
  const domain = await loadDomain(ctx, connection, rawDomain);
  if (!domain) return notFound();
  const limited = await assertRateLimit(
    ctx.db,
    {
      schoolId: ctx.schoolId,
      userId: "school",
      scope: "learner_sso",
      action: "verify_domain",
      subjectId: ctx.schoolId,
      windowMs: VERIFY_WINDOW_MS,
      limit: VERIFY_LIMIT,
    },
    ctx.clock,
  );
  if (!limited.ok) return limited;
  const proven = await domainVerification(ctx.dnsResolver ?? ssoDnsResolver()).verifyOwnership(
    domain.domain,
    domain.verificationToken,
  );
  const now = ctx.clock.now();
  const [updated] = await ctx.db
    .update(schema.schoolSsoDomains)
    .set(
      proven
        ? { verifiedAt: domain.verifiedAt ?? now, consecutiveCheckFailures: 0, lastCheckedAt: now }
        : { lastCheckedAt: now },
    )
    .where(eq(schema.schoolSsoDomains.id, domain.id))
    .returning();
  if (proven && !domain.verifiedAt) {
    await audit(ctx, connection, "domain.verified", `The domain ${domain.domain} was verified`, {
      domain: domain.domain,
    });
  }
  return { ok: true, value: toDomainDto(updated!) };
}

export async function deleteSsoDomain(
  ctx: SsoAdminContext,
  publicId: string,
  rawDomain: string,
): Promise<Result<null>> {
  const connection = await loadConnection(ctx, publicId);
  if (!connection) return notFound();
  const domain = await loadDomain(ctx, connection, rawDomain);
  if (!domain) return notFound();
  await ctx.db.delete(schema.schoolSsoDomains).where(eq(schema.schoolSsoDomains.id, domain.id));
  await audit(ctx, connection, "domain.removed", `The domain ${domain.domain} was removed`, {
    domain: domain.domain,
  });
  return { ok: true, value: null };
}

/** The admin origin plus a path, from a return URL the admin app sent. */
function adminReturn(webOrigin: string, returnUrl: string): { origin: string; path: string } | null {
  let target: URL;
  try {
    target = new URL(returnUrl);
  } catch {
    return null;
  }
  if (
    target.origin !== new URL(webOrigin).origin ||
    target.username ||
    target.password ||
    (target.protocol !== "https:" && target.protocol !== "http:")
  ) {
    return null;
  }
  return { origin: target.origin, path: `${target.pathname}${target.search}` };
}

export async function startSsoConnectionTest(
  ctx: SsoAdminContext,
  publicId: string,
  body: z.infer<typeof startSsoConnectionTestBodySchema>,
): Promise<Result<{ url: string }>> {
  const connection = await loadConnection(ctx, publicId);
  if (!connection) return notFound();
  if (connection.status !== "draft" && connection.status !== "active") {
    return conflict("connection_not_testable");
  }
  if (
    connection.protocol !== "saml" ||
    !connection.idpSsoUrl ||
    !isSafeIdpUrl(connection.idpSsoUrl) ||
    connection.idpCertificates.length === 0
  ) {
    return invalid("incomplete_configuration");
  }
  const target = adminReturn(ctx.webOrigin, body.returnUrl);
  if (!target) return invalid("return_url_not_allowed");
  const token = randomBytes(32).toString("base64url");
  const now = ctx.clock.now();
  await ctx.db.insert(schema.schoolSsoRequests).values({
    id: uuidv7(ctx.clock),
    requestDigest: digestToken(token),
    schoolId: ctx.schoolId,
    connectionId: connection.id,
    // A test needs no browser nonce; nothing ever redeems a ticket for it.
    nonceDigest: digestToken(randomBytes(32).toString("base64url")),
    returnOrigin: target.origin,
    nextPath: target.path.slice(0, 1000),
    purpose: "test",
    startedBySchoolAccountId: ctx.actorSchoolAccountId,
    expiresAt: new Date(now.getTime() + TEST_REQUEST_TTL_MS),
    createdAt: now,
  });
  await recordSsoEvent(
    ctx.db,
    {
      schoolId: ctx.schoolId,
      connectionId: connection.id,
      actorSchoolAccountId: ctx.actorSchoolAccountId,
      action: "test.started",
    },
    ctx.clock,
  );
  const url = new URL(
    `/learner-login/sso/${encodeURIComponent(connection.publicId)}/start`,
    ctx.publicApiUrl,
  );
  url.searchParams.set("request", token);
  return { ok: true, value: { url: url.toString() } };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What the IdP sent in a test sign-in, for the admin who started it, for 15 minutes. */
export async function getSsoConnectionTestResult(
  ctx: SsoAdminContext,
  publicId: string,
  requestId: string,
): Promise<Result<SsoTestResultDto>> {
  const connection = await loadConnection(ctx, publicId);
  if (!connection || !UUID.test(requestId)) return notFound();
  const [row] = await ctx.db
    .select()
    .from(schema.schoolSsoRequests)
    .where(
      and(
        eq(schema.schoolSsoRequests.id, requestId.toLowerCase()),
        eq(schema.schoolSsoRequests.connectionId, connection.id),
        eq(schema.schoolSsoRequests.purpose, "test"),
        eq(schema.schoolSsoRequests.startedBySchoolAccountId, ctx.actorSchoolAccountId),
      ),
    )
    .limit(1);
  const result = row?.testResult as Record<string, unknown> | null | undefined;
  if (
    !row ||
    !result ||
    !row.testResultExpiresAt ||
    row.testResultExpiresAt.getTime() <= ctx.clock.now().getTime()
  ) {
    return notFound();
  }
  const str = (value: unknown) => (typeof value === "string" ? value : null);
  return {
    ok: true,
    value: {
      ok: result.ok === true,
      reason: str(result.reason),
      issuer: str(result.issuer),
      subject: str(result.subject),
      email: str(result.email),
      name: str(result.name),
      emailDomainVerified:
        typeof result.emailDomainVerified === "boolean" ? result.emailDomainVerified : null,
      attributes: (result.attributes ?? {}) as Record<string, string[]>,
      expiresAt: row.testResultExpiresAt.toISOString(),
    },
  };
}

export async function activateSsoConnection(
  ctx: SsoAdminContext,
  publicId: string,
): Promise<Result<SsoConnectionDto>> {
  const connection = await loadConnection(ctx, publicId);
  if (!connection) return notFound();
  if (connection.status === "active") {
    return { ok: true, value: await toConnectionDto(ctx, connection) };
  }
  if (connection.status === "suspended") {
    // The system restores a suspended connection when the plan is back.
    return conflict("connection_suspended");
  }
  if (!(await schoolHasFeature(ctx.billing, ctx.schoolId, SSO_FEATURE))) {
    return {
      ok: false,
      error: createPlatformError("forbidden", { safeDetails: { reason: "plan_required" } }),
    };
  }
  const blocker = await activationBlocker(ctx.db, connection);
  if (blocker) return conflict(blocker);
  let activated: SsoConnectionRow | undefined;
  try {
    [activated] = await ctx.db
      .update(schema.schoolSsoConnections)
      .set({ status: "active", updatedAt: ctx.clock.now() })
      .where(eq(schema.schoolSsoConnections.id, connection.id))
      .returning();
  } catch {
    return conflict("another_connection_active");
  }
  if (activated!.enforcement === "required_for_domains") {
    await endNonSsoSessionsForEnforcedDomains(ctx.db, connection.id);
  }
  await audit(ctx, activated!, "connection.activated", "The connection was turned on");
  return { ok: true, value: await toConnectionDto(ctx, activated!) };
}

export async function disableSsoConnection(
  ctx: SsoAdminContext,
  publicId: string,
): Promise<Result<SsoConnectionDto>> {
  const connection = await loadConnection(ctx, publicId);
  if (!connection) return notFound();
  const [disabled] = await ctx.db
    .update(schema.schoolSsoConnections)
    .set({ status: "disabled", updatedAt: ctx.clock.now() })
    .where(eq(schema.schoolSsoConnections.id, connection.id))
    .returning();
  await ctx.db
    .delete(schema.schoolSessions)
    .where(eq(schema.schoolSessions.ssoConnectionId, connection.id));
  await audit(ctx, disabled!, "connection.disabled", "The connection was turned off and its sessions ended");
  return { ok: true, value: await toConnectionDto(ctx, disabled!) };
}

/** Remove a learner's SSO link and end their SSO sessions. */
export async function unlinkSsoIdentity(
  ctx: SsoAdminContext,
  schoolAccountPublicId: string,
): Promise<Result<null>> {
  const [account] = await ctx.db
    .select({ id: schema.schoolAccounts.id })
    .from(schema.schoolAccounts)
    .where(
      and(
        eq(schema.schoolAccounts.publicId, schoolAccountPublicId),
        eq(schema.schoolAccounts.schoolId, ctx.schoolId),
      ),
    )
    .limit(1);
  if (!account) return notFound();
  const removed = await ctx.db
    .delete(schema.schoolSsoIdentities)
    .where(
      and(
        eq(schema.schoolSsoIdentities.schoolAccountId, account.id),
        eq(schema.schoolSsoIdentities.schoolId, ctx.schoolId),
      ),
    )
    .returning({ connectionId: schema.schoolSsoIdentities.connectionId });
  if (removed.length === 0) return notFound();
  await ctx.db
    .delete(schema.schoolSessions)
    .where(
      and(
        eq(schema.schoolSessions.schoolAccountId, account.id),
        eq(schema.schoolSessions.authenticationMethod, "sso"),
      ),
    );
  const eventId = await recordSsoEvent(
    ctx.db,
    {
      schoolId: ctx.schoolId,
      connectionId: removed[0]!.connectionId,
      actorSchoolAccountId: ctx.actorSchoolAccountId,
      action: "identity.unlinked",
    },
    ctx.clock,
  );
  await notifySsoOwner(
    ctx.db,
    {
      schoolId: ctx.schoolId,
      subject: "Single sign-on settings changed",
      lines: ["A learner's single sign-on link was removed and their SSO sessions ended."],
      idempotencyKey: `sso-event:${eventId}`,
    },
    ctx.clock,
  );
  return { ok: true, value: null };
}
