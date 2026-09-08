import { type Clock, createPlatformError, uuidv7 } from "@codelitdev/platform";
import { and, count, eq, gte } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

type RateLimitInput = {
  schoolId: string;
  userId: string;
  scope: string;
  action: string;
  subjectId: string;
  windowMs: number;
  limit: number;
  fingerprint?: string;
  record?: boolean;
};

export async function assertRateLimit(
  db: AppDb,
  input: RateLimitInput,
  clock: Clock,
): Promise<
  { ok: true } | { ok: false; error: ReturnType<typeof createPlatformError> }
> {
  const since = new Date(clock.now().getTime() - input.windowMs);
  const base = and(
    eq(schema.rateLimitEvents.schoolId, input.schoolId),
    eq(schema.rateLimitEvents.userId, input.userId),
    eq(schema.rateLimitEvents.scope, input.scope),
    eq(schema.rateLimitEvents.action, input.action),
    eq(schema.rateLimitEvents.subjectId, input.subjectId),
    gte(schema.rateLimitEvents.createdAt, since),
  );
  const existing = await db
    .select({ count: count() })
    .from(schema.rateLimitEvents)
    .where(base);
  if (Number(existing[0]?.count ?? 0) >= input.limit) {
    return { ok: false, error: createPlatformError("rate_limited") };
  }
  if (input.fingerprint) {
    const duplicate = await db
      .select({ id: schema.rateLimitEvents.id })
      .from(schema.rateLimitEvents)
      .where(and(base, eq(schema.rateLimitEvents.fingerprint, input.fingerprint)))
      .limit(1);
    if (duplicate[0]) {
      return { ok: false, error: createPlatformError("rate_limited") };
    }
  }
  if (input.record !== false) {
    await db.insert(schema.rateLimitEvents).values({
      id: uuidv7(clock),
      schoolId: input.schoolId,
      userId: input.userId,
      scope: input.scope,
      action: input.action,
      subjectId: input.subjectId,
      fingerprint: input.fingerprint ?? null,
      createdAt: clock.now(),
    });
  }
  return { ok: true };
}
