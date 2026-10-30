import type { Clock } from "@codelitdev/platform";

/**
 * In-memory limiter for *failed* API-key authentication, keyed by client IP.
 * Successful requests are not counted. Once a client exceeds the budget, every
 * API-key attempt from it is refused (even a valid key) until the window
 * slides, so the limiter cannot be used as a validity oracle.
 */
export const API_KEY_FAILURE_LIMIT = 30;
export const API_KEY_FAILURE_WINDOW_MS = 5 * 60 * 1000;
const MAX_TRACKED_CLIENTS = 10_000;

/** Internal header the HTTP edge sets to the resolved client address. */
export const CLIENT_IP_HEADER = "x-courselit-client-ip";

export type ApiKeyFailureLimiter = {
  /** Seconds until another attempt is allowed, or `null` when not limited. */
  retryAfterSeconds(clientKey: string): number | null;
  recordFailure(clientKey: string): void;
};

export function createApiKeyFailureLimiter(
  clock: Clock,
  options: { limit?: number; windowMs?: number } = {},
): ApiKeyFailureLimiter {
  const limit = options.limit ?? API_KEY_FAILURE_LIMIT;
  const windowMs = options.windowMs ?? API_KEY_FAILURE_WINDOW_MS;
  const failures = new Map<string, number[]>();

  function recent(clientKey: string, now: number): number[] {
    const kept = (failures.get(clientKey) ?? []).filter((at) => at > now - windowMs);
    if (kept.length === 0) failures.delete(clientKey);
    else failures.set(clientKey, kept);
    return kept;
  }

  return {
    retryAfterSeconds(clientKey) {
      const now = clock.now().getTime();
      const kept = recent(clientKey, now);
      if (kept.length < limit) return null;
      const oldest = kept[kept.length - limit]!;
      return Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    },
    recordFailure(clientKey) {
      const now = clock.now().getTime();
      const kept = recent(clientKey, now);
      if (!failures.has(clientKey) && failures.size >= MAX_TRACKED_CLIENTS) {
        // Bound memory: drop the oldest tracked client.
        const first = failures.keys().next().value;
        if (first !== undefined) failures.delete(first);
      }
      kept.push(now);
      failures.set(clientKey, kept.slice(-limit));
    },
  };
}

const limiters = new WeakMap<object, ApiKeyFailureLimiter>();

/** One limiter per runtime (keyed by the deps object) so tests stay isolated. */
export function apiKeyFailureLimiterFor(
  owner: object,
  clock: Clock,
): ApiKeyFailureLimiter {
  const existing = limiters.get(owner);
  if (existing) return existing;
  const created = createApiKeyFailureLimiter(clock);
  limiters.set(owner, created);
  return created;
}

export function clientKeyFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): string {
  const internal = headers[CLIENT_IP_HEADER];
  const internalValue = Array.isArray(internal) ? internal[0] : internal;
  if (internalValue?.trim()) return internalValue.trim();
  const forwarded = headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = forwardedValue?.split(",")[0]?.trim();
  return first || "unknown";
}
