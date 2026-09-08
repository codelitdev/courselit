"use client";

import { createBrowserObservability } from "@codelitdev/observability/browser";
import { type ReactNode, useEffect } from "react";

export function BrowserObservabilityProvider({
  apiKey,
  host,
  environment,
  serviceName,
  children,
}: {
  apiKey: string;
  host?: string;
  environment: string;
  serviceName: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const observability = createBrowserObservability({
      apiKey,
      host,
      environment,
      serviceName,
    });
    void observability.init().then(async () => {
      if (!observability.enabled) {
        return;
      }
      try {
        const response = await fetch("/api/auth/get-session", {
          cache: "no-store",
          credentials: "include",
        });
        if (!response.ok) {
          return;
        }
        const session = (await response.json()) as {
          user?: {
            id?: string;
            email?: string;
            name?: string | null;
          };
        };
        observability.identify(session.user);
      } catch {
        // Telemetry must not break the admin shell.
      }
    });
  }, [apiKey, host, environment, serviceName]);

  return children;
}
