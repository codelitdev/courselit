"use client";

import { type ReactNode, useEffect, useState } from "react";
import {
  persistInvitationToken,
  readInvitationTokenFromHash,
} from "@/lib/invitation-token";

export function AuthGate({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    async function checkSession() {
      try {
        const response = await fetch("/api/auth/get-session", {
          cache: "no-store",
          credentials: "include",
        });
        if (!active) return;

        if (response.status === 429) {
          // Rate limited: do NOT log the user out. Retry after a backoff.
          retryTimer = setTimeout(() => {
            if (active) void checkSession();
          }, 2000);
          return;
        }

        if (response.status === 401) {
          const token = readInvitationTokenFromHash(window.location.hash);
          const invitationMatch = /^\/team-invitations\/([^/]+)\/?$/.exec(
            window.location.pathname,
          );
          if (token && invitationMatch?.[1]) {
            persistInvitationToken(decodeURIComponent(invitationMatch[1]), token);
          } else if (token) {
            persistInvitationToken(token);
          }
          const loginUrl = new URL("/login", window.location.origin);
          loginUrl.searchParams.set(
            "next",
            `${window.location.pathname}${window.location.search}`,
          );
          window.location.replace(loginUrl.toString());
          return;
        }

        if (response.ok) {
          const body = (await response.json()) as { user?: unknown };
          if (!body?.user) {
            const loginUrl = new URL("/login", window.location.origin);
            loginUrl.searchParams.set(
              "next",
              `${window.location.pathname}${window.location.search}`,
            );
            window.location.replace(loginUrl.toString());
            return;
          }
          setChecking(false);
          return;
        }

        // Never render protected content when the session cannot be verified.
        setError("Unable to verify your session. Please try again.");
      } catch {
        if (active) setError("Unable to verify your session. Please try again.");
      }
    }

    void checkSession();

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  if (checking) return <main>Checking session…</main>;
  if (error) {
    return (
      <main role="alert" className="p-6 text-sm text-destructive">
        {error}
      </main>
    );
  }
  return children;
}
