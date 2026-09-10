"use client";

import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { learnerHeaders, writeSchoolId } from "@/lib/school";
import { ExternalLoginButton } from "./auth/external-login-button";
import { LearnerButton, LearnerInput, LearnerText2 } from "./themed-page-builder";

type Learner = {
  id: string;
  email: string;
  name: string;
  schoolId?: string;
};

export function CheckoutLoginForm({
  checkoutPath,
  loginMethods,
  onComplete,
}: {
  checkoutPath: string;
  loginMethods: string[];
  onComplete: (learner: Learner) => void;
}) {
  const [otpStep, setOtpStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showEmail = loginMethods.includes("email");
  const showGoogle = loginMethods.includes("google");
  const showSso = loginMethods.includes("sso");
  const hasExternal = showGoogle || showSso;

  async function completeFromSession() {
    const response = await fetch("/api/v1/learner/me", {
      headers: learnerHeaders(),
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Unable to establish your learner session.");
    const learner = (await response.json()) as Learner;
    if (learner.schoolId) writeSchoolId(learner.schoolId);
    onComplete(learner);
  }

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (result.error)
        throw new Error(result.error.message || "Unable to send a sign-in code.");
      setOtpStep("otp");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to send a sign-in code.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.signIn.emailOtp({ email, otp });
      if (result.error)
        throw new Error(result.error.message || "Invalid or expired code.");
      await completeFromSession();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to verify the sign-in code.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: checkoutPath,
      });
      if (result?.error) {
        await authClient.signIn.sso({
          providerId: "google",
          callbackURL: checkoutPath,
        });
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to sign in with Google.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function signInWithSso() {
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.signIn.sso({
        providerId: "sso",
        callbackURL: checkoutPath,
      });
      if (result?.error)
        setError(result.error.message || "Unable to sign in with SSO.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to sign in with SSO.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {showEmail ? (
        otpStep === "email" ? (
          <form onSubmit={requestOtp} className="flex flex-col gap-3">
            <LearnerInput
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              required
            />
            <LearnerButton type="submit" disabled={loading} className="w-full">
              {loading ? "Sending…" : "Continue"}
            </LearnerButton>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="flex flex-col gap-3">
            <LearnerText2 className="text-muted-foreground">
              Enter the six-digit code sent to {email}.
            </LearnerText2>
            <LearnerInput
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
              placeholder="Verification code"
              required
            />
            <LearnerButton
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full"
            >
              {loading ? "Verifying…" : "Continue"}
            </LearnerButton>
            <LearnerButton
              type="button"
              onClick={() => {
                setOtpStep("email");
                setOtp("");
                setError(null);
              }}
              variant="ghost"
              className="text-muted-foreground"
            >
              Use a different email
            </LearnerButton>
          </form>
        )
      ) : null}

      {showEmail && hasExternal && otpStep === "email" ? (
        <div className="relative flex items-center justify-center py-1">
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
              onClick={signInWithGoogle}
            />
          ) : null}
          {showSso ? (
            <ExternalLoginButton
              provider="sso"
              disabled={loading}
              onClick={signInWithSso}
            />
          ) : null}
        </div>
      ) : null}

      {error ? (
        <LearnerText2 className="text-destructive" role="alert">
          {error}
        </LearnerText2>
      ) : null}
    </div>
  );
}
