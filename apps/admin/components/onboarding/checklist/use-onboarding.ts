"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAdminShellContext } from "@/components/layout/admin-shell-context";
import type { School } from "@/components/layout/team-switcher";
import {
  type ChecklistKey,
  type SchoolOnboardingState,
  summarizeChecklist,
} from "./checklist-model";

/**
 * One module-level store shared by the sidebar, the checklist page and the
 * Overview page, so the onboarding state is fetched once per school and
 * refreshed only after a mutation.
 */
type Store = {
  schoolId: string | null;
  data: SchoolOnboardingState | null;
  loading: boolean;
  failed: boolean;
};

let store: Store = { schoolId: null, data: null, loading: false, failed: false };
let inflight: { schoolId: string; promise: Promise<void> } | null = null;
const listeners = new Set<() => void>();

function setStore(next: Partial<Store>) {
  store = { ...store, ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return store;
}

async function request(
  schoolId: string,
  init?: { method: "PATCH"; body: unknown },
): Promise<SchoolOnboardingState | null> {
  const response = await fetch("/api/v1/school/onboarding", {
    method: init?.method ?? "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      "x-school-id": schoolId,
      ...(init ? { "content-type": "application/json" } : {}),
    },
    ...(init ? { body: JSON.stringify(init.body) } : {}),
  });
  if (!response.ok) return null;
  return (await response.json()) as SchoolOnboardingState;
}

function load(schoolId: string): Promise<void> {
  if (inflight?.schoolId === schoolId) return inflight.promise;
  setStore({
    schoolId,
    loading: true,
    failed: false,
    data: store.schoolId === schoolId ? store.data : null,
  });
  const promise = request(schoolId)
    .then((data) => {
      if (store.schoolId !== schoolId) return;
      setStore({ data: data ?? store.data, failed: !data, loading: false });
    })
    .catch(() => {
      if (store.schoolId === schoolId) setStore({ failed: true, loading: false });
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
  inflight = { schoolId, promise };
  return promise;
}

export type OnboardingPatch = {
  checklistHidden?: boolean;
  markDone?: ChecklistKey[];
};

export function useOnboarding() {
  const shell = useAdminShellContext();
  const schools = shell?.schools ?? [];
  const school = (schools.find((s) => s.selected) ?? schools[0] ?? null) as
    | (School & { isOwner?: boolean })
    | null;
  const schoolId = school?.id ?? null;
  const isOwner = school?.isOwner === true;
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!schoolId || !isOwner) return;
    if (store.schoolId !== schoolId) void load(schoolId);
  }, [schoolId, isOwner]);

  const current = snapshot.schoolId === schoolId ? snapshot.data : null;

  const refresh = useCallback(async () => {
    if (schoolId) await load(schoolId);
  }, [schoolId]);

  const update = useCallback(
    async (patch: OnboardingPatch): Promise<boolean> => {
      if (!schoolId) return false;
      try {
        const next = await request(schoolId, { method: "PATCH", body: patch });
        if (!next) return false;
        if (store.schoolId === schoolId) setStore({ data: next, failed: false });
        return true;
      } catch {
        return false;
      }
    },
    [schoolId],
  );

  return {
    schoolId,
    school,
    isOwner,
    state: current,
    loading:
      !!schoolId && isOwner && (snapshot.loading || (!current && !snapshot.failed)),
    failed: snapshot.schoolId === schoolId && snapshot.failed,
    progress: summarizeChecklist(current?.checklist),
    refresh,
    update,
  };
}
