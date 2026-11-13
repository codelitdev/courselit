import { describe, expect, it } from "bun:test";
import { apiStatus, shortCommit, versionMismatch } from "./about";

describe("shortCommit", () => {
  it("shortens a full SHA and ignores blanks", () => {
    expect(shortCommit("be4e1d24a1b2c3d4e5f6")).toBe("be4e1d24a1b2");
    expect(shortCommit("abc123")).toBe("abc123");
    expect(shortCommit("  ")).toBeNull();
    expect(shortCommit(undefined)).toBeNull();
  });
});

describe("apiStatus", () => {
  const respond = (statuses: Record<string, number>) =>
    (async (url: string | URL | Request) => {
      const path = new URL(String(url)).pathname;
      if (!(path in statuses)) throw new Error("connection refused");
      const body = path === "/health" ? { status: "ok", version: "1.2.3" } : {};
      return new Response(JSON.stringify(body), { status: statuses[path] });
    }) as typeof fetch;

  it("reports a healthy API and database", async () => {
    expect(
      await apiStatus("http://api:4000/", respond({ "/health": 200, "/ready": 200 })),
    ).toEqual({ reachable: true, version: "1.2.3", databaseReady: true });
  });

  it("reports a database that isn't ready", async () => {
    expect(
      await apiStatus("http://api:4000", respond({ "/health": 200, "/ready": 503 })),
    ).toEqual({ reachable: true, version: "1.2.3", databaseReady: false });
  });

  it("reports an API that doesn't answer", async () => {
    expect(await apiStatus("http://api:4000", respond({}))).toEqual({
      reachable: false,
      version: null,
      databaseReady: null,
    });
  });
});

describe("versionMismatch", () => {
  it("flags an admin built at a different version from the API", () => {
    expect(versionMismatch("1.0.0-alpha.2", "1.0.0-alpha.3")).toBe(true);
    expect(versionMismatch("1.0.0-alpha.3", "1.0.0-alpha.3")).toBe(false);
    expect(versionMismatch("1.0.0-alpha.3", null)).toBe(false);
  });
});
