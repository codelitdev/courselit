"use client";

import { Button } from "@codelitdev/design-system";
import { CAPTCHA_ERROR_MESSAGE, captchaHeaders } from "@courselit/page-blocks/captcha";
import { type FormEvent, useEffect, useState } from "react";
import { CourseLitLogo } from "@/components/layout/courselit-logo";

function destinationAfterSignIn() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Someone already signed in (Back after signing in, a bookmark, a page
  // restored from the back/forward cache) goes straight on.
  useEffect(() => {
    let active = true;
    function continueIfSignedIn() {
      void fetch("/api/auth/get-session", { cache: "no-store", credentials: "include" })
        .then(async (response) => {
          if (!active || !response.ok) return;
          const body = (await response.json().catch(() => null)) as { user?: unknown } | null;
          if (active && body?.user) window.location.replace(destinationAfterSignIn());
        })
        .catch(() => {});
    }
    continueIfSignedIn();
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) continueIfSignedIn();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      active = false;
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    let captcha: Record<string, string>;
    try {
      captcha = await captchaHeaders("login");
    } catch {
      setError(CAPTCHA_ERROR_MESSAGE);
      return;
    }
    const response = await fetch("/api/auth/email-otp/send-verification-otp", {
      method: "POST",
      headers: { "content-type": "application/json", ...captcha },
      body: JSON.stringify({ email, type: "sign-in" }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        code?: string;
      } | null;
      setError(
        body?.code === "VERIFICATION_FAILED" || body?.code === "MISSING_RESPONSE"
          ? CAPTCHA_ERROR_MESSAGE
          : "Unable to send a sign-in code.",
      );
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
    // Replace, not push: Back after signing in should not land on this form.
    window.location.replace(destinationAfterSignIn());
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
            {process.env.NODE_ENV === "development" ? (
              <p className="muted">
                In development the code is printed in the API server log.
              </p>
            ) : null}
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
      </section>
    </main>
  );
}
