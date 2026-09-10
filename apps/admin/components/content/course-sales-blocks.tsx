"use client";

import type {
  PageData,
  ThemeStyle,
  Widget,
  WidgetDefaultSettings,
  WidgetEditorProps,
  WidgetProps,
} from "@frontlit/page-builder/models";
import {
  Button,
  Caption,
  Header1,
  Header4,
  PageCardImage,
  Section,
  Text2,
} from "@frontlit/page-builder/primitives";
import { Editor, emptyDoc, TextRenderer, type TextEditorContent } from "@frontlit/text-editor";
import { getWidget, registerBlock } from "@frontlit/page-builder";
import { ChevronDown, Mail } from "lucide-react";
import React from "react";

export const COURSE_PRODUCT_BANNER_BLOCK = "courselit-product-banner";
export const COURSE_PRODUCT_CURRICULUM_BLOCK = "courselit-product-curriculum";

type ProductPlan = {
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

export type CourseLitProductPreview = {
  id: string;
  slug: string;
  kind: "course" | "download";
  title: string;
  description: string;
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
  plans: ProductPlan[];
};

export type CourseLitSalesPageData = {
  resourceType: "product";
  product: CourseLitProductPreview;
};

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

function salesData(pageData: PageData): CourseLitSalesPageData | null {
  const value = pageData.courseLitSalesData;
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<CourseLitSalesPageData>;
  if (candidate.resourceType !== "product" || !candidate.product) return null;
  return candidate as CourseLitSalesPageData;
}

function themedSection(
  theme: ThemeStyle,
  settings: WidgetDefaultSettings,
  children: React.ReactNode,
  nextTheme?: "light" | "dark",
) {
  const overriddenTheme = JSON.parse(JSON.stringify(theme)) as ThemeStyle;
  overriddenTheme.structure.page.width =
    settings.maxWidth || theme.structure.page.width;
  overriddenTheme.structure.section.padding.y =
    settings.verticalPadding || theme.structure.section.padding.y;
  return (
    <Section
      theme={overriddenTheme}
      id={settings.cssId}
      background={settings.background}
      nextTheme={nextTheme}
    >
      {children}
    </Section>
  );
}

function descriptionContent(value: string): TextEditorContent | null {
  if (!value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as TextEditorContent;
    if (parsed.type === "doc" && Array.isArray(parsed.content)) return parsed;
  } catch {
    // Older product descriptions may be plain text.
  }
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: value }] }],
  };
}

function displayDescription(
  value: TextEditorContent | undefined,
  fallback: string,
  theme: ThemeStyle,
) {
  const content = value ?? descriptionContent(fallback);
  return content ? <TextRenderer json={content} theme={theme} /> : null;
}

function planPrice(plan: ProductPlan | undefined) {
  if (!plan) return null;
  if (plan.type === "free") return "Free";
  const amount = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: plan.currency,
  }).format(plan.amountMinor / 100);
  if (plan.type === "subscription" && plan.billingInterval) {
    return `${amount} / ${plan.billingInterval}`;
  }
  if (plan.type === "emi" && plan.installmentCount) {
    return `${amount} × ${plan.installmentCount}`;
  }
  return amount;
}

function selectedPlan(product: CourseLitProductPreview) {
  return product.plans.find((plan) => plan.isDefault) ?? product.plans[0];
}

function ProductBannerWidget({
  settings,
  state: { theme },
  pageData,
  editing,
  nextTheme,
}: WidgetProps<BannerSettings>) {
  const data = salesData(pageData);
  const product = data?.product;
  if (!product) {
    return themedSection(
      theme.theme,
      settings,
      <div className="mx-auto flex min-h-56 max-w-4xl items-center justify-center rounded-xl border border-dashed border-border px-6 text-center">
        <Text2 theme={theme.theme}>Product banner preview</Text2>
      </div>,
      nextTheme,
    );
  }

  const plan = selectedPlan(product);
  const title = settings.customTitle?.trim() || product.title;
  const description = displayDescription(
    settings.customDescription,
    product.description,
    theme.theme,
  );
  const buttonCaption =
    settings.buttonCaption?.trim() ||
    (product.leadMagnet && plan?.type === "free"
      ? "Get for free"
      : plan?.type === "free"
        ? "Start learning for free"
        : "Buy now");
  const media = product.featuredMedia;
  const image = media ? (
    <PageCardImage
      theme={theme.theme}
      src={media.thumbnailUrl ?? media.canonicalUrl}
      alt={media.altText || product.title}
      className="aspect-[4/3] w-full rounded-xl border object-cover"
    />
  ) : null;
  const copy = (
    <div
      className={
        settings.textAlignment === "center"
          ? "flex flex-col items-center gap-4 text-center"
          : "flex flex-col items-start gap-4"
      }
    >
      <Caption theme={theme.theme}>
        {product.kind === "course" ? "Course" : "Digital download"}
      </Caption>
      <Header1 theme={theme.theme}>{title}</Header1>
      {description}
      {plan ? <Header4 theme={theme.theme}>{planPrice(plan)}</Header4> : null}
      {editing && product.leadMagnet && plan?.type === "free" ? (
        <div className="flex w-full max-w-sm items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm text-muted-foreground">
          <Mail className="size-4 shrink-0" /> Enter your email
        </div>
      ) : (
        <Button theme={theme.theme} type="button" disabled={!plan}>
          {buttonCaption}
        </Button>
      )}
    </div>
  );

  const position = settings.textPosition ?? "left";
  const content =
    position === "top" || position === "bottom" ? (
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        {position === "top" ? copy : image}
        {position === "top" ? image : copy}
      </div>
    ) : (
      <div
        className={`mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2 ${
          position === "right" ? "md:[&>*:first-child]:order-2" : ""
        }`}
      >
        {image}
        {copy}
      </div>
    );

  return themedSection(theme.theme, settings, content, nextTheme);
}

function ProductCurriculumWidget({
  settings,
  state: { theme },
  pageData,
  nextTheme,
}: WidgetProps<CurriculumSettings>) {
  const product = salesData(pageData)?.product;
  if (!product || product.kind !== "course") return null;

  const groups = product.sections.map((section) => ({
    ...section,
    lessons: product.lessons.filter((lesson) => lesson.sectionId === section.id),
  }));
  const unsectioned = product.lessons.filter((lesson) => !lesson.sectionId);
  if (unsectioned.length > 0) {
    groups.push({ id: "unsectioned", title: "Additional content", lessons: unsectioned });
  }

  return themedSection(
    theme.theme,
    settings,
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div
        className={
          settings.headerAlignment === "left"
            ? "flex flex-col gap-2"
            : "flex flex-col items-center gap-2 text-center"
        }
      >
        <Header1 theme={theme.theme}>{settings.title?.trim() || "Curriculum"}</Header1>
        {settings.description ? (
          <TextRenderer json={settings.description} theme={theme.theme} />
        ) : null}
      </div>
      {groups.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          {groups.map((group, index) => (
            <details
              key={group.id}
              open={settings.openByDefault === true || (settings.openByDefault == null && index === 0)}
              className="group border-b last:border-b-0"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1 font-medium">{group.title}</span>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                  {group.lessons.length} {group.lessons.length === 1 ? "lesson" : "lessons"}
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-border px-4 py-2">
                {group.lessons.length > 0 ? (
                  group.lessons.map((lesson) => (
                    <div key={lesson.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                      {!lesson.requiresEnrollment ? (
                        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                          Preview
                        </span>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <Text2 theme={theme.theme} className="py-2 text-muted-foreground">
                    No lessons in this section yet.
                  </Text2>
                )}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <Text2 theme={theme.theme} className="text-center text-muted-foreground">
          The curriculum will appear here soon.
        </Text2>
      )}
    </div>,
    nextTheme,
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 border-b border-border pb-5 last:border-0">{title ? <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p> : null}{children}</div>;
}

function TextField({ label, value, placeholder, multiline, onChange }: { label: string; value?: string; placeholder?: string; multiline?: boolean; onChange: (value: string) => void }) {
  const Control = multiline ? "textarea" : "input";
  return <label className="flex flex-col gap-1.5 text-xs font-semibold"><span>{label}</span><Control value={value ?? ""} placeholder={placeholder} onChange={(event) => onChange(event.currentTarget.value)} className="min-h-9 rounded-lg border border-input bg-muted/20 px-3 py-2 text-sm font-normal outline-none focus:border-ring" /></label>;
}

function SelectField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ label: string; value: T }>; onChange: (value: T) => void }) {
  return <label className="flex flex-col gap-1.5 text-xs font-semibold"><span>{label}</span><select value={value} onChange={(event) => onChange(event.currentTarget.value as T)} className="h-9 rounded-lg border border-input bg-muted/20 px-3 py-2 text-sm font-normal outline-none focus:border-ring">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between gap-3 text-sm"><span>{label}</span><input type="checkbox" checked={value} onChange={(event) => onChange(event.currentTarget.checked)} /></label>;
}

function ProductBannerEditor({ settings, onChange }: WidgetEditorProps<BannerSettings>) {
  const update = (partial: Partial<BannerSettings>) => onChange({ ...settings, ...partial });
  return <div className="flex flex-col gap-5">
    <FieldGroup title="Basic">
      <TextField label="Custom title" value={settings.customTitle} placeholder="Use the product title" onChange={(customTitle) => update({ customTitle })} />
      <div className="flex flex-col gap-1.5 text-sm"><span className="text-xs font-semibold">Custom description</span><Editor initialContent={settings.customDescription ?? emptyDoc} onChange={(json) => update({ customDescription: json as TextEditorContent })} showToolbar={false} editorClassName="min-h-24" /></div>
    </FieldGroup>
    <FieldGroup title="Call to action"><TextField label="Button caption" value={settings.buttonCaption} placeholder="Buy now" onChange={(buttonCaption) => update({ buttonCaption })} /></FieldGroup>
    <FieldGroup title="Design">
      <SelectField label="Text content position" value={settings.textPosition ?? "left"} options={[{ label: "Left", value: "left" }, { label: "Right", value: "right" }, { label: "Top", value: "top" }, { label: "Bottom", value: "bottom" }]} onChange={(textPosition) => update({ textPosition })} />
      <SelectField label="Text alignment" value={settings.textAlignment ?? "left"} options={[{ label: "Left", value: "left" }, { label: "Center", value: "center" }]} onChange={(textAlignment) => update({ textAlignment })} />
    </FieldGroup>
  </div>;
}

function ProductCurriculumEditor({ settings, onChange }: WidgetEditorProps<CurriculumSettings>) {
  const update = (partial: Partial<CurriculumSettings>) => onChange({ ...settings, ...partial });
  return <div className="flex flex-col gap-5">
    <FieldGroup title="Basic"><TextField label="Title" value={settings.title} placeholder="Curriculum" onChange={(title) => update({ title })} /><div className="flex flex-col gap-1.5 text-sm"><span className="text-xs font-semibold">Description</span><Editor initialContent={settings.description ?? emptyDoc} onChange={(json) => update({ description: json as TextEditorContent })} showToolbar={false} editorClassName="min-h-20" /></div></FieldGroup>
    <FieldGroup title="Layout"><SelectField label="Header alignment" value={settings.headerAlignment ?? "center"} options={[{ label: "Left", value: "left" }, { label: "Center", value: "center" }]} onChange={(headerAlignment) => update({ headerAlignment })} /><ToggleField label="Open all sections by default" value={settings.openByDefault ?? false} onChange={(openByDefault) => update({ openByDefault })} /></FieldGroup>
  </div>;
}

const productBanner: Widget<BannerSettings> = {
  metadata: { name: COURSE_PRODUCT_BANNER_BLOCK, displayName: "Banner", description: "Product title, description, media, price, and checkout action.", compatibleWith: ["custom"] },
  widget: ProductBannerWidget,
  editor: ProductBannerEditor,
  getDefaultSettings: () => ({ textPosition: "left", textAlignment: "left" }),
  layouts: [{ id: "split", name: "Split" }, { id: "stacked", name: "Stacked" }],
};

const productCurriculum: Widget<CurriculumSettings> = {
  metadata: { name: COURSE_PRODUCT_CURRICULUM_BLOCK, displayName: "Curriculum", description: "Course sections and lessons.", compatibleWith: ["custom"] },
  widget: ProductCurriculumWidget,
  editor: ProductCurriculumEditor,
  getDefaultSettings: () => ({ title: "Curriculum", headerAlignment: "center", openByDefault: false }),
};

if (!getWidget(COURSE_PRODUCT_BANNER_BLOCK)) registerBlock(productBanner);
if (!getWidget(COURSE_PRODUCT_CURRICULUM_BLOCK)) registerBlock(productCurriculum);
