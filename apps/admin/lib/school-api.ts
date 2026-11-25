"use client";

import { useEffect, useState } from "react";

export type ApiResult<T> = { ok: boolean; status: number; body: T | null };

/** Calls the school API through the admin proxy for the selected school. */
export async function schoolRequest<T>(
  schoolId: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const response = await fetch(path, {
    method: init.method ?? "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      "x-school-id": schoolId,
      ...(init.body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const body = (await response.json().catch(() => null)) as T | null;
  return { ok: response.ok, status: response.status, body };
}

type SchoolItem = { id: string; name: string; isOwner?: boolean; selected?: boolean };

/** The selected school, whether the viewer owns it, and whether hosted billing exists. */
export function useSelectedSchool() {
  const [state, setState] = useState<{
    loading: boolean;
    schoolId: string | null;
    isOwner: boolean;
    billingAvailable: boolean;
  }>({ loading: true, schoolId: null, isOwner: false, billingAvailable: false });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/v1/schools", { credentials: "include", cache: "no-store" });
        const body = (response.ok ? await response.json() : { items: [] }) as { items?: SchoolItem[] };
        const items = body.items ?? [];
        const school = items.find((item) => item.selected) ?? items[0];
        if (!school) {
          if (active) setState((s) => ({ ...s, loading: false }));
          return;
        }
        const isOwner = school.isOwner === true;
        // Only the owner can read the plan; everyone else just doesn't see upgrade prompts.
        let billingAvailable = false;
        if (isOwner) {
          const plan = await fetch("/api/v1/school/billing", {
            credentials: "include",
            cache: "no-store",
            headers: { "x-school-id": school.id },
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
          billingAvailable = (plan as { billingAvailable?: boolean } | null)?.billingAvailable === true;
        }
        if (active) setState({ loading: false, schoolId: school.id, isOwner, billingAvailable });
      } catch {
        if (active) setState((s) => ({ ...s, loading: false }));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return state;
}
