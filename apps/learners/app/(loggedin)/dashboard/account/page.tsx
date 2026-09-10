"use client";

import { Bell, LogOut } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useLearnerSession } from "@/components/communities/learner-community";
import { LearnerShell } from "@/components/layout/learner-shell";
import {
  LearnerButton as Button,
  LearnerCard as PageCard,
  LearnerCardContent as PageCardContent,
  LearnerHeader1,
  LearnerHeader2,
  LearnerInput,
  LearnerLabel,
  LearnerText2,
} from "@/components/themed-page-builder";
import { clearSchoolId } from "@/lib/school";

export default function AccountPage() {
  const { learner, checking } = useLearnerSession("/dashboard/account");
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await Promise.allSettled([
      authClient.signOut(),
      fetch("/api/v1/learner/auth/sign-out", {
        method: "POST",
        credentials: "include",
      }),
    ]);
    clearSchoolId();
    window.location.href = "/";
  }

  if (checking) {
    return (
      <main className="flex min-h-[400px] items-center justify-center p-6">
        <LearnerText2>Loading account…</LearnerText2>
      </main>
    );
  }

  if (!learner) return null;

  return (
    <LearnerShell user={learner} headerTitle="Account">
      <main className="grid gap-7">
        <header>
          <LearnerText2 className="text-muted-foreground">Learner account</LearnerText2>
          <LearnerHeader1>Account</LearnerHeader1>
          <LearnerText2 className="mt-2 text-muted-foreground">
            View your learner identity and manage your session.
          </LearnerText2>
        </header>

        <PageCard aria-labelledby="profile-title">
          <PageCardContent className="grid gap-5">
            <div>
              <LearnerText2 className="text-muted-foreground">Profile</LearnerText2>
              <LearnerHeader2 id="profile-title">Your learner profile</LearnerHeader2>
              <LearnerText2 className="mt-2 text-muted-foreground">
                Your school manages these details. Sign-in providers are kept separate
                from CourseLit admin accounts.
              </LearnerText2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <LearnerLabel>
                Email
                <LearnerInput readOnly value={learner.email} />
              </LearnerLabel>
              <LearnerLabel>
                Name
                <LearnerInput readOnly value={learner.name || "Not provided"} />
              </LearnerLabel>
            </div>
          </PageCardContent>
        </PageCard>

        <PageCard aria-labelledby="account-actions-title">
          <PageCardContent className="grid gap-5">
            <div>
              <LearnerText2 className="text-muted-foreground">
                Account actions
              </LearnerText2>
              <LearnerHeader2 id="account-actions-title">
                Stay in control
              </LearnerHeader2>
              <LearnerText2 className="mt-2 text-muted-foreground">
                Review in-app activity or sign out of this learner session.
              </LearnerText2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard/notifications">
                  <Bell />
                  Notification settings
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={signingOut}
                onClick={() => void signOut()}
              >
                <LogOut />
                {signingOut ? "Signing out…" : "Log out"}
              </Button>
            </div>
          </PageCardContent>
        </PageCard>
      </main>
    </LearnerShell>
  );
}
