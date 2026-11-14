"use client";

import { useEffect, useState } from "react";

export type LimitUsage = {
  key: "storage_bytes" | "marketing_emails_month";
  used: number | null;
  allowed: number | null;
  resetsAt: string | null;
};

/** At or past this share of a limit, the admin warns the owner. */
export const USAGE_WARN_AT = 0.8;

export function formatBytes(bytes: number): string {
  const units = ["bytes", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 || value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

const NAMES: Record<LimitUsage["key"], string> = {
  storage_bytes: "Storage",
  marketing_emails_month: "Marketing email this month",
};

function amount(key: LimitUsage["key"], value: number): string {
  return key === "storage_bytes" ? formatBytes(value) : value.toLocaleString("en-US");
}

/** "120 MB of 500 MB", "Unlimited", or "Not available right now". */
export function usageLabel(usage: LimitUsage): string {
  if (usage.allowed === null) {
    return usage.used === null ? "Unlimited" : `${amount(usage.key, usage.used)} used, unlimited`;
  }
  if (usage.allowed === 0) return "Not included";
  if (usage.used === null) return `${amount(usage.key, usage.allowed)} included`;
  return `${amount(usage.key, usage.used)} of ${amount(usage.key, usage.allowed)}`;
}

/** The share used, from 0 to 1, or null when there's nothing to measure. */
export function usageShare(usage: LimitUsage): number | null {
  if (usage.used === null || usage.allowed === null || usage.allowed <= 0) return null;
  return Math.min(1, usage.used / usage.allowed);
}

/** The first limit at or past 80%, for the owner's banner. */
export function limitNearlyUsed(items: readonly LimitUsage[]): LimitUsage | null {
  return items.find((item) => (usageShare(item) ?? 0) >= USAGE_WARN_AT) ?? null;
}

export function useSchoolUsage(schoolId: string | null, enabled = true) {
  const [items, setItems] = useState<LimitUsage[] | null>(null);
  useEffect(() => {
    if (!schoolId || !enabled) return;
    let active = true;
    void fetch("/api/v1/school/billing/usage", {
      credentials: "include",
      cache: "no-store",
      headers: { "x-school-id": schoolId },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { items?: LimitUsage[] } | null) => {
        if (active) setItems(body?.items ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [schoolId, enabled]);
  return items;
}

/** A meter for each limit of the school's plan (owner only). */
export function UsageMeters({ schoolId, trial }: { schoolId: string | null; trial: boolean }) {
  const items = useSchoolUsage(schoolId);
  if (!items?.length) return null;
  return (
    <div className="space-y-4">
      {items.map((usage) => {
        const share = usageShare(usage);
        const high = share !== null && share >= USAGE_WARN_AT;
        return (
          <div key={usage.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="font-medium">{NAMES[usage.key]}</span>
              <span className={high ? "text-destructive" : "text-muted-foreground"}>
                {usageLabel(usage)}
              </span>
            </div>
            {share !== null ? (
              <div
                role="meter"
                aria-label={NAMES[usage.key]}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(share * 100)}
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={`h-full rounded-full ${high ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${Math.max(2, Math.round(share * 100))}%` }}
                />
              </div>
            ) : null}
            {usage.key === "marketing_emails_month" && trial ? (
              <p className="text-xs text-muted-foreground">
                Sending marketing email starts with a paid plan. Sign-in codes and receipts
                go out during your trial.
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
