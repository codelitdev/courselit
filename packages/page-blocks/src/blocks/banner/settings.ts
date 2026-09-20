import type { WidgetDefaultSettings } from "@frontlit/page-builder/models";
import type { TextEditorContent } from "@frontlit/text-editor";

export type BannerSettings = WidgetDefaultSettings & {
  title?: string;
  description?: TextEditorContent;
  /** Deprecated aliases from the first rewrite implementation. */
  customTitle?: string;
  customDescription?: TextEditorContent;
  buttonCaption?: string;
  productId?: string;
  textPosition?: "left" | "right" | "top" | "bottom";
  textAlignment?: "left" | "center" | "right";
};
