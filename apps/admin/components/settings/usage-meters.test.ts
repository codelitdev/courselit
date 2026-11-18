import { describe, expect, it } from "bun:test";
import { formatBytes, limitNearlyUsed, usageLabel, usageShare } from "./usage-meters";

const MB = 1024 * 1024;
const storage = (used: number | null, allowed: number | null) => ({
  key: "storage_bytes" as const,
  used,
  allowed,
  resetsAt: null,
});

describe("usage meters", () => {
  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 bytes");
    expect(formatBytes(1.5 * MB)).toBe("1.5 MB");
    expect(formatBytes(500 * MB)).toBe("500 MB");
    expect(formatBytes(20 * 1024 * MB)).toBe("20 GB");
  });

  it("labels used, allowed, unlimited and unknown", () => {
    expect(usageLabel(storage(120 * MB, 500 * MB))).toBe("120 MB of 500 MB");
    expect(usageLabel(storage(null, null))).toBe("Unlimited");
    expect(usageLabel(storage(null, 500 * MB))).toBe("500 MB included");
    expect(
      usageLabel({ key: "marketing_emails_month", used: null, allowed: 0, resetsAt: null }),
    ).toBe("Not included");
    expect(
      usageLabel({ key: "marketing_emails_month", used: 8500, allowed: 10000, resetsAt: null }),
    ).toBe("8,500 of 10,000");
  });

  it("flags a limit at 80%", () => {
    expect(usageShare(storage(400 * MB, 500 * MB))).toBe(0.8);
    expect(limitNearlyUsed([storage(100 * MB, 500 * MB)])).toBeNull();
    expect(limitNearlyUsed([storage(400 * MB, 500 * MB)])?.key).toBe("storage_bytes");
    expect(limitNearlyUsed([storage(400 * MB, null)])).toBeNull();
  });
});
