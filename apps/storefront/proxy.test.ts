import { describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

describe("storefront proxy", () => {
  it("blocks direct requests to internal /schools routes with 404", async () => {
    const request = new NextRequest("http://localhost:3001/schools/sch_123");
    const response = await proxy(request);
    expect(response.status).toBe(404);
  });

  it("blocks direct requests to exact /schools with 404", async () => {
    const request = new NextRequest("http://localhost:3001/schools");
    const response = await proxy(request);
    expect(response.status).toBe(404);
  });

  it("resolves a known host and internally rewrites to /schools/[schoolId]", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/v1/public/school/resolve")) {
        return new Response(
          JSON.stringify({
            schoolId: "sch_test_abc",
            subdomain: "acme",
            name: "Acme School",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(null, { status: 404 });
    }) as typeof fetch;

    try {
      const request = new NextRequest("http://acme.courselit.app/products", {
        headers: { host: "acme.courselit.app" },
      });
      const response = await proxy(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("x-middleware-rewrite")).toContain(
        "/schools/sch_test_abc/products",
      );
      expect(response.headers.get("x-school-id")).toBe("sch_test_abc");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns 404 for unknown or unregistered hosts", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => {
      return new Response(null, { status: 404 });
    }) as typeof fetch;

    try {
      const request = new NextRequest("http://unknown.courselit.app/products", {
        headers: { host: "unknown.courselit.app" },
      });
      const response = await proxy(request);
      expect(response.status).toBe(404);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
