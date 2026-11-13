import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { API_VERSION } from "./version.js";

describe("API_VERSION", () => {
  it("is the version in the API's package.json", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { version: string };
    expect(API_VERSION).toBe(pkg.version);
  });
});
