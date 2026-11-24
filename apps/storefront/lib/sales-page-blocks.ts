import type { WidgetInstance } from "@frontlit/page-builder/models";

const LEGACY_SALES_BANNERS = [
  "banner",
  "courselit-banner",
  "courselit-product-banner",
  "courselit-community-banner",
];

/** On a sales page, the first rewrite's sales slot and banner blocks render
 * as the product or community block. Other blocks are returned unchanged. */
export function salesPageBlock(
  instance: WidgetInstance,
  resourceType: "product" | "community",
): WidgetInstance {
  const isLegacySalesSlot =
    instance.name === "data-slot" &&
    instance.settings?.slot === "courselit.sales-page-content";
  if (!isLegacySalesSlot && !LEGACY_SALES_BANNERS.includes(instance.name)) {
    return instance;
  }
  const legacyTextPosition = instance.settings?.alignment;
  const legacyTextAlignment = instance.settings?.textAlignment;
  return {
    ...instance,
    name: resourceType === "community" ? "courselit-community" : "courselit-product",
    settings: {
      ...instance.settings,
      textPosition:
        typeof legacyTextPosition === "string" &&
        ["left", "right", "top", "bottom"].includes(legacyTextPosition)
          ? legacyTextPosition
          : "left",
      textAlignment:
        typeof legacyTextAlignment === "string" &&
        ["left", "center", "right"].includes(legacyTextAlignment)
          ? legacyTextAlignment
          : "left",
    },
  };
}
