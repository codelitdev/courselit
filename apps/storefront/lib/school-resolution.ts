import type { NextRequest } from "next/server";

/**
 * Host -> school resolution for the storefront.
 *
 * The API never picks a school from the Host header. The storefront asks
 * `GET /v1/public/resolve-host?host=` once per hostname (cached for 60s) and
 * then names the school explicitly: in the internal `/schools/<schoolId>`
 * rewrite, in path-scoped public API URLs and in the `x-school-id` header it
 * sets for learner API calls.
 */

const API_URL = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
const CACHE_TTL_MS = 60_000;

/** Host-only cookie that remembers `?school=<id>` on bare localhost. */
export const DEV_SCHOOL_COOKIE = "courselit.dev-school";

const SCHOOL_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export interface ResolvedSchool {
  schoolId: string;
  subdomain: string;
  name: string;
}

export type SchoolResolution =
  | {
      status: "resolved";
      schoolId: string;
      /** Set when the school came from the localhost `?school=` dev fallback
       * and should be persisted in {@link DEV_SCHOOL_COOKIE}. */
      persistDevSchool?: string;
    }
  | { status: "unknown" }
  | { status: "unavailable" };

/** Normalize a browser/edge Host header before using it as a cache key or
 * calling the API. In local development it is usually `slug.localhost:3002`. */
export function normalizeHost(value: string): string {
  const host = value.split(",")[0]?.trim().toLowerCase() || "";
  if (!host) return "";
  try {
    return new URL(`http://${host}`).hostname.replace(/\.$/, "");
  } catch {
    return host.replace(/:\d+$/, "").replace(/\.$/, "");
  }
}

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host);
}

export function isValidSchoolId(value: string | null | undefined): value is string {
  return typeof value === "string" && SCHOOL_ID_PATTERN.test(value);
}

type CacheEntry = { value: ResolvedSchool | null; expiresAt: number };

function createHostCache(ttlMs = CACHE_TTL_MS) {
  const cache = new Map<string, CacheEntry>();
  return {
    get(host: string): ResolvedSchool | null | undefined {
      const entry = cache.get(host);
      if (!entry || entry.expiresAt < Date.now()) return undefined;
      return entry.value;
    },
    set(host: string, value: ResolvedSchool | null): void {
      cache.set(host, { value, expiresAt: Date.now() + ttlMs });
    },
    delete(host: string): void {
      cache.delete(host);
    },
    clear(): void {
      cache.clear();
    },
  };
}

type HostCache = ReturnType<typeof createHostCache>;

/** Shared on `globalThis` because Next.js bundles the proxy and route
 * handlers separately, each with its own copy of this module. */
export const schoolHostCache: HostCache = ((
  globalThis as { __courselitSchoolHostCache?: HostCache }
).__courselitSchoolHostCache ??= createHostCache());

/**
 * Ask the API which school serves `host`. Returns null for an unknown host
 * (404) and throws on an API outage so callers do not cache it as unknown.
 */
export async function fetchResolvedHost(host: string): Promise<ResolvedSchool | null> {
  const url = new URL(`${API_URL}/v1/public/resolve-host`);
  url.searchParams.set("host", host);
  const response = await fetch(url.toString(), {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`resolve-host failed with ${response.status}`);
  const body = (await response.json()) as Partial<ResolvedSchool>;
  return isValidSchoolId(body.schoolId)
    ? {
        schoolId: body.schoolId,
        subdomain: body.subdomain ?? "",
        name: body.name ?? "",
      }
    : null;
}

/** Cached host lookup. Throws on API outages (which are never cached). */
export async function resolveHost(host: string): Promise<ResolvedSchool | null> {
  const cached = schoolHostCache.get(host);
  if (cached !== undefined) return cached;
  const resolved = await fetchResolvedHost(host);
  schoolHostCache.set(host, resolved);
  return resolved;
}

/** The request's host as seen by the visitor. `Host` wins; the edge's
 * `x-forwarded-host` is only a fallback for host lookup. */
export function requestHostname(request: Pick<NextRequest, "headers">): string {
  const raw = request.headers.get("host") || request.headers.get("x-forwarded-host") || "";
  return normalizeHost(raw);
}

/**
 * Resolve the school for an incoming storefront request.
 *
 * On bare loopback hosts (`localhost`, `127.0.0.1`, `::1`) that resolve-host
 * does not know, a `?school=`/`?schoolId=` query parameter (page navigations)
 * or the {@link DEV_SCHOOL_COOKIE} cookie selects the school. This fallback is
 * never available on any other hostname.
 */
export async function resolveSchoolForRequest(
  request: Pick<NextRequest, "headers" | "nextUrl" | "cookies">,
  options: { allowQuery?: boolean } = {},
): Promise<SchoolResolution> {
  const host = requestHostname(request);
  if (!host) return { status: "unknown" };

  let resolved: ResolvedSchool | null;
  try {
    resolved = await resolveHost(host);
  } catch {
    return { status: "unavailable" };
  }
  if (resolved) return { status: "resolved", schoolId: resolved.schoolId };

  if (!isLoopbackHost(host)) return { status: "unknown" };

  if (options.allowQuery) {
    const fromQuery = (
      request.nextUrl.searchParams.get("school") ??
      request.nextUrl.searchParams.get("schoolId")
    )?.trim();
    if (isValidSchoolId(fromQuery)) {
      return { status: "resolved", schoolId: fromQuery, persistDevSchool: fromQuery };
    }
  }

  const fromCookie = request.cookies.get(DEV_SCHOOL_COOKIE)?.value?.trim();
  if (isValidSchoolId(fromCookie)) return { status: "resolved", schoolId: fromCookie };

  return { status: "unknown" };
}
