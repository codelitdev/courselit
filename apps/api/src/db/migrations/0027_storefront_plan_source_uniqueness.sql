-- CourseLit production validation permits one active plan per non-subscription
-- type, plus one monthly and one yearly subscription. Plan names are not unique.
DROP INDEX IF EXISTS storefront_plans_product_name_uidx;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS storefront_plans_active_free_type_uidx
  ON storefront_plans (product_id)
  WHERE status = 'active' AND kind = 'free';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS storefront_plans_active_one_time_type_uidx
  ON storefront_plans (product_id)
  WHERE status = 'active' AND kind = 'one_time';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS storefront_plans_active_installment_type_uidx
  ON storefront_plans (product_id)
  WHERE status = 'active' AND kind = 'installment';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS storefront_plans_active_subscription_monthly_uidx
  ON storefront_plans (product_id)
  WHERE status = 'active'
    AND kind = 'subscription'
    AND subscription_monthly_amount IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS storefront_plans_active_subscription_yearly_uidx
  ON storefront_plans (product_id)
  WHERE status = 'active'
    AND kind = 'subscription'
    AND subscription_yearly_amount IS NOT NULL;
