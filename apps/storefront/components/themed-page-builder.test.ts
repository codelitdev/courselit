import { describe, expect, it } from "bun:test";
import { isSitePath } from "./themed-page-builder";

describe("isSitePath", () => {
  it("treats paths on this site as client-side routes", () => {
    expect(isSitePath("/join")).toBe(true);
    expect(isSitePath("/course/a/b")).toBe(true);
  });

  it("leaves other hosts, protocol-relative URLs and anchors to a plain link", () => {
    expect(isSitePath("https://courselit.app/")).toBe(false);
    expect(isSitePath("//evil.example")).toBe(false);
    expect(isSitePath("#section")).toBe(false);
  });
});
