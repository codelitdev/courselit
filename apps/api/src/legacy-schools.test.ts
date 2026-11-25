import { describe, expect, it } from "bun:test";
import {
  createLegacySchoolChecker,
  createLegacySchoolCheckerFromEnv,
  LEGACY_SCHOOL_CHECK_TIMEOUT_MS,
} from "./legacy-schools.js";

function checkerAnswering(
  respond: (url: URL, init?: RequestInit) => Promise<Response>,
) {
  const urls: string[] = [];
  const checker = createLegacySchoolChecker({
    url: "https://classic.test/api/school-check?token=abc",
    platformDomain: "https://Courselit.app/",
    timeoutMs: 50,
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      urls.push(url.toString());
      return respond(url, init);
    }) as typeof fetch,
  });
  return { checker, urls };
}

describe("classic school check", () => {
  it("asks about a hostname and reads only the status", async () => {
    const { checker, urls } = checkerAnswering(async (url) =>
      url.searchParams.get("host") === "maya.courselit.app"
        ? new Response("anything", { status: 200 })
        : new Response('{"owned":true}', { status: 404 }),
    );
    expect(await checker.checkSubdomain("Maya")).toBe("owned");
    expect(await checker.checkHostname("Learn.Example.com.")).toBe("free");
    expect(urls).toEqual([
      "https://classic.test/api/school-check?token=abc&host=maya.courselit.app",
      "https://classic.test/api/school-check?token=abc&host=learn.example.com",
    ]);
  });

  it("reports anything but 200 or 404 as unavailable", async () => {
    for (const status of [400, 301, 429, 500, 503]) {
      const { checker } = checkerAnswering(async () => new Response(null, { status }));
      expect(await checker.checkHostname("learn.example.com")).toBe("unavailable");
    }
    const { checker } = checkerAnswering(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await checker.checkHostname("learn.example.com")).toBe("unavailable");
  });

  it("gives up after the timeout", async () => {
    let aborted = false;
    const { checker } = checkerAnswering(
      (_url, init) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            aborted = true;
            reject(new Error("aborted"));
          });
        }),
    );
    const started = Date.now();
    expect(await checker.checkHostname("learn.example.com")).toBe("unavailable");
    expect(aborted).toBe(true);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(LEGACY_SCHOOL_CHECK_TIMEOUT_MS).toBe(1500);
  });

  it("is off unless LEGACY_SCHOOL_CHECK_URL is set", () => {
    expect(createLegacySchoolCheckerFromEnv({})).toBeUndefined();
    expect(
      createLegacySchoolCheckerFromEnv({ LEGACY_SCHOOL_CHECK_URL: "  " }),
    ).toBeUndefined();
    expect(
      createLegacySchoolCheckerFromEnv({
        LEGACY_SCHOOL_CHECK_URL: "https://classic.test/api/school-check",
      }),
    ).toBeDefined();
    expect(() =>
      createLegacySchoolCheckerFromEnv({ LEGACY_SCHOOL_CHECK_URL: "not a url" }),
    ).toThrow();
  });
});
