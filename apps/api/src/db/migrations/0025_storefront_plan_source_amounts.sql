-- Preserve the numeric amount fields used by CourseLit's production PaymentPlan
-- model. The existing minor-unit fields remain as a derived checkout projection.
ALTER TABLE storefront_plans
  ADD COLUMN IF NOT EXISTS one_time_amount numeric,
  ADD COLUMN IF NOT EXISTS emi_amount numeric,
  ADD COLUMN IF NOT EXISTS emi_total_installments integer,
  ADD COLUMN IF NOT EXISTS subscription_monthly_amount numeric,
  ADD COLUMN IF NOT EXISTS subscription_yearly_amount numeric;
--> statement-breakpoint
UPDATE storefront_plans
SET
  one_time_amount = CASE
    WHEN kind = 'one_time' THEN amount_minor::numeric / 100
    ELSE one_time_amount
  END,
  emi_amount = CASE
    WHEN kind = 'installment' THEN amount_minor::numeric / 100
    ELSE emi_amount
  END,
  emi_total_installments = CASE
    WHEN kind = 'installment' THEN installment_count
    ELSE emi_total_installments
  END,
  subscription_monthly_amount = CASE
    WHEN kind = 'subscription' AND billing_interval = 'month'
      THEN amount_minor::numeric / 100
    ELSE subscription_monthly_amount
  END,
  subscription_yearly_amount = CASE
    WHEN kind = 'subscription' AND billing_interval = 'year'
      THEN amount_minor::numeric / 100
    ELSE subscription_yearly_amount
  END;
