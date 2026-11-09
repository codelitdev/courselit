import type { WidgetDefaultSettings } from "@frontlit/page-builder/models";
import type { TextEditorContent } from "@frontlit/text-editor";
import type { ImageAspectRatio } from "../_shared/image-aspect-ratio";

export type BannerSettings = WidgetDefaultSettings & {
  title?: string;
  description?: TextEditorContent;
  /** Deprecated aliases from the first rewrite implementation. */
  customTitle?: string;
  customDescription?: TextEditorContent;
  buttonCaption?: string;
  productId?: string;
  /** Which side the text sits on; read through `textSide()`. */
  textPosition?: "left" | "right";
  textAlignment?: "left" | "center" | "right";
  /** How the featured image is cropped; each block has its own default. */
  imageAspectRatio?: ImageAspectRatio;
};
