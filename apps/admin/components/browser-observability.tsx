"use client";

import {
  type BrowserObservability,
  createBrowserObservability,
} from "@codelitdev/observability/browser";
import { type ReactNode, useEffect } from "react";

let active: BrowserObservability | null = null;
let pendingSchoolId: string | null = null;

/**
 * Ties the session's events to the selected school's PostHog group, the same
 * group the API sends school events with. Safe to call before init or when
 * telemetry is off.
 */
export function setObservedSchool(schoolId: string | null | undefined) {
  pendingSchoolId = schoolId ?? null;
  if (active && pendingSchoolId) active.group("school", pendingSchoolId);
}

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
        active = observability;
        if (pendingSchoolId) observability.group("school", pendingSchoolId);
      } catch {
        // Telemetry must not break the admin shell.
      }
    });
  }, [apiKey, host, environment, serviceName]);

  return children;
}
