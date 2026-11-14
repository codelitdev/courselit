import { randomBytes } from "node:crypto";
import type { BillingEngine } from "@codelitdev/billing/workflows";
import { type Clock, createPlatformError, type PlatformError, uuidv7 } from "@codelitdev/platform";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { digestToken } from "./learners.js";
import { createSchoolAuthTicket, originForHost, safeNextPath } from "./learner-sign-in.js";
import { linkSsoIdentity } from "./learner-sso.js";
import { schoolHasFeature } from "./plan-features.js";
import { assertRateLimit } from "./rate-limit.js";
import { resolveSchoolByHost } from "./schools.js";
import { activeSsoConnection, isVerifiedSsoDomainEmail } from "./sign-in-policy.js";
import {
  connectionConfigDigest,
  samlConfigFor,
  SSO_FEATURE,
  type SsoConnectionRow,
} from "./sso-config.js";
import { recordSsoEvent } from "./sso-events.js";
import {
  type AssertionReplayStore,
  createSamlServiceProvider,
  type SamlFailureReason,
  type SsoRequestStore,
} from "./sso-protocol/index.js";
import type { AppDb } from "./types.js";

const SSO_REQUEST_TTL_MS = 10 * 60 * 1000;
const TEST_RESULT_TTL_MS = 15 * 60 * 1000;
const MIN_NONCE_LENGTH = 32;
const START_WINDOW_MS = 10 * 60 * 1000;
const START_LIMIT = 30;

type Billing = Pick<BillingEngine, "hasFeature" | "commercialState">;
type Result<T> = { ok: true; value: T } | { ok: false; error: PlatformError };

export async function findSsoConnectionByPublicId(db: AppDb, publicId: string) {
  const [connection] = await db
    .select()
    .from(schema.schoolSsoConnections)
    .where(eq(schema.schoolSsoConnections.publicId, publicId))
    .limit(1);
  return connection ?? null;
}

/**
 * Begin single sign-on for a school website. The storefront calls this
 * server-to-server like Google: the host the learner is on, a random nonce it
 * has also put in a cookie there, and where to go afterwards. Nothing here
 * proves anything about the learner; the request row only holds digests.
 */
export async function startLearnerSsoSignIn(
  db: AppDb,
  input: {
    schoolPublicId: string;
    host: string;
    nonce: string;
    next?: string | null;
    publicApiUrl: string;
    billing: Billing;
    /** The client address the API resolved, for rate limiting. */
    clientIp?: string | null;
  },
  clock: Clock,
): Promise<Result<{ url: string }>> {
  if (input.nonce.length < MIN_NONCE_LENGTH) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const origin = originForHost(input.host);
  const school = origin ? await resolveSchoolByHost(db, input.host) : null;
  if (!origin || !school || school.publicId !== input.schoolPublicId) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }
  const limited = await assertRateLimit(
    db,
    {
      schoolId: school.id,
      userId: input.clientIp || "unknown",
      scope: "learner_sso",
      action: "start",
      subjectId: school.id,
      windowMs: START_WINDOW_MS,
      limit: START_LIMIT,
    },
    clock,
  );
  if (!limited.ok) return limited;
  const connection = await activeSsoConnection(db, school.id);
  if (
    connection?.protocol !== "saml" ||
    !(await schoolHasFeature(input.billing, school.id, SSO_FEATURE, db, clock.now()))
  ) {
    return {
      ok: false,
      error: createPlatformError("forbidden", {
        safeDetails: { reason: "sso_not_available" },
      }),
    };
  }
  const token = randomBytes(32).toString("base64url");
  const now = clock.now();
  await db.insert(schema.schoolSsoRequests).values({
    id: uuidv7(clock),
    requestDigest: digestToken(token),
    schoolId: school.id,
    connectionId: connection.id,
    nonceDigest: digestToken(input.nonce),
    returnOrigin: origin,
    nextPath: safeNextPath(input.next),
    purpose: "sign_in",
    expiresAt: new Date(now.getTime() + SSO_REQUEST_TTL_MS),
    createdAt: now,
  });
  const url = new URL(
    `/learner-login/sso/${encodeURIComponent(connection.publicId)}/start`,
    input.publicApiUrl,
  );
  url.searchParams.set("request", token);
  return { ok: true, value: { url: url.toString() } };
}

/** A connection the public routes will serve: draft or active. Anything else looks unknown. */
function routableConnection(connection: SsoConnectionRow | null): SsoConnectionRow | null {
  return connection &&
    connection.protocol === "saml" &&
    (connection.status === "draft" || connection.status === "active")
    ? connection
    : null;
}

/** SP metadata for the IdP admin, or null for a missing, disabled or suspended connection. */
export async function ssoServiceProviderMetadata(
  db: AppDb,
  connectionPublicId: string,
  publicApiUrl: string,
): Promise<string | null> {
  const connection = routableConnection(
    await findSsoConnectionByPublicId(db, connectionPublicId),
  );
  if (!connection) return null;
  return createSamlServiceProvider(samlConfigFor(connection, publicApiUrl)).serviceProviderMetadata();
}

export type SsoRouteOutcome = { kind: "unavailable" } | { kind: "redirect"; url: string };

/**
 * `GET /learner-login/sso/:conn/start?request=…`: find the open request, build
 * the AuthnRequest with RelayState = the request token, keep its ID on the
 * row, and return the IdP URL to send the browser to.
 */
export async function beginSsoRedirect(
  db: AppDb,
  input: { connectionPublicId: string; requestToken: string; publicApiUrl: string },
  clock: Clock,
): Promise<SsoRouteOutcome> {
  const connection = routableConnection(
    await findSsoConnectionByPublicId(db, input.connectionPublicId),
  );
  if (!connection || !input.requestToken) return { kind: "unavailable" };
  const [request] = await db
    .select()
    .from(schema.schoolSsoRequests)
    .where(
      and(
        eq(schema.schoolSsoRequests.requestDigest, digestToken(input.requestToken)),
        eq(schema.schoolSsoRequests.connectionId, connection.id),
        isNull(schema.schoolSsoRequests.consumedAt),
        gt(schema.schoolSsoRequests.expiresAt, clock.now()),
      ),
    )
    .limit(1);
  if (!request) return { kind: "unavailable" };
  // A sign-in needs an active connection; only a test may use a draft one.
  if (request.purpose === "sign_in" && connection.status !== "active") {
    return { kind: "unavailable" };
  }
  let built: { url: string; requestId: string };
  try {
    built = await createSamlServiceProvider(
      samlConfigFor(connection, input.publicApiUrl),
    ).buildAuthnRequestUrl({ relayState: input.requestToken });
  } catch {
    return { kind: "unavailable" };
  }
  const saved = await db
    .update(schema.schoolSsoRequests)
    .set({ protocolRequestId: built.requestId })
    .where(
      and(
        eq(schema.schoolSsoRequests.id, request.id),
        isNull(schema.schoolSsoRequests.consumedAt),
        isNull(schema.schoolSsoRequests.protocolRequestId),
      ),
    )
    .returning({ id: schema.schoolSsoRequests.id });
  // One AuthnRequest per request: opening the link a second time can't
  // replace the ID the first one is waiting on.
  if (!saved[0]) return { kind: "unavailable" };
  return { kind: "redirect", url: built.url };
}

function requestStore(
  db: AppDb,
  connectionId: string,
  clock: Clock,
  captured: { request: typeof schema.schoolSsoRequests.$inferSelect | null },
): SsoRequestStore {
  return {
    async findOpen(relayState) {
      const [row] = await db
        .select({ protocolRequestId: schema.schoolSsoRequests.protocolRequestId })
        .from(schema.schoolSsoRequests)
        .where(
          and(
            eq(schema.schoolSsoRequests.requestDigest, digestToken(relayState)),
            eq(schema.schoolSsoRequests.connectionId, connectionId),
            isNull(schema.schoolSsoRequests.consumedAt),
            gt(schema.schoolSsoRequests.expiresAt, clock.now()),
          ),
        )
        .limit(1);
      return row?.protocolRequestId ? { requestId: row.protocolRequestId } : null;
    },
    async consume(relayState, inResponseTo) {
      const [row] = await db
        .update(schema.schoolSsoRequests)
        .set({ consumedAt: clock.now() })
        .where(
          and(
            eq(schema.schoolSsoRequests.requestDigest, digestToken(relayState)),
            eq(schema.schoolSsoRequests.connectionId, connectionId),
            eq(schema.schoolSsoRequests.protocolRequestId, inResponseTo),
            isNull(schema.schoolSsoRequests.consumedAt),
            gt(schema.schoolSsoRequests.expiresAt, clock.now()),
          ),
        )
        .returning();
      if (row) captured.request = row;
      return Boolean(row);
    },
  };
}

function replayStore(db: AppDb, connectionId: string): AssertionReplayStore {
  return {
    async remember(assertionId, expiresAt) {
      const inserted = await db
        .insert(schema.schoolSsoAssertionIds)
        .values({ connectionId, assertionId, expiresAt })
        .onConflictDoNothing()
        .returning({ id: schema.schoolSsoAssertionIds.assertionId });
      return inserted.length > 0;
    },
  };
}

function failureUrl(
  request: Pick<typeof schema.schoolSsoRequests.$inferSelect, "id" | "purpose" | "returnOrigin" | "nextPath">,
): string {
  if (request.purpose === "test") {
    const url = new URL(request.nextPath, request.returnOrigin);
    url.searchParams.set("ssoTest", request.id);
    return url.toString();
  }
  const url = new URL("/login", request.returnOrigin);
  url.searchParams.set("error", "sso");
  if (request.nextPath !== "/dashboard") url.searchParams.set("next", request.nextPath);
  return url.toString();
}

/** The earliest of the IdP's session end and the connection's own limit. */
export function ssoSessionExpiry(
  connection: Pick<SsoConnectionRow, "maxSessionMinutes">,
  sessionNotOnOrAfter: Date | null,
  now: Date,
): Date | null {
  const limits: number[] = [];
  if (connection.maxSessionMinutes) {
    limits.push(now.getTime() + connection.maxSessionMinutes * 60_000);
  }
  if (sessionNotOnOrAfter) limits.push(sessionNotOnOrAfter.getTime());
  return limits.length > 0 ? new Date(Math.min(...limits)) : null;
}

/**
 * `POST /learner-login/sso/:conn/acs`. The module checks everything about the
 * response, in order, through the stores below: open request found (not used
 * up), connection still usable, signature, status, then the request is used
 * up with one conditional update and the assertion ID remembered. Only then
 * does anything happen here: a sign-in links the identity and hands out a
 * ticket; a test only stores what the IdP sent.
 */
export async function completeSsoResponse(
  db: AppDb,
  input: {
    connectionPublicId: string;
    samlResponse: unknown;
    relayState: unknown;
    publicApiUrl: string;
    billing: Billing;
  },
  clock: Clock,
): Promise<SsoRouteOutcome> {
  const loaded = await findSsoConnectionByPublicId(db, input.connectionPublicId);
  // Unknown, disabled and suspended connections all answer the same way.
  const connection = routableConnection(loaded);
  if (!connection || typeof input.relayState !== "string" || !input.relayState) {
    return { kind: "unavailable" };
  }
  const [known] = await db
    .select()
    .from(schema.schoolSsoRequests)
    .where(
      and(
        eq(schema.schoolSsoRequests.requestDigest, digestToken(input.relayState)),
        eq(schema.schoolSsoRequests.connectionId, connection.id),
      ),
    )
    .limit(1);
  if (!known) return { kind: "unavailable" };

  const loadedDigest = connectionConfigDigest(connection);
  const captured: { request: typeof schema.schoolSsoRequests.$inferSelect | null } = {
    request: null,
  };
  const failed = async (reason: string): Promise<SsoRouteOutcome> => {
    await recordSsoEvent(
      db,
      {
        schoolId: connection.schoolId,
        connectionId: connection.id,
        action: known.purpose === "test" ? "test.failed" : "sign_in.failed",
        reason,
      },
      clock,
    );
    if (known.purpose === "test") {
      await storeTestResult(db, known, { ok: false, reason }, clock);
    }
    return { kind: "redirect", url: failureUrl(known) };
  };

  const validation = await createSamlServiceProvider(
    samlConfigFor(connection, input.publicApiUrl),
  ).validatePostResponse({
    samlResponse: typeof input.samlResponse === "string" ? input.samlResponse : "",
    relayState: input.relayState,
    requests: requestStore(db, connection.id, clock, captured),
    replay: replayStore(db, connection.id),
    checkConnection: async () => {
      // The connection may have changed since the request started.
      const current = await findSsoConnectionByPublicId(db, input.connectionPublicId);
      if (!current || connectionConfigDigest(current) !== loadedDigest) return false;
      if (known.purpose === "sign_in") {
        return (
          current.status === "active" &&
          (await schoolHasFeature(input.billing, current.schoolId, SSO_FEATURE, db))
        );
      }
      return current.status === "draft" || current.status === "active";
    },
  });
  if (!validation.ok) return failed(validation.reason satisfies SamlFailureReason);
  const request = captured.request;
  if (!request) return failed("request_not_found");
  const assertion = validation.assertion;

  if (request.purpose === "test") {
    const parsedDomain = assertion.email
      ? await isVerifiedSsoDomainEmail(db, connection.id, assertion.email)
      : false;
    await storeTestResult(
      db,
      request,
      {
        ok: true,
        issuer: assertion.issuer,
        subject: assertion.subject,
        email: assertion.email,
        name: assertion.name,
        emailDomainVerified: parsedDomain,
        attributes: assertion.attributes,
      },
      clock,
    );
    // The digest of the settings this test ran against: activation needs it
    // to still match.
    await db
      .update(schema.schoolSsoConnections)
      .set({ testedAt: clock.now(), testedConfigDigest: loadedDigest })
      .where(eq(schema.schoolSsoConnections.id, connection.id));
    await recordSsoEvent(
      db,
      { schoolId: connection.schoolId, connectionId: connection.id, action: "test.succeeded" },
      clock,
    );
    // The browser carries only the request id, never the attributes.
    return { kind: "redirect", url: failureUrl(request) };
  }

  if (!assertion.email) return failed("sso_invalid_email");
  const linked = await linkSsoIdentity(
    db,
    {
      connection,
      issuer: assertion.issuer,
      subject: assertion.subject,
      email: assertion.email,
      name: assertion.name,
    },
    clock,
  );
  if (!linked.ok) return failed(linked.reason);
  const ticket = await createSchoolAuthTicket(db, {
    schoolId: connection.schoolId,
    schoolAccountId: linked.value.id,
    userId: linked.value.userId,
    authenticationMethod: "sso",
    ssoConnectionId: connection.id,
    sessionExpiresAt: ssoSessionExpiry(connection, assertion.sessionNotOnOrAfter, clock.now()),
    nonceDigest: request.nonceDigest,
    clock,
  });
  const url = new URL("/auth/complete", request.returnOrigin);
  url.searchParams.set("next", request.nextPath);
  url.hash = new URLSearchParams({ ticket }).toString();
  return { kind: "redirect", url: url.toString() };
}

async function storeTestResult(
  db: AppDb,
  request: Pick<typeof schema.schoolSsoRequests.$inferSelect, "id">,
  result: Record<string, unknown>,
  clock: Clock,
): Promise<void> {
  const now = clock.now();
  await db
    .update(schema.schoolSsoRequests)
    .set({
      testResult: result,
      testResultExpiresAt: new Date(now.getTime() + TEST_RESULT_TTL_MS),
    })
    .where(eq(schema.schoolSsoRequests.id, request.id));
}

/** Delete expired requests, test results and replay-cache rows. */
export async function cleanupSsoRequests(
  db: AppDb,
  clock: Clock,
): Promise<{ requests: number; assertionIds: number }> {
  const now = clock.now();
  const requests = await db
    .delete(schema.schoolSsoRequests)
    .where(
      and(
        lt(schema.schoolSsoRequests.expiresAt, now),
        sql`(${schema.schoolSsoRequests.testResultExpiresAt} is null or ${schema.schoolSsoRequests.testResultExpiresAt} < ${now.toISOString()}::timestamptz)`,
      ),
    )
    .returning({ id: schema.schoolSsoRequests.id });
  const ids = await db
    .delete(schema.schoolSsoAssertionIds)
    .where(lt(schema.schoolSsoAssertionIds.expiresAt, now))
    .returning({ id: schema.schoolSsoAssertionIds.assertionId });
  return { requests: requests.length, assertionIds: ids.length };
}
