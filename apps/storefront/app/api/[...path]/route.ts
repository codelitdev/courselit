import { type NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    if (path[0] !== "v1" && path[0] !== "auth" && path[0] !== "learner-auth") {
      return NextResponse.json(
        {
          code: "not_found",
          message: "Storefront app only proxies public, learner, and auth APIs.",
        },
        { status: 404 },
      );
    }
    const suffix = path.join("/");
    const isAuth = path[0] === "auth" || path[0] === "learner-auth";
    const upstreamPath = isAuth ? `/api/${suffix}` : `/${suffix}`;
    const target = `${API_URL}${upstreamPath}${request.nextUrl.search}`;
    const headers = new Headers(request.headers);
    const incomingHost =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    headers.delete("host");
    if (incomingHost) headers.set("x-forwarded-host", incomingHost);
    const rawCookie = request.headers.get("cookie");
    if (rawCookie) {
      const isBetterAuthCookie = (name: string) =>
        name.startsWith("better-auth.") ||
        name.startsWith("__Secure-better-auth.") ||
        name.startsWith("courselit-learner.") ||
        name.startsWith("courselit-learner-") ||
        name.startsWith("__Secure-courselit-learner.") ||
        name.startsWith("__Secure-courselit-learner-");
      const includeBetterAuth =
        isAuth || (path[0] === "v1" && suffix === "v1/learner/me");
      const cookies = rawCookie
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .filter((part) => {
          const name = part.split("=", 1)[0];
          return (
            name === "courselit.learner.session" ||
            (includeBetterAuth && isBetterAuthCookie(name))
          );
        });
      if (cookies.length > 0) {
        headers.set("cookie", cookies.join("; "));
      } else {
        headers.delete("cookie");
      }
    }
    let body: BodyInit | undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      body = await request.text();
    }
    const response = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });
    const outputHeaders = new Headers();
    for (const name of [
      "content-type",
      "location",
      "x-request-id",
      "retry-after",
    ]) {
      const value = response.headers.get(name);
      if (value) outputHeaders.set(name, value);
    }
    const setCookies = response.headers.getSetCookie?.() ?? [];
    for (const cookie of setCookies) {
      outputHeaders.append("set-cookie", cookie);
    }
    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      status: response.status,
      headers: outputHeaders,
    });
  } catch (caught) {
    return NextResponse.json(
      { code: "proxy_error", message: String(caught) },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
