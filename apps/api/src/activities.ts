import { createHash } from "node:crypto";
import { type Clock, createPlatformError, uuidv7 } from "@codelitdev/platform";
import { and, eq, gte, lt, inArray } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { ActivityType, type ActivityType as ActivityTypeValue } from "./activity-types.js";
import { type AnalyticsRange, analyticsWindow } from "./analytics-range.js";
import { schoolRevenueEvents } from "./revenue.js";
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

export type ActivityRange = AnalyticsRange;

function growth(current: number, previous: number): number {
  if (previous === 0 && current > 0) return 100;
  if (previous === 0) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
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
    .select({ currency: schema.schools.currency, createdAt: schema.schools.createdAt })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  if (!schools[0]) return { ok: false, error: createPlatformError("not_found") };

  const { currentStart, previousStart, pointCount } = analyticsWindow(
    range,
    clock.now(),
    schools[0].createdAt,
  );
  const rows = await db
    .select({ type: schema.activities.type, metadata: schema.activities.metadata, createdAt: schema.activities.createdAt })
    .from(schema.activities)
    .where(
      and(
        eq(schema.activities.schoolId, schoolId),
        inArray(schema.activities.type, [
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
      .length;
    const previous = rows
      .filter((row) => row.type === type && row.createdAt >= previousStart && row.createdAt < currentStart)
      .length;
    return { count: current, growth: growth(current, previous) };
  };

  // Sales are money received, not purchase events: refunds drop out and a
  // payment in an earlier currency isn't added to this one.
  const currency = (schools[0].currency || "USD").toUpperCase();
  const revenue = await schoolRevenueEvents(db, { schoolId, currency, from: previousStart });
  const currentRevenue = revenue
    .filter((event) => event.date >= currentStart)
    .reduce((total, event) => total + event.value, 0);
  const previousRevenue = revenue
    .filter((event) => event.date < currentStart)
    .reduce((total, event) => total + event.value, 0);
  const sales = { count: currentRevenue, growth: growth(currentRevenue, previousRevenue) };
  const points = new Map<string, number>();
  for (let index = 0; index < pointCount; index += 1) {
    const date = new Date(currentStart);
    date.setUTCDate(date.getUTCDate() + index);
    points.set(date.toISOString().slice(0, 10), 0);
  }
  for (const event of revenue) {
    if (event.date < currentStart) continue;
    const key = event.date.toISOString().slice(0, 10);
    if (points.has(key)) points.set(key, (points.get(key) ?? 0) + event.value);
  }

  return {
    ok: true,
    value: {
      range,
      currency,
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

