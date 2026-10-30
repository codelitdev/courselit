/** Normalize a request hostname (`Acme.Localhost:3002.` -> `acme.localhost`). */
export function normalizeRequestHostname(value: string): string | null {
  const host = value.split(",")[0]?.trim().toLowerCase() ?? "";
  if (!host) return null;
  let hostname: string;
  try {
    hostname = new URL(`http://${host}`).hostname;
  } catch {
    hostname = host.replace(/:\d+$/, "");
  }
  hostname = hostname.replace(/\.$/, "");
  return hostname.length > 0 && hostname.length <= 253 ? hostname : null;
}

/**
 * The school label of a single-label platform subdomain:
 * `<label>.<PLATFORM_SITE_DOMAIN>` or `<label>.localhost`. Any other host
 * (bare platform domain, `www`, nested labels, custom domains, IPs) is null.
 */
export function platformSubdomainFromHost(
  hostname: string,
  platformDomain = process.env.PLATFORM_SITE_DOMAIN ?? "courselit.app",
): string | null {
  const host = hostname.trim().toLowerCase();
  if (!host) return null;
  const platform = platformDomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[:/].*$/, "")
    .replace(/^\./, "");
  for (const suffix of [platform, "localhost"]) {
    if (!suffix || !host.endsWith(`.${suffix}`)) continue;
    const label = host.slice(0, -(suffix.length + 1));
    if (!label || label.includes(".") || label === "www") return null;
    return label;
  }
  return null;
}

/** Normalize a custom hostname before it is persisted or used for routing. */
export function normalizeCustomHostname(value: string): string | null {
  const candidate = value.trim().toLowerCase();
  if (!candidate) return null;
  try {
    const parsed = new URL(
      candidate.includes("://") ? candidate : `http://${candidate}`,
    );
    if (
      parsed.username ||
      parsed.password ||
      parsed.port ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }
    const hostname = parsed.hostname.replace(/\.$/, "");
    if (
      !hostname.includes(".") ||
      hostname.length > 253 ||
      hostname
        .split(".")
        .some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
    ) {
      return null;
    }
    return hostname;
  } catch {
    return null;
  }
}
