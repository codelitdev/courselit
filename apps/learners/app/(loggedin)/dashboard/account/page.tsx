"use client";

import { Bell, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useLearnerSession } from "@/components/communities/learner-community";
import { LearnerShell } from "@/components/layout/learner-shell";
import { Button } from "@/components/ui/codelit/button";
import { clearSchoolId } from "@/lib/school";

export default function AccountPage() {
  const { learner, checking } = useLearnerSession("/dashboard/account");
  const router = useRouter();
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
        Loading account…
      </main>
    );
  }

  if (!learner) return null;

  return (
    <LearnerShell user={learner} headerTitle="Account">
      <main className="page-shell">
        <header>
          <p className="eyebrow">Learner account</p>
          <h1>Account</h1>
          <p className="subtitle">
            View your learner identity and manage your session.
          </p>
        </header>

        <section className="card stack" aria-labelledby="profile-title">
          <div>
            <p className="eyebrow">Profile</p>
            <h2 id="profile-title">Your learner profile</h2>
            <p className="muted">
              Your school manages these details. Sign-in providers are kept separate
              from CourseLit admin accounts.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              Email
              <input readOnly value={learner.email} />
            </label>
            <label>
              Name
              <input readOnly value={learner.name || "Not provided"} />
            </label>
          </div>
        </section>

        <section className="card stack" aria-labelledby="account-actions-title">
          <div>
            <p className="eyebrow">Account actions</p>
            <h2 id="account-actions-title">Stay in control</h2>
            <p className="muted">
              Review in-app activity or sign out of this learner session.
            </p>
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
        </section>
      </main>
    </LearnerShell>
  );
}
