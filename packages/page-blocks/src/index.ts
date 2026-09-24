import { getWidget, registerBlock } from "@frontlit/page-builder";
import { BANNER_BLOCK, Banner } from "./blocks/banner";
import { COMMUNITY_BLOCK, Community } from "./blocks/community";
import { PRODUCT_CURRICULUM_BLOCK, ProductCurriculum } from "./blocks/curriculum";
import { NEWSLETTER_SIGNUP_BLOCK, NewsletterSignup } from "./blocks/newsletter-signup";

export { BANNER_BLOCK, PRODUCT_BLOCK } from "./blocks/banner";
export { COMMUNITY_BLOCK } from "./blocks/community";
export { PRODUCT_CURRICULUM_BLOCK } from "./blocks/curriculum";
export { NEWSLETTER_SIGNUP_BLOCK } from "./blocks/newsletter-signup";
export type {
  CourseLitCommunityPreview,
  CourseLitPlan,
  CourseLitProductPreview,
  CourseLitSalesPageData,
} from "./blocks/shared/types";
export { normalizeCourseLitSiteLayout } from "./site-layout";

export function registerCourseLitBlocks() {
  if (!getWidget(BANNER_BLOCK)) registerBlock(Banner);
  if (!getWidget(COMMUNITY_BLOCK)) registerBlock(Community);
  if (!getWidget(PRODUCT_CURRICULUM_BLOCK)) registerBlock(ProductCurriculum);
  if (!getWidget(NEWSLETTER_SIGNUP_BLOCK)) registerBlock(NewsletterSignup);
}
