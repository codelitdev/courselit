import type { WidgetMetadata } from "@frontlit/page-builder/models";
import { BANNER_BLOCK } from "./constants";

export const bannerMetadata: WidgetMetadata = {
  name: BANNER_BLOCK,
  displayName: "Product",
  description: "Product details, payment plans, and checkout.",
  compatibleWith: ["custom", "product"],
};
