// Kept apart from the contract index so the storefront can import these
// limits in the browser without bundling every schema.
export const LEARNER_AVATAR_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const LEARNER_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
