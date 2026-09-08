ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS payment_settings_encrypted text;
--> statement-breakpoint
ALTER TABLE storefront_checkout_attempts
  DROP CONSTRAINT IF EXISTS storefront_checkout_attempts_provider_check;
--> statement-breakpoint
ALTER TABLE storefront_checkout_attempts
  ADD CONSTRAINT storefront_checkout_attempts_provider_check
  CHECK (provider IN ('free', 'stripe', 'lemonsqueezy', 'razorpay'));
--> statement-breakpoint
ALTER TABLE storefront_webhook_events
  DROP CONSTRAINT IF EXISTS storefront_webhook_events_provider_check;
--> statement-breakpoint
ALTER TABLE storefront_webhook_events
  ADD CONSTRAINT storefront_webhook_events_provider_check
  CHECK (provider IN ('stripe', 'lemonsqueezy', 'razorpay'));
--> statement-breakpoint
ALTER TABLE community_checkout_attempts
  DROP CONSTRAINT IF EXISTS community_checkout_attempts_provider_check;
--> statement-breakpoint
ALTER TABLE community_checkout_attempts
  ADD CONSTRAINT community_checkout_attempts_provider_check
  CHECK (provider IN ('free', 'stripe', 'lemonsqueezy', 'razorpay'));
