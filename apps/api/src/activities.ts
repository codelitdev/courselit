import { createHash } from "node:crypto";
import { type Clock, createPlatformError, uuidv7 } from "@codelitdev/platform";
import { and, eq, gte, lt, inArray } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { ActivityType, type ActivityType as ActivityTypeValue } from "./activity-types.js";
import type { AppDb } from "./types.js";

export { ActivityType } from "./activity-types.js";
export type { ActivityType as ActivityTypeValue } from "./activity-types.js";

export type ActivityMetadata = Record<string, unknown>;

export type RecordActivityInput = {
  schoolId: string;
  actorId: string;
  type: ActivityTypeValue;
  entityId?: string | null;
  metadata?: ActivityMetadata;
};

const repeatableTypes = new Set<ActivityTypeValue>([
  ActivityType.NEWSLETTER_SUBSCRIBED,
  ActivityType.NEWSLETTER_UNSUBSCRIBED,
  ActivityType.COMMUNITY_MEMBERSHIP_REQUESTED,
  ActivityType.COMMUNITY_MEMBERSHIP_GRANTED,
  ActivityType.COMMUNITY_JOINED,
  ActivityType.COMMUNITY_LEFT,
]);

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function dedupeKey(input: RecordActivityInput, id: string): string {
  if (repeatableTypes.has(input.type)) return id;
  const payload = JSON.stringify(
    canonicalize({
      schoolId: input.schoolId,
      actorId: input.actorId,
      type: input.type,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {},
    }),
  );
  return createHash("sha256").update(payload).digest("hex");
}

/** Record an activity without coupling it to notifications or external jobs. */
export async function recordActivity(
  db: AppDb,
  input: RecordActivityInput,
  clock: Clock,
): Promise<void> {
  const now = clock.now();
  const id = uuidv7(clock);
  await db
    .insert(schema.activities)
    .values({
      id,
      schoolId: input.schoolId,
      actorId: input.actorId,
      type: input.type,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {},
      dedupeKey: dedupeKey(input, id),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: schema.activities.dedupeKey });
}

export type ActivityRange = "7d" | "30d" | "90d" | "1y";

function windowFor(range: ActivityRange, now: Date) {
  const currentEnd = new Date(now);
  currentEnd.setUTCHours(0, 0, 0, 0);
  if (range === "1y") {
    const currentStart = new Date(currentEnd);
    currentStart.setUTCFullYear(currentStart.getUTCFullYear() - 1);
    const previousStart = new Date(currentStart);
    previousStart.setUTCFullYear(previousStart.getUTCFullYear() - 1);
    return {
      currentStart,
      previousStart,
      pointCount: Math.floor((currentEnd.getTime() - currentStart.getTime()) / 86_400_000) + 1,
    };
  }
  const days = Number(range.slice(0, -1));
  const currentStart = new Date(currentEnd);
  currentStart.setUTCDate(currentStart.getUTCDate() - (days - 1));
  const previousStart = new Date(currentStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);
  return { currentStart, previousStart, pointCount: days };
}

function growth(current: number, previous: number): number {
  if (previous === 0 && current > 0) return 100;
  if (previous === 0) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function eventValue(row: { type: ActivityTypeValue; metadata: unknown }): number {
  if (row.type !== ActivityType.PURCHASED) return 1;
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as ActivityMetadata : {};
  const amount = metadata.amountMinor ?? metadata.cost;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
}

export async function getSchoolOverview(
  db: AppDb,
  schoolId: string,
  range: ActivityRange,
  clock: Clock,
): Promise<
  | { ok: true; value: SchoolOverview }
  | { ok: false; error: ReturnType<typeof createPlatformError> }
> {
  const schools = await db
    .select({ currency: schema.schools.currency })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  if (!schools[0]) return { ok: false, error: createPlatformError("not_found") };

  const { currentStart, previousStart, pointCount } = windowFor(range, clock.now());
  const rows = await db
    .select({ type: schema.activities.type, metadata: schema.activities.metadata, createdAt: schema.activities.createdAt })
    .from(schema.activities)
    .where(
      and(
        eq(schema.activities.schoolId, schoolId),
        inArray(schema.activities.type, [
          ActivityType.PURCHASED,
          ActivityType.ENROLLED,
          ActivityType.COMMUNITY_JOINED,
          ActivityType.NEWSLETTER_SUBSCRIBED,
        ]),
        gte(schema.activities.createdAt, previousStart),
        lt(schema.activities.createdAt, new Date(currentStart.getTime() + pointCount * 86_400_000)),
      ),
    );

  const metric = (type: ActivityTypeValue) => {
    const current = rows
      .filter((row) => row.type === type && row.createdAt >= currentStart)
      .reduce((total, row) => total + eventValue(row), 0);
    const previous = rows
      .filter((row) => row.type === type && row.createdAt >= previousStart && row.createdAt < currentStart)
      .reduce((total, row) => total + eventValue(row), 0);
    return { count: current, growth: growth(current, previous) };
  };

  const sales = metric(ActivityType.PURCHASED);
  const points = new Map<string, number>();
  for (let index = 0; index < pointCount; index += 1) {
    const date = new Date(currentStart);
    date.setUTCDate(date.getUTCDate() + index);
    points.set(date.toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    if (row.type !== ActivityType.PURCHASED || row.createdAt < currentStart) continue;
    const key = row.createdAt.toISOString().slice(0, 10);
    if (points.has(key)) points.set(key, (points.get(key) ?? 0) + eventValue(row));
  }

  return {
    ok: true,
    value: {
      range,
      currency: (schools[0].currency || "USD").toUpperCase(),
      sales: {
        amountMinor: sales.count,
        growth: sales.growth,
        points: [...points].map(([date, amountMinor]) => ({ date, amountMinor })),
      },
      customers: metric(ActivityType.ENROLLED),
      communityMembers: metric(ActivityType.COMMUNITY_JOINED),
      subscribers: metric(ActivityType.NEWSLETTER_SUBSCRIBED),
    },
  };
}

export type SchoolOverview = {
  range: ActivityRange;
  currency: string;
  sales: {
    amountMinor: number;
    growth: number;
    points: Array<{ date: string; amountMinor: number }>;
  };
  customers: { count: number; growth: number };
  communityMembers: { count: number; growth: number };
  subscribers: { count: number; growth: number };
};

