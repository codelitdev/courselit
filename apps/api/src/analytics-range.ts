/**
 * The reporting periods shared by the school overview and product analytics,
 * matching main: today, the last 7/30/90 days, the last year, or everything
 * since the school was created.
 */
export type AnalyticsRange = "1d" | "7d" | "30d" | "90d" | "1y" | "lifetime";

const DAY_MS = 86_400_000;

export type AnalyticsWindow = {
  /** First instant counted in the period. */
  currentStart: Date;
  /** First instant of the equal-length period before it, used for growth. */
  previousStart: Date;
  /** Daily points in the period's chart, starting at `currentStart`. */
  pointCount: number;
};

function startOfUtcDay(value: Date): Date {
  const day = new Date(value);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}

export function analyticsWindow(
  range: AnalyticsRange,
  now: Date,
  schoolCreatedAt: Date,
): AnalyticsWindow {
  const today = startOfUtcDay(now);
  if (range === "lifetime") {
    // Nothing comes before a school's creation, so there is no earlier period.
    const currentStart = startOfUtcDay(schoolCreatedAt);
    const start = currentStart > today ? today : currentStart;
    return {
      currentStart: start,
      previousStart: start,
      pointCount: Math.floor((today.getTime() - start.getTime()) / DAY_MS) + 1,
    };
  }
  if (range === "1y") {
    const currentStart = new Date(today);
    currentStart.setUTCFullYear(currentStart.getUTCFullYear() - 1);
    const previousStart = new Date(currentStart);
    previousStart.setUTCFullYear(previousStart.getUTCFullYear() - 1);
    return {
      currentStart,
      previousStart,
      pointCount: Math.floor((today.getTime() - currentStart.getTime()) / DAY_MS) + 1,
    };
  }
  const days = Number(range.slice(0, -1));
  const currentStart = new Date(today);
  currentStart.setUTCDate(currentStart.getUTCDate() - (days - 1));
  const previousStart = new Date(currentStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);
  return { currentStart, previousStart, pointCount: days };
}
