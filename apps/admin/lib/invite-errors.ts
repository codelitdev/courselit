/** What the admin says when the API refuses an invite over its limits (S6). */
export const INVITE_LIMIT_COPY: Record<string, string> = {
  invite_limit_reached:
    "You've sent 50 invites in the last 24 hours, the most a school can send. Try again tomorrow.",
  too_many_pending_invites:
    "200 team invitations are still waiting for an answer. Revoke some before inviting more.",
};

/** The message for a refused invite: the limit's copy, the API's message, or `fallback`. */
export function inviteErrorMessage(body: unknown, fallback: string): string {
  const parsed = body as { message?: string; details?: { reason?: string } } | null;
  const reason = parsed?.details?.reason;
  if (reason && INVITE_LIMIT_COPY[reason]) return INVITE_LIMIT_COPY[reason];
  return parsed?.message || fallback;
}
