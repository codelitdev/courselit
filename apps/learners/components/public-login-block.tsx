"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { ExternalLoginButton } from "@/components/auth/external-login-button";
import {
  LearnerButton,
  LearnerInput,
  LearnerLabel,
  LearnerText2,
} from "@/components/themed-page-builder";
import { authClient } from "@/lib/auth-client";
import { learnerHeaders, writeSchoolId } from "@/lib/school";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

type OtpStep = "email" | "otp";

function destinationAfterLogin() {
  if (typeof window === "undefined") return "/dashboard/feed";
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard/feed";
}

/**
 * CourseLit-owned login block rendered inside the runtime site page. The page
 * renderer owns the surrounding header, footer, section, and theme.
 */
export function PublicLoginBlock() {
  const theme = useSchoolThemeStyle();
  const [otpStep, setOtpStep] = useState<OtpStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [identityLinkToken] = useState(() => {
    if (typeof window === "undefined") return "";
    const query = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    return fragment.get("identityLink") ?? query.get("identityLink") ?? "";
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginMethods, setLoginMethods] = useState<string[]>(["email"]);

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
      .catch(() => {});
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
      if (res.error)
        throw new Error(res.error.message || "Unable to send a sign-in code.");
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
      const res = await authClient.signIn.emailOtp({ email, otp });
      if (res.error) throw new Error(res.error.message || "Invalid or expired code.");
      const meRes = await fetch("/api/v1/learner/me", {
        headers: learnerHeaders(),
        credentials: "include",
      });
      if (!meRes.ok) throw new Error("Unable to establish your learner session.");
      const meBody = (await meRes.json()) as { schoolId?: string };
      if (meBody.schoolId) writeSchoolId(meBody.schoolId);
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
        await authClient.signIn.sso({
          providerId: "google",
          callbackURL: destinationAfterLogin(),
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to sign in with Google.");
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
      setError(err instanceof Error ? err.message : "Unable to sign in with SSO.");
    } finally {
      setLoading(false);
    }
  }

  const showEmail = loginMethods.includes("email");
  const showGoogle = loginMethods.includes("google");
  const showSso = loginMethods.includes("sso");
  const hasExternal = showGoogle || showSso;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-12">
      <LearnerText2>
        {otpStep === "email"
          ? "Enter your email to sign in or create an account"
          : `Enter the six-digit code sent to ${email}.`}
      </LearnerText2>

      {identityLinkToken ? (
        <LearnerText2>
          Continue signing in to connect this learner account to your school admin
          account.
        </LearnerText2>
      ) : null}

      {showEmail ? (
        otpStep === "email" ? (
          <form onSubmit={requestOtp} className="flex flex-col gap-3">
            <LearnerLabel theme={theme} htmlFor="login-email" className="sr-only">
              Email
            </LearnerLabel>
            <LearnerInput
              theme={theme}
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              required
            />
            <LearnerButton type="submit" disabled={loading} className="w-full">
              {loading ? "Sending…" : "Get code"}
            </LearnerButton>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="flex flex-col gap-3">
            <LearnerLabel theme={theme} htmlFor="login-code">
              Code
            </LearnerLabel>
            <LearnerInput
              theme={theme}
              id="login-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
              placeholder="Verification code"
              required
            />
            <LearnerButton type="submit" disabled={loading || otp.length !== 6}>
              {loading ? "Verifying…" : "Continue"}
            </LearnerButton>
            <LearnerButton
              type="button"
              variant="link"
              size="sm"
              onClick={() => {
                setOtpStep("email");
                setOtp("");
                setError(null);
              }}
            >
              Use a different email
            </LearnerButton>
          </form>
        )
      ) : null}

      {showEmail && hasExternal && otpStep === "email" ? (
        <div className="relative my-1 flex items-center justify-center">
          <div className="absolute inset-x-0 border-t border-border" />
          <LearnerText2
            component="span"
            className="relative bg-background px-2 text-xs uppercase text-muted-foreground"
          >
            or
          </LearnerText2>
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

      {error ? (
        <LearnerText2 role="alert" className="text-destructive">
          {error}
        </LearnerText2>
      ) : null}

      <LearnerText2 className="text-center text-xs text-muted-foreground">
        By continuing, you agree to the{" "}
        <Link href="/terms" className="underline">
          Terms
        </Link>
        .
      </LearnerText2>
    </div>
  );
}
