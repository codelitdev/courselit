import { describe, expect, test } from "bun:test";
import { safeRedirectPath } from "./safe-redirect.js";

const FALLBACK = "/dashboard";

describe("safeRedirectPath", () => {
  test.each([
    "/\\evil.com",
    "//evil.com",
    "/\\/evil.com",
    "\\\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "evil.com",
    "/\tevil.com",
    "/\n/evil.com",
    "/\r/evil.com",
    "/\t/evil.com",
    "/ok\u0000",
    "",
  ])("rejects %j", (value) => {
    expect(safeRedirectPath(value, FALLBACK)).toBe(FALLBACK);
  });

  test("rejects null and undefined", () => {
    expect(safeRedirectPath(null, FALLBACK)).toBe(FALLBACK);
    expect(safeRedirectPath(undefined, FALLBACK)).toBe(FALLBACK);
  });

  test("percent-encoded tricks stay on the same origin as plain paths", () => {
    expect(safeRedirectPath("/%5Cevil.com", FALLBACK)).toBe("/%5Cevil.com");
    expect(safeRedirectPath("/%0a/evil.com", FALLBACK)).toBe("/%0a/evil.com");
    expect(safeRedirectPath("/%2F/evil.com", FALLBACK)).toBe("/%2F/evil.com");
  });

  test("rejects over-long values", () => {
    expect(safeRedirectPath(`/${"a".repeat(1000)}`, FALLBACK)).toBe(FALLBACK);
    expect(safeRedirectPath(`/${"a".repeat(999)}`, FALLBACK)).toBe(
      `/${"a".repeat(999)}`,
    );
  });

  test("keeps good paths with query and hash", () => {
    expect(safeRedirectPath("/", FALLBACK)).toBe("/");
    expect(safeRedirectPath("/dashboard", FALLBACK)).toBe("/dashboard");
    expect(safeRedirectPath("/courses/a?x=1&y=2#top", FALLBACK)).toBe(
      "/courses/a?x=1&y=2#top",
    );
    expect(safeRedirectPath("/a/../b", FALLBACK)).toBe("/b");
  });

  test("a path that normalises to a protocol-relative one falls back", () => {
    expect(safeRedirectPath("/.//evil.com", FALLBACK)).toBe(FALLBACK);
  });
});
