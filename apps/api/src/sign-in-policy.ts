import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { emailDomainOf } from "./sso-email.js";
import type { AppDb } from "./types.js";

export type SignInMethod = "email" | "google" | "sso";
export type SignInPolicyDenial = "sso_required" | "sign_in_method_disabled";
export type SignInPolicyResult =
  | { allowed: true }
  | { allowed: false; reason: SignInPolicyDenial };

/** Whether the platform has Google keys at all. */
export function platformGoogleAvailable(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

type SchoolForPolicy = Pick<typeof schema.schools.$inferSelect, "id" | "loginMethods">;

/** The school's active SSO connection, if any. */
export async function activeSsoConnection(db: AppDb, schoolId: string) {
  const [connection] = await db
    .select()
    .from(schema.schoolSsoConnections)
    .where(
      and(
        eq(schema.schoolSsoConnections.schoolId, schoolId),
        eq(schema.schoolSsoConnections.status, "active"),
      ),
    )
    .limit(1);
  return connection ?? null;
}

/** Whether an email's domain is a verified domain of this connection. */
export async function isVerifiedSsoDomainEmail(
  db: AppDb,
  connectionId: string,
  email: string,
): Promise<boolean> {
  const domain = emailDomainOf(email);
  if (!domain) return false;
  const [row] = await db
    .select({ id: schema.schoolSsoDomains.id })
    .from(schema.schoolSsoDomains)
    .where(
      and(
        eq(schema.schoolSsoDomains.connectionId, connectionId),
        eq(schema.schoolSsoDomains.domain, domain),
        isNotNull(schema.schoolSsoDomains.verifiedAt),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/**
 * Whether a school may sign someone in, or keep them signed in, with a
 * method. This is the one policy check; the start endpoints call it early and
 * `issueSchoolSession` calls it again, so no path is missed.
 *
 * - A method is on when the school turned it on (`login_methods`), or, for
 *   SSO, exactly when it has an active connection.
 * - If every method the school has on is unusable (Google without platform
 *   keys, SSO not active), email codes are allowed so no learner is locked
 *   out by something the school didn't choose.
 * - When the active connection requires SSO for its verified domains, an
 *   address in one of them can only sign in with SSO. Pass `email` whenever
 *   it is known; Google's start endpoint can't know it yet.
 */
export async function sessionMethodAllowed(
  db: AppDb,
  input: {
    school: SchoolForPolicy;
    email?: string | null;
    method: SignInMethod;
    /** For `sso`: the connection the session belongs to. */
    ssoConnectionId?: string | null;
  },
): Promise<SignInPolicyResult> {
  const connection = await activeSsoConnection(db, input.school.id);
  if (input.method === "sso") {
    const ok =
      Boolean(connection) &&
      (!input.ssoConnectionId || connection!.id === input.ssoConnectionId);
    return ok ? { allowed: true } : { allowed: false, reason: "sign_in_method_disabled" };
  }
  if (
    connection &&
    connection.enforcement === "required_for_domains" &&
    input.email &&
    (await isVerifiedSsoDomainEmail(db, connection.id, input.email))
  ) {
    return { allowed: false, reason: "sso_required" };
  }
  const usable = new Set<SignInMethod>();
  for (const method of input.school.loginMethods) {
    if (method === "email") usable.add("email");
    if (method === "google" && platformGoogleAvailable()) usable.add("google");
  }
  if (connection) usable.add("sso");
  if (usable.size === 0) usable.add("email");
  return usable.has(input.method)
    ? { allowed: true }
    : { allowed: false, reason: "sign_in_method_disabled" };
}

/**
 * The methods a school's learners can use right now, as the storefront shows
 * them: what the policy would allow for an address with no enforcement.
 */
export async function usableSignInMethods(
  db: AppDb,
  school: SchoolForPolicy,
): Promise<SignInMethod[]> {
  const methods: SignInMethod[] = [];
  for (const method of ["email", "google", "sso"] as const) {
    const result = await sessionMethodAllowed(db, { school, method });
    if (result.allowed) methods.push(method);
  }
  return methods;
}

/** End every session a school's learners hold that was created with a method. */
export async function endSessionsForMethod(
  db: AppDb,
  schoolId: string,
  method: SignInMethod,
): Promise<number> {
  const deleted = await db
    .delete(schema.schoolSessions)
    .where(
      and(
        eq(schema.schoolSessions.schoolId, schoolId),
        eq(schema.schoolSessions.authenticationMethod, method),
      ),
    )
    .returning({ id: schema.schoolSessions.id });
  return deleted.length;
}

/**
 * Turning enforcement on: end the non-SSO sessions of accounts whose email is
 * in one of the connection's verified domains. Otherwise people removed from
 * the IdP would keep their access until their sessions expire.
 */
export async function endNonSsoSessionsForEnforcedDomains(
  db: AppDb,
  connectionId: string,
): Promise<number> {
  const [connection] = await db
    .select({ schoolId: schema.schoolSsoConnections.schoolId })
    .from(schema.schoolSsoConnections)
    .where(eq(schema.schoolSsoConnections.id, connectionId))
    .limit(1);
  if (!connection) return 0;
  const domainRows = await db
    .select({ domain: schema.schoolSsoDomains.domain })
    .from(schema.schoolSsoDomains)
    .where(
      and(
        eq(schema.schoolSsoDomains.connectionId, connectionId),
        isNotNull(schema.schoolSsoDomains.verifiedAt),
      ),
    );
  const domains = new Set(domainRows.map((row) => row.domain));
  if (domains.size === 0) return 0;
  const sessions = await db
    .select({
      id: schema.schoolSessions.id,
      email: schema.schoolAccounts.email,
    })
    .from(schema.schoolSessions)
    .innerJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.schoolSessions.schoolAccountId),
    )
    .where(
      and(
        eq(schema.schoolSessions.schoolId, connection.schoolId),
        ne(schema.schoolSessions.authenticationMethod, "sso"),
      ),
    );
  const ids = sessions
    .filter((row) => {
      const domain = emailDomainOf(row.email);
      return domain !== null && domains.has(domain);
    })
    .map((row) => row.id);
  if (ids.length === 0) return 0;
  const deleted = await db
    .delete(schema.schoolSessions)
    .where(inArray(schema.schoolSessions.id, ids))
    .returning({ id: schema.schoolSessions.id });
  return deleted.length;
}
