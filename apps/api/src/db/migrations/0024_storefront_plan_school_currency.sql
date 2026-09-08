-- PaymentPlan in the production CourseLit model does not own currency.
-- Currency is configured once on the school and projected into plan/checkout
-- responses when needed.
ALTER TABLE storefront_plans
  DROP CONSTRAINT IF EXISTS storefront_plans_currency_check;
--> statement-breakpoint
ALTER TABLE storefront_plans
  DROP COLUMN IF EXISTS currency;
