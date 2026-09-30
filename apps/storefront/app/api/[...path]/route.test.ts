import { afterEach, describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { GET } from "./route";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

async function forwardedCookie(path: string, cookie: string): Promise<string | null> {
  let upstreamCookie: string | null = null;
  globalThis.fetch = (async (_input, init) => {
    upstreamCookie = new Headers(init?.headers).get("cookie");
    return new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  const request = new NextRequest(`https://school.example/api/${path}`, {
    headers: { cookie },
  });
  const response = await GET(request, {
    params: Promise.resolve({ path: path.split("/") }),
  });

  expect(response.status).toBe(200);
  return upstreamCookie;
}

describe("storefront API proxy cookies", () => {
  it("forwards the CourseLit Better Auth session cookie to learner /me", async () => {
    const cookie = "__Secure-courselit.session_token=session-value";

    expect(await forwardedCookie("v1/learner/me", cookie)).toBe(cookie);
  });

  it("forwards regular and chunked CourseLit session cookie variants", async () => {
    const cookie = [
      "courselit.session_token=session-value",
      "__Secure-courselit.session_token.0=session-chunk",
    ].join("; ");

    expect(await forwardedCookie("v1/learner/me", cookie)).toBe(cookie);
  });

  it("does not forward the Better Auth session cookie to unrelated API routes", async () => {
    expect(
      await forwardedCookie(
        "v1/products/product-id",
        "__Secure-courselit.session_token=session-value",
      ),
    ).toBeNull();
  });

  it("continues forwarding the active learner session cookie", async () => {
    const cookie = "courselit.learner.session=learner-session";

    expect(await forwardedCookie("v1/learner/me", cookie)).toBe(cookie);
  });
});
