import type { Widget } from "@frontlit/page-builder/models";
import { homeOffersMetadata } from "./metadata";
import type { HomeOffersSettings } from "./settings";
import HomeOffersWidget from "./widget";

export const HomeOffers: Widget<HomeOffersSettings> = {
  metadata: homeOffersMetadata,
  widget: HomeOffersWidget,
  getDefaultSettings: () => ({}),
};

export { HOME_OFFERS_BLOCK } from "./constants";
