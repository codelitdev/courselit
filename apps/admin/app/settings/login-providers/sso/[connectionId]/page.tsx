"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { AuthGate } from "@/components/auth-gate";
import { SsoConnectionSettings } from "@/components/settings/sso-connection-settings";

/** One SSO connection of the school. */
export default function SsoConnectionPage() {
  const params = useParams<{ connectionId: string }>();
  return (
    <AuthGate>
      <div className="page-shell">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Single sign-on</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Let learners sign in through your own identity provider.
          </p>
        </div>
        <Suspense fallback={null}>
          <SsoConnectionSettings connectionId={params.connectionId} />
        </Suspense>
      </div>
    </AuthGate>
  );
}
