import type { WidgetMetadata } from "@frontlit/page-builder/models";
import { NEWSLETTER_SIGNUP_BLOCK } from "./constants";

export const newsletterSignupMetadata: WidgetMetadata = {
  name: NEWSLETTER_SIGNUP_BLOCK,
  displayName: "Newsletter signup",
  description: "Collect visitor emails as school contacts and subscribers.",
  compatibleWith: ["site", "custom"],
};
