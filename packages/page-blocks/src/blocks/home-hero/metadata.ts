import type { WidgetMetadata } from "@frontlit/page-builder/models";
import { HOME_HERO_BLOCK } from "./constants";

export const homeHeroMetadata: WidgetMetadata = {
  name: HOME_HERO_BLOCK,
  displayName: "Home hero",
  description: "Your tagline and first offer. Hidden until you have them.",
  compatibleWith: ["site", "custom"],
};
