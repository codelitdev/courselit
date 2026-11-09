"use client";

import type { WidgetProps } from "@frontlit/page-builder/models";
import {
  Badge,
  Button,
  Caption,
  Header1,
  Header2,
  Input,
  Label,
  PageCard,
  PageCardContent,
  PageCardImage,
  RadioGroup,
  RadioGroupItem,
  Section,
  Subheader1,
  Subheader2,
  Text1,
  Text2,
} from "@frontlit/page-builder/primitives";
import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import { BookOpen, Check, Download, Lock, Mail } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { BannerResource } from "../shared/types";
import {
  descriptionContent,
  publicApiPath,
  salesData,
  sectionTheme,
} from "../shared/utils";
import type { BannerSettings } from "./settings";
import { captchaHeaders } from "../../captcha";
import { imageAspectRatioClass } from "../_shared/image-aspect-ratio";
import { textSide } from "../_shared/text-side";
import { PRODUCT_IMAGE_ASPECT_RATIO } from "./constants";
import { type BuyOption, buyOptionCopy, buyOptions } from "./plan-copy";

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

const optionKey = (option: BuyOption) => `${option.source}:${option.plan.id}`;

export default function BannerWidget({
  settings,
  state: { theme },
  pageData,
  editing,
}: WidgetProps<BannerSettings>) {
  const data = salesData(pageData);
  const [busy, setBusy] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | undefined>();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const resolvedTheme = sectionTheme(theme.theme, settings);
  const resource = data ? resourceForBanner(data) : null;

  if (!resource) {
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
          <Text2 theme={resolvedTheme}>{data ? "Select a product" : "Sales banner"}</Text2>
        </PageCard>
      </Section>
    );
  }

  const title =
    settings.title?.trim() || settings.customTitle?.trim() || resource.title;
  const description: TextEditorContent | null =
    settings.description ??
    settings.customDescription ??
    descriptionContent(resource.description);
  const leadMagnet =
    resource.leadMagnet && resource.plans.some((plan) => plan.type === "free");
  const { options, initial } = buyOptions(
    resource.plans,
    resource.community?.plans ?? [],
  );
  const selected =
    options.find((option) => optionKey(option) === selectedKey) ?? initial;
  const selectedCopy = selected ? buyOptionCopy(selected, { leadMagnet }) : null;
  const claimsByEmail =
    leadMagnet && selected?.source === "product" && selected.plan.type === "free";
  // Like main, the block's button caption replaces the default checkout label.
  const buttonCaption = settings.buttonCaption?.trim();
  const isDownload = resource.kind === "download";
  const image = resource.featuredImage;

  async function claimLeadMagnet() {
    setBusy(true);
    setError(null);
    try {
      const endpoint = publicApiPath(pageData, "/lead-magnets");
      if (!endpoint) throw new Error("Sign-up is not available here.");
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...(await captchaHeaders("lead-magnet")),
        },
        body: JSON.stringify({ productId: resource?.id, email: email.trim() }),
      });
      if (!response.ok) {
        throw new Error("Unable to sign you up. Check your email and try again.");
      }
      setSentTo(email.trim());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue.");
    } finally {
      setBusy(false);
    }
  }

  async function startCheckout(option: BuyOption) {
    setBusy(true);
    setError(null);
    try {
      const endpoint = publicApiPath(pageData, "/checkout-sessions");
      if (!endpoint) throw new Error("Checkout is not available here.");
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          option.source === "product"
            ? { productId: resource?.id, planId: option.plan.id }
            : { communityId: resource?.community?.id, planId: option.plan.id },
        ),
      });
      if (!response.ok) throw new Error("Unable to start checkout.");
      const body = (await response.json()) as { id?: string };
      if (!body.id) throw new Error("Unable to create checkout session.");
      window.location.assign(`/checkout?session=${encodeURIComponent(body.id)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue.");
      setBusy(false);
    }
  }

  const alignment =
    settings.textAlignment === "center"
      ? "items-center text-center"
      : settings.textAlignment === "right"
        ? "items-end text-right"
        : "items-start";

  // Left: the pitch.
  const pitch = (
    <div className={`flex min-w-0 flex-col gap-5 ${alignment}`}>
      <Badge theme={resolvedTheme} variant="secondary" className="gap-1.5">
        {isDownload ? (
          <Download className="size-3.5" aria-hidden />
        ) : (
          <BookOpen className="size-3.5" aria-hidden />
        )}
        {isDownload ? "Digital download" : "Course"}
      </Badge>
      <Header1 theme={resolvedTheme}>{title}</Header1>
      {description ? <TextRenderer json={description} theme={resolvedTheme} /> : null}
      {image ? null : (
        // Without an image the buy card is short, so the pitch carries a
        // little more.
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {(leadMagnet
            ? ["Free", "Sent to your inbox"]
            : ["Instant access", isDownload ? "Yours to keep" : "Learn at your own pace"]
          ).map((point) => (
            <Text2
              key={point}
              theme={resolvedTheme}
              component="span"
              className="inline-flex items-center gap-1.5"
            >
              <Check className="size-4 text-primary" aria-hidden />
              {point}
            </Text2>
          ))}
        </div>
      )}
    </div>
  );

  let purchase: ReactNode;
  if (resource.enrolled && !editing) {
    // Buying again would only replace access the learner already has.
    purchase = (
      <div className="flex flex-col gap-3">
        <Text1 theme={resolvedTheme}>You already have access.</Text1>
        <Button
          theme={resolvedTheme}
          type="button"
          className="w-full"
          onClick={() =>
            window.location.assign(
              `/course/${encodeURIComponent(resource.slug)}/${encodeURIComponent(resource.id)}`,
            )
          }
        >
          {isDownload ? "Open your download" : "Continue learning"}
        </Button>
      </div>
    );
  } else if (!selected || !selectedCopy) {
    purchase = <Text1 theme={resolvedTheme}>Not on sale yet.</Text1>;
  } else {
    purchase = (
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (editing || busy) return;
          if (claimsByEmail) {
            if (!email.trim()) {
              setError("Enter your email to continue.");
              return;
            }
            void claimLeadMagnet();
            return;
          }
          void startCheckout(selected);
        }}
      >
        {options.length > 1 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <Subheader2 theme={resolvedTheme} id="product-plans">
                {isDownload ? "Choose an option" : "Choose how to join"}
              </Subheader2>
              <Caption theme={resolvedTheme}>{options.length} options</Caption>
            </div>
            <RadioGroup
              theme={resolvedTheme}
              value={optionKey(selected)}
              onValueChange={(key) => {
                setSelectedKey(key);
                setError(null);
              }}
              aria-labelledby="product-plans"
              className="flex flex-col gap-2.5"
            >
              {options.map((option) => {
                const key = optionKey(option);
                const copy = buyOptionCopy(option, { leadMagnet });
                const inputId = `product-plan-${option.source}-${option.plan.id}`;
                const on = key === optionKey(selected);
                return (
                  <Label
                    theme={resolvedTheme}
                    key={key}
                    htmlFor={inputId}
                    className="block w-full cursor-pointer"
                  >
                    <PageCard
                      theme={resolvedTheme}
                      className={`flex items-start gap-3 px-4 py-3.5 text-left transition-shadow ${on ? "border-primary ring-2 ring-primary/20" : ""}`}
                    >
                      <RadioGroupItem
                        theme={resolvedTheme}
                        id={inputId}
                        value={key}
                        className="mt-1"
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Subheader2 theme={resolvedTheme}>{option.plan.name}</Subheader2>
                          {option.source === "community" ? (
                            <Badge theme={resolvedTheme} variant="secondary">
                              Community
                            </Badge>
                          ) : option.plan.isDefault ? (
                            <Badge theme={resolvedTheme} variant="secondary">
                              Recommended
                            </Badge>
                          ) : null}
                        </div>
                        <Text2 theme={resolvedTheme} className="text-muted-foreground">
                          {copy.detail}
                        </Text2>
                      </div>
                      <div className="shrink-0 whitespace-nowrap text-right">
                        <Subheader1 theme={resolvedTheme} component="span">
                          {copy.price}
                        </Subheader1>
                        {copy.unit ? (
                          <Caption theme={resolvedTheme}> {copy.unit}</Caption>
                        ) : null}
                      </div>
                    </PageCard>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <Text2 theme={resolvedTheme} className="text-muted-foreground">
              {selected.plan.name}
            </Text2>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <Header2 theme={resolvedTheme} as="p">
                {selectedCopy.price}
              </Header2>
              <Text2 theme={resolvedTheme} component="span" className="text-muted-foreground">
                {[selectedCopy.unit, selectedCopy.detail].filter(Boolean).join(" · ")}
              </Text2>
            </div>
          </div>
        )}
        {claimsByEmail && sentTo ? (
          <Text2 theme={resolvedTheme} role="status">
            Check your inbox: we sent it to {sentTo}.
          </Text2>
        ) : (
          <div className="flex flex-col gap-2.5">
            {claimsByEmail ? (
              <div className="flex flex-col gap-1.5">
                <Label theme={resolvedTheme} htmlFor="product-lead-email" className="sr-only">
                  Email
                </Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    theme={resolvedTheme}
                    id="product-lead-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.currentTarget.value)}
                    placeholder="Enter your email"
                    className="w-full pl-9"
                    required
                  />
                </div>
              </div>
            ) : null}
            <Button
              theme={resolvedTheme}
              type="submit"
              className="w-full"
              disabled={editing || busy}
            >
              {busy ? "Please wait…" : buttonCaption || selectedCopy.cta}
            </Button>
            <Text2
              theme={resolvedTheme}
              className="flex items-center justify-center gap-1.5 text-center text-muted-foreground"
            >
              {selected.plan.type === "free" ? null : (
                <Lock className="size-3.5" aria-hidden />
              )}
              {selectedCopy.finePrint}
            </Text2>
          </div>
        )}
        {error ? (
          <Text2 theme={resolvedTheme} role="alert" className="text-destructive">
            {error}
          </Text2>
        ) : null}
      </form>
    );
  }

  // Right: the buy card, with the featured image on top.
  const card = (
    <PageCard theme={resolvedTheme} className="min-w-0 overflow-hidden">
      {image ? (
        <PageCardImage
          theme={resolvedTheme}
          // The full image, not the thumbnail: a hero scaled up from a
          // thumbnail looks soft and stretched.
          src={image.url}
          alt={image.alt || resource.title}
          className={`block ${imageAspectRatioClass(settings.imageAspectRatio, PRODUCT_IMAGE_ASPECT_RATIO)}`}
        />
      ) : null}
      <PageCardContent theme={resolvedTheme} className="flex flex-col gap-4">
        {purchase}
      </PageCardContent>
    </PageCard>
  );

  const side = textSide(settings.textPosition);
  return (
    <Section theme={resolvedTheme} id={settings.cssId} background={settings.background}>
      <div className="@container w-full">
        <div
          // No base column count or plain `gap`: those utilities are emitted
          // after the container-query ones and would win over them.
          className={`grid w-full items-start gap-x-14 gap-y-8 ${
            image
              ? "@3xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]"
              : "@3xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]"
          } ${side === "right" ? "@3xl:[&>*:first-child]:order-2" : ""}`}
        >
          {pitch}
          {card}
        </div>
      </div>
    </Section>
  );
}
