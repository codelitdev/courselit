import { type Clock, uuidv7 } from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { queueSchoolEmail, renderSchoolEmail } from "./school-emails.js";
import { adminSiteUrl } from "./school-emails.js";
import type { AppDb } from "./types.js";

/** One row in the SSO audit log. Reason codes only; never assertion contents. */
export async function recordSsoEvent(
  db: AppDb,
  input: {
    schoolId: string;
    connectionId?: string | null;
    actorSchoolAccountId?: string | null;
    action: string;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  },
  clock: Clock,
): Promise<string> {
  const id = uuidv7(clock);
  await db.insert(schema.schoolSsoEvents).values({
    id,
    schoolId: input.schoolId,
    connectionId: input.connectionId ?? null,
    actorSchoolAccountId: input.actorSchoolAccountId ?? null,
    action: input.action,
    reason: input.reason ?? null,
    metadata: input.metadata ?? {},
    createdAt: clock.now(),
  });
  return id;
}

/** The email address of the school's owner, or null. */
export async function schoolOwnerEmail(db: AppDb, schoolId: string): Promise<string | null> {
  const [owner] = await db
    .select({ email: schema.schoolAccounts.email })
    .from(schema.memberships)
    .innerJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
    )
    .where(and(eq(schema.memberships.schoolId, schoolId), eq(schema.memberships.isOwner, true)))
    .limit(1);
  return owner?.email ?? null;
}

/**
 * Tell the school's owner what changed about its SSO setup, through the same
 * school email path as other owner notifications.
 */
export async function notifySsoOwner(
  db: AppDb,
  input: {
    schoolId: string;
    subject: string;
    lines: string[];
    idempotencyKey: string;
  },
  clock: Clock,
): Promise<void> {
  const [school] = await db
    .select({ name: schema.schools.name })
    .from(schema.schools)
    .where(eq(schema.schools.id, input.schoolId))
    .limit(1);
  const to = await schoolOwnerEmail(db, input.schoolId);
  if (!school || !to) return;
  const rendered = renderSchoolEmail({
    schoolName: school.name,
    paragraphs: input.lines,
    footer: {
      text: "You're receiving this because you own this school.",
      link: { label: "Review sign-in settings", url: `${adminSiteUrl()}/settings/login-providers` },
    },
  });
  await queueSchoolEmail(
    db,
    input.schoolId,
    { to, subject: input.subject, ...rendered, idempotencyKey: input.idempotencyKey },
    clock,
  );
}
