import { describe, expect, it } from "bun:test";
import { analyticsWindow } from "./analytics-range.js";

const now = new Date("2026-03-05T15:30:00.000Z");
const created = new Date("2026-01-10T08:00:00.000Z");

describe("analyticsWindow", () => {
  it("covers today only for 1d, compared with yesterday", () => {
    expect(analyticsWindow("1d", now, created)).toEqual({
      currentStart: new Date("2026-03-05T00:00:00.000Z"),
      previousStart: new Date("2026-03-04T00:00:00.000Z"),
      pointCount: 1,
    });
  });

  it("covers the last N days, compared with the N days before", () => {
    expect(analyticsWindow("7d", now, created)).toEqual({
      currentStart: new Date("2026-02-27T00:00:00.000Z"),
      previousStart: new Date("2026-02-20T00:00:00.000Z"),
      pointCount: 7,
    });
  });

  it("covers a year, compared with the year before", () => {
    const window = analyticsWindow("1y", now, created);
    expect(window.currentStart).toEqual(new Date("2025-03-05T00:00:00.000Z"));
    expect(window.previousStart).toEqual(new Date("2024-03-05T00:00:00.000Z"));
    expect(window.pointCount).toBe(366);
  });

  it("covers everything since the school's creation for lifetime, with nothing before", () => {
    expect(analyticsWindow("lifetime", now, created)).toEqual({
      currentStart: new Date("2026-01-10T00:00:00.000Z"),
      previousStart: new Date("2026-01-10T00:00:00.000Z"),
      pointCount: 55,
    });
  });
});
