import { learnerHeaders } from "@/lib/school";

// Learners sign in to this school only. Email codes and Google both end in a
// school session cookie on this host; nothing here talks to Better Auth.

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    code?: string;
    message?: string;
  } | null;
  if (body?.code === "rate_limited") {
    return "Please wait a moment before asking for another code.";
  }
  return fallback;
}

/** Email a six-digit sign-in code for this school. */
export async function requestEmailCode(email: string): Promise<void> {
  const response = await fetch("/api/v1/learner/auth/email-code", {
    method: "POST",
    headers: learnerHeaders({ "content-type": "application/json" }),
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Unable to send a sign-in code."));
  }
}

/** Sign in to this school with the emailed code. */
export async function verifyEmailCode(email: string, code: string): Promise<void> {
  const response = await fetch("/api/v1/learner/auth/email-code/verify", {
    method: "POST",
    headers: learnerHeaders({ "content-type": "application/json" }),
    credentials: "include",
    body: JSON.stringify({ email, code }),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Invalid or expired code."));
  }
}

/** Leave for Google sign-in; the learner comes back to `next` on this site. */
export function signInWithGoogle(next: string) {
  window.location.assign(`/auth/google?next=${encodeURIComponent(next)}`);
}

/** End the school session on this site. */
export async function signOutLearner() {
  await fetch("/api/v1/learner/auth/sign-out", {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);
}
