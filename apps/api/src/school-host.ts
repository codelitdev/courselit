export function hostnameFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const raw =
    headers["x-forwarded-host"] ??
    headers["X-Forwarded-Host"] ??
    headers.host ??
    headers.Host;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const host = value.split(",")[0]?.trim().toLowerCase() ?? "";
  const hostname = host.split(":")[0] ?? "";
  return hostname.length > 0 ? hostname : null;
}

/** First label of `<school>.courselit.app` / `<school>.localhost`, or the full custom host. */
export function schoolLookupKeyFromHost(
  hostname: string,
  platformDomain = process.env.PLATFORM_SITE_DOMAIN ?? "courselit.app",
): string | null {
  const host = hostname.trim().toLowerCase();
  if (!host || host === "localhost" || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    return null;
  }
  const platform = platformDomain.trim().toLowerCase().replace(/^\./, "");
  if (host === platform || host === `www.${platform}`) return null;
  if (platform && host.endsWith(`.${platform}`)) {
    const label = host.slice(0, -(platform.length + 1));
    return label.includes(".") ? null : label;
  }
  if (host.endsWith(".localhost")) {
    const label = host.slice(0, -".localhost".length);
    return label.includes(".") ? null : label;
  }
  return host;
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
