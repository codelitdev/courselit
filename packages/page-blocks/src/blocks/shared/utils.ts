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

export function learnerHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (typeof window === "undefined") return headers;
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("school") ?? params.get("schoolId");
  const schoolId =
    fromQuery?.trim() || window.sessionStorage.getItem("courselit.learner.schoolId");
  const hostname = window.location.hostname.toLowerCase();
  if (
    schoolId &&
    (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1")
  ) {
    headers.set("x-school-id", schoolId.trim());
  }
  return headers;
}
