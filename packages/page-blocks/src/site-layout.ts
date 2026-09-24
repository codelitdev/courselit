import type { WidgetInstance } from "@frontlit/page-builder/models";

const FRONTLIT_DEFAULT_START_PATHS = new Set(["/help", "/builder"]);

/**
 * Replace the page builder's generic Get started destination with CourseLit's
 * learner admission route. Preserve any destination configured by the school.
 */
export function normalizeCourseLitSiteLayout(
  layout: WidgetInstance[],
): WidgetInstance[] {
  return layout.map((widget) => {
    if (widget.name !== "header") return widget;

    const settings = widget.settings ?? {};
    const label = settings.ctaLabel;
    const href = settings.ctaHref;
    const isDefaultLabel = label == null || label === "Get started";
    const isDefaultDestination =
      href == null ||
      (typeof href === "string" && FRONTLIT_DEFAULT_START_PATHS.has(href));

    if (!isDefaultLabel || !isDefaultDestination) return widget;

    return {
      ...widget,
      settings: { ...settings, ctaHref: "/join" },
    };
  });
}
