"use client";

import type { WidgetProps } from "@frontlit/page-builder/models";
import {
  Badge,
  Button,
  Caption,
  Header1,
  Header4,
  Label,
  PageCard,
  PageCardImage,
  RadioGroup,
  RadioGroupItem,
  Section,
  Text2,
} from "@frontlit/page-builder/primitives";
import { TextRenderer } from "@frontlit/text-editor";
import { Lock, MessagesSquare, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { planCopy } from "./plan-copy";
import {
  descriptionContent,
  publicApiPath,
  salesData,
  sectionTheme,
} from "../shared/utils";
import type { CommunitySettings } from "./settings";
import { imageAspectRatioClass } from "../_shared/image-aspect-ratio";
import { textSide } from "../_shared/text-side";
import { COMMUNITY_IMAGE_ASPECT_RATIO } from "./constants";

export default function CommunityWidget({
  settings,
  state: { theme },
  pageData,
  editing,
}: WidgetProps<CommunitySettings>) {
  const data = salesData(pageData);
  const resolvedTheme = sectionTheme(theme.theme, settings);
  const community = data?.resourceType === "community" ? data.community : null;
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(
    community?.membership?.status ?? null,
  );
  const communityPath = community?.id
    ? publicApiPath(pageData, `/communities/${encodeURIComponent(community.id)}`)
    : null;

  useEffect(() => {
    if (!community?.id || editing || !communityPath) return;
    let active = true;
    void fetch(communityPath, {
      credentials: "include",
      cache: "no-store",
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
  }, [community?.id, communityPath, editing]);

  if (!community) {
    return (
      <Section
        theme={resolvedTheme}
        id={settings.cssId}
        background={settings.background}
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

  // Free communities that screen new members only take requests.
  const needsApproval = community.autoAcceptMembers === false;
  const title = settings.title?.trim() || community.name;
  const description = settings.description ?? descriptionContent(community.description);
  const plans = [...community.plans].sort(
    (a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)),
  );
  const selected = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];
  const selectedCopy = selected ? planCopy(selected, needsApproval) : null;
  const member = membershipStatus === "active";
  const waiting = membershipStatus === "pending";
  const alignment =
    settings.textAlignment === "center"
      ? "items-center text-center"
      : settings.textAlignment === "right"
        ? "items-end text-right"
        : "items-start";

  async function startCheckout(planId: string) {
    setBusyPlan(planId);
    setError(null);
    try {
      const endpoint = publicApiPath(pageData, "/checkout-sessions");
      if (!endpoint) throw new Error("Checkout is not available here.");
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
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

  const copy = (
    <div className={`flex w-full flex-col gap-5 ${alignment}`}>
      <Caption theme={resolvedTheme} className="flex items-center gap-1.5">
        <MessagesSquare className="size-4" /> Community
      </Caption>
      <Header1 theme={resolvedTheme}>{title}</Header1>
      {community.membersCount > 0 ? (
        <Text2 theme={resolvedTheme} className="flex items-center gap-1.5">
          <Users className="size-4" />
          {community.membersCount === 1
            ? "1 member already inside"
            : `${community.membersCount.toLocaleString()} members already inside`}
        </Text2>
      ) : null}
      {description ? <TextRenderer json={description} theme={resolvedTheme} /> : null}
      {member || waiting ? null : plans.length > 1 ? (
        <RadioGroup
          theme={resolvedTheme}
          value={selected?.id}
          onValueChange={setSelectedPlanId}
          aria-label="Choose a plan"
          className="flex w-full flex-col gap-3 text-left"
        >
          {plans.map((plan) => {
            const details = planCopy(plan, needsApproval);
            const inputId = `community-plan-${plan.id}`;
            return (
              <Label theme={resolvedTheme} key={plan.id} htmlFor={inputId} className="block w-full cursor-pointer">
                <PageCard
                  theme={resolvedTheme}
                  className={`flex items-center gap-4 px-5 py-4 transition-shadow ${plan.id === selected?.id ? "ring-2 ring-current/20" : ""}`}
                >
                  <RadioGroupItem theme={resolvedTheme} id={inputId} value={plan.id} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Header4 theme={resolvedTheme}>{plan.name}</Header4>
                      {plan.isDefault ? (
                        <Badge theme={resolvedTheme} variant="secondary">
                          Recommended
                        </Badge>
                      ) : null}
                    </div>
                    <Text2 theme={resolvedTheme}>{details.detail}</Text2>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                    <Header4 theme={resolvedTheme}>{details.price}</Header4>
                    {details.unit ? <Text2 theme={resolvedTheme}>{details.unit}</Text2> : null}
                  </div>
                </PageCard>
              </Label>
            );
          })}
        </RadioGroup>
      ) : selected && selectedCopy ? (
        <PageCard theme={resolvedTheme} className="flex w-full items-center gap-4 px-5 py-4 text-left">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Header4 theme={resolvedTheme}>{selected.name}</Header4>
            <Text2 theme={resolvedTheme}>{selectedCopy.detail}</Text2>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-right">
            <Header4 theme={resolvedTheme}>{selectedCopy.price}</Header4>
            {selectedCopy.unit ? <Text2 theme={resolvedTheme}>{selectedCopy.unit}</Text2> : null}
          </div>
        </PageCard>
      ) : null}
      {member ? (
        <Button
          theme={resolvedTheme}
          type="button"
          className="w-full"
          onClick={() => window.location.assign("/dashboard")}
        >
          Go to the community
        </Button>
      ) : waiting ? (
        <Text2 theme={resolvedTheme}>
          Your request to join is waiting for approval. We&apos;ll let you know.
        </Text2>
      ) : selected && selectedCopy ? (
        <div className="flex w-full flex-col items-center gap-3">
          <Button
            theme={resolvedTheme}
            type="button"
            className="w-full"
            disabled={editing || busyPlan !== null}
            onClick={() => {
              if (editing) return;
              void startCheckout(selected.id);
            }}
          >
            {busyPlan === selected.id
              ? "Please wait…"
              : settings.buttonCaption?.trim() || selectedCopy.join}
          </Button>
          {selectedCopy.note ? (
            <Text2 theme={resolvedTheme} className="flex items-center gap-1.5">
              <Lock className="size-3.5" /> {selectedCopy.note}
            </Text2>
          ) : null}
        </div>
      ) : (
        <Text2 theme={resolvedTheme}>Joining opens soon.</Text2>
      )}
      {error ? (
        <Text2 theme={resolvedTheme} className="text-destructive">
          {error}
        </Text2>
      ) : null}
    </div>
  );

  const media = community.featuredImage ? (
    <PageCardImage
      theme={resolvedTheme}
      src={community.featuredImage.url}
      alt={community.featuredImage.alt || title}
      className={`w-full rounded-xl border ${imageAspectRatioClass(settings.imageAspectRatio, COMMUNITY_IMAGE_ASPECT_RATIO)}`}
    />
  ) : null;

  const side = textSide(settings.textPosition);
  return (
    <Section theme={resolvedTheme} id={settings.cssId} background={settings.background}>
      {media ? (
        <div
          className={`grid w-full items-start gap-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] ${side === "right" ? "md:[&>*:first-child]:order-2" : ""}`}
        >
          {copy}
          {media}
        </div>
      ) : (
        <div className="flex w-full flex-col gap-8">{copy}</div>
      )}
    </Section>
  );
}
