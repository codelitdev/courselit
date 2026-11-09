"use client";

import type { WidgetInstance } from "@frontlit/page-builder/models";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  headerHasAccountEntry,
  readSignedInHint,
  signedInHeaderSettings,
  writeSignedInHint,
} from "@/lib/header-account";
import { learnerHeaders } from "@/lib/school";

const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The layout with the header switched to "Dashboard" for a signed-in learner.
 * Anonymous visitors cost nothing: the session is only checked when this
 * browser has signed in before, and the remembered state is applied before
 * the first paint so the header does not flash.
 */
export function useHeaderForVisitor(layout: WidgetInstance[]): WidgetInstance[] {
  const hasAccountEntry = layout.some(
    (instance) =>
      instance.name === "header" &&
      headerHasAccountEntry(instance.settings as Parameters<typeof headerHasAccountEntry>[0]),
  );
  const [signedIn, setSignedIn] = useState(false);

  useBeforePaint(() => {
    if (hasAccountEntry && readSignedInHint()) setSignedIn(true);
  }, [hasAccountEntry]);

  useEffect(() => {
    if (!hasAccountEntry || !readSignedInHint()) return;
    let active = true;
    void fetch("/api/v1/learner/me", {
      cache: "no-store",
      credentials: "include",
      headers: learnerHeaders(),
    })
      .then((response) => {
        if (!active) return;
        // Only a definite answer changes the header; a network blip keeps it.
        if (response.ok) setSignedIn(true);
        else if (response.status === 401 || response.status === 403) {
          writeSignedInHint(false);
          setSignedIn(false);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [hasAccountEntry]);

  return useMemo(
    () =>
      signedIn
        ? layout.map((instance) =>
            instance.name === "header"
              ? {
                  ...instance,
                  settings: signedInHeaderSettings(
                    (instance.settings ?? {}) as Parameters<typeof signedInHeaderSettings>[0],
                  ),
                }
              : instance,
          )
        : layout,
    [layout, signedIn],
  );
}
