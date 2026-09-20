"use client";

import type { WidgetProps } from "@frontlit/page-builder/models";
import {
  Button,
  Caption,
  Header1,
  Header4,
  PageCard,
  PageCardImage,
  Section,
  Text2,
} from "@frontlit/page-builder/primitives";
import { TextRenderer } from "@frontlit/text-editor";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  descriptionContent,
  learnerHeaders,
  planPrice,
  salesData,
  sectionTheme,
} from "../shared/utils";
import type { CommunitySettings } from "./settings";

export default function CommunityWidget({
  settings,
  state: { theme },
  pageData,
  editing,
  nextTheme,
}: WidgetProps<CommunitySettings>) {
  const data = salesData(pageData);
  const resolvedTheme = sectionTheme(theme.theme, settings);
  const community = data?.resourceType === "community" ? data.community : null;
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(
    community?.membership?.status ?? null,
  );

  useEffect(() => {
    if (!community?.id || editing) return;
    let active = true;
    void fetch(`/api/v1/public/communities/${encodeURIComponent(community.id)}`, {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(),
    })
      .then(async (response) => {
        if (!response.ok || !active) return;
        const body = (await response.json()) as {
          membership?: { status?: string } | null;
        };
        setMembershipStatus(body.membership?.status ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [community?.id, editing]);

  if (!community) {
    return (
      <Section
        theme={resolvedTheme}
        id={settings.cssId}
        background={settings.background}
        nextTheme={nextTheme}
      >
        <PageCard
          theme={resolvedTheme}
          className="flex min-h-56 w-full items-center justify-center border-dashed px-6 py-6 text-center"
        >
          <Text2 theme={resolvedTheme}>Community</Text2>
        </PageCard>
      </Section>
    );
  }

  const title = settings.title?.trim();
  const description = settings.description ?? descriptionContent(community.description);

  async function startCheckout(planId: string) {
    setBusyPlan(planId);
    setError(null);
    try {
      const response = await fetch("/api/v1/storefront/checkout-sessions", {
        method: "POST",
        credentials: "include",
        headers: learnerHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ communityId: community!.id, planId }),
      });
      if (!response.ok) throw new Error("Unable to start checkout.");
      const body = (await response.json()) as { id?: string };
      if (!body.id) throw new Error("Unable to create checkout session.");
      window.location.assign(`/checkout?session=${encodeURIComponent(body.id)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue.");
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <Section
      theme={resolvedTheme}
      id={settings.cssId}
      background={settings.background}
      nextTheme={nextTheme}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Caption theme={resolvedTheme}>Community</Caption>
          {title ? <Header1 theme={resolvedTheme}>{title}</Header1> : null}
          {description ? (
            <TextRenderer json={description} theme={resolvedTheme} />
          ) : null}
          <Text2 theme={resolvedTheme} className="flex items-center gap-1">
            <Users className="size-4" /> {community.membersCount} members
          </Text2>
        </div>
        {community.featuredImage ? (
          <PageCardImage
            theme={resolvedTheme}
            src={community.featuredImage.thumbnailUrl ?? community.featuredImage.url}
            alt={community.featuredImage.alt || "Community"}
            className="aspect-[4/3] w-full rounded-xl border object-cover"
          />
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {community.plans.map((plan) => (
            <PageCard
              theme={resolvedTheme}
              key={plan.id}
              className="flex flex-col gap-3 p-5"
            >
              <Header4 theme={resolvedTheme}>{plan.name}</Header4>
              {plan.description ? (
                <Text2 theme={resolvedTheme}>{plan.description}</Text2>
              ) : null}
              <Header4 theme={resolvedTheme}>{planPrice(plan)}</Header4>
              {editing ? (
                <Button theme={resolvedTheme} type="button" disabled>
                  {settings.buttonCaption?.trim() || "Join community"}
                </Button>
              ) : membershipStatus === "active" ? (
                <Button
                  theme={resolvedTheme}
                  type="button"
                  onClick={() => window.location.assign("/dashboard")}
                >
                  Already owned
                </Button>
              ) : (
                <Button
                  theme={resolvedTheme}
                  type="button"
                  disabled={busyPlan !== null}
                  onClick={() => void startCheckout(plan.id)}
                >
                  {busyPlan === plan.id
                    ? "Please wait…"
                    : settings.buttonCaption?.trim() || "Join community"}
                </Button>
              )}
            </PageCard>
          ))}
        </div>
        {error ? (
          <Text2 theme={resolvedTheme} className="text-destructive">
            {error}
          </Text2>
        ) : null}
      </div>
    </Section>
  );
}
