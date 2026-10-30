import { type NextRequest, NextResponse } from "next/server";
import { DEV_SCHOOL_COOKIE, resolveSchoolForRequest } from "./lib/school-resolution";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Direct access to the internal /schools/* rewrite segment is never allowed.
  if (pathname === "/schools" || pathname.startsWith("/schools/")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const resolution = await resolveSchoolForRequest(request, { allowQuery: true });

  if (resolution.status === "unavailable") {
    // An API outage is not evidence of an unknown school; do not 404.
    return new NextResponse("Site temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  // Unknown hosts do not map to any school; refuse rather than falling through.
  if (resolution.status === "unknown") {
    return new NextResponse("School Not Found", { status: 404 });
  }

  const { schoolId } = resolution;
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/schools/${schoolId}${pathname}`;

  const headers = new Headers(request.headers);
  headers.delete("x-tenant-id");
  headers.set("x-school-id", schoolId);

  const response = NextResponse.rewrite(rewriteUrl, { request: { headers } });
  response.headers.set("x-school-id", schoolId);
  if (resolution.persistDevSchool) {
    // Local development only: remember `?school=` for later navigations on
    // the bare loopback host (the cookie is host-only).
    response.cookies.set(DEV_SCHOOL_COOKIE, resolution.persistDevSchool, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
    });
  }
  return response;
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes (/api/*)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - Static assets: icon.svg, courselit_backdrop_square.webp
     */
    "/((?!api|_next/static|_next/image|icon\\.svg|courselit_backdrop_square\\.webp).*)",
  ],
};
