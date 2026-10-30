import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { DEV_SCHOOL_COOKIE, schoolHostCache } from "@/lib/school-resolution";
import { GET } from "./route";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  schoolHostCache.clear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  schoolHostCache.clear();
});

type Upstream = { url: string; headers: Headers };

/** Sends `path` through the storefront proxy and returns what reached the
 * API. resolve-host maps `school.example` to `sch_school` only. */
async function proxied(
  path: string,
  headers: Record<string, string>,
  url = `https://school.example/api/${path}`,
): Promise<{ status: number; upstream: Upstream | null; resolveCalls: number }> {
  let upstream: Upstream | null = null;
  let resolveCalls = 0;
  globalThis.fetch = (async (input, init) => {
    const target = new URL(typeof input === "string" ? input : input.toString());
    if (target.pathname === "/v1/public/resolve-host") {
      resolveCalls += 1;
      return target.searchParams.get("host") === "school.example"
        ? Response.json({ schoolId: "sch_school", subdomain: "school", name: "School" })
        : new Response(null, { status: 404 });
    }
    upstream = { url: target.toString(), headers: new Headers(init?.headers) };
    return new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  const host = new URL(url).host;
  const request = new NextRequest(url, { headers: { host, ...headers } });
  const response = await GET(request, {
    params: Promise.resolve({ path: path.split("/") }),
  });
  return { status: response.status, upstream, resolveCalls };
}

async function forwardedCookie(path: string, cookie: string): Promise<string | null> {
  const { status, upstream } = await proxied(path, { cookie });
  expect(status).toBe(200);
  return (upstream as Upstream | null)?.headers.get("cookie") ?? null;
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
        "v1/public/sch_school/products/product-id",
        "__Secure-courselit.session_token=session-value",
      ),
    ).toBeNull();
  });

  it("continues forwarding the active learner session cookie", async () => {
    const cookie = "courselit.learner.session=learner-session";

    expect(await forwardedCookie("v1/learner/me", cookie)).toBe(cookie);
  });
});

describe("storefront API proxy tenancy", () => {
  it("sets x-school-id for learner routes from the request host", async () => {
    const { upstream } = await proxied("v1/learner/me", {
      "x-school-id": "sch_attacker",
      "x-tenant-id": "tenant_attacker",
      "x-forwarded-host": "other.example",
    });
    expect(upstream?.headers.get("x-school-id")).toBe("sch_school");
    expect(upstream?.headers.get("x-tenant-id")).toBeNull();
    expect(upstream?.headers.get("x-forwarded-host")).toBeNull();
  });

  it("rejects learner routes on unknown hosts", async () => {
    const { status, upstream } = await proxied(
      "v1/learner/me",
      {},
      "https://unknown.example/api/v1/learner/me",
    );
    expect(status).toBe(404);
    expect(upstream).toBeNull();
  });

  it("uses the dev school cookie for learner routes on bare localhost", async () => {
    const { upstream } = await proxied(
      "v1/learner/me",
      { cookie: `${DEV_SCHOOL_COOKIE}=sch_dev` },
      "http://localhost:3002/api/v1/learner/me",
    );
    expect(upstream?.headers.get("x-school-id")).toBe("sch_dev");
    // The dev cookie is storefront-only and never forwarded to the API.
    expect(upstream?.headers.get("cookie")).toBeNull();
  });

  it("strips tenant headers from public routes without resolving the host", async () => {
    const { upstream, resolveCalls } = await proxied("v1/public/sch_school/products", {
      "x-school-id": "sch_attacker",
      "x-forwarded-host": "other.example",
    });
    expect(upstream?.url).toEndWith("/v1/public/sch_school/products");
    expect(upstream?.headers.get("x-school-id")).toBeNull();
    expect(upstream?.headers.get("x-forwarded-host")).toBeNull();
    expect(resolveCalls).toBe(0);
  });

  it("keeps forwarding the host to Better Auth for CSRF origin checks", async () => {
    const { upstream } = await proxied("auth/get-session", {});
    expect(upstream?.url).toEndWith("/api/auth/get-session");
    expect(upstream?.headers.get("x-forwarded-host")).toBe("school.example");
  });
});
