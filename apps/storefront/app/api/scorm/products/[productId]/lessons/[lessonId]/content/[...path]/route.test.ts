import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { schoolHostCache } from "@/lib/school-resolution";
import { GET } from "./route";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  schoolHostCache.clear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  schoolHostCache.clear();
});

/** Requests SCORM content and returns the cookie the media lookup sent to the API. */
async function mediaLookupCookie(cookie: string): Promise<string | null> {
  let sent: string | null = null;
  globalThis.fetch = (async (input, init) => {
    const target = new URL(typeof input === "string" ? input : input.toString());
    if (target.pathname === "/v1/public/resolve-host") {
      return Response.json({ schoolId: "sch_school", subdomain: "school", name: "School" });
    }
    sent = new Headers(init?.headers).get("cookie");
    // Stop after the media lookup: the package itself is not under test.
    return new Response(null, { status: 404 });
  }) as typeof fetch;
  const request = new NextRequest("https://school.example/api/scorm/x", {
    headers: { host: "school.example", cookie },
  });
  await GET(request, {
    params: Promise.resolve({ productId: "p1", lessonId: "l1", path: ["index.html"] }),
  });
  return sent;
}

describe("SCORM content learner cookie", () => {
  it("forwards the plain learner cookie", async () => {
    expect(await mediaLookupCookie("courselit.learner.session=abc")).toBe(
      "courselit.learner.session=abc",
    );
  });

  it("forwards the __Host- learner cookie under its own name", async () => {
    expect(await mediaLookupCookie("__Host-courselit.learner.session=abc")).toBe(
      "__Host-courselit.learner.session=abc",
    );
  });

  it("prefers the __Host- cookie when both are present", async () => {
    expect(
      await mediaLookupCookie(
        "courselit.learner.session=plain; __Host-courselit.learner.session=host",
      ),
    ).toBe("__Host-courselit.learner.session=host");
  });

  it("never forwards platform session cookies", async () => {
    expect(await mediaLookupCookie("__Host-courselit.session_token=x")).toBeNull();
  });
});
