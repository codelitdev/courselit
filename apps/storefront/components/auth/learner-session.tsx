"use client";

import { learnerSchema } from "@courselit/api-contract";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { requestJson } from "@/lib/request-json";
import { clearLearnerIdentityLink, writeSchoolId } from "@/lib/school";

export type LearnerSession = z.infer<typeof learnerSchema>;

type LearnerSessionState = {
  learner: LearnerSession | null;
  checking: boolean;
};

const LearnerSessionContext = createContext<LearnerSessionState | null>(null);

function isCoursePreviewPath(pathname: string) {
  if (!pathname.startsWith("/dashboard/courses/")) return false;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return Boolean(search.get("preview") ?? hash.get("preview"));
}

export function LearnerSessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [learner, setLearner] = useState<LearnerSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [preview, setPreview] = useState<boolean | null>(null);
  const requestedRef = useRef(false);

  useEffect(() => {
    setPreview(isCoursePreviewPath(pathname));
  }, [pathname]);

  useEffect(() => {
    if (preview === null) return;

    if (preview) {
      requestedRef.current = false;
      setLearner(null);
      setChecking(false);
      return;
    }

    if (requestedRef.current) return;
    requestedRef.current = true;

    let active = true;
    setChecking(true);
    void requestJson<LearnerSession>("/api/v1/learner/me")
      .then((body) => {
        if (!active) return;
        writeSchoolId(body.schoolId);
        clearLearnerIdentityLink();
        setLearner(body);
      })
      .catch(() => {
        if (active) setLearner(null);
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [preview]);

  useEffect(() => {
    if (preview || checking || learner) return;
    const next = `${window.location.pathname}${window.location.search}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [checking, learner, preview, router]);

  return (
    <LearnerSessionContext.Provider value={{ learner, checking }}>
      {children}
    </LearnerSessionContext.Provider>
  );
}

export function useLearnerSessionState(): LearnerSessionState {
  const state = useContext(LearnerSessionContext);
  if (!state) {
    throw new Error("useLearnerSessionState must be used under LearnerSessionProvider");
  }
  return state;
}
