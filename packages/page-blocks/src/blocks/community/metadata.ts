import type { WidgetMetadata } from "@frontlit/page-builder/models";
import { COMMUNITY_BLOCK } from "./constants";

export const communityMetadata: WidgetMetadata = {
  name: COMMUNITY_BLOCK,
  displayName: "Community",
  description: "Community details and payment plans with join/buy.",
  compatibleWith: ["custom", "community"],
};
