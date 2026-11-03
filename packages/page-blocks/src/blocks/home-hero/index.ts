import type { Widget } from "@frontlit/page-builder/models";
import { homeHeroMetadata } from "./metadata";
import type { HomeHeroSettings } from "./settings";
import HomeHeroWidget from "./widget";

export const HomeHero: Widget<HomeHeroSettings> = {
  metadata: homeHeroMetadata,
  widget: HomeHeroWidget,
  getDefaultSettings: () => ({}),
};

export { HOME_HERO_BLOCK } from "./constants";
