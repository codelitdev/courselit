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
