import type { Widget } from "@frontlit/page-builder/models";
import CurriculumAdminWidget from "./admin-widget";
import { productCurriculumMetadata } from "./metadata";
import type { CurriculumSettings } from "./settings";
import CurriculumWidget from "./widget";

export const ProductCurriculum: Widget<CurriculumSettings> = {
  metadata: productCurriculumMetadata,
  widget: CurriculumWidget,
  editor: CurriculumAdminWidget,
  getDefaultSettings: () => ({
    title: "Curriculum",
    headerAlignment: "center" as const,
    openByDefault: false,
  }),
};

export { PRODUCT_CURRICULUM_BLOCK } from "./constants";
