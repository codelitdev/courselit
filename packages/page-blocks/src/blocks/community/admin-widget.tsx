"use client";

import type { WidgetEditorProps } from "@frontlit/page-builder/models";
import { BannerEditor } from "../_shared/fields";
import type { BannerSettings } from "../banner/settings";
import { COMMUNITY_IMAGE_ASPECT_RATIO } from "./constants";
import type { CommunitySettings } from "./settings";

export default function CommunityAdminWidget({
  settings,
  onChange,
}: WidgetEditorProps<CommunitySettings>) {
  return (
    <BannerEditor
      settings={settings as BannerSettings}
      onChange={(next) => onChange(next as CommunitySettings)}
      defaultImageAspectRatio={COMMUNITY_IMAGE_ASPECT_RATIO}
      sideLabel="Image side"
      sideDescription="The text takes the other side. Without an image, the text spans the block."
    />
  );
}
