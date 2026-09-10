"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LearnerText2 } from "@/components/themed-page-builder";
import { learnerHeaders, writeSchoolId } from "@/lib/school";

function isCoursePreviewPath(pathname: string) {
  return pathname.startsWith("/dashboard/courses/");
}

export function LoggedInRoute({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    let active = true;
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const isPreview =
      isCoursePreviewPath(pathname) &&
      Boolean(search.get("preview") ?? hash.get("preview"));
    setPreview(isPreview);

    if (isPreview) {
      setChecking(false);
      return () => {
        active = false;
      };
    }

    void fetch("/api/v1/learner/me", {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(),
    })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          const next = `${window.location.pathname}${window.location.search}`;
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        const body = (await response.json()) as { schoolId?: string };
        if (body.schoolId) writeSchoolId(body.schoolId);
      })
      .catch(() => {
        if (!active) return;
        const next = `${window.location.pathname}${window.location.search}`;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (checking && !preview) {
    return (
      <main className="flex min-h-[400px] items-center justify-center p-6">
        <LearnerText2 className="text-muted-foreground">Loading your learner portal…</LearnerText2>
      </main>
    );
  }

  return <>{children}</>;
}
