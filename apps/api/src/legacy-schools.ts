import { normalizePlatformDomain } from "./school-host.js";

/**
 * Whether a school on the classic CourseLit app uses a hostname. `owned` and
 * `free` are the classic app's answer; `unavailable` means it couldn't be
 * asked (an unexpected status, a network error or a timeout). Callers treat
 * `unavailable` as "not free".
 */
export type LegacyHostStatus = "owned" | "free" | "unavailable";

export type LegacySchoolChecker = {
  /** Checks a full hostname: a custom domain or `<label>.<platform domain>`. */
  checkHostname(hostname: string): Promise<LegacyHostStatus>;
  /** Checks the platform subdomain `<label>.<platform domain>`. */
  checkSubdomain(label: string): Promise<LegacyHostStatus>;
};

export const LEGACY_SCHOOL_CHECK_TIMEOUT_MS = 1500;

export function createLegacySchoolChecker(options: {
  /** The classic app's check endpoint; called as `GET <url>?host=<hostname>`. */
  url: string;
  platformDomain: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}): LegacySchoolChecker {
  const timeoutMs = options.timeoutMs ?? LEGACY_SCHOOL_CHECK_TIMEOUT_MS;
  const platformDomain = normalizePlatformDomain(options.platformDomain);
  // A malformed URL is a deployment mistake: fail at startup, not per request.
  const endpoint = new URL(options.url);
  async function checkHostname(hostname: string): Promise<LegacyHostStatus> {
    const host = hostname.trim().toLowerCase().replace(/\.$/, "");
    const url = new URL(endpoint);
    url.searchParams.set("host", host);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await (options.fetch ?? globalThis.fetch)(url, {
        method: "GET",
        signal: controller.signal,
        redirect: "manual",
      });
      // Only the status matters; drop the body so the connection is freed.
      await response.body?.cancel().catch(() => undefined);
      if (response.status === 200) return "owned";
      if (response.status === 404) return "free";
      return "unavailable";
    } catch {
      return "unavailable";
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    checkHostname,
    checkSubdomain: (label) =>
      checkHostname(`${label.trim().toLowerCase()}.${platformDomain}`),
  };
}

/**
 * The checker for `LEGACY_SCHOOL_CHECK_URL`, or `undefined` when it isn't set
 * (self-hosted installs), in which case the classic app isn't consulted.
 */
export function createLegacySchoolCheckerFromEnv(
  env: Record<string, string | undefined> = process.env,
): LegacySchoolChecker | undefined {
  const url = env.LEGACY_SCHOOL_CHECK_URL?.trim();
  if (!url) return undefined;
  return createLegacySchoolChecker({
    url,
    platformDomain: env.PLATFORM_SITE_DOMAIN?.trim() || "courselit.app",
  });
}
