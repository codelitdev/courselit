/**
 * What learners see when an upload is refused for storage reasons. It never
 * names the school's plan or usage (docs/wip/plan-limits.md, S2).
 */
export const LEARNER_UPLOAD_REFUSALS: Record<string, string> = {
  upload_not_allowed: "This upload can't be added right now. Try a smaller file.",
  unsupported_community_media_type: "Choose an image, video, audio file or PDF.",
};

/** The message for a refused upload, by reason or HTTP status. */
export function learnerUploadErrorMessage(
  status: number,
  reason: string,
  fallback: string,
): string {
  if (LEARNER_UPLOAD_REFUSALS[reason]) return LEARNER_UPLOAD_REFUSALS[reason];
  if (status === 429) return "You've uploaded a lot in the last hour. Try again later.";
  if (status === 403) return "You can't upload files here.";
  return fallback;
}
