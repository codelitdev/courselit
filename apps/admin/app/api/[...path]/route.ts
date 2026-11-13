import { type NextRequest, NextResponse } from "next/server";
import { isCrossOriginWrite } from "@/lib/request-origin";

const CLIENT_IP_HEADER = "x-courselit-client-ip";
const API_URL = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    if (isCrossOriginWrite(request.method, request.headers)) {
      return NextResponse.json(
        { code: "forbidden", message: "Cross-origin requests can't change data." },
        { status: 403 },
      );
    }
    const suffix = path.join("/");
    // The BFF strips its own `/api` segment.  Restore it for Better Auth and
    // account-scoped routes; versioned product APIs live at `/v1/*` upstream.
    const upstreamPath =
      path[0] === "auth" || path[0] === "school" ? `/api/${suffix}` : `/${suffix}`;
    const target = `${API_URL}${upstreamPath}${request.nextUrl.search}`;
    const headers = new Headers(request.headers);
    headers.delete("host");
    // The API never picks a school from the host. Only Better Auth (`/api/auth`)
    // reads the forwarded host, for CSRF origin checks.
    if (path[0] !== "auth") headers.delete("x-forwarded-host");
    // The API resolves the client address from the forwarded chain, so pass
    // it through unchanged. A browser must never set the internal header.
    headers.delete(CLIENT_IP_HEADER);
    let body: BodyInit | undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      const contentType = request.headers.get("content-type") ?? "";
      // Better Auth's own HTML forms (OAuth consent) post urlencoded bodies it
      // only reads as JSON. Product APIs take JSON alone, so a plain HTML form
      // can't reach them.
      if (
        path[0] === "auth" &&
        contentType.includes("application/x-www-form-urlencoded")
      ) {
        const form = await request.formData();
        body = JSON.stringify(Object.fromEntries(form.entries()));
        headers.set("content-type", "application/json");
        headers.delete("content-length");
      } else {
        body = await request.text();
      }
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
      // Names a download (e.g. a product's files as `<title>.zip`).
      "content-disposition",
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
    if (setCookies.length === 0) {
      const rawSetCookie = response.headers.get("set-cookie");
      if (rawSetCookie) outputHeaders.set("set-cookie", rawSetCookie);
    }
    outputHeaders.set("cache-control", "no-store");
    return new NextResponse(response.body, {
      status: response.status,
      headers: outputHeaders,
    });
  } catch (error) {
    console.error("PROXY HANDLER ERROR:", error);
    return NextResponse.json(
      { code: "proxy_error", message: String(error) },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
