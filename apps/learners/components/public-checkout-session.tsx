"use client";

import {
  Badge,
  Button,
  Header1,
  Header4,
  PageCard,
  PageCardContent,
  Text2,
} from "@frontlit/page-builder/primitives";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { learnerHeaders } from "@/lib/school";
import { openRazorpayCheckout, type RazorpayCheckoutData } from "@/lib/razorpay";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

type CheckoutSession = {
  id: string;
  productId: string;
  planId: string;
  productTitle: string;
  productKind: "course" | "download";
  planName: string;
  planDescription: string;
  planType: "free" | "onetime" | "emi" | "subscription";
  currency: string;
  amountMinor: number;
  billingInterval: "month" | "year" | null;
  installmentCount: number | null;
  status: "open" | "completed" | "expired";
  checkoutId: string | null;
  checkoutStatus:
    | "pending"
    | "paid"
    | "failed"
    | "cancelled"
    | "refunded"
    | "disputed"
    | null;
  expiresAt: string;
};

type CheckoutData = RazorpayCheckoutData & {
  provider: "stripe" | "lemonsqueezy" | "razorpay";
  publicKey?: string;
  orderId?: string;
  subscriptionId?: string;
  customerEmail?: string;
  customerName?: string;
};

type StartedCheckout = {
  checkoutUrl?: string | null;
  checkoutData?: CheckoutData | null;
  status?: string;
};

type Learner = { id: string };

function formatPrice(session: CheckoutSession) {
  if (session.planType === "free") return "Free";
  const price = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: session.currency,
  }).format(session.amountMinor / 100);
  if (session.planType === "subscription" && session.billingInterval) {
    return `${price} / ${session.billingInterval}`;
  }
  if (session.planType === "emi" && session.installmentCount) {
    return `${price} × ${session.installmentCount}`;
  }
  return price;
}

export function PublicCheckoutSession({ sessionId }: { sessionId: string }) {
  const theme = useSchoolThemeStyle();
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [learner, setLearner] = useState<Learner | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loginHref = useMemo(
    () => `/login?next=${encodeURIComponent(`/checkout?session=${sessionId}`)}`,
    [sessionId],
  );

  const loadSession = useCallback(async () => {
    const response = await fetch(
      `/api/v1/storefront/checkout-sessions/${encodeURIComponent(sessionId)}`,
      { credentials: "include", cache: "no-store", headers: learnerHeaders() },
    );
    if (!response.ok) throw new Error("This checkout session has expired.");
    setSession((await response.json()) as CheckoutSession);
  }, [sessionId]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadSession(),
      fetch("/api/v1/learner/me", {
        credentials: "include",
        cache: "no-store",
        headers: learnerHeaders(),
      }).then(async (response) => {
        if (response.ok && active) setLearner((await response.json()) as Learner);
      }),
    ])
      .catch((caught) => {
        if (active)
          setError(
            caught instanceof Error ? caught.message : "Unable to load checkout.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadSession]);

  useEffect(() => {
    if (session?.checkoutStatus !== "pending") return;
    const timer = window.setInterval(() => {
      void loadSession().catch(() => {});
    }, 3000);
    return () => window.clearInterval(timer);
  }, [loadSession, session?.checkoutStatus]);

  useEffect(() => {
    if (session?.checkoutStatus === "paid") {
      window.location.assign(
        `/dashboard/courses/${encodeURIComponent(session.productId)}`,
      );
    }
  }, [session?.checkoutStatus, session?.productId]);

  async function continueCheckout() {
    if (!learner || !session) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/v1/learner/checkout-sessions/${encodeURIComponent(session.id)}/checkout`,
        {
          method: "POST",
          credentials: "include",
          headers: learnerHeaders({ "content-type": "application/json" }),
          body: JSON.stringify({
            returnUrl: `${window.location.origin}/checkout?session=${encodeURIComponent(session.id)}`,
          }),
        },
      );
      if (!response.ok) throw new Error("Unable to start checkout.");
      const checkout = (await response.json()) as StartedCheckout;
      if (checkout.checkoutUrl) {
        window.location.assign(checkout.checkoutUrl);
        return;
      }
      if (checkout.checkoutData?.provider === "razorpay") {
        await openRazorpayCheckout({
          data: checkout.checkoutData,
          name: session.productTitle,
          description: session.planName,
        });
        await loadSession();
        setNotice("Payment submitted. We’ll update access after confirmation.");
        return;
      }
      if (checkout.status === "paid") {
        window.location.assign(
          `/dashboard/courses/${encodeURIComponent(session.productId)}`,
        );
        return;
      }
      setNotice("Your payment is processing. This page will update automatically.");
      await loadSession();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue.");
    } finally {
      setBusy(false);
    }
  }


  if (loading) return <Text2 theme={theme}>Loading checkout…</Text2>;
  if (error || !session)
    return <Text2 theme={theme}>{error ?? "Checkout is unavailable."}</Text2>;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Header1 theme={theme}>Complete your purchase</Header1>
        <Text2 theme={theme}>Secure access to your school product.</Text2>
      </header>

      <PageCard theme={theme}>
        <PageCardContent theme={theme} className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Text2 theme={theme}>
                {session.productKind === "course" ? "Course" : "Digital download"}
              </Text2>
              <Header4 theme={theme}>{session.productTitle}</Header4>
              <Text2 theme={theme}>{session.planName}</Text2>
            </div>
            <Badge theme={theme} variant="secondary">
              {formatPrice(session)}
            </Badge>
          </div>
          {session.planDescription ? (
            <Text2 theme={theme}>{session.planDescription}</Text2>
          ) : null}

          {notice ? <Text2 theme={theme}>{notice}</Text2> : null}
          {session.checkoutStatus === "pending" ? (
            <Text2 theme={theme}>
              Payment is processing. We&apos;ll grant access after confirmation.
            </Text2>
          ) : learner ? (
            <Button
              theme={theme}
              type="button"
              disabled={busy}
              onClick={() => void continueCheckout()}
            >
              {busy
                ? "Please wait…"
                : session.planType === "free"
                  ? "Get access"
                  : "Continue to payment"}
            </Button>
          ) : (
            <Button theme={theme} asChild>
              <Link href={loginHref}>Sign in to continue</Link>
            </Button>
          )}
        </PageCardContent>
      </PageCard>
    </div>
  );
}
