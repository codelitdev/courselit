import type { Widget } from "@frontlit/page-builder/models";
import CommunityAdminWidget from "./admin-widget";
import { communityMetadata } from "./metadata";
import type { CommunitySettings } from "./settings";
import CommunityWidget from "./widget";

export const Community: Widget<CommunitySettings> = {
  metadata: communityMetadata,
  widget: CommunityWidget,
  editor: CommunityAdminWidget,
  getDefaultSettings: () => ({
    textPosition: "left" as const,
    textAlignment: "left" as const,
  }),
  layouts: [
    { id: "split", name: "Split" },
    { id: "stacked", name: "Stacked" },
  ],
};

export { COMMUNITY_BLOCK } from "./constants";
