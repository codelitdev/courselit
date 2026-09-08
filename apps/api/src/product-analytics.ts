import { and, eq, gte, isNotNull, lt } from "drizzle-orm";
import { createPlatformError, type Clock, type PlatformError } from "@codelitdev/platform";
import * as schema from "./db/schema/index.js";
import type { CourseLitPermission } from "./permissions.js";
import type { AppDb } from "./types.js";

export type AnalyticsRange = "7d" | "30d" | "90d" | "1y";

type Context = {
  tenantId?: string | null;
  permissions: ReadonlySet<CourseLitPermission>;
};

type Event = { date: Date; value: number };
const DAY_MS = 86_400_000;

function normalizeCurrency(value: string | null | undefined) {
  const currency = value?.trim().toUpperCase();
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : "USD";
}

function windowFor(range: AnalyticsRange, now: Date) {
  const currentStart = new Date(now);
  currentStart.setUTCHours(0, 0, 0, 0);
  if (range === "1y") {
    const previousStart = new Date(currentStart);
    previousStart.setUTCFullYear(previousStart.getUTCFullYear() - 2);
    const currentPeriodStart = new Date(currentStart);
    currentPeriodStart.setUTCFullYear(currentPeriodStart.getUTCFullYear() - 1);
    return {
      currentPeriodStart,
      previousStart,
      pointCount: Math.floor((currentStart.getTime() - currentPeriodStart.getTime()) / DAY_MS) + 1,
    };
  }
  const days = Number(range.slice(0, -1));
  const currentPeriodStart = new Date(currentStart);
  currentPeriodStart.setUTCDate(currentPeriodStart.getUTCDate() - (days - 1));
  const previousStart = new Date(currentPeriodStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);
  return { currentPeriodStart, previousStart, pointCount: days };
}

function growth(current: number, previous: number) {
  return previous === 0 && current > 0
    ? 100
    : previous === 0
      ? 0
      : Number((((current - previous) / previous) * 100).toFixed(2));
}

function metric(events: Event[], currentStart: Date, previousStart: Date) {
  const current = events
    .filter((event) => event.date >= currentStart)
    .reduce((total, event) => total + event.value, 0);
  const previous = events
    .filter((event) => event.date >= previousStart && event.date < currentStart)
    .reduce((total, event) => total + event.value, 0);
  return { count: current, growth: growth(current, previous) };
}

function salesMetric(events: Event[], currentStart: Date, previousStart: Date, pointCount: number) {
  const current = metric(events, currentStart, previousStart);
  const points = new Map<string, number>();
  const pointStart = new Date(currentStart);
  for (let index = 0; index < pointCount; index += 1) {
    const date = new Date(pointStart);
    date.setUTCDate(date.getUTCDate() + index);
    points.set(date.toISOString().slice(0, 10), 0);
  }
  for (const event of events) {
    if (event.date < currentStart) continue;
    const key = event.date.toISOString().slice(0, 10);
    if (points.has(key)) points.set(key, (points.get(key) ?? 0) + event.value);
  }
  return {
    amountMinor: current.count,
    growth: current.growth,
    points: [...points].map(([date, amountMinor]) => ({ date, amountMinor })),
  };
}

export async function getProductAnalytics(
  db: AppDb,
  ctx: Context,
  productPublicId: string,
  range: AnalyticsRange,
  clock: Clock,
): Promise<
  | {
      ok: true;
      value: {
        productId: string;
        range: AnalyticsRange;
        currency: string;
        sales: ReturnType<typeof salesMetric>;
        customers: { count: number; growth: number };
        completions: { count: number; growth: number };
        downloads: { count: number; growth: number };
      };
    }
  | { ok: false; error: PlatformError }
> {
  if (!ctx.tenantId || !ctx.permissions.has("products:read")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const products = await db
    .select({ id: schema.products.id, publicId: schema.products.publicId, kind: schema.products.kind })
    .from(schema.products)
    .where(
      and(
        eq(schema.products.schoolId, ctx.tenantId),
        eq(schema.products.publicId, productPublicId),
      ),
    )
    .limit(1);
  const product = products[0];
  if (!product) return { ok: false, error: createPlatformError("not_found") };

  const school = await db
    .select({ currency: schema.schools.currency })
    .from(schema.schools)
    .where(eq(schema.schools.id, ctx.tenantId))
    .limit(1);
  const { currentPeriodStart, previousStart, pointCount } = windowFor(range, clock.now());

  const salesRows = await db
    .select({ amountMinor: schema.storefrontPayments.amountMinor, date: schema.storefrontPayments.occurredAt })
    .from(schema.storefrontPayments)
    .innerJoin(
      schema.storefrontCheckoutAttempts,
      eq(schema.storefrontCheckoutAttempts.id, schema.storefrontPayments.checkoutId),
    )
    .where(
      and(
        eq(schema.storefrontCheckoutAttempts.schoolId, ctx.tenantId),
        eq(schema.storefrontCheckoutAttempts.productId, product.id),
        eq(schema.storefrontPayments.status, "succeeded"),
        gte(schema.storefrontPayments.occurredAt, previousStart),
      ),
    );
  const customerRows = await db
    .select({ date: schema.enrollments.createdAt })
    .from(schema.enrollments)
    .where(
      and(
        eq(schema.enrollments.schoolId, ctx.tenantId),
        eq(schema.enrollments.productId, product.id),
        gte(schema.enrollments.createdAt, previousStart),
      ),
    );

  const lessonRows = await db
    .select({ id: schema.lessons.id })
    .from(schema.lessons)
    .where(
      and(eq(schema.lessons.schoolId, ctx.tenantId), eq(schema.lessons.productId, product.id)),
    );
  const enrollmentRows = await db
    .select({ id: schema.enrollments.id })
    .from(schema.enrollments)
    .where(
      and(eq(schema.enrollments.schoolId, ctx.tenantId), eq(schema.enrollments.productId, product.id)),
    );
  const progressRows = await db
    .select({
      enrollmentId: schema.lessonProgress.enrollmentId,
      lessonId: schema.lessonProgress.lessonId,
      completedAt: schema.lessonProgress.completedAt,
    })
    .from(schema.lessonProgress)
    .innerJoin(schema.lessons, eq(schema.lessons.id, schema.lessonProgress.lessonId))
    .where(
      and(
        eq(schema.lessonProgress.schoolId, ctx.tenantId),
        eq(schema.lessons.productId, product.id),
        isNotNull(schema.lessonProgress.completedAt),
      ),
    );
  const downloadRows = await db
    .select({ date: schema.auditEvents.createdAt })
    .from(schema.auditEvents)
    .where(
      and(
        eq(schema.auditEvents.schoolId, ctx.tenantId),
        eq(schema.auditEvents.action, "download.completed"),
        eq(schema.auditEvents.resourceType, "product"),
        eq(schema.auditEvents.resourceId, product.publicId),
        gte(schema.auditEvents.createdAt, previousStart),
      ),
    );

  const completionEvents: Event[] = [];
  if (product.kind === "course" && lessonRows.length > 0) {
    const lessonIds = new Set(lessonRows.map((lesson) => lesson.id));
    const byEnrollment = new Map<string, { lessons: Set<string>; latest: Date | null }>();
    for (const row of progressRows) {
      if (!row.completedAt) continue;
      const entry = byEnrollment.get(row.enrollmentId) ?? {
        lessons: new Set<string>(),
        latest: null,
      };
      entry.lessons.add(row.lessonId);
      if (!entry.latest || row.completedAt > entry.latest) entry.latest = row.completedAt;
      byEnrollment.set(row.enrollmentId, entry);
    }
    for (const enrollment of enrollmentRows) {
      const entry = byEnrollment.get(enrollment.id);
      if (entry && entry.latest && [...lessonIds].every((id) => entry.lessons.has(id))) {
        completionEvents.push({ date: entry.latest, value: 1 });
      }
    }
  }

  const downloadEvents: Event[] =
    product.kind === "download"
      ? downloadRows.map((row) => ({ date: row.date, value: 1 }))
      : [];

  return {
    ok: true,
    value: {
      productId: product.publicId,
      range,
      currency: normalizeCurrency(school[0]?.currency),
      sales: salesMetric(
        salesRows.map((row) => ({ date: row.date, value: row.amountMinor })),
        currentPeriodStart,
        previousStart,
        pointCount,
      ),
      customers: metric(
        customerRows.map((row) => ({ date: row.date, value: 1 })),
        currentPeriodStart,
        previousStart,
      ),
      completions: metric(completionEvents, currentPeriodStart, previousStart),
      downloads: metric(downloadEvents, currentPeriodStart, previousStart),
    },
  };
}
