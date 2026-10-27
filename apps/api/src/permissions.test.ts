import { describe, expect, it } from "bun:test";
import { narrowToScopes, OWNER_PERMISSIONS } from "./permissions.js";

describe("narrowToScopes", () => {
  const owner = new Set(OWNER_PERMISSIONS);

  it("keeps only read permissions for a data:read token", () => {
    const narrowed = narrowToScopes(owner, ["openid", "data:read"]);
    expect(narrowed.has("products:read")).toBe(true);
    expect(narrowed.has("products:write")).toBe(false);
    expect(narrowed.has("mails:send")).toBe(false);
    expect([...narrowed].every((permission) => permission.endsWith(":read"))).toBe(
      true,
    );
  });

  it("keeps write permissions only with data:write", () => {
    const narrowed = narrowToScopes(owner, ["data:write"]);
    expect(narrowed.has("products:write")).toBe(true);
    expect(narrowed.has("commerce:refund")).toBe(true);
    expect(narrowed.has("products:read")).toBe(false);
  });

  it("never adds permissions the member lacks", () => {
    const member = new Set(["products:read"] as const);
    expect([...narrowToScopes(member, ["data:read", "data:write"])]).toEqual([
      "products:read",
    ]);
  });

  it("grants nothing without a data scope", () => {
    expect(narrowToScopes(owner, ["openid", "offline_access"]).size).toBe(0);
  });
});
