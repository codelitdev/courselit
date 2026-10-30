import type {
  PageData,
  ThemeStyle,
  WidgetDefaultSettings,
} from "@frontlit/page-builder/models";
import type { TextEditorContent } from "@frontlit/text-editor";
import type { CourseLitPlan, CourseLitSalesPageData } from "./types";

export function salesData(pageData: PageData): CourseLitSalesPageData | null {
  const value = pageData.courseLitSalesData;
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<CourseLitSalesPageData>;
  if (candidate.resourceType === "product" && candidate.product) {
    return candidate as CourseLitSalesPageData;
  }
  if (candidate.resourceType === "community" && candidate.community) {
    return candidate as CourseLitSalesPageData;
  }
  return null;
}

export function sectionTheme(theme: ThemeStyle, settings: WidgetDefaultSettings) {
  const resolved = JSON.parse(JSON.stringify(theme)) as ThemeStyle;
  resolved.structure.page.width = settings.maxWidth || theme.structure.page.width;
  resolved.structure.section.padding.y =
    settings.verticalPadding || theme.structure.section.padding.y;
  return resolved;
}

export function descriptionContent(value: string): TextEditorContent | null {
  if (!value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as TextEditorContent;
    if (parsed.type === "doc" && Array.isArray(parsed.content)) return parsed;
  } catch {
    // Older descriptions may be plain text.
  }
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: value }] }],
  };
}

export function planPrice(plan: CourseLitPlan | undefined) {
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

/** School public id the storefront put on `pageData`; absent in the admin
 * page editor, where public storefront APIs are not available. */
export function pageSchoolId(pageData: PageData): string | null {
  const value = pageData.schoolId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Browser path of a school's public API route, e.g.
 * `publicApiPath(pageData, "/checkout-sessions")` ->
 * `/api/v1/public/<schoolId>/checkout-sessions`. Returns null when the page
 * is not rendered by the storefront (no `pageData.schoolId`).
 */
export function publicApiPath(pageData: PageData, suffix: string): string | null {
  const schoolId = pageSchoolId(pageData);
  return schoolId ? `/api/v1/public/${encodeURIComponent(schoolId)}${suffix}` : null;
}
