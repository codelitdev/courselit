"use client";

import { getWidget, registerBlock } from "@frontlit/page-builder";
import type {
  PageData,
  ThemeStyle,
  Widget,
  WidgetDefaultSettings,
  WidgetProps,
} from "@frontlit/page-builder/models";
import {
  Badge,
  Button,
  Caption,
  Header1,
  Header4,
  PageCard,
  Section,
  Text2,
} from "@frontlit/page-builder/primitives";
import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import { ChevronDown, Mail } from "lucide-react";
import { useState } from "react";
import {
  LearnerCardImage,
  LearnerInput,
  LearnerInputShell,
  LearnerLabel,
} from "@/components/themed-page-builder";
import { learnerHeaders } from "@/lib/school";

const PRODUCT_BANNER = "courselit-product-banner";
const PRODUCT_CURRICULUM = "courselit-product-curriculum";

type Plan = {
  id: string;
  name: string;
  description?: string;
  type: "free" | "onetime" | "emi" | "subscription";
  currency: string;
  amountMinor: number;
  billingInterval?: "month" | "year" | null;
  installmentCount?: number | null;
  isDefault?: boolean;
};

type Product = {
  id: string;
  slug: string;
  kind: "course" | "download";
  title: string;
  description: string;
  enrolled?: boolean;
  leadMagnet: boolean;
  featuredMedia: {
    canonicalUrl: string;
    thumbnailUrl: string | null;
    altText: string;
  } | null;
  sections: Array<{ id: string; title: string }>;
  lessons: Array<{
    id: string;
    title: string;
    sectionId: string | null;
    requiresEnrollment: boolean;
  }>;
  plans: Plan[];
};

type SalesData = { resourceType: "product"; product: Product };

type BannerSettings = WidgetDefaultSettings & {
  customTitle?: string;
  customDescription?: TextEditorContent;
  buttonCaption?: string;
  textPosition?: "left" | "right" | "top" | "bottom";
  textAlignment?: "left" | "center";
};

type CurriculumSettings = WidgetDefaultSettings & {
  title?: string;
  description?: TextEditorContent;
  headerAlignment?: "left" | "center";
  openByDefault?: boolean;
};

function getSalesData(pageData: PageData): SalesData | null {
  const value = pageData.courseLitSalesData;
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SalesData>;
  return candidate.resourceType === "product" && candidate.product
    ? (candidate as SalesData)
    : null;
}

function productDescription(value: string): TextEditorContent | null {
  if (!value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as TextEditorContent;
    if (parsed.type === "doc" && Array.isArray(parsed.content)) return parsed;
  } catch {
    // Product descriptions created before rich-text support are plain text.
  }
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: value }] }],
  };
}

function price(plan: Plan | undefined) {
  if (!plan) return null;
  if (plan.type === "free") return "Free";
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: plan.currency,
  }).format(plan.amountMinor / 100);
  if (plan.type === "subscription" && plan.billingInterval) {
    return `${formatted} / ${plan.billingInterval}`;
  }
  if (plan.type === "emi" && plan.installmentCount) {
    return `${formatted} × ${plan.installmentCount}`;
  }
  return formatted;
}

function sectionTheme(theme: ThemeStyle, settings: WidgetDefaultSettings) {
  const resolved = JSON.parse(JSON.stringify(theme)) as ThemeStyle;
  resolved.structure.page.width = settings.maxWidth || theme.structure.page.width;
  resolved.structure.section.padding.y =
    settings.verticalPadding || theme.structure.section.padding.y;
  return resolved;
}

function ProductBannerWidget({
  settings,
  state: { theme },
  pageData,
  nextTheme,
}: WidgetProps<BannerSettings>) {
  const data = getSalesData(pageData);
  const [busy, setBusy] = useState(false);
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
          className="mx-auto flex min-h-56 max-w-4xl items-center justify-center border-dashed px-6 py-6 text-center"
        >
          <Text2 theme={resolvedTheme}>Product banner</Text2>
        </PageCard>
      </Section>
    );
  }

  const { product } = data;
  const plan =
    product.plans.find((candidate) => candidate.isDefault) ?? product.plans[0];
  const title = settings.customTitle?.trim() || product.title;
  const description =
    settings.customDescription ?? productDescription(product.description);
  const leadMagnet = product.leadMagnet && plan?.type === "free";
  const buttonCaption =
    settings.buttonCaption?.trim() ||
    (leadMagnet
      ? "Get for free"
      : plan?.type === "free"
        ? "Start learning for free"
        : "Buy now");
  const media = product.featuredMedia ? (
    <LearnerCardImage
      theme={resolvedTheme}
      src={product.featuredMedia.thumbnailUrl ?? product.featuredMedia.canonicalUrl}
      alt={product.featuredMedia.altText || product.title}
      className="aspect-[4/3] w-full border object-cover"
    />
  ) : null;

  async function startCheckout() {
    if (!plan) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/storefront/checkout-sessions", {
        method: "POST",
        credentials: "include",
        headers: learnerHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ productId: product.id, planId: plan.id }),
      });
      if (!response.ok) throw new Error("Unable to start checkout.");
      const body = (await response.json()) as { id?: string };
      if (!body.id) throw new Error("Unable to create checkout session.");
      window.location.assign(`/checkout?session=${encodeURIComponent(body.id)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue.");
    } finally {
      setBusy(false);
    }
  }

  const copy = (
    <div
      className={
        settings.textAlignment === "center"
          ? "flex flex-col items-center gap-4 text-center"
          : "flex flex-col items-start gap-4"
      }
    >
      <Caption theme={resolvedTheme}>
        {product.kind === "course" ? "Course" : "Digital download"}
      </Caption>
      <Header1 theme={resolvedTheme}>{title}</Header1>
      {description ? <TextRenderer json={description} theme={resolvedTheme} /> : null}
      {plan ? <Header4 theme={resolvedTheme}>{price(plan)}</Header4> : null}
      {leadMagnet ? (
        <form
          className="flex w-full max-w-sm flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!email.trim()) {
              setError("Enter your email to continue.");
              return;
            }
            void startCheckout();
          }}
        >
          <LearnerLabel
            theme={resolvedTheme}
            className="sr-only"
            htmlFor="product-lead-email"
          >
            Email
          </LearnerLabel>
          <LearnerInputShell theme={resolvedTheme} className="w-full gap-2 px-3 py-2">
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <LearnerInput
              theme={resolvedTheme}
              id="product-lead-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              placeholder="Enter your email"
              className="min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 shadow-none outline-none"
              required
            />
          </LearnerInputShell>
          <Button theme={resolvedTheme} type="submit" disabled={busy}>
            {busy ? "Please wait…" : buttonCaption}
          </Button>
        </form>
      ) : (
        <Button
          theme={resolvedTheme}
          type="button"
          disabled={!plan || busy}
          onClick={() => void startCheckout()}
        >
          {busy
            ? "Please wait…"
            : product.enrolled
              ? "Continue learning"
              : buttonCaption}
        </Button>
      )}
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
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        {position === "top" ? copy : media}
        {position === "top" ? media : copy}
      </div>
    ) : (
      <div
        className={`mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2 ${position === "right" ? "md:[&>*:first-child]:order-2" : ""}`}
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

function ProductCurriculumWidget({
  settings,
  state: { theme },
  pageData,
  nextTheme,
}: WidgetProps<CurriculumSettings>) {
  const data = getSalesData(pageData);
  if (data?.product.kind !== "course") return null;
  const product = data.product;
  const resolvedTheme = sectionTheme(theme.theme, settings);
  const groups = product.sections.map((section) => ({
    ...section,
    lessons: product.lessons.filter((lesson) => lesson.sectionId === section.id),
  }));
  const unsectioned = product.lessons.filter((lesson) => !lesson.sectionId);
  if (unsectioned.length > 0)
    groups.push({
      id: "unsectioned",
      title: "Additional content",
      lessons: unsectioned,
    });

  return (
    <Section
      theme={resolvedTheme}
      id={settings.cssId}
      background={settings.background}
      nextTheme={nextTheme}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div
          className={
            settings.headerAlignment === "left"
              ? "flex flex-col gap-2"
              : "flex flex-col items-center gap-2 text-center"
          }
        >
          <Header1 theme={resolvedTheme}>
            {settings.title?.trim() || "Curriculum"}
          </Header1>
          {settings.description ? (
            <TextRenderer json={settings.description} theme={resolvedTheme} />
          ) : null}
        </div>
        {groups.length > 0 ? (
          <PageCard theme={resolvedTheme} className="overflow-hidden p-0">
            {groups.map((group, index) => (
              <details
                key={group.id}
                open={
                  settings.openByDefault === true ||
                  (settings.openByDefault == null && index === 0)
                }
                className="group border-b last:border-b-0"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
                  <Text2
                    theme={resolvedTheme}
                    component="span"
                    className="min-w-0 flex-1 font-medium"
                  >
                    {group.title}
                  </Text2>
                  <Badge theme={resolvedTheme} variant="outline">
                    {group.lessons.length}{" "}
                    {group.lessons.length === 1 ? "lesson" : "lessons"}
                  </Badge>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-border px-4 py-2">
                  {group.lessons.length > 0 ? (
                    group.lessons.map((lesson) => {
                      const lessonHref = `/course/${encodeURIComponent(product.slug || product.id)}/${encodeURIComponent(product.id)}/${encodeURIComponent(lesson.id)}`;
                      const content = (
                        <Text2
                          key={lesson.id}
                          theme={resolvedTheme}
                          component="span"
                          className="min-w-0 flex-1 truncate"
                        >
                          {lesson.title}
                        </Text2>
                      );
                      return lesson.requiresEnrollment ? (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-3 py-2 text-sm"
                        >
                          {content}
                        </div>
                      ) : (
                        <a
                          key={lesson.id}
                          href={lessonHref}
                          className="flex items-center gap-3 py-2 text-sm hover:underline"
                        >
                          {content}
                          <Badge
                            theme={resolvedTheme}
                            variant="outline"
                            className="shrink-0"
                          >
                            Preview
                          </Badge>
                        </a>
                      );
                    })
                  ) : (
                    <Text2 theme={resolvedTheme} className="py-2 text-muted-foreground">
                      No lessons in this section yet.
                    </Text2>
                  )}
                </div>
              </details>
            ))}
          </PageCard>
        ) : (
          <Text2 theme={resolvedTheme} className="text-center text-muted-foreground">
            The curriculum will appear here soon.
          </Text2>
        )}
      </div>
    </Section>
  );
}

const productBanner: Widget<BannerSettings> = {
  metadata: {
    name: PRODUCT_BANNER,
    displayName: "Banner",
    description: "Product title, description, media, price, and checkout action.",
    compatibleWith: ["custom"],
  },
  widget: ProductBannerWidget,
  getDefaultSettings: () => ({ textPosition: "left", textAlignment: "left" }),
  layouts: [
    { id: "split", name: "Split" },
    { id: "stacked", name: "Stacked" },
  ],
};

const productCurriculum: Widget<CurriculumSettings> = {
  metadata: {
    name: PRODUCT_CURRICULUM,
    displayName: "Curriculum",
    description: "Course sections and lessons.",
    compatibleWith: ["custom"],
  },
  widget: ProductCurriculumWidget,
  getDefaultSettings: () => ({
    title: "Curriculum",
    headerAlignment: "center",
    openByDefault: false,
  }),
};

if (!getWidget(PRODUCT_BANNER)) registerBlock(productBanner);
if (!getWidget(PRODUCT_CURRICULUM)) registerBlock(productCurriculum);
