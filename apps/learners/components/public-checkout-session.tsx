"use client";

import {
  Button,
  Caption,
  Header1,
  Header4,
  PageCard,
  PageCardContent,
  Text2,
} from "@frontlit/page-builder/primitives";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckoutLoginForm } from "@/components/checkout-login-form";
import {
  LearnerCardImage,
  LearnerOptionLabel,
  LearnerRadio,
} from "@/components/themed-page-builder";
import { openRazorpayCheckout, type RazorpayCheckoutData } from "@/lib/razorpay";
import { learnerHeaders, writeSchoolId } from "@/lib/school";
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

type Product = {
  title: string;
  description: string;
  featuredMedia: {
    canonicalUrl: string;
    thumbnailUrl: string | null;
    altText: string;
  } | null;
};

type Plan = {
  id: string;
  name: string;
  description: string;
  type: "free" | "onetime" | "emi" | "subscription";
  currency: string;
  amountMinor: number;
  billingInterval: "month" | "year" | null;
  installmentCount: number | null;
  isDefault?: boolean;
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

type Learner = {
  id: string;
  email: string;
  name: string;
  schoolId?: string;
};

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

function formatPlanPrice(plan: Plan) {
  const price = formatMoney(plan.amountMinor, plan.currency);
  if (plan.type === "subscription" && plan.billingInterval) {
    return `${price} / ${plan.billingInterval}`;
  }
  if (plan.type === "emi" && plan.installmentCount) {
    return `${price} × ${plan.installmentCount}`;
  }
  return price;
}

function fallbackPlan(session: CheckoutSession): Plan {
  return {
    id: session.planId,
    name: session.planName,
    description: session.planDescription,
    type: session.planType,
    currency: session.currency,
    amountMinor: session.amountMinor,
    billingInterval: session.billingInterval,
    installmentCount: session.installmentCount,
    isDefault: true,
  };
}

async function openCourse(productId: string) {
  let slug = productId;
  try {
    const response = await fetch(`/api/v1/products/${encodeURIComponent(productId)}`, {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(),
    });
    if (response.ok) {
      const product = (await response.json()) as { slug?: string };
      if (product.slug) slug = product.slug;
    }
  } catch {
    // Keep the canonical route shape even if the post-checkout refresh fails.
  }
  window.location.assign(
    `/course/${encodeURIComponent(slug)}/${encodeURIComponent(productId)}`,
  );
}

export function PublicCheckoutSession({ sessionId }: { sessionId: string }) {
  const theme = useSchoolThemeStyle();
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [learner, setLearner] = useState<Learner | null>(null);
  const [loginMethods, setLoginMethods] = useState<string[]>(["email"]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const loadSession = useCallback(async (checkoutSessionId: string) => {
    const response = await fetch(
      `/api/v1/storefront/checkout-sessions/${encodeURIComponent(checkoutSessionId)}`,
      { credentials: "include", cache: "no-store", headers: learnerHeaders() },
    );
    if (!response.ok) throw new Error("This checkout session has expired.");
    const nextSession = (await response.json()) as CheckoutSession;
    setSession(nextSession);
    setSelectedPlanId((current) => current ?? nextSession.planId);
    return nextSession;
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadSession(sessionId),
      fetch("/api/v1/learner/me", {
        credentials: "include",
        cache: "no-store",
        headers: learnerHeaders(),
      }).then(async (response) => {
        if (response.ok && active) {
          const nextLearner = (await response.json()) as Learner;
          if (nextLearner.schoolId) writeSchoolId(nextLearner.schoolId);
          setLearner(nextLearner);
        }
      }),
      fetch("/api/v1/public/school/login-methods", {
        credentials: "include",
        cache: "no-store",
        headers: learnerHeaders(),
      }).then(async (response) => {
        if (!response.ok || !active) return;
        const body = (await response.json()) as { loginMethods?: string[] };
        if (Array.isArray(body.loginMethods)) setLoginMethods(body.loginMethods);
      }),
    ])
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "Unable to load checkout.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadSession, sessionId]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    void Promise.all([
      fetch(`/api/v1/products/${encodeURIComponent(session.productId)}`, {
        credentials: "include",
        cache: "no-store",
        headers: learnerHeaders(),
      }),
      fetch(
        `/api/v1/storefront/products/${encodeURIComponent(session.productId)}/plans`,
        {
          credentials: "include",
          cache: "no-store",
          headers: learnerHeaders(),
        },
      ),
    ])
      .then(async ([productResponse, plansResponse]) => {
        if (!active) return;
        if (productResponse.ok) setProduct((await productResponse.json()) as Product);
        if (plansResponse.ok) {
          const body = (await plansResponse.json()) as { items?: Plan[] };
          setPlans(body.items?.length ? body.items : [fallbackPlan(session)]);
        } else {
          setPlans([fallbackPlan(session)]);
        }
      })
      .catch(() => {
        if (active) setPlans([fallbackPlan(session)]);
      });
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!session?.checkoutId || session.checkoutStatus !== "pending") return;
    const timer = window.setInterval(() => {
      void loadSession(session.id).catch(() => {});
    }, 3000);
    return () => window.clearInterval(timer);
  }, [loadSession, session?.checkoutId, session?.checkoutStatus, session?.id]);

  useEffect(() => {
    if (session?.checkoutStatus === "paid") {
      void openCourse(session.productId);
    }
  }, [session?.checkoutStatus, session?.productId]);

  const selectedPlan = useMemo(
    () =>
      plans.find((plan) => plan.id === selectedPlanId) ??
      plans.find((plan) => plan.id === session?.planId) ??
      plans.find((plan) => plan.isDefault) ??
      plans[0],
    [plans, selectedPlanId, session?.planId],
  );

  const loginPath = `/checkout?session=${encodeURIComponent(session?.id ?? sessionId)}`;

  async function createSessionForPlan(plan: Plan) {
    if (!session) throw new Error("Checkout is unavailable.");
    const response = await fetch("/api/v1/storefront/checkout-sessions", {
      method: "POST",
      credentials: "include",
      headers: learnerHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ productId: session.productId, planId: plan.id }),
    });
    if (!response.ok) throw new Error("Unable to select this plan.");
    const nextSession = (await response.json()) as CheckoutSession;
    setSession(nextSession);
    setSelectedPlanId(nextSession.planId);
    window.history.replaceState(
      null,
      "",
      `/checkout?session=${encodeURIComponent(nextSession.id)}`,
    );
    return nextSession;
  }

  async function selectPlan(plan: Plan) {
    if (!session || plan.id === selectedPlanId || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setSelectedPlanId(plan.id);
    try {
      await createSessionForPlan(plan);
    } catch (caught) {
      setSelectedPlanId(session.planId);
      setError(
        caught instanceof Error ? caught.message : "Unable to select this plan.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function continueCheckout() {
    if (!learner || !session || !selectedPlan) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const activeSession =
        session.planId === selectedPlan.id && session.status === "open"
          ? session
          : await createSessionForPlan(selectedPlan);
      const response = await fetch(
        `/api/v1/learner/checkout-sessions/${encodeURIComponent(activeSession.id)}/checkout`,
        {
          method: "POST",
          credentials: "include",
          headers: learnerHeaders({ "content-type": "application/json" }),
          body: JSON.stringify({
            returnUrl: `${window.location.origin}/checkout?session=${encodeURIComponent(activeSession.id)}`,
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
          name: product?.title ?? activeSession.productTitle,
          description: activeSession.planName,
        });
        await loadSession(activeSession.id);
        setNotice("Payment submitted. We’ll update access after confirmation.");
        return;
      }
      if (checkout.status === "paid") {
        await openCourse(activeSession.productId);
        return;
      }
      setNotice("Your payment is processing. This page will update automatically.");
      await loadSession(activeSession.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Text2 theme={theme}>Loading checkout…</Text2>;
  if (error || !session) {
    return <Text2 theme={theme}>{error ?? "Checkout is unavailable."}</Text2>;
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl items-start gap-x-8 gap-y-10 md:grid-cols-[minmax(0,1fr)_22.5rem]">
      <main className="flex min-w-0 flex-col gap-9">
        <Header1 theme={theme}>Checkout</Header1>

        <section className="flex flex-col gap-4">
          <Header4 theme={theme}>Personal Information</Header4>
          {learner ? (
            <div className="flex flex-col gap-2 text-sm">
              <Text2 theme={theme} component="span">
                <strong>Email:</strong> {learner.email}
              </Text2>
              <Text2 theme={theme} component="span">
                <strong>Name:</strong> {learner.name}
              </Text2>
            </div>
          ) : (
            <CheckoutLoginForm
              checkoutPath={loginPath}
              loginMethods={loginMethods}
              onComplete={setLearner}
            />
          )}
          <Text2 theme={theme} className="text-muted-foreground">
            By submitting, you accept the{" "}
            <Link href="/terms" className="underline">
              Terms
            </Link>
            .
          </Text2>
        </section>

        <section className="flex flex-col gap-4">
          <Header4 theme={theme}>Select Your Plan</Header4>
          {plans.length > 0 ? (
            <div className="flex flex-col gap-3">
              {plans.map((plan) => {
                const selected = selectedPlan?.id === plan.id;
                return (
                  <div key={plan.id} className="flex items-start gap-3">
                    <LearnerRadio
                      theme={theme}
                      id={`checkout-plan-${plan.id}`}
                      type="radio"
                      name="checkout-plan"
                      value={plan.id}
                      checked={selected}
                      onChange={() => void selectPlan(plan)}
                      disabled={!learner || busy}
                    />
                    <LearnerOptionLabel
                      theme={theme}
                      htmlFor={`checkout-plan-${plan.id}`}
                      className={`flex min-h-28 flex-1 cursor-pointer flex-col gap-1 px-4 py-4 transition-colors ${
                        selected
                          ? "border-primary ring-1 ring-primary"
                          : "border-border"
                      } ${!learner ? "cursor-not-allowed opacity-70" : "hover:bg-muted/40"}`}
                    >
                      <Text2 theme={theme} component="span" className="font-semibold">
                        {plan.name}
                      </Text2>
                      {plan.description ? (
                        <Text2
                          theme={theme}
                          component="span"
                          className="text-muted-foreground"
                        >
                          {plan.description}
                        </Text2>
                      ) : null}
                      <Text2 theme={theme} component="span" className="font-semibold">
                        {formatPlanPrice(plan)}
                      </Text2>
                    </LearnerOptionLabel>
                  </div>
                );
              })}
            </div>
          ) : (
            <Text2 theme={theme}>This product is not available for checkout yet.</Text2>
          )}

          {notice ? <Text2 theme={theme}>{notice}</Text2> : null}
          {error ? (
            <Text2 theme={theme} className="text-destructive">
              {error}
            </Text2>
          ) : null}
          <Button
            theme={theme}
            type="button"
            disabled={
              !learner || !selectedPlan || busy || session.checkoutStatus === "pending"
            }
            onClick={() => void continueCheckout()}
            className="w-fit"
          >
            {busy ? "Please wait…" : "Complete Purchase"}
          </Button>
        </section>
      </main>

      <aside className="md:pt-16">
        <PageCard theme={theme}>
          <PageCardContent theme={theme} className="flex flex-col gap-5">
            <Header4 theme={theme}>Order summary</Header4>
            <div className="flex items-center gap-3">
              {product?.featuredMedia ? (
                <LearnerCardImage
                  theme={theme}
                  src={
                    product.featuredMedia.thumbnailUrl ??
                    product.featuredMedia.canonicalUrl
                  }
                  alt={product.featuredMedia.altText || product.title}
                  className="size-14 shrink-0 border object-cover"
                />
              ) : (
                <PageCard
                  aria-hidden
                  className="size-14 shrink-0 border-dashed bg-muted/30 p-0"
                >
                  <span aria-hidden />
                </PageCard>
              )}
              <div className="min-w-0">
                <Text2 theme={theme} className="truncate font-semibold">
                  {product?.title ?? session.productTitle}
                </Text2>
                <Caption theme={theme}>
                  {selectedPlan?.name ?? session.planName}
                </Caption>
              </div>
            </div>
            <div className="flex items-end justify-between gap-4 border-t border-border pt-4">
              <div className="flex flex-col gap-1">
                <Text2 theme={theme} component="span" className="font-semibold">
                  Total
                </Text2>
                <Caption theme={theme}>
                  {selectedPlan?.type === "free" ? "Free plan" : selectedPlan?.name}
                </Caption>
              </div>
              <Text2 theme={theme} component="span" className="text-lg font-semibold">
                {selectedPlan
                  ? formatMoney(selectedPlan.amountMinor, selectedPlan.currency)
                  : formatMoney(session.amountMinor, session.currency)}
              </Text2>
            </div>
          </PageCardContent>
        </PageCard>
      </aside>
    </div>
  );
}
