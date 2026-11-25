/**
 * The deployment the API tests run against. Plan limits are environment
 * settings (plan-limits-config.ts), so tests set them here and read them back
 * through `planLimits()` instead of repeating the numbers. Set even when a
 * local `.env` has its own values, so every machine tests the same thing.
 * They are configured here too, as a runtime would at startup, so a test that
 * reads them without creating a runtime doesn't depend on test order.
 */
import { configurePlanLimits, readPlanLimits } from "./plan-limits-config.js";

Object.assign(process.env, {
  PLAN_PRO_MARKETING_EMAILS_MONTH: "25000",
  PLAN_PRO_STORAGE: "unlimited",
  PLAN_BUSINESS_MARKETING_EMAILS_MONTH: "100000",
  PLAN_BUSINESS_STORAGE: "unlimited",
  PLAN_TRIAL_MARKETING_EMAILS_MONTH: "0",
  PLAN_TRIAL_STORAGE: "500MB",
});

configurePlanLimits(readPlanLimits(process.env));
