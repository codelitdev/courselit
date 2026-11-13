import { afterEach, describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { POST } from "./route";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

/** Posts through the admin proxy; returns the status and what reached the API. */
async function posted(
  path: string,
  headers: Record<string, string>,
  body: string,
): Promise<{
  status: number;
  upstream: { url: string; headers: Headers; body: string } | null;
}> {
  let upstream: { url: string; headers: Headers; body: string } | null = null;
  globalThis.fetch = (async (input, init) => {
    upstream = {
      url: typeof input === "string" ? input : input.toString(),
      headers: new Headers(init?.headers),
      body: String(init?.body ?? ""),
    };
    return Response.json({});
  }) as typeof fetch;
  const request = new NextRequest(`https://admin.example/api/${path}`, {
    method: "POST",
    headers: { host: "admin.example", ...headers },
    body,
  });
  const response = await POST(request, {
    params: Promise.resolve({ path: path.split("/") }),
  });
  return { status: response.status, upstream };
}

describe("admin API proxy", () => {
  it("refuses a write a storefront page posts with the admin's cookies", async () => {
    const result = await posted(
      "v1/schools/transfer-ownership",
      {
        cookie: "courselit.session_token=session",
        origin: "https://school.example",
        "sec-fetch-site": "same-site",
        "content-type": "application/x-www-form-urlencoded",
      },
      "newOwnerUserId=attacker",
    );
    expect(result).toEqual({ status: 403, upstream: null });
  });

  it("forwards a product API form body untouched, never as JSON", async () => {
    const { status, upstream } = await posted(
      "v1/contacts",
      { "content-type": "application/x-www-form-urlencoded" },
      "email=a%40example.com",
    );
    expect(status).toBe(200);
    expect(upstream!.headers.get("content-type")).toBe(
      "application/x-www-form-urlencoded",
    );
    expect(upstream!.body).toBe("email=a%40example.com");
  });

  it("still converts Better Auth's form posts to JSON", async () => {
    const { upstream } = await posted(
      "auth/oauth2/consent",
      {
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://admin.example",
        "sec-fetch-site": "same-origin",
      },
      "accept=true",
    );
    expect(upstream!.url).toBe("http://127.0.0.1:4000/api/auth/oauth2/consent");
    expect(upstream!.headers.get("content-type")).toBe("application/json");
    expect(JSON.parse(upstream!.body)).toEqual({ accept: "true" });
  });

  it("passes X-Forwarded-For through unchanged and strips a client-sent client-IP header", async () => {
    const { upstream } = await posted(
      "v1/contacts",
      {
        "content-type": "application/json",
        "x-forwarded-for": "6.6.6.6, 203.0.113.9",
        "x-real-ip": "6.6.6.6",
        "x-courselit-client-ip": "6.6.6.6",
      },
      "{}",
    );
    expect(upstream!.headers.get("x-forwarded-for")).toBe("6.6.6.6, 203.0.113.9");
    expect(upstream!.headers.get("x-courselit-client-ip")).toBeNull();
  });
});
