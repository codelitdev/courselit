export const LEARNER_IDENTITY_LINK_STORAGE_KEY = "courselit.learner.identityLink";

export function readLearnerIdentityLink(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(LEARNER_IDENTITY_LINK_STORAGE_KEY);
}

export function writeLearnerIdentityLink(token: string) {
  if (typeof window !== "undefined" && token.trim()) {
    window.sessionStorage.setItem(LEARNER_IDENTITY_LINK_STORAGE_KEY, token.trim());
  }
}

export function clearLearnerIdentityLink() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(LEARNER_IDENTITY_LINK_STORAGE_KEY);
  }
}

/**
 * Headers for browser calls to learner API routes. The school is never sent
 * from the browser: the storefront API proxy derives it from the request host.
 */
export function learnerHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (typeof window !== "undefined") {
    const identityLink = window.sessionStorage.getItem(LEARNER_IDENTITY_LINK_STORAGE_KEY);
    if (identityLink) headers.set("x-learner-identity-link", identityLink);
  }
  return headers;
}
