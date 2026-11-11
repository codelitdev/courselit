import { UNAVAILABLE_PAGE_BLOCKS } from "@courselit/api-contract/page-blocks";
import { getWidget, NON_ADDABLE_BLOCK_NAMES, registerBlock } from "@frontlit/page-builder";
import { BANNER_BLOCK, Banner } from "./blocks/banner";
import { COMMUNITY_BLOCK, Community } from "./blocks/community";
import { PRODUCT_CURRICULUM_BLOCK, ProductCurriculum } from "./blocks/curriculum";
import { HOME_HERO_BLOCK, HomeHero } from "./blocks/home-hero";
import { HOME_OFFERS_BLOCK, HomeOffers } from "./blocks/home-offers";
import { NEWSLETTER_SIGNUP_BLOCK, NewsletterSignup } from "./blocks/newsletter-signup";

export { BANNER_BLOCK, PRODUCT_BLOCK } from "./blocks/banner";
export { COMMUNITY_BLOCK } from "./blocks/community";
export { PRODUCT_CURRICULUM_BLOCK } from "./blocks/curriculum";
export { HOME_HERO_BLOCK } from "./blocks/home-hero";
export { HOME_OFFERS_BLOCK } from "./blocks/home-offers";
export { NEWSLETTER_SIGNUP_BLOCK } from "./blocks/newsletter-signup";
export type {
  CourseLitCommunityPreview,
  CourseLitHomeData,
  CourseLitHomeOffer,
  CourseLitPlan,
  CourseLitProductPreview,
  CourseLitSalesPageData,
} from "./blocks/shared/types";

export function registerCourseLitBlocks() {
  // Keep the page builder's blocks that need backends CourseLit doesn't have
  // out of the block picker (see UNAVAILABLE_PAGE_BLOCKS).
  for (const name of UNAVAILABLE_PAGE_BLOCKS) {
    if (!NON_ADDABLE_BLOCK_NAMES.includes(name)) NON_ADDABLE_BLOCK_NAMES.push(name);
  }
  if (!getWidget(BANNER_BLOCK)) registerBlock(Banner);
  if (!getWidget(COMMUNITY_BLOCK)) registerBlock(Community);
  if (!getWidget(PRODUCT_CURRICULUM_BLOCK)) registerBlock(ProductCurriculum);
  if (!getWidget(HOME_HERO_BLOCK)) registerBlock(HomeHero);
  if (!getWidget(HOME_OFFERS_BLOCK)) registerBlock(HomeOffers);
  if (!getWidget(NEWSLETTER_SIGNUP_BLOCK)) registerBlock(NewsletterSignup);
}
