/**
 * Subdomains used by schools on the classic CourseLit app, which shares the
 * platform domain. The classic app is asked `GET <LEGACY_SCHOOL_CHECK_URL>?host=
 * <label>.<platform domain>`: 200 means a classic school owns it, 404 means it
 * doesn't. Any other answer throws, so a name is never handed out unchecked.
 * When the variable is unset (self-hosted installs), nothing is checked.
 */
export async function legacySubdomainsAmong(
  candidates: string[],
): Promise<Set<string>> {
  const url = process.env.LEGACY_SCHOOL_CHECK_URL;
  if (!url || candidates.length === 0) return new Set();
  const domain = process.env.PLATFORM_SITE_DOMAIN ?? "courselit.app";
  const owned = await Promise.all(
    candidates.map(async (label) => {
      const endpoint = new URL(url);
      endpoint.searchParams.set("host", `${label}.${domain}`);
      const response = await fetch(endpoint, {
        redirect: "manual",
        signal: AbortSignal.timeout(1500),
      });
      await response.body?.cancel();
      if (response.status === 200) return true;
      if (response.status === 404) return false;
      throw new Error(`classic school check returned ${response.status}`);
    }),
  );
  return new Set(candidates.filter((_, index) => owned[index]));
}
