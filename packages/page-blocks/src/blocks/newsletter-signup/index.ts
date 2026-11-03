import type { Widget } from "@frontlit/page-builder/models";
import NewsletterSignupAdminWidget from "./admin-widget";
import {
  DEFAULT_NEWSLETTER_BUTTON,
  DEFAULT_NEWSLETTER_FAILURE,
  DEFAULT_NEWSLETTER_SUCCESS,
} from "./constants";
import { newsletterSignupMetadata } from "./metadata";
import type { NewsletterSignupSettings } from "./settings";
import NewsletterSignupWidget from "./widget";

export const NewsletterSignup: Widget<NewsletterSignupSettings> = {
  metadata: newsletterSignupMetadata,
  widget: NewsletterSignupWidget,
  editor: NewsletterSignupAdminWidget,
  getDefaultSettings: () => ({
    btnText: DEFAULT_NEWSLETTER_BUTTON,
    successMessage: DEFAULT_NEWSLETTER_SUCCESS,
    failureMessage: DEFAULT_NEWSLETTER_FAILURE,
    alignment: "left",
  }),
};

export { NEWSLETTER_SIGNUP_BLOCK } from "./constants";
