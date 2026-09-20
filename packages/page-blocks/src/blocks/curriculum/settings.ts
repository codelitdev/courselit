import type { WidgetDefaultSettings } from "@frontlit/page-builder/models";
import type { TextEditorContent } from "@frontlit/text-editor";

export type CurriculumSettings = WidgetDefaultSettings & {
  title?: string;
  description?: TextEditorContent;
  headerAlignment?: "left" | "center";
  openByDefault?: boolean;
};
