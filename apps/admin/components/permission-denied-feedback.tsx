"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export const PERMISSION_DENIED_MESSAGE =
  "You do not have permission to perform that action.";
const SELF_EXPLAINING_REASONS = new Set(["recent_authentication_required", "plan_required"]);
const PERMISSION_DENIED_TOAST_ID = "courselit-permission-denied";

export function showPermissionDeniedToast() {
  toast.error(PERMISSION_DENIED_MESSAGE, { id: PERMISSION_DENIED_TOAST_ID });
}

function isCourseLitAdminApiRequest(input: RequestInfo | URL): boolean {
  try {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const url = new URL(rawUrl, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    return (
      url.pathname.startsWith("/api/v1/") || url.pathname.startsWith("/api/school/")
    );
  } catch {
    return false;
  }
}

export function PermissionDeniedFeedback() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const interceptedFetch = async (
      input: Parameters<typeof window.fetch>[0],
      init?: Parameters<typeof window.fetch>[1],
    ) => {
      const response = await originalFetch(input, init);
      if (response.status === 403 && isCourseLitAdminApiRequest(input)) {
        // Some 403s are not about permission; the screen explains those itself.
        const reason = await response
          .clone()
          .json()
          .then((body: { details?: { reason?: unknown } }) => body?.details?.reason)
          .catch(() => null);
        if (!SELF_EXPLAINING_REASONS.has(reason as string)) showPermissionDeniedToast();
      }
      return response;
    };

    window.fetch = interceptedFetch as typeof window.fetch;
    return () => {
      if (window.fetch === interceptedFetch) window.fetch = originalFetch;
    };
  }, []);

  return null;
}
