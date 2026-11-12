import type { SequenceStats } from "@sendlit/email-blocks";

/** The stats in a `/stats` response body, or null when it holds none. */
export function parseMailStats(body: unknown): SequenceStats | null {
  if (!body || typeof body !== "object") return null;
  return typeof (body as { sent?: unknown }).sent === "number"
    ? (body as SequenceStats)
    : null;
}
