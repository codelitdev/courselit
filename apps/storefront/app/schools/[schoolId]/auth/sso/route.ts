import { randomBytes } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
const LOGIN_NONCE_COOKIE = "courselit.login.nonce";

/**
 * Start single sign-on. This site keeps a random nonce in a cookie and
 * sends the learner to the API host, where the school's identity provider sign-in runs. They come back
 * to /auth/complete with a ticket that only works alongside this cookie.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await params;
  const host =
    request.headers.get("host") || request.headers.get("x-forwarded-host") || "";
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const nonce = randomBytes(32).toString("base64url");
  const secure =
    request.headers.get("x-forwarded-proto") === "https" ||
    request.nextUrl.protocol === "https:";
  const failure = new URL(
    "/login",
    host ? `${secure ? "https" : "http"}://${host}` : request.nextUrl.origin,
  );
  failure.searchParams.set("error", "sso");

  const response = await fetch(`${API_URL}/v1/learner/auth/sso`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-school-id": schoolId },
    body: JSON.stringify({ host, nonce, next }),
    cache: "no-store",
  }).catch(() => null);
  const body = response?.ok
    ? ((await response.json().catch(() => null)) as { url?: string } | null)
    : null;
  if (!body?.url) {
    return NextResponse.redirect(failure, 303);
  }
  const redirect = NextResponse.redirect(body.url, 303);
  redirect.cookies.set(LOGIN_NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  redirect.headers.set("Cache-Control", "no-store");
  return redirect;
}
