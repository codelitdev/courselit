const PLACEHOLDER_ORIGIN = "https://placeholder.invalid";
export const SAFE_REDIRECT_MAX_LENGTH = 1000;

// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHARACTERS = /[\\\u0000-\u001f\u007f-\u009f]/;

/**
 * Returns a same-origin path (pathname + search + hash) for a user-supplied
 * post-login `next` value, or `fallback` when the value could leave the site.
 * Parsing with the URL API means browser quirks (`/\evil.com`, tabs and
 * newlines stripped from URLs) cannot disagree with this check.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > SAFE_REDIRECT_MAX_LENGTH ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    FORBIDDEN_CHARACTERS.test(value)
  ) {
    return fallback;
  }
  let parsed: URL;
  try {
    parsed = new URL(value, PLACEHOLDER_ORIGIN);
  } catch {
    return fallback;
  }
  if (parsed.origin !== PLACEHOLDER_ORIGIN) return fallback;
  const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}
