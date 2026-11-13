/**
 * Refuses state-changing requests that a browser sent from another origin.
 *
 * Every school's storefront is a subdomain of the same site, so the
 * SameSite=Lax learner cookie rides along on a form another school's page
 * (or its injected code) posts here. Browsers say where a request came from with
 * `Sec-Fetch-Site` and `Origin`; only this origin's own pages may write.
 * Requests with neither header come from non-browser clients, which carry no
 * ambient cookies to abuse.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function requestHosts(headers: Headers): Set<string> {
  const hosts = new Set<string>();
  for (const name of ["host", "x-forwarded-host"]) {
    for (const value of (headers.get(name) ?? "").split(",")) {
      const host = value.trim().toLowerCase();
      if (host) hosts.add(host);
    }
  }
  return hosts;
}

export function isCrossOriginWrite(method: string, headers: Headers): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return false;
  const fetchSite = headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return true;
  const origin = headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    // Includes the opaque "null" origin of sandboxed frames and data: URLs.
    return true;
  }
  return !requestHosts(headers).has(originHost);
}
