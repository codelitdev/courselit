import type { WidgetDefaultSettings } from "@frontlit/page-builder/models";

export type NewsletterSignupSettings = WidgetDefaultSettings & {
  title?: string;
  subtitle?: string;
  btnText?: string;
  alignment?: "left" | "center" | "right";
  successMessage?: string;
  failureMessage?: string;
};
