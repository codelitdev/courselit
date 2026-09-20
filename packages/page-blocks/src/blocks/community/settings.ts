import type { WidgetDefaultSettings } from "@frontlit/page-builder/models";
import type { TextEditorContent } from "@frontlit/text-editor";

export type CommunitySettings = WidgetDefaultSettings & {
  title?: string;
  description?: TextEditorContent;
  buttonCaption?: string;
  textPosition?: "left" | "right" | "top" | "bottom";
  textAlignment?: "left" | "center" | "right";
};
