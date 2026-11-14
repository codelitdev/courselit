import { type Clock, createPlatformError, type PlatformError, uuidv7 } from "@codelitdev/platform";
import { and, count, eq, gt, gte } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

/**
 * Invite limits (docs/wip/plan-limits.md, S6). Team, product and community
 * invites all send platform mail in the school's name, so they share one
 * budget: 50 a day per school, and at most 200 team invitations waiting for
 * an answer. They are abuse limits, not plan limits, so they don't depend on
 * the plan; OSS installs send through their own mail and skip them.
 */
export const INVITE_LIMITS = { perDay: 50, maxPending: 200 } as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const SCOPE = "invite";

export type InviteKind = "team" | "product" | "community";

/**
 * Refuses an invite over the limits; null when it may go out. `newInvitation`
 * is set for a new team invitation, which also counts toward the pending cap
 * (a resend doesn't add one).
 */
export async function inviteLimitError(
  db: AppDb,
  schoolId: string,
  input: { newInvitation: boolean },
  now: Date,
): Promise<PlatformError | null> {
  const [sent] = await db
    .select({ count: count() })
    .from(schema.rateLimitEvents)
    .where(
      and(
        eq(schema.rateLimitEvents.schoolId, schoolId),
        eq(schema.rateLimitEvents.scope, SCOPE),
        gte(schema.rateLimitEvents.createdAt, new Date(now.getTime() - DAY_MS)),
      ),
    );
  if (Number(sent?.count ?? 0) >= INVITE_LIMITS.perDay) {
    return createPlatformError("rate_limited", {
      safeDetails: { reason: "invite_limit_reached" },
    });
  }
  if (input.newInvitation) {
    const [pending] = await db
      .select({ count: count() })
      .from(schema.invitations)
      .where(
        and(
          eq(schema.invitations.schoolId, schoolId),
          eq(schema.invitations.status, "pending"),
          gt(schema.invitations.expiresAt, now),
        ),
      );
    if (Number(pending?.count ?? 0) >= INVITE_LIMITS.maxPending) {
      return createPlatformError("conflict", {
        safeDetails: { reason: "too_many_pending_invites" },
      });
    }
  }
  return null;
}

/** Counts an invite that went out. */
export async function recordInvite(
  db: AppDb,
  input: { schoolId: string; userId: string; kind: InviteKind },
  clock: Clock,
): Promise<void> {
  await db.insert(schema.rateLimitEvents).values({
    id: uuidv7(clock),
    schoolId: input.schoolId,
    userId: input.userId,
    scope: SCOPE,
    action: input.kind,
    subjectId: input.schoolId,
    fingerprint: null,
    createdAt: clock.now(),
  });
}
