import { describe, expect, it } from "bun:test";
import { getBroadcastDelivery } from "./broadcast-status";

const now = Date.parse("2026-11-12T10:00:00Z");
const later = Date.parse("2026-11-13T09:00:00Z");

describe("getBroadcastDelivery", () => {
  it("shows when a broadcast went out", () => {
    const sentAt = "2026-11-12T06:21:16Z";
    expect(
      getBroadcastDelivery(
        { status: "completed", report: { broadcast: { sentAt, lockedAt: sentAt } } },
        now,
      ),
    ).toEqual({ kind: "sent", at: new Date(sentAt) });
  });

  it("shows the time of a scheduled broadcast", () => {
    expect(
      getBroadcastDelivery(
        { status: "active", emails: [{ delayInMillis: later }] },
        now,
      ),
    ).toEqual({ kind: "scheduled", at: new Date(later) });
  });

  it("tells a saved but unscheduled time apart from a scheduled one", () => {
    expect(
      getBroadcastDelivery(
        { status: "draft", emails: [{ delayInMillis: later }] },
        now,
      ),
    ).toEqual({ kind: "saved", at: new Date(later) });
  });

  it("shows nothing for a draft without a time, or a time already past", () => {
    expect(getBroadcastDelivery({ status: "draft", emails: [{}] }, now)).toEqual({
      kind: "none",
    });
    expect(
      getBroadcastDelivery(
        { status: "draft", emails: [{ delayInMillis: now - 1000 }] },
        now,
      ),
    ).toEqual({ kind: "none" });
    expect(getBroadcastDelivery(null, now)).toEqual({ kind: "none" });
  });
});
