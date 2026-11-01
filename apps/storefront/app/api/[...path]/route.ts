import { type NextRequest, NextResponse } from "next/server";
import { resolveSchoolForRequest } from "@/lib/school-resolution";

const API_URL = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    if (path[0] !== "v1") {
      return NextResponse.json(
        {
          code: "not_found",
          message: "Storefront app only proxies public and learner APIs.",
        },
        { status: 404 },
      );
    }
    const suffix = path.join("/");
    const target = `${API_URL}/${suffix}${request.nextUrl.search}`;
    // Redeeming a Google sign-in ticket needs the school and the nonce cookie
    // this site set when the learner started.
    const isTicketConsume = suffix === "v1/auth/tickets/consume";
    const headers = new Headers(request.headers);
    headers.delete("host");
    // The browser never names the school: learner routes get it from the
    // request host below, public routes carry it in the path.
    headers.delete("x-school-id");
    headers.delete("x-tenant-id");
    headers.delete("x-forwarded-host");
    if (path[1] === "learner" || isTicketConsume) {
      const resolution = await resolveSchoolForRequest(request);
      if (resolution.status === "unavailable") {
        return NextResponse.json(
          { code: "service_unavailable", message: "School lookup is unavailable." },
          { status: 503 },
        );
      }
      if (resolution.status === "unknown") {
        return NextResponse.json(
          { code: "tenant_required", message: "This host is not a school website." },
          { status: 404 },
        );
      }
      headers.set("x-school-id", resolution.schoolId);
    }
    // Only this school's own cookies reach the API: the learner session, and
    // the sign-in nonce when redeeming a ticket.
    const rawCookie = request.headers.get("cookie");
    const cookies = (rawCookie ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => {
        const name = part.split("=", 1)[0];
        return (
          name === "courselit.learner.session" ||
          (isTicketConsume && name === "courselit.login.nonce")
        );
      });
    if (cookies.length > 0) {
      headers.set("cookie", cookies.join("; "));
    } else {
      headers.delete("cookie");
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
    for (const name of ["content-type", "location", "x-request-id", "retry-after"]) {
      const value = response.headers.get(name);
      if (value) outputHeaders.set(name, value);
    }
    const setCookies = response.headers.getSetCookie?.() ?? [];
    for (const cookie of setCookies) {
      outputHeaders.append("set-cookie", cookie);
    }
    if (isTicketConsume) {
      outputHeaders.append(
        "set-cookie",
        "courselit.login.nonce=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      );
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
