/** Remembers, per browser session, that the Resume dialog was already offered. */
export const RESUME_PROMPTED_KEY = "courselit.onboarding.resume-prompted";

export function wasResumePrompted(): boolean {
  try {
    return window.sessionStorage.getItem(RESUME_PROMPTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markResumePrompted(): void {
  try {
    window.sessionStorage.setItem(RESUME_PROMPTED_KEY, "1");
  } catch {
    // Without storage the prompt can repeat; that is acceptable.
  }
}

/**
 * Whether to offer "Pick up where you left off?": only while setup is under
 * way, and never again once the owner has said so for this school.
 */
export function shouldOfferResume(
  onboarding: { status?: string; resumePromptHidden?: boolean } | null | undefined,
): boolean {
  return onboarding?.status === "in_progress" && onboarding.resumePromptHidden !== true;
}
