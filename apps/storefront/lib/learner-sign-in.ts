import { CAPTCHA_ERROR_MESSAGE, captchaHeaders } from "@courselit/page-blocks/captcha";
import { writeSignedInHint } from "@/lib/header-account";
import { learnerHeaders } from "@/lib/school";

// Learners sign in to this school only. Email codes and Google both end in a
// school session cookie on this host; nothing here talks to Better Auth.

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    code?: string;
    message?: string;
    details?: { reason?: string };
  } | null;
  const reason = body?.details?.reason;
  if (reason === "captcha_required" || reason === "captcha_failed") {
    return CAPTCHA_ERROR_MESSAGE;
  }
  if (body?.code === "rate_limited") {
    return "Please wait a moment before asking for another code.";
  }
  return fallback;
}

/** Email a six-digit sign-in code for this school. */
export async function requestEmailCode(email: string): Promise<void> {
  const captcha = await captchaHeaders("login");
  const response = await fetch("/api/v1/learner/auth/email-code", {
    method: "POST",
    headers: learnerHeaders({ "content-type": "application/json", ...captcha }),
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Unable to send a sign-in code."));
  }
}

/** Sign in to this school with the emailed code. `needsName` is true while
 * the learner's name is still the placeholder made from their email. */
export async function verifyEmailCode(
  email: string,
  code: string,
): Promise<{ needsName: boolean }> {
  const response = await fetch("/api/v1/learner/auth/email-code/verify", {
    method: "POST",
    headers: learnerHeaders({ "content-type": "application/json" }),
    credentials: "include",
    body: JSON.stringify({ email, code }),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Invalid or expired code."));
  }
  writeSignedInHint(true);
  const body = (await response.json().catch(() => null)) as { needsName?: boolean } | null;
  return { needsName: body?.needsName === true };
}

/** Save the name the learner wants to be called by. */
export async function saveLearnerName(name: string): Promise<void> {
  const response = await fetch("/api/v1/learner/me", {
    method: "PATCH",
    headers: learnerHeaders({ "content-type": "application/json" }),
    credentials: "include",
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Unable to save your name."));
  }
}

/** Leave for Google sign-in; the learner comes back to `next` on this site. */
export function signInWithGoogle(next: string) {
  window.location.assign(`/auth/google?next=${encodeURIComponent(next)}`);
}

/** End the school session on this site. */
export async function signOutLearner() {
  writeSignedInHint(false);
  await fetch("/api/v1/learner/auth/sign-out", {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);
}
