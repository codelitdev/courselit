import type { WidgetMetadata } from "@frontlit/page-builder/models";
import { PRODUCT_CURRICULUM_BLOCK } from "./constants";

export const productCurriculumMetadata: WidgetMetadata = {
  name: PRODUCT_CURRICULUM_BLOCK,
  displayName: "Curriculum",
  description: "Course sections and lessons.",
  compatibleWith: ["custom"],
};
