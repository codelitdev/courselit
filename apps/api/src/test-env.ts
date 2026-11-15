/**
 * The deployment the API tests run against. Plan limits are environment
 * settings (plan-limits-config.ts), so tests set them here and read them back
 * through `planLimits()` instead of repeating the numbers. Set even when a
 * local `.env` has its own values, so every machine tests the same thing.
 */
Object.assign(process.env, {
  PLAN_PRO_MARKETING_EMAILS_MONTH: "25000",
  PLAN_PRO_STORAGE: "unlimited",
  PLAN_BUSINESS_MARKETING_EMAILS_MONTH: "100000",
  PLAN_BUSINESS_STORAGE: "unlimited",
  PLAN_TRIAL_MARKETING_EMAILS_MONTH: "0",
  PLAN_TRIAL_STORAGE: "500MB",
});
