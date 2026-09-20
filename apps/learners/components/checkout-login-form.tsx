"use client";

import { type FormEvent, useState } from "react";
import { ExternalLoginButton } from "@/components/auth/external-login-button";
import {
  LearnerButton,
  LearnerInput,
  LearnerLabel,
  LearnerText2,
} from "@/components/themed-page-builder";
import { authClient } from "@/lib/auth-client";
import { learnerHeaders, writeSchoolId } from "@/lib/school";
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
  googleProviderId?: string | null;
  ssoProviderId?: string | null;
  onComplete: (learner: Learner) => void;
}) {
  const [otpStep, setOtpStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showEmail = loginMethods.includes("email");
  const showGoogle = loginMethods.includes("google");
  const hasExternal = showGoogle;

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
        throw new Error(result.error.message || "Unable to sign in with Google.");
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to sign in with Google.",
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
              placeholder="Enter your email"
              required
            />
            <LearnerButton type="submit" disabled={loading} className="w-full">
              {loading ? "Sending…" : "Continue with email"}
            </LearnerButton>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="flex flex-col gap-3">
            <LearnerLabel htmlFor="checkout-code">Code</LearnerLabel>
            <LearnerInput
              id="checkout-code"
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
              {loading ? "Verifying…" : "Sign in and continue"}
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
              onClick={signInWithGoogle}
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
