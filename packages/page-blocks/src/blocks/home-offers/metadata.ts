import type { WidgetMetadata } from "@frontlit/page-builder/models";
import { HOME_OFFERS_BLOCK } from "./constants";

export const homeOffersMetadata: WidgetMetadata = {
  name: HOME_OFFERS_BLOCK,
  displayName: "Offers",
  description: "Your published courses, downloads and community. Hidden when there are none.",
  compatibleWith: ["site", "custom"],
};
