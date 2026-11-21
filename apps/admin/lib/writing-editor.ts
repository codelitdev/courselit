/**
 * The save status in the full-screen writing editor's top bar
 * (`WritingEditorShell`), shared by blog posts and lessons. No React, so it
 * is unit-tested.
 */
export type WritingSaveStatus =
  | { kind: "saving" }
  /** `at` is when the last save landed; null when unknown (just opened). */
  | { kind: "saved"; at: string | number | null }
  | { kind: "error"; message: string };

/** "Saved just now", "Saved 5m ago", ...; plain "Saved" without a time. */
export function savedAtLabel(
  savedAt: string | number | null | undefined,
  now: number | null,
): string {
  if (savedAt === null || savedAt === undefined || now === null) return "Saved";
  const time = typeof savedAt === "number" ? savedAt : new Date(savedAt).getTime();
  if (Number.isNaN(time)) return "Saved";
  const elapsedSeconds = Math.max(0, Math.floor((now - time) / 1000));
  if (elapsedSeconds < 60) return "Saved just now";
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `Saved ${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Saved ${elapsedHours}h ago`;
  return `Saved ${Math.floor(elapsedHours / 24)}d ago`;
}

export function writingSaveStatusLabel(
  status: WritingSaveStatus,
  now: number | null,
): string {
  if (status.kind === "saving") return "Saving…";
  if (status.kind === "error") return status.message;
  return savedAtLabel(status.at, now);
}
