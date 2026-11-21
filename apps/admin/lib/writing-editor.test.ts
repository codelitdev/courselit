import { describe, expect, it } from "bun:test";
import { savedAtLabel, writingSaveStatusLabel } from "./writing-editor";

const now = Date.parse("2026-11-21T12:00:00Z");

describe("savedAtLabel", () => {
  it("says plain Saved without a time or before the clock is known", () => {
    expect(savedAtLabel(null, now)).toBe("Saved");
    expect(savedAtLabel(undefined, now)).toBe("Saved");
    expect(savedAtLabel("2026-11-21T11:59:30Z", null)).toBe("Saved");
    expect(savedAtLabel("not a date", now)).toBe("Saved");
  });

  it("rounds the elapsed time to the largest whole unit", () => {
    expect(savedAtLabel("2026-11-21T11:59:30Z", now)).toBe("Saved just now");
    expect(savedAtLabel(now + 5_000, now)).toBe("Saved just now");
    expect(savedAtLabel(now - 5 * 60_000, now)).toBe("Saved 5m ago");
    expect(savedAtLabel("2026-11-21T09:00:00Z", now)).toBe("Saved 3h ago");
    expect(savedAtLabel("2026-11-19T12:00:00Z", now)).toBe("Saved 2d ago");
  });
});

describe("writingSaveStatusLabel", () => {
  it("shows saving, errors and the last save time", () => {
    expect(writingSaveStatusLabel({ kind: "saving" }, now)).toBe("Saving…");
    expect(writingSaveStatusLabel({ kind: "error", message: "Not saved" }, now)).toBe(
      "Not saved",
    );
    expect(writingSaveStatusLabel({ kind: "saved", at: now - 1_000 }, now)).toBe(
      "Saved just now",
    );
    expect(writingSaveStatusLabel({ kind: "saved", at: null }, now)).toBe("Saved");
  });
});
