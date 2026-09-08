ALTER TABLE storefront_plans
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE storefront_plans
  ADD COLUMN IF NOT EXISTS included_products text[] NOT NULL DEFAULT '{}';
