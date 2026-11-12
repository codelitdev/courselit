import { describe, expect, it } from "bun:test";
import { parseMailStats } from "./mail-stats";

describe("parseMailStats", () => {
  it("returns the stats when the body has a sent count", () => {
    const body = { sent: 3, openRate: 0.5, clickThroughRate: 0, subscribersCount: 4 };
    expect(parseMailStats(body)).toEqual(body);
  });

  it("returns null for bodies without stats", () => {
    expect(parseMailStats(null)).toBeNull();
    expect(parseMailStats("nope")).toBeNull();
    expect(parseMailStats({ error: "not found" })).toBeNull();
    expect(parseMailStats({ sent: "3" })).toBeNull();
  });
});
