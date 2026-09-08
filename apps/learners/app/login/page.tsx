"use client";

import { Button } from "@codelitdev/design-system";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { CourseLitLogo } from "@/components/layout/courselit-logo";
import { ExternalLoginButton } from "@/components/auth/external-login-button";
import { authClient } from "@/lib/auth-client";
import { learnerHeaders, writeSchoolId } from "@/lib/school";

// Supported learner auth endpoints: /api/v1/learner/auth/sign-in, /api/v1/learner/auth/sign-up
type OtpStep = "email" | "otp";

function destinationAfterLogin() {
  if (typeof window === "undefined") return "/dashboard/feed";
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard/feed";
}

export default function LearnerLoginPage() {
  const [otpStep, setOtpStep] = useState<OtpStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [identityLinkToken] = useState(() => {
    if (typeof window === "undefined") return "";
    const query = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    return fragment.get("identityLink") ?? query.get("identityLink") ?? "";
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [loginMethods, setLoginMethods] = useState<string[]>(["email"]);
  const [loadedMethods, setLoadedMethods] = useState(false);

  useEffect(() => {
    void fetch("/api/v1/public/school/login-methods", {
      headers: learnerHeaders(),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { loginMethods?: string[] } | null) => {
        if (data?.loginMethods && Array.isArray(data.loginMethods)) {
          setLoginMethods(data.loginMethods);
        }
      })
      .catch(() => {})
      .finally(() => setLoadedMethods(true));
  }, []);

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (res.error) {
        // Fallback to legacy OTP endpoint
        const response = await fetch("/api/v1/learner/auth/request-otp", {
          method: "POST",
          headers: learnerHeaders({ "content-type": "application/json" }),
          credentials: "include",
          body: JSON.stringify({ email }),
        });
        if (!response.ok) {
          setError(
            response.status === 400
              ? "Open this page from your school’s address to sign in."
              : res.error.message || "Unable to send a sign-in code.",
          );
          return;
        }
      }
      setOtpStep("otp");
    } catch {
      setError("Unable to send a sign-in code.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authClient.signIn.emailOtp({
        email,
        otp,
      });
      if (res.error) {
        // Fallback to legacy OTP verify endpoint
        const response = await fetch("/api/v1/learner/auth/verify-otp", {
          method: "POST",
          headers: learnerHeaders({ "content-type": "application/json" }),
          credentials: "include",
          body: JSON.stringify({
            email,
            otp,
            name: name || undefined,
            identityLinkToken: identityLinkToken || undefined,
          }),
        });
        if (!response.ok) {
          setError(
            response.status === 400
              ? "Enter the six-digit code."
              : res.error.message || "Invalid or expired code.",
          );
          return;
        }
        const body = (await response.json()) as { schoolId?: string };
        if (body.schoolId) writeSchoolId(body.schoolId);
      } else {
        const meRes = await fetch("/api/v1/learner/me", {
          headers: learnerHeaders(),
          credentials: "include",
        });
        if (meRes.ok) {
          const meBody = (await meRes.json()) as { schoolId?: string };
          if (meBody.schoolId) writeSchoolId(meBody.schoolId);
        }
      }
      window.location.assign(destinationAfterLogin());
    } catch {
      setError("Unable to verify the sign-in code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const res = await authClient.signIn.social({
        provider: "google",
        callbackURL: destinationAfterLogin(),
      });
      if (res?.error) {
        // Try SSO OIDC fallback
        await authClient.signIn.sso({
          providerId: "google",
          callbackURL: destinationAfterLogin(),
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to sign in with Google.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSsoSignIn() {
    setError(null);
    setLoading(true);
    try {
      const res = await authClient.signIn.sso({
        providerId: "sso",
        callbackURL: destinationAfterLogin(),
      });
      if (res?.error) {
        setError(res.error.message || "Unable to sign in with SSO.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to sign in with SSO.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const showEmail = loginMethods.includes("email");
  const showGoogle = loginMethods.includes("google");
  const showSso = loginMethods.includes("sso");
  const hasExternal = showGoogle || showSso;

  return (
    <main className="auth-page">
      <section className="card auth-card stack">
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded-md bg-[var(--primary-soft)]">
            <CourseLitLogo className="size-8" />
          </div>
          <div>
            <p className="eyebrow">CourseLit</p>
            <h1>Learner sign in</h1>
          </div>
        </div>
        <p className="subtitle">School-scoped access. Admin sessions are not reused.</p>
        {identityLinkToken ? (
          <p>
            Continue signing in to connect this learner account to your school admin
            account.
          </p>
        ) : null}

        {showEmail ? (
          otpStep === "email" ? (
            <form onSubmit={requestOtp} className="stack">
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <Button type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send sign-in code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="stack">
              <p>Enter the six-digit code sent to {email}.</p>
              <label>
                Code
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                  required
                />
              </label>
              <label>
                Name <span>(optional for new learners)</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={200}
                />
              </label>
              <Button type="submit" disabled={loading || otp.length !== 6}>
                {loading ? "Verifying…" : "Continue"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setOtpStep("email");
                  setOtp("");
                  setError(null);
                }}
              >
                Use a different email
              </button>
            </form>
          )
        ) : null}

        {showEmail && hasExternal && otpStep === "email" ? (
          <div className="relative my-1 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-card px-2 text-xs uppercase text-muted-foreground">
              or
            </span>
          </div>
        ) : null}

        {otpStep === "email" ? (
          <div className="flex flex-col gap-2">
            {showGoogle ? (
              <ExternalLoginButton
                provider="google"
                disabled={loading}
                onClick={handleGoogleSignIn}
              />
            ) : null}
            {showSso ? (
              <ExternalLoginButton
                provider="sso"
                disabled={loading}
                onClick={handleSsoSignIn}
              />
            ) : null}
          </div>
        ) : null}

        {error ? <p role="alert">{error}</p> : null}

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to the{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
