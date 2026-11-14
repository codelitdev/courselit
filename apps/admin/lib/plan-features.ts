"use client";

import { useEffect, useState } from "react";

/**
 * Features the school's CourseLit plan includes (`scorm`, `audit_log`,
 * `remove_branding`, ...). The API refuses what the plan doesn't include;
 * this only lets screens explain it up front.
 */
export type PlanFeatures = {
  loading: boolean;
  /** True while loading or when the features can't be read, so nothing is
   * locked by mistake; the API still has the final say. */
  has: (feature: string) => boolean;
};

export function planFeatureChecker(features: readonly string[] | null) {
  return (feature: string) => features === null || features.includes(feature);
}

export function usePlanFeatures(schoolId: string | null | undefined): PlanFeatures {
  const [features, setFeatures] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(Boolean(schoolId));

  useEffect(() => {
    if (!schoolId) return;
    let active = true;
    setLoading(true);
    void fetch("/api/v1/school/plan-features", {
      credentials: "include",
      cache: "no-store",
      headers: { "x-school-id": schoolId },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { features?: string[] } | null) => {
        if (!active) return;
        setFeatures(Array.isArray(body?.features) ? body.features : null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [schoolId]);

  return { loading, has: planFeatureChecker(features) };
}

/** What the admin says when a plan doesn't include something. */
export const PLAN_FEATURE_COPY: Record<string, string> = {
  scorm: "SCORM lessons come with the Business plan.",
  audit_log: "The audit log comes with the Business plan.",
  remove_branding: "Removing CourseLit branding comes with any paid plan.",
};
