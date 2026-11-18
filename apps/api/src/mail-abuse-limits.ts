import { type Clock, createPlatformError, type PlatformError, uuidv7 } from "@codelitdev/platform";
import { and, count, eq, gte, type SQL } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

/**
 * Mail anyone can trigger at an arbitrary address, which goes out under
 * CourseLit's reputation (docs/wip/plan-limits.md, S14 and S28).
 */
export type TriggeredMailKind = "sign_in_code" | "lead_magnet";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type Window = { limit: number; windowMs: number };

/** The limits, from the plan's rate-limit table. */
export const TRIGGERED_MAIL_LIMITS: Record<
  TriggeredMailKind,
  { addressPerSchool: Window; school: Window; ip: Window; addressPlatform: Window }
> = {
  sign_in_code: {
    addressPerSchool: { limit: 5, windowMs: HOUR },
    school: { limit: 50, windowMs: HOUR },
    ip: { limit: 20, windowMs: HOUR },
    addressPlatform: { limit: 10, windowMs: HOUR },
  },
  lead_magnet: {
    addressPerSchool: { limit: 3, windowMs: DAY },
    school: { limit: 100, windowMs: DAY },
    ip: { limit: 20, windowMs: HOUR },
    addressPlatform: { limit: 10, windowMs: DAY },
  },
};

const SCOPE = "triggered_mail";

async function recent(db: AppDb, where: SQL | undefined): Promise<number> {
  const [row] = await db.select({ count: count() }).from(schema.rateLimitEvents).where(where);
  return Number(row?.count ?? 0);
}

/**
 * Checks every limit for one more email of `kind` to `email` and, when all
 * pass, records it. The address and IP limits count across every school, so
 * one address can't be flooded from many schools.
 */
export async function assertTriggeredMailAllowed(
  db: AppDb,
  input: { schoolId: string; kind: TriggeredMailKind; email: string; clientIp: string | null },
  clock: Clock,
): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  const limits = TRIGGERED_MAIL_LIMITS[input.kind];
  const now = clock.now().getTime();
  const since = (window: Window) => new Date(now - window.windowMs);
  const base = (window: Window) =>
    and(
      eq(schema.rateLimitEvents.scope, SCOPE),
      eq(schema.rateLimitEvents.action, input.kind),
      gte(schema.rateLimitEvents.createdAt, since(window)),
    );
  const email = input.email.trim().toLowerCase();
  const checks: Array<[Window, SQL | undefined]> = [
    [
      limits.addressPerSchool,
      and(
        base(limits.addressPerSchool),
        eq(schema.rateLimitEvents.schoolId, input.schoolId),
        eq(schema.rateLimitEvents.subjectId, email),
      ),
    ],
    [limits.school, and(base(limits.school), eq(schema.rateLimitEvents.schoolId, input.schoolId))],
    [limits.addressPlatform, and(base(limits.addressPlatform), eq(schema.rateLimitEvents.subjectId, email))],
  ];
  if (input.clientIp) {
    checks.push([limits.ip, and(base(limits.ip), eq(schema.rateLimitEvents.userId, input.clientIp))]);
  }
  for (const [window, where] of checks) {
    if ((await recent(db, where)) >= window.limit) {
      return { ok: false, error: createPlatformError("rate_limited") };
    }
  }
  await db.insert(schema.rateLimitEvents).values({
    id: uuidv7(clock),
    schoolId: input.schoolId,
    userId: input.clientIp ?? "unknown",
    scope: SCOPE,
    action: input.kind,
    subjectId: email,
    fingerprint: null,
    createdAt: clock.now(),
  });
  return { ok: true };
}
