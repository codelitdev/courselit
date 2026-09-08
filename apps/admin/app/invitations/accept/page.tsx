"use client";

import { Button } from "@codelitdev/design-system";
import { type FormEvent, useState } from "react";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { AuthGate } from "../../../components/auth-gate";

export default function AcceptInvitationPage() {
  useSetBreadcrumb([{ label: "Overview", href: "/" }, { label: "Accept invitation" }]);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<string | null>(null);
  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/invitations/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        token: form.get("token"),
        email: form.get("email"),
      }),
    });
    if (!response.ok) {
      setError("Unable to accept that invitation.");
      return;
    }
    const body = (await response.json()) as { schoolId?: string };
    setAccepted(body.schoolId ?? "ok");
  }
  return (
    <AuthGate>
      <main className="page-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">Team</p>
            <h1>Accept invitation</h1>
          </div>
        </header>
        <section className="card stack">
          <form onSubmit={accept}>
            <label className="field">
              Email
              <input name="email" type="email" required />
            </label>
            <label className="field">
              Invitation token
              <input name="token" required />
            </label>
            <Button type="submit">Join school</Button>
          </form>
          {error ? <p role="alert">{error}</p> : null}
          {accepted ? <p>Joined school {accepted}.</p> : null}
        </section>
      </main>
    </AuthGate>
  );
}
