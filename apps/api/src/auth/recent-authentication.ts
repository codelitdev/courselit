import type { Clock } from "@codelitdev/platform";
import {
  isRecentlyAuthenticated,
  resolveBetterAuthSession,
} from "@codelitdev/oauth-server-kit/better-auth";
import { fromNodeHeaders } from "better-auth/node";
import type { AdminAuth } from "./better-auth.js";

/** How long after signing in a browser session may run an operation whose
 * policy asks for recent authentication (handing over a school). Billing
 * actions don't: they run on a single-use grant instead. */
export const RECENT_AUTHENTICATION_MS = 10 * 60 * 1000;

/** Whether the browser session on this request was signed into recently. */
export async function hasRecentAuthentication(
  auth: AdminAuth,
  headers: Record<string, string | string[] | undefined>,
  clock: Clock,
): Promise<boolean> {
  const resolved = await resolveBetterAuthSession(
    { auth: auth.auth, issuer: auth.issuer },
    fromNodeHeaders(headers),
  );
  return (
    resolved.status === "authenticated" &&
    isRecentlyAuthenticated(resolved.identity, {
      maxAgeMs: RECENT_AUTHENTICATION_MS,
      now: clock.now(),
    })
  );
}
