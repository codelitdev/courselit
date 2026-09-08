"use client";

import { type ReactNode, useEffect, useState } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);

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
          window.location.replace("/login");
          return;
        }

        if (response.ok) {
          const body = (await response.json()) as { user?: unknown };
          if (!body?.user) {
            window.location.replace("/login");
            return;
          }
          setChecking(false);
          return;
        }

        // Other non-200/non-401 responses (e.g. 500/502/503): do not log out
        setChecking(false);
      } catch {
        // Network or fetch failure: do not log out
        if (active) setChecking(false);
      }
    }

    void checkSession();

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  if (checking) return <main>Checking session…</main>;
  return children;
}
