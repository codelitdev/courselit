import { type NextRequest, NextResponse } from "next/server";
import { resolveSchoolIdentity } from "./lib/courselit-public";

// In-memory cache for resolved school hostnames with a 60-second TTL
const resolutionCache = new Map<string, { schoolId: string; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Security Guard 1: Complete perimeter mediation - block direct access to internal /schools/* routes
  if (pathname === "/schools" || pathname.startsWith("/schools/")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Extract host and search parameters
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const normalizedHost = host.split(",")[0]?.split(":")[0]?.trim().toLowerCase() ?? "";
  const schoolParam =
    request.nextUrl.searchParams.get("school") ??
    request.nextUrl.searchParams.get("schoolId");

  const cacheKey = schoolParam
    ? `${normalizedHost}:${schoolParam.trim()}`
    : normalizedHost;

  let schoolId: string | null = null;
  const cached = resolutionCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    schoolId = cached.schoolId;
  } else {
    const resolved = await resolveSchoolIdentity(
      normalizedHost || undefined,
      schoolParam?.trim() || undefined,
    );
    if (resolved?.schoolId) {
      schoolId = resolved.schoolId;
      resolutionCache.set(cacheKey, {
        schoolId: resolved.schoolId,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }
  }

  // Security Guard 2: Reject unknown or unverified hostnames with 404
  if (!schoolId) {
    return new NextResponse("School Not Found", { status: 404 });
  }

  // Rewrite URL internally to tenant path: /schools/${schoolId}${pathname}
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/schools/${schoolId}${pathname}`;

  const response = NextResponse.rewrite(rewriteUrl);
  // Authoritative school ID forwarded to internal server components
  response.headers.set("x-school-id", schoolId);
  return response;
}

export const middleware = proxy;
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
