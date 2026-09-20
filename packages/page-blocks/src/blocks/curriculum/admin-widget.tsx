"use client";

import type { WidgetEditorProps } from "@frontlit/page-builder/models";
import { CurriculumEditor } from "../_shared/fields";
import type { CurriculumSettings } from "./settings";

export default function CurriculumAdminWidget({
  settings,
  onChange,
}: WidgetEditorProps<CurriculumSettings>) {
  return <CurriculumEditor settings={settings} onChange={onChange} />;
}
