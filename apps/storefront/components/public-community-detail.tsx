"use client";

import type {
  communityPaymentPlanSchema,
  communitySchema,
} from "@courselit/api-contract";
import {
  Button,
  Caption,
  Header1,
  Header4,
  Text2,
} from "@frontlit/page-builder/primitives";
import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import { Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { LearnerCard, LearnerCardImage } from "@/components/themed-page-builder";
import { CourseLitLoading } from "@/components/course-lit-loader";
import { learnerHeaders } from "@/lib/school";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

type PublicCommunity = z.infer<typeof communitySchema>;
type CommunityPlan = z.infer<typeof communityPaymentPlanSchema>;

function planPrice(plan: CommunityPlan): string {
  if (plan.amountMinor === 0) return "Free";
  const price = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: plan.currency,
  }).format(plan.amountMinor / 100);
  if (plan.type === "subscription" && plan.billingInterval) {
    return `${price} / ${plan.billingInterval}`;
  }
  if (plan.type === "emi" && plan.installmentCount) {
    return `${price} × ${plan.installmentCount}`;
  }
  return price;
}

function richText(value: string): TextEditorContent | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as { type?: unknown }).type === "doc" &&
      Array.isArray((parsed as { content?: unknown }).content)
    ) {
      return parsed as TextEditorContent;
    }
  } catch {
    // Older community descriptions are plain text.
  }
  return null;
}

export function PublicCommunityDetail({ communityId }: { communityId: string }) {
  const theme = useSchoolThemeStyle();
  const [community, setCommunity] = useState<PublicCommunity | null>(null);
  const [plans, setPlans] = useState<CommunityPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch(`/api/v1/public/communities/${encodeURIComponent(communityId)}`, {
        credentials: "include",
        cache: "no-store",
      }),
      fetch(`/api/v1/public/communities/${encodeURIComponent(communityId)}/plans`, {
        credentials: "include",
        cache: "no-store",
      }),
    ])
      .then(async ([communityResponse, plansResponse]) => {
        if (!active) return;
        if (!communityResponse.ok) return;
        setCommunity((await communityResponse.json()) as PublicCommunity);
        if (plansResponse.ok) {
          const body = (await plansResponse.json()) as { items?: CommunityPlan[] };
          setPlans(body.items ?? []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [communityId]);

  if (loading) return <CourseLitLoading label="Loading community" />;
  if (!community) return <Text2 theme={theme}>That community is not available.</Text2>;

  const description = richText(community.description);
  const image = community.featuredImage;
  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ??
    plans.find((plan) => plan.isDefault) ??
    plans[0];
  const currentCommunity = community;

  async function checkoutResponseError(response: Response, fallback: string) {
    try {
      const body = (await response.json()) as { message?: unknown };
      if (typeof body.message === "string" && body.message.trim()) {
        return body.message;
      }
    } catch {
      // Keep the stable fallback for non-JSON proxy responses.
    }
    return fallback;
  }

  async function startCheckout() {
    if (!selectedPlan || checkoutBusy) return;
    setCheckoutBusy(true);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/v1/storefront/checkout-sessions", {
        method: "POST",
        credentials: "include",
        headers: learnerHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({
          communityId: currentCommunity.id,
          planId: selectedPlan.id,
        }),
      });
      if (!response.ok) {
        throw new Error(
          await checkoutResponseError(response, "Unable to start checkout."),
        );
      }
      const session = (await response.json()) as { id?: unknown };
      if (typeof session.id !== "string" || !session.id) {
        throw new Error("Unable to create checkout session.");
      }
      window.location.assign(`/checkout?session=${encodeURIComponent(session.id)}`);
    } catch (caught) {
      setCheckoutError(
        caught instanceof Error ? caught.message : "Unable to start checkout.",
      );
    } finally {
      setCheckoutBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-16">
      <section id="checkout" className="scroll-mt-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          {image ? (
            <LearnerCardImage
              theme={theme}
              src={image.thumbnailUrl ?? image.url}
              alt={image.alt || community.name}
              className="aspect-[4/3] w-full border object-cover"
            />
          ) : (
            <LearnerCard className="hidden aspect-[4/3] border-dashed bg-muted/30 p-0 md:block">
              <span aria-hidden />
            </LearnerCard>
          )}
          <div className="flex flex-col items-start gap-4">
            <Caption theme={theme}>Community</Caption>
            <Header1 theme={theme}>{community.name}</Header1>
            {description ? (
              <TextRenderer json={description} theme={theme} />
            ) : community.description ? (
              <Text2 theme={theme}>{community.description}</Text2>
            ) : null}
            <Text2 theme={theme} className="flex items-center gap-1">
              <Users className="size-4" /> {community.membersCount} members
            </Text2>
            {plans.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {plans.map((plan) => (
                  <Button
                    key={plan.id}
                    type="button"
                    theme={theme}
                    size="sm"
                    variant={selectedPlan?.id === plan.id ? "secondary" : "outline"}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    {plan.name}
                  </Button>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-4">
              {selectedPlan ? (
                <Header4 theme={theme}>{planPrice(selectedPlan)}</Header4>
              ) : null}
              <Button
                theme={theme}
                type="button"
                disabled={!selectedPlan || checkoutBusy}
                onClick={() => void startCheckout()}
              >
                {checkoutBusy ? "Please wait…" : "Join community"}
              </Button>
            </div>
            {checkoutError ? (
              <Text2 theme={theme} className="text-destructive">
                {checkoutError}
              </Text2>
            ) : null}
            {selectedPlan?.description ? (
              <Text2 theme={theme} className="max-w-md text-muted-foreground">
                {selectedPlan.description}
              </Text2>
            ) : null}
          </div>
        </div>
      </section>
      <Link href="/communities" className="w-fit">
        <Text2 theme={theme} className="hover:underline">
          ← Communities
        </Text2>
      </Link>
    </div>
  );
}
