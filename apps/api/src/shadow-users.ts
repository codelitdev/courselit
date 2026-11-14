import { type Clock, uuidv7 } from "@codelitdev/platform";
import { eq, sql } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

/**
 * Shadow users own SSO-created school accounts, because
 * `school_accounts.user_id` must point at a platform `user`. They can never
 * sign in: no password, no `account` rows, an unreachable address, and
 * Better Auth refuses to start a session for anyone listed in
 * `sso_shadow_users`.
 */

export const SHADOW_USER_EMAIL_DOMAIN = "users.invalid";

/** Whether an address is in the reserved domain shadow users live under. */
export function isShadowUserEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${SHADOW_USER_EMAIL_DOMAIN}`);
}

export async function isShadowUser(db: AppDb, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: schema.ssoShadowUsers.userId })
    .from(schema.ssoShadowUsers)
    .where(eq(schema.ssoShadowUsers.userId, userId))
    .limit(1);
  return Boolean(row);
}

/**
 * Create a shadow user for one school. Call it inside the transaction that
 * also creates the school account, so a failed insert leaves no user behind.
 */
export async function createShadowUser(
  db: AppDb,
  input: { schoolId: string; name: string },
  clock: Clock,
): Promise<typeof schema.user.$inferSelect> {
  const now = clock.now();
  const id = uuidv7(clock);
  const [created] = await db
    .insert(schema.user)
    .values({
      id,
      name: input.name.trim().slice(0, 200) || "Learner",
      email: `sso-${uuidv7(clock)}@${SHADOW_USER_EMAIL_DOMAIN}`,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  await db.insert(schema.ssoShadowUsers).values({
    userId: id,
    schoolId: input.schoolId,
    createdAt: now,
  });
  return created!;
}

/**
 * Delete a shadow user once it owns no school account, so personal data isn't
 * left behind. A user that isn't a shadow user is never touched.
 */
export async function deleteShadowUserIfOrphaned(
  db: AppDb,
  userId: string,
): Promise<boolean> {
  const deleted = await db.execute(sql`
    DELETE FROM "user"
    WHERE id = ${userId}
      AND EXISTS (SELECT 1 FROM sso_shadow_users WHERE user_id = ${userId})
      AND NOT EXISTS (SELECT 1 FROM school_accounts WHERE user_id = ${userId})
    RETURNING id
  `);
  const rows = (deleted as { rows?: unknown[] }).rows ?? [];
  return rows.length > 0;
}

/**
 * A school account that an SSO identity is linked to, or that belongs to a
 * shadow user, matched by user or by email. Such accounts are the IdP's to
 * sign in as, so they can never be invited to, accept, or be granted a place
 * on the school's team. Unlinking the identity is the only way back.
 */
export async function findSsoBackedAccount(
  db: AppDb,
  input: { schoolId: string; userId?: string | null; email?: string | null },
): Promise<{ id: string } | null> {
  const matches = [];
  if (input.userId) matches.push(sql`sa.user_id = ${input.userId}`);
  if (input.email) matches.push(sql`sa.email = ${input.email.trim().toLowerCase()}`);
  if (matches.length === 0) return null;
  const found = await db.execute(sql`
    SELECT sa.id FROM school_accounts sa
    WHERE sa.school_id = ${input.schoolId}
      AND (${sql.join(matches, sql` OR `)})
      AND (
        EXISTS (SELECT 1 FROM school_sso_identities i WHERE i.school_account_id = sa.id)
        OR EXISTS (SELECT 1 FROM sso_shadow_users s WHERE s.user_id = sa.user_id)
      )
    LIMIT 1
  `);
  const rows = ((found as unknown) as { rows?: { id: string }[] }).rows ?? [];
  return rows[0] ?? null;
}
