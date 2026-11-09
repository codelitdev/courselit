"use client";

import { publicApiPath, useLegalPages, useSchoolId } from "@/components/school-context";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { CourseLitLoadingIcon } from "@/components/course-lit-loader";
import { ExternalLoginButton } from "@/components/auth/external-login-button";
import {
  LearnerButton,
  LearnerInput,
  LearnerLabel,
  LearnerText2,
} from "@/components/themed-page-builder";
import {
  requestEmailCode,
  signInWithGoogle,
  verifyEmailCode,
} from "@/lib/learner-sign-in";
import {
  clearLearnerIdentityLink,
  learnerHeaders,
  writeLearnerIdentityLink,
} from "@/lib/school";
import { readSignedInHint } from "@/lib/header-account";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

type OtpStep = "email" | "otp";

function destinationAfterLogin() {
  if (typeof window === "undefined") return "/dashboard";
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

/**
 * CourseLit-owned login block rendered inside the runtime site page. The page
 * renderer owns the surrounding header, footer, section, and theme.
 */
export function PublicLoginBlock() {
  const theme = useSchoolThemeStyle();
  const schoolId = useSchoolId();
  const legalPages = useLegalPages();
  const [otpStep, setOtpStep] = useState<OtpStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [identityLinkToken] = useState(() => {
    if (typeof window === "undefined") return "";
    const query = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    return fragment.get("identityLink") ?? query.get("identityLink") ?? "";
  });
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("error") === "google"
      ? "Google sign-in didn't finish. Please try again."
      : null;
  });
  const [loading, setLoading] = useState(false);
  const [loginMethods, setLoginMethods] = useState<string[]>(["email"]);

  // A learner who is already signed in (Back after signing in, a bookmark, a
  // page restored from the back/forward cache) goes straight on. Only browsers
  // that signed in before are checked, so other visitors make no request.
  useEffect(() => {
    if (identityLinkToken) return;
    let active = true;
    function continueIfSignedIn() {
      if (!readSignedInHint()) return;
      void fetch("/api/v1/learner/me", {
        cache: "no-store",
        credentials: "include",
        headers: learnerHeaders(),
      })
        .then((response) => {
          if (active && response.ok) window.location.replace(destinationAfterLogin());
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
  }, [identityLinkToken]);

  useEffect(() => {
    void fetch(publicApiPath(schoolId, "/login-methods"))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { loginMethods?: string[] } | null) => {
        if (data?.loginMethods && Array.isArray(data.loginMethods)) {
          setLoginMethods(data.loginMethods);
        }
      })
      .catch(() => {});
  }, [schoolId]);

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestEmailCode(email);
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
      await verifyEmailCode(email, otp);
      const meHeaders = learnerHeaders();
      if (identityLinkToken) meHeaders.set("x-learner-identity-link", identityLinkToken);
      const meRes = await fetch("/api/v1/learner/me", {
        headers: meHeaders,
        credentials: "include",
      });
      if (!meRes.ok) {
        const errorBody = (await meRes.json().catch(() => null)) as {
          message?: string;
          debug?: unknown;
        } | null;
        console.error("GET /api/v1/learner/me failed:", errorBody);
        throw new Error(
          errorBody?.message || "Unable to establish your learner session.",
        );
      }
      clearLearnerIdentityLink();
      // Replace, not push: Back after signing in should not land on this form.
      window.location.replace(destinationAfterLogin());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to verify the sign-in code.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    if (identityLinkToken) writeLearnerIdentityLink(identityLinkToken);
    signInWithGoogle(destinationAfterLogin());
  }

  const showEmail = loginMethods.includes("email");
  const showGoogle = loginMethods.includes("google");
  const hasExternal = showGoogle;

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
            <LearnerButton
              type="submit"
              disabled={loading}
              className="w-full"
              aria-label={loading ? "Sending" : "Get code"}
            >
              {loading ? <CourseLitLoadingIcon size={14} /> : "Get code"}
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
            <LearnerButton
              type="submit"
              disabled={loading || otp.length !== 6}
              aria-label={loading ? "Verifying" : "Continue"}
            >
              {loading ? <CourseLitLoadingIcon size={14} /> : "Continue"}
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
        </div>
      ) : null}

      {error ? (
        <LearnerText2 role="alert" className="text-destructive">
          {error}
        </LearnerText2>
      ) : null}

      {legalPages.terms ? (
        <LearnerText2 className="text-center text-xs text-muted-foreground">
          By continuing, you agree to the{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>
          .
        </LearnerText2>
      ) : null}
    </div>
  );
}
