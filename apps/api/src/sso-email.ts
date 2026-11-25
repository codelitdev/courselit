import { normalizeHostname } from "@codelitdev/platform";

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

const LOCAL_PART = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;

/**
 * Parse an email an IdP sent. Plain `local@domain` only: no quoted local
 * part, comments, second `@`, whitespace or control characters. The domain
 * becomes lowercase punycode; the local part is lowercased like every other
 * school account email. Null for anything else.
 */
export function parseSsoEmail(
  raw: unknown,
): { email: string; local: string; domain: string } | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 254) return null;
  if (/\s/.test(raw) || hasControlCharacter(raw)) return null;
  const at = raw.indexOf("@");
  if (at <= 0 || at !== raw.lastIndexOf("@")) return null;
  const local = raw.slice(0, at).toLowerCase();
  const rawDomain = raw.slice(at + 1);
  // A bare domain only: `normalizeHostname` also accepts a URL-ish form
  // (`https://acme.com/`), which is never a valid email domain.
  if (/[/:?#[\]\\]/.test(rawDomain)) return null;
  const domain = normalizeHostname(rawDomain);
  if (!domain || local.length > 64 || !LOCAL_PART.test(local)) return null;
  return { email: `${local}@${domain}`, local, domain };
}

/** The normalized domain of an already-stored or typed email, or null. */
export function emailDomainOf(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  return normalizeHostname(email.slice(at + 1));
}
