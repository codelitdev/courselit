import { afterEach, describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { GET } from "./route";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

type Sent = { url: string; headers: Headers; body: Record<string, string> };

function start(
  query: string,
  upstream: () => Response | Promise<Response>,
  headers: Record<string, string> = { host: "school.example", "x-forwarded-proto": "https" },
) {
  const sent: Sent[] = [];
  globalThis.fetch = (async (input, init) => {
    sent.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body)),
    });
    return upstream();
  }) as typeof fetch;
  const request = new NextRequest(`https://school.example/auth/sso${query}`, { headers });
  return GET(request, { params: Promise.resolve({ schoolId: "sch_school" }) }).then(
    (response) => ({ response, sent }),
  );
}

describe("SSO start route", () => {
  it("posts host, nonce and next to the API and sets the nonce cookie", async () => {
    const { response, sent } = await start("?next=%2Fcourses%2Fx", () =>
      Response.json({ url: "https://idp.example/sso?req=1" }),
    );
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toEndWith("/v1/learner/auth/sso");
    expect(sent[0].headers.get("x-school-id")).toBe("sch_school");
    expect(sent[0].body.host).toBe("school.example");
    expect(sent[0].body.next).toBe("/courses/x");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://idp.example/sso?req=1");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const cookie = response.cookies.get("courselit.login.nonce");
    expect(cookie?.value).toBe(sent[0].body.nonce);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.maxAge).toBe(600);
  });

  it("defaults next to /dashboard", async () => {
    const { sent } = await start("", () => Response.json({ url: "https://idp.example/" }));
    expect(sent[0].body.next).toBe("/dashboard");
  });

  it("leaves next for the API to sanitise and never trusts it for the redirect", async () => {
    const { response } = await start("?next=https%3A%2F%2Fevil.example", () =>
      Response.json({ url: "https://idp.example/" }),
    );
    // The browser is only ever sent to the URL the API returned.
    expect(response.headers.get("location")).toBe("https://idp.example/");
  });

  it("redirects to /login?error=sso without a cookie when the API refuses", async () => {
    const { response } = await start("", () => new Response("{}", { status: 403 }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://school.example/login?error=sso");
    expect(response.cookies.get("courselit.login.nonce")).toBeUndefined();
  });

  it("fails the same way when the API is unreachable or returns no url", async () => {
    const down = await start("", () => {
      throw new Error("down");
    });
    expect(down.response.headers.get("location")).toBe("https://school.example/login?error=sso");
    const empty = await start("", () => Response.json({}));
    expect(empty.response.headers.get("location")).toBe("https://school.example/login?error=sso");
  });
});
