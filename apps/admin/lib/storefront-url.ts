/** Build a public storefront URL using the school's API-resolved runtime host. */
export function storefrontUrl(path: string, storefrontHost?: string | null): string | null {
  const host = storefrontHost?.trim().toLowerCase().replace(/\.$/, "");
  if (!host) return null;
  const isLocalHost =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
  const origin = `${isLocalHost ? "http" : "https"}://${host}${isLocalHost ? ":3001" : ""}`;
  try {
    return new URL(path, origin).toString();
  } catch {
    return null;
  }
}
