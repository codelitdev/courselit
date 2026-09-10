const LEGACY_STORAGE_KEY = "courselit.invitation.token";

function storageKey(invitationId: string): string {
  return `courselit.invitation.${invitationId}.token`;
}

export function readInvitationTokenFromHash(hash: string): string | null {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  const token = new URLSearchParams(value).get("token");
  return token && token.length > 0 ? token : null;
}

export function persistInvitationToken(token: string): void;
export function persistInvitationToken(invitationId: string, token: string): void;
export function persistInvitationToken(first: string, second?: string) {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(
      second === undefined ? LEGACY_STORAGE_KEY : storageKey(first),
      second ?? first,
    );
  }
}

export function peekInvitationToken(invitationId?: string): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(
    invitationId ? storageKey(invitationId) : LEGACY_STORAGE_KEY,
  );
}

export function clearInvitationToken(invitationId?: string) {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(
      invitationId ? storageKey(invitationId) : LEGACY_STORAGE_KEY,
    );
  }
}

export function clearInvitationHash(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.pathname + parsed.search;
}
