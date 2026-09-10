"use client";

import { Button } from "@codelitdev/design-system";
import { type FormEvent, useState } from "react";
import { CourseLitLogo } from "@/components/layout/courselit-logo";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/auth/email-otp/send-verification-otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, type: "sign-in" }),
    });
    if (!response.ok) {
      setError("Unable to send a sign-in code.");
      return;
    }
    setSent(true);
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/auth/sign-in/email-otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, otp, name: email.split("@")[0] }),
    });
    if (!response.ok) {
      setError("That code is invalid or expired.");
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.assign(
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/",
    );
  }

  return (
    <main className="auth-page">
      <section className="card auth-card stack">
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded-md bg-[var(--primary-soft)]">
            <CourseLitLogo className="size-8" />
          </div>
          <div>
            <p className="eyebrow">CourseLit</p>
            <h1>Sign in</h1>
          </div>
        </div>
        <p className="subtitle">Access your school dashboard.</p>
        {!sent ? (
          <form onSubmit={sendCode} className="stack">
            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <Button type="submit">Send sign-in code</Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="stack">
            <p>Enter the code sent to {email}.</p>
            <p className="muted">
              In development the code is printed in the API server log.
            </p>
            <label>
              Sign-in code
              <input
                inputMode="numeric"
                name="otp"
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                required
              />
            </label>
            <Button type="submit">Sign in</Button>
          </form>
        )}
        {error ? <p role="alert">{error}</p> : null}
        <small>Same-origin BFF cookies are set by the API after verification.</small>
      </section>
    </main>
  );
}
