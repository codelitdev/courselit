/**
 * Technical details for the hidden /about page, the rewrite's version of
 * main's /dashboard/courselit: what is installed and whether the API answers.
 */

export type ApiStatus = {
  /** The API answered its health check. */
  reachable: boolean;
  /** The installed version the API reports, when it answered. */
  version: string | null;
  /** The API's own database check, when it answered. */
  databaseReady: boolean | null;
};

/** A short commit for display: the first 12 characters of a full SHA. */
export function shortCommit(commit: string | null | undefined): string | null {
  const value = commit?.trim();
  if (!value) return null;
  return value.length > 12 ? value.slice(0, 12) : value;
}

/** Asks the API's health and readiness endpoints, giving up after `timeoutMs`. */
export async function apiStatus(
  apiUrl: string,
  fetcher: typeof fetch = fetch,
  timeoutMs = 2000,
): Promise<ApiStatus> {
  const base = apiUrl.replace(/\/$/, "");
  const get = async (path: string) => {
    try {
      return await fetcher(`${base}${path}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      return null;
    }
  };
  const [health, ready] = await Promise.all([get("/health"), get("/ready")]);
  let version: string | null = null;
  if (health?.ok) {
    const body = (await health.json().catch(() => null)) as { version?: unknown } | null;
    if (typeof body?.version === "string") version = body.version;
  }
  return {
    reachable: health?.ok === true,
    version,
    databaseReady: ready ? ready.ok : null,
  };
}

/**
 * The admin and API ship together under one product version. A difference
 * means a deploy is half done, so /about calls it out.
 */
export function versionMismatch(
  adminVersion: string,
  apiVersion: string | null,
): boolean {
  return apiVersion !== null && apiVersion !== adminVersion;
}
