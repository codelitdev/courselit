"use client";

import { useEffect, useRef, useState } from "react";
import { CourseLitLoadingIcon } from "@/components/course-lit-loader";
import { LearnerButton, LearnerText2 } from "@/components/themed-page-builder";
import { writeSignedInHint } from "@/lib/header-account";

function safeNext(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : "/dashboard";
}

/**
 * Landing spot after Google sign-in: swap the one-time ticket in the URL
 * fragment for a session on this school's site, then continue.
 */
export function AuthComplete() {
  const [failed, setFailed] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const ticket = new URLSearchParams(window.location.hash.slice(1)).get("ticket");
    const next = safeNext(new URLSearchParams(window.location.search).get("next"));
    // Drop the ticket from the address bar and history straight away.
    window.history.replaceState(null, "", window.location.pathname);
    if (!ticket) {
      setFailed(true);
      return;
    }
    void fetch("/api/v1/auth/tickets/consume", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ticket }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("ticket_rejected");
        writeSignedInHint(true);
        window.location.replace(next);
      })
      .catch(() => setFailed(true));
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-12">
      {failed ? (
        <>
          <LearnerText2>
            We couldn't finish signing you in. The link may have expired, or it was
            opened in a different browser.
          </LearnerText2>
          <LearnerButton onClick={() => window.location.assign("/login")}>
            Try again
          </LearnerButton>
        </>
      ) : (
        <>
          <CourseLitLoadingIcon size={20} />
          <LearnerText2>Signing you in…</LearnerText2>
        </>
      )}
    </div>
  );
}
