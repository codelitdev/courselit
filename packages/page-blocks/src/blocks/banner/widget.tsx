"use client";

import type { WidgetProps } from "@frontlit/page-builder/models";
import {
  Button,
  Caption,
  Header1,
  Header4,
  Input,
  Label,
  PageCard,
  PageCardImage,
  Section,
  Text2,
} from "@frontlit/page-builder/primitives";
import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import { Mail, Users } from "lucide-react";
import { useState } from "react";
import type { BannerResource } from "../shared/types";
import {
  descriptionContent,
  learnerHeaders,
  planPrice,
  salesData,
  sectionTheme,
} from "../shared/utils";
import type { BannerSettings } from "./settings";

function resourceForBanner(
  data: NonNullable<ReturnType<typeof salesData>>,
): BannerResource | null {
  if (data.resourceType !== "product") return null;
  return {
    id: data.product.id,
    slug: data.product.slug,
    title: data.product.title,
    description: data.product.description,
    kind: data.product.kind,
    leadMagnet: data.product.leadMagnet,
    enrolled: data.product.enrolled ?? false,
    membersCount: null,
    featuredImage: data.product.featuredImage,
    plans: data.product.plans,
    includedWithCommunity: data.product.includedWithCommunity,
    community: data.product.community,
  };
}

export default function BannerWidget({
  settings,
  state: { theme },
  pageData,
  editing,
  nextTheme,
}: WidgetProps<BannerSettings>) {
  const data = salesData(pageData);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const resolvedTheme = sectionTheme(theme.theme, settings);

  if (!data) {
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
          <Text2 theme={resolvedTheme}>Sales banner</Text2>
        </PageCard>
      </Section>
    );
  }

  const resourceType = data.resourceType;
  const resource = resourceForBanner(data);
  if (!resource) {
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
          <Text2 theme={resolvedTheme}>Select a product</Text2>
        </PageCard>
      </Section>
    );
  }
  const productPlans = resource.plans;
  const communityPlans = resource.community?.plans ?? [];
  const title =
    settings.title?.trim() || settings.customTitle?.trim() || resource.title;
  const description: TextEditorContent | null =
    settings.description ??
    settings.customDescription ??
    descriptionContent(resource.description);
  const leadMagnet =
    resource.leadMagnet && productPlans.some((plan) => plan.type === "free");
  const media = resource.featuredImage ? (
    <PageCardImage
      theme={resolvedTheme}
      src={resource.featuredImage.thumbnailUrl ?? resource.featuredImage.url}
      alt={resource.featuredImage.alt || resource.title}
      className="aspect-[4/3] w-full rounded-xl border object-cover"
    />
  ) : null;
  const hasMedia = Boolean(resource.featuredImage);

  async function startCheckout(planId: string, kind: "product" | "community") {
    setBusyPlan(planId);
    setError(null);
    try {
      const response = await fetch("/api/v1/storefront/checkout-sessions", {
        method: "POST",
        credentials: "include",
        headers: learnerHeaders({ "content-type": "application/json" }),
        body: JSON.stringify(
          kind === "product"
            ? { productId: resource?.id, planId }
            : { communityId: resource?.community?.id, planId },
        ),
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
    <div
      className={
        settings.textAlignment === "center"
          ? "flex flex-col items-center gap-4 text-center"
          : settings.textAlignment === "right"
            ? "flex flex-col items-end gap-4 text-right"
            : "flex flex-col items-start gap-4"
      }
    >
      <Caption theme={resolvedTheme}>
        {resource.kind === "course" ? "Course" : "Digital download"}
      </Caption>
      <Header1 theme={resolvedTheme}>{title}</Header1>
      {description ? <TextRenderer json={description} theme={resolvedTheme} /> : null}
      {resource.membersCount !== null ? (
        <Text2 theme={resolvedTheme} className="flex items-center gap-1">
          <Users className="size-4" /> {resource.membersCount} members
        </Text2>
      ) : null}
      {productPlans.length > 0 ? (
        <div className="flex w-full flex-col gap-3">
          <Caption theme={resolvedTheme}>Buy this course</Caption>
          {productPlans.map((plan) => (
            <PageCard theme={resolvedTheme} key={plan.id} className="flex flex-col gap-2 p-4">
              <Header4 theme={resolvedTheme}>{plan.name}</Header4>
              <Text2 theme={resolvedTheme}>{planPrice(plan)}</Text2>
              {leadMagnet && plan.type === "free" ? (
                <form
                  className="flex w-full max-w-sm flex-col gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (editing) return;
                    if (!email.trim()) {
                      setError("Enter your email to continue.");
                      return;
                    }
                    void startCheckout(plan.id, "product");
                  }}
                >
                  <Label theme={resolvedTheme} className="sr-only" htmlFor="product-lead-email">
                    Email
                  </Label>
                  <div className="flex w-full items-center gap-2">
                    <Mail className="size-4 shrink-0 text-muted-foreground" />
                    <Input
                      theme={resolvedTheme}
                      id="product-lead-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.currentTarget.value)}
                      placeholder="Enter your email"
                      className="min-w-0 flex-1"
                      required
                    />
                  </div>
                  <Button theme={resolvedTheme} type="submit" disabled={editing || busyPlan !== null}>
                    {busyPlan === plan.id ? "Please wait…" : "Get for free"}
                  </Button>
                </form>
              ) : (
                <Button
                  theme={resolvedTheme}
                  type="button"
                  disabled={editing || busyPlan !== null}
                  onClick={() => {
                    if (editing) return;
                    void startCheckout(plan.id, "product");
                  }}
                >
                  {busyPlan === plan.id
                    ? "Please wait…"
                    : resource.enrolled
                      ? "Continue learning"
                      : plan.type === "free"
                        ? "Get for free"
                        : "Buy now"}
                </Button>
              )}
            </PageCard>
          ))}
        </div>
      ) : null}
      {communityPlans.length > 0 ? (
        <div className="flex w-full flex-col gap-3">
          <Caption theme={resolvedTheme}>Included with community</Caption>
          {communityPlans.map((plan) => (
            <PageCard theme={resolvedTheme} key={plan.id} className="flex flex-col gap-2 p-4">
              <Header4 theme={resolvedTheme}>{plan.name}</Header4>
              <Text2 theme={resolvedTheme}>{planPrice(plan)}</Text2>
              <Button
                theme={resolvedTheme}
                type="button"
                disabled={editing || busyPlan !== null}
                onClick={() => {
                  if (editing) return;
                  void startCheckout(plan.id, "community");
                }}
              >
                {busyPlan === plan.id ? "Please wait…" : "Join community"}
              </Button>
            </PageCard>
          ))}
        </div>
      ) : null}
      {error ? (
        <Text2 theme={resolvedTheme} className="text-destructive">
          {error}
        </Text2>
      ) : null}
    </div>
  );

  const position = settings.textPosition ?? "left";
  const content =
    position === "top" || position === "bottom" ? (
      <div className="flex w-full flex-col gap-8">
        {position === "top" ? copy : media}
        {position === "top" ? media : copy}
      </div>
    ) : (
      <div
        className={`grid w-full items-center gap-10 ${hasMedia ? "md:grid-cols-2" : "grid-cols-1"} ${position === "right" && hasMedia ? "md:[&>*:first-child]:order-2" : ""}`}
      >
        {media}
        {copy}
      </div>
    );

  return (
    <Section
      theme={resolvedTheme}
      id={settings.cssId}
      background={settings.background}
      nextTheme={nextTheme}
    >
      {content}
    </Section>
  );
}
