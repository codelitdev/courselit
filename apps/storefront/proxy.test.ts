import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";
import { DEV_SCHOOL_COOKIE, schoolHostCache } from "./lib/school-resolution";
import { proxy } from "./proxy";

const originalFetch = globalThis.fetch;

type ResolveHandler = (host: string) => Response;

function mockResolveHost(handler: ResolveHandler) {
  const calls: string[] = [];
  globalThis.fetch = mock(async (input: string | URL | Request) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    if (url.pathname === "/v1/public/resolve-host") {
      const host = url.searchParams.get("host") ?? "";
      calls.push(host);
      return handler(host);
    }
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
  return calls;
}

function resolved(schoolId: string) {
  return new Response(JSON.stringify({ schoolId, subdomain: "acme", name: "Acme" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  schoolHostCache.clear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  schoolHostCache.clear();
});

describe("storefront proxy", () => {
  it("blocks direct requests to internal /schools routes with 404", async () => {
    const response = await proxy(new NextRequest("http://localhost:3002/schools/sch_123"));
    expect(response.status).toBe(404);
  });

  it("blocks direct requests to exact /schools with 404", async () => {
    const response = await proxy(new NextRequest("http://localhost:3002/schools"));
    expect(response.status).toBe(404);
  });

  it("resolves a known host and internally rewrites to /schools/[schoolId]", async () => {
    const calls = mockResolveHost((host) =>
      host === "acme.courselit.app" ? resolved("sch_test_abc") : new Response(null, { status: 404 }),
    );
    const request = new NextRequest("http://acme.courselit.app/products", {
      headers: { host: "Acme.CourseLit.app:443", "x-school-id": "sch_attacker" },
    });
    const response = await proxy(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toContain(
      "/schools/sch_test_abc/products",
    );
    expect(response.headers.get("x-school-id")).toBe("sch_test_abc");
    expect(response.headers.get("x-middleware-request-x-school-id")).toBe("sch_test_abc");
    expect(calls).toEqual(["acme.courselit.app"]);
  });

  it("caches host resolution", async () => {
    const calls = mockResolveHost(() => resolved("sch_cached"));
    for (let i = 0; i < 3; i += 1) {
      const response = await proxy(
        new NextRequest("http://cached.courselit.app/", {
          headers: { host: "cached.courselit.app" },
        }),
      );
      expect(response.status).toBe(200);
    }
    expect(calls).toEqual(["cached.courselit.app"]);
  });

  it("resolves *.localhost hosts through resolve-host", async () => {
    const calls = mockResolveHost((host) =>
      host === "acme.localhost" ? resolved("sch_local") : new Response(null, { status: 404 }),
    );
    const response = await proxy(
      new NextRequest("http://acme.localhost:3002/", {
        headers: { host: "acme.localhost:3002" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toEndWith("/schools/sch_local");
    expect(calls).toEqual(["acme.localhost"]);
  });

  it("returns 404 for unknown or unregistered hosts", async () => {
    mockResolveHost(() => new Response(null, { status: 404 }));
    const response = await proxy(
      new NextRequest("http://unknown.courselit.app/products", {
        headers: { host: "unknown.courselit.app" },
      }),
    );
    expect(response.status).toBe(404);
  });

  it("ignores ?school= on non-loopback hosts", async () => {
    mockResolveHost(() => new Response(null, { status: 404 }));
    const response = await proxy(
      new NextRequest("http://unknown.courselit.app/?school=sch_abc", {
        headers: { host: "unknown.courselit.app" },
      }),
    );
    expect(response.status).toBe(404);
  });

  it("returns 503 and does not cache when the API is unavailable", async () => {
    const calls = mockResolveHost(() => new Response(null, { status: 500 }));
    const request = () =>
      new NextRequest("http://acme.courselit.app/", {
        headers: { host: "acme.courselit.app" },
      });
    expect((await proxy(request())).status).toBe(503);
    expect((await proxy(request())).status).toBe(503);
    expect(calls).toHaveLength(2);
  });

  it("accepts ?school= on bare localhost and persists it in a dev cookie", async () => {
    mockResolveHost(() => new Response(null, { status: 404 }));
    const response = await proxy(
      new NextRequest("http://localhost:3002/products?school=sch_dev", {
        headers: { host: "localhost:3002" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toContain(
      "/schools/sch_dev/products",
    );
    expect(response.cookies.get(DEV_SCHOOL_COOKIE)?.value).toBe("sch_dev");
  });

  it("reads the dev cookie on later bare localhost requests", async () => {
    mockResolveHost(() => new Response(null, { status: 404 }));
    const response = await proxy(
      new NextRequest("http://localhost:3002/dashboard", {
        headers: { host: "localhost:3002", cookie: `${DEV_SCHOOL_COOKIE}=sch_dev` },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toContain(
      "/schools/sch_dev/dashboard",
    );
  });

  it("returns 404 on bare localhost without a dev school", async () => {
    mockResolveHost(() => new Response(null, { status: 404 }));
    const response = await proxy(
      new NextRequest("http://localhost:3002/", { headers: { host: "localhost:3002" } }),
    );
    expect(response.status).toBe(404);
  });
});
