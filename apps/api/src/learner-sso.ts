import { type Clock, createPublicId, uuidv7 } from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import { ActivityType, recordActivity } from "./activities.js";
import { setContactMarketingSubscription } from "./contacts.js";
import * as schema from "./db/schema/index.js";
import { enqueueLearnerContactSync } from "./learners.js";
import { CONTACT_PUBLIC_ID_PREFIX } from "./public-id-prefixes.js";
import { createShadowUser } from "./shadow-users.js";
import { isVerifiedSsoDomainEmail } from "./sign-in-policy.js";
import { parseSsoEmail } from "./sso-email.js";
import type { AppDb } from "./types.js";

// Linking an identity an IdP vouched for to a school account. An IdP proves
// nothing about an email address, so everything here stays inside the one
// school that owns the connection: it never creates, verifies or changes a
// platform user by email, and never calls `ensureSchoolAccount` (which would
// move an existing account onto whichever user it is called with).

export type SsoLinkFailureReason =
  | "sso_invalid_email"
  | "sso_invalid_subject"
  | "sso_connection_inactive"
  | "sso_issuer_mismatch"
  | "sso_domain_not_verified"
  | "sso_account_is_team_member"
  | "sso_account_inactive"
  | "sso_identity_conflict";

type SchoolAccount = typeof schema.schoolAccounts.$inferSelect;
type SsoConnection = typeof schema.schoolSsoConnections.$inferSelect;

export type LinkSsoIdentityResult =
  | { ok: true; value: SchoolAccount; created: boolean }
  | { ok: false; reason: SsoLinkFailureReason };

const fail = (reason: SsoLinkFailureReason): { ok: false; reason: SsoLinkFailureReason } => ({
  ok: false,
  reason,
});

class RetryLink extends Error {}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth += 1) {
    if ((current as { code?: string }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

async function accountIsTeamMember(
  db: AppDb,
  schoolId: string,
  schoolAccountId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.memberships.id })
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.schoolId, schoolId),
        eq(schema.memberships.schoolAccountId, schoolAccountId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

function displayNameFor(name: string | null | undefined, local: string): string {
  return (name?.trim() || local).slice(0, 200);
}

/**
 * Sign an already-validated IdP assertion into a school account:
 * `{ connection, issuer, subject, email, name }`. See the plan's Phase 2.
 */
export async function linkSsoIdentity(
  db: AppDb,
  input: {
    connection: Pick<SsoConnection, "id" | "schoolId">;
    issuer: string;
    subject: string;
    email: string;
    name?: string | null;
  },
  clock: Clock,
): Promise<LinkSsoIdentityResult> {
  // 0. Strict email.
  const parsed = parseSsoEmail(input.email);
  if (!parsed) return fail("sso_invalid_email");
  if (
    typeof input.subject !== "string" ||
    input.subject.length === 0 ||
    input.subject.length > 512 ||
    typeof input.issuer !== "string" ||
    input.issuer.length === 0
  ) {
    return fail("sso_invalid_subject");
  }
  const [connection] = await db
    .select()
    .from(schema.schoolSsoConnections)
    .where(eq(schema.schoolSsoConnections.id, input.connection.id))
    .limit(1);
  if (
    !connection ||
    connection.schoolId !== input.connection.schoolId ||
    connection.status !== "active"
  ) {
    return fail("sso_connection_inactive");
  }
  const connectionIssuer = connection.idpEntityId ?? connection.oidcIssuer;
  if (!connectionIssuer || connectionIssuer !== input.issuer) {
    return fail("sso_issuer_mismatch");
  }

  let result: LinkSsoIdentityResult | null = null;
  for (let attempt = 0; attempt < 3 && !result; attempt += 1) {
    try {
      result = await linkOnce(db, connection, input, parsed, clock);
    } catch (error) {
      // A concurrent sign-in created the same identity or account first;
      // look everything up again rather than trusting stale reads.
      if (error instanceof RetryLink || isUniqueViolation(error)) continue;
      throw error;
    }
  }
  if (!result) return fail("sso_identity_conflict");
  if (!result.ok) return result;

  await afterSignIn(db, connection, result.value, result.created, clock);
  return result;
}

async function linkOnce(
  db: AppDb,
  connection: SsoConnection,
  input: { issuer: string; subject: string; name?: string | null },
  parsed: { email: string; local: string },
  clock: Clock,
): Promise<LinkSsoIdentityResult> {
  const schoolId = connection.schoolId;
  const now = clock.now();

  // 1. An identity already linked for this subject wins over anything by email.
  const [identity] = await db
    .select()
    .from(schema.schoolSsoIdentities)
    .where(
      and(
        eq(schema.schoolSsoIdentities.connectionId, connection.id),
        eq(schema.schoolSsoIdentities.subject, input.subject),
      ),
    )
    .limit(1);
  if (identity) {
    if (identity.issuer !== input.issuer) return fail("sso_issuer_mismatch");
    const [account] = await db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.id, identity.schoolAccountId),
          eq(schema.schoolAccounts.schoolId, schoolId),
        ),
      )
      .limit(1);
    if (!account) return fail("sso_account_inactive");
    if (account.status !== "active") return fail("sso_account_inactive");
    if (await accountIsTeamMember(db, schoolId, account.id)) {
      return fail("sso_account_is_team_member");
    }
    return db.transaction(async (transaction) => {
      const tx = transaction as unknown as AppDb;
      let current = account;
      if (account.email !== parsed.email) {
        const [shadow] = await tx
          .select({ userId: schema.ssoShadowUsers.userId })
          .from(schema.ssoShadowUsers)
          .where(eq(schema.ssoShadowUsers.userId, account.userId))
          .limit(1);
        const [taken] = await tx
          .select({ id: schema.schoolAccounts.id })
          .from(schema.schoolAccounts)
          .where(
            and(
              eq(schema.schoolAccounts.schoolId, schoolId),
              eq(schema.schoolAccounts.email, parsed.email),
            ),
          )
          .limit(1);
        // Emails change at the IdP, so a change is followed only for accounts
        // that exist because of SSO, in a verified domain, and never onto
        // an address another account in the school already has.
        if (
          shadow &&
          !taken &&
          (await isVerifiedSsoDomainEmail(tx, connection.id, parsed.email))
        ) {
          const [updated] = await tx
            .update(schema.schoolAccounts)
            .set({
              email: parsed.email,
              displayName: displayNameFor(input.name, parsed.local),
              updatedAt: now,
            })
            .where(eq(schema.schoolAccounts.id, account.id))
            .returning();
          current = updated!;
        }
      }
      await tx
        .update(schema.schoolSsoIdentities)
        .set({ lastEmail: parsed.email, lastSignedInAt: now })
        .where(eq(schema.schoolSsoIdentities.id, identity.id));
      return { ok: true as const, value: current, created: false };
    });
  }

  // 2. A new identity needs an email in a domain the school proved it owns.
  if (!(await isVerifiedSsoDomainEmail(db, connection.id, parsed.email))) {
    return fail("sso_domain_not_verified");
  }

  // 3. Link to the school's account for that email, or create one.
  const [existing] = await db
    .select()
    .from(schema.schoolAccounts)
    .where(
      and(
        eq(schema.schoolAccounts.schoolId, schoolId),
        eq(schema.schoolAccounts.email, parsed.email),
      ),
    )
    .limit(1);
  if (existing) return linkExisting(db, connection, existing, input, parsed.email, clock);

  const attempt = await db.transaction(async (transaction) => {
    const tx = transaction as unknown as AppDb;
    const shadow = await createShadowUser(
      tx,
      { schoolId, name: displayNameFor(input.name, parsed.local) },
      clock,
    );
    const [account] = await tx
      .insert(schema.schoolAccounts)
      .values({
        id: uuidv7(clock),
        publicId: createPublicId(CONTACT_PUBLIC_ID_PREFIX, clock),
        schoolId,
        userId: shadow.id,
        email: parsed.email,
        displayName: displayNameFor(input.name, parsed.local),
        status: "active",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [schema.schoolAccounts.schoolId, schema.schoolAccounts.email],
      })
      .returning();
    if (!account) {
      // Someone else created the account between our lookup and insert.
      // Roll the shadow user back and link to theirs, untouched.
      throw new RetryLink();
    }
    await tx.insert(schema.schoolSsoIdentities).values({
      id: uuidv7(clock),
      schoolId,
      connectionId: connection.id,
      issuer: input.issuer,
      subject: input.subject,
      schoolAccountId: account.id,
      lastEmail: parsed.email,
      lastSignedInAt: now,
      createdAt: now,
    });
    return account;
  });
  return { ok: true, value: attempt, created: true };
}

async function linkExisting(
  db: AppDb,
  connection: SsoConnection,
  account: SchoolAccount,
  input: { issuer: string; subject: string },
  email: string,
  clock: Clock,
): Promise<LinkSsoIdentityResult> {
  if (account.status !== "active") return fail("sso_account_inactive");
  // 4. Team members sign in to the website with email or Google, never SSO.
  if (await accountIsTeamMember(db, connection.schoolId, account.id)) {
    return fail("sso_account_is_team_member");
  }
  const now = clock.now();
  const [already] = await db
    .select({ id: schema.schoolSsoIdentities.id })
    .from(schema.schoolSsoIdentities)
    .where(
      and(
        eq(schema.schoolSsoIdentities.connectionId, connection.id),
        eq(schema.schoolSsoIdentities.schoolAccountId, account.id),
      ),
    )
    .limit(1);
  // The account is already linked to a different person at the IdP.
  if (already) return fail("sso_identity_conflict");
  // The account's user row is never touched.
  await db.insert(schema.schoolSsoIdentities).values({
    id: uuidv7(clock),
    schoolId: connection.schoolId,
    connectionId: connection.id,
    issuer: input.issuer,
    subject: input.subject,
    schoolAccountId: account.id,
    lastEmail: email,
    lastSignedInAt: now,
    createdAt: now,
  });
  return { ok: true, value: account, created: false };
}

async function afterSignIn(
  db: AppDb,
  connection: SsoConnection,
  account: SchoolAccount,
  created: boolean,
  clock: Clock,
): Promise<void> {
  const now = clock.now();
  try {
    if (created) {
      await recordActivity(
        db,
        {
          schoolId: connection.schoolId,
          actorId: account.publicId,
          type: ActivityType.USER_CREATED,
          entityId: account.publicId,
          metadata: { email: account.email },
        },
        clock,
      );
    }
    await recordActivity(
      db,
      {
        schoolId: connection.schoolId,
        actorId: account.publicId,
        type: ActivityType.LEARNER_SIGNED_IN,
        entityId: account.publicId,
        metadata: { method: "sso", at: now.toISOString() },
      },
      clock,
    );
  } catch (error) {
    console.error("[recordActivity failed on sso sign-in]", error);
  }
  await db
    .update(schema.schoolAccounts)
    .set({
      lastActiveAt: now,
      updatedAt: now,
      ...(account.learnerRegisteredAt ? {} : { learnerRegisteredAt: now }),
    })
    .where(eq(schema.schoolAccounts.id, account.id));
  if (created) {
    // A fake IdP must not add mailing-list contacts the school has no consent for.
    await setContactMarketingSubscription(db, {
      schoolId: connection.schoolId,
      account,
      subscribed: false,
      reason: "sso_created",
      clock,
    });
  } else {
    await enqueueLearnerContactSync(
      db,
      connection.schoolId,
      { email: account.email, name: account.displayName, id: account.id },
      clock,
      { reason: "learner_login" },
    );
  }
}
