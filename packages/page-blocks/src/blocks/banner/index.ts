import type { Widget } from "@frontlit/page-builder/models";
import BannerAdminWidget from "./admin-widget";
import { bannerMetadata } from "./metadata";
import type { BannerSettings } from "./settings";
import BannerWidget from "./widget";

const bannerDefaults = () => ({
  textPosition: "left" as const,
  textAlignment: "left" as const,
});

export const Banner: Widget<BannerSettings> = {
  metadata: bannerMetadata,
  widget: BannerWidget,
  editor: BannerAdminWidget,
  getDefaultSettings: bannerDefaults,
  layouts: [
    { id: "split", name: "Split" },
    { id: "stacked", name: "Stacked" },
  ],
};

export { BANNER_BLOCK, PRODUCT_BLOCK } from "./constants";
