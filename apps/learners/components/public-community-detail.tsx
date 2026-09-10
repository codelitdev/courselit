"use client";

import type {
  communityPaymentPlanSchema,
  communitySchema,
} from "@courselit/api-contract";
import {
  Badge,
  Button,
  Caption,
  Header1,
  Header4,
  PageCard,
  PageCardContent,
  Subheader1,
  Text2,
} from "@frontlit/page-builder/primitives";
import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { LearnerCardImage } from "@/components/themed-page-builder";
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

  if (loading) return <Text2 theme={theme}>Loading community…</Text2>;
  if (!community) return <Text2 theme={theme}>That community is not available.</Text2>;

  const description = richText(community.description);
  const image = community.featuredMedia;

  return (
    <div className="flex flex-col gap-8">
      <Link href="/communities" className="w-fit">
        <Text2 theme={theme} className="hover:underline">
          ← Communities
        </Text2>
      </Link>
      <header className="flex flex-col gap-4">
        <Header1 theme={theme}>{community.name}</Header1>
        <Subheader1 theme={theme} component="span">
          Join the conversation and learn with other members.
        </Subheader1>
      </header>
      <PageCard theme={theme} className="scroll-mt-24 overflow-hidden" id="checkout">
        {image ? (
          <LearnerCardImage
            theme={theme}
            src={image.thumbnailUrl ?? image.canonicalUrl}
            alt={image.altText || community.name}
            className="aspect-video w-full object-cover"
          />
        ) : null}
        <PageCardContent theme={theme} className="flex flex-col gap-5">
          {description ? (
            <TextRenderer json={description} theme={theme} />
          ) : community.description ? (
            <Text2 theme={theme}>{community.description}</Text2>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Caption theme={theme}>{community.membersCount} members</Caption>
            <Caption theme={theme}>{community.postsCount} posts</Caption>
            {community.categories.slice(0, 4).map((category) => (
              <Caption key={category} theme={theme}>
                {category}
              </Caption>
            ))}
          </div>
          {plans.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {plans.map((plan) => (
                <PageCard key={plan.id} theme={theme}>
                  <PageCardContent theme={theme} className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <Header4 theme={theme}>{plan.name}</Header4>
                      <Badge theme={theme} variant="secondary">
                        {planPrice(plan)}
                      </Badge>
                    </div>
                    {plan.description ? (
                      <Text2 theme={theme}>{plan.description}</Text2>
                    ) : null}
                    <Button theme={theme} type="button" asChild>
                      <Link
                        href={`/dashboard/community/${encodeURIComponent(community.id)}`}
                      >
                        Join community
                      </Link>
                    </Button>
                  </PageCardContent>
                </PageCard>
              ))}
            </div>
          ) : (
            <Button theme={theme} type="button" asChild>
              <Link href={`/dashboard/community/${encodeURIComponent(community.id)}`}>
                Join community
              </Link>
            </Button>
          )}
        </PageCardContent>
      </PageCard>
    </div>
  );
}
