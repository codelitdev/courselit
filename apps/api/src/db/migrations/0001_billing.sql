CREATE TABLE IF NOT EXISTS billing_price_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_key text NOT NULL,
  plan text NOT NULL,
  billing_interval text NOT NULL,
  currency text NOT NULL,
  amount_minor integer NOT NULL,
  provider_trial_days integer NOT NULL DEFAULT 0,
  provider text NOT NULL,
  provider_product_id text NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_price_entries_amount_check CHECK (amount_minor > 0),
  CONSTRAINT billing_price_entries_trial_days_check CHECK (provider_trial_days >= 0),
  CONSTRAINT billing_price_entries_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT billing_price_entries_plan_check CHECK (plan IN ('pro', 'business')),
  CONSTRAINT billing_price_entries_interval_check CHECK (billing_interval IN ('month', 'year'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS billing_price_entries_provider_product_uidx
  ON billing_price_entries (provider, provider_product_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS billing_price_entries_offer_key_idx ON billing_price_entries (offer_key);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS billing_catalog_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision integer NOT NULL UNIQUE,
  checkout_provider text NOT NULL,
  status text NOT NULL DEFAULT 'pending_verification',
  verified_at timestamptz,
  activated_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_catalog_revisions_status_check CHECK (status IN ('pending_verification', 'active', 'retired', 'invalid', 'abandoned')),
  CONSTRAINT billing_catalog_revisions_revision_check CHECK (revision > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS billing_catalog_revisions_active_provider_uidx
  ON billing_catalog_revisions (checkout_provider) WHERE status = 'active';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS billing_catalog_revision_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_revision_id uuid NOT NULL REFERENCES billing_catalog_revisions(id) ON DELETE CASCADE,
  offer_key text NOT NULL,
  billing_price_entry_id uuid NOT NULL REFERENCES billing_price_entries(id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS billing_catalog_revision_items_revision_key_uidx
  ON billing_catalog_revision_items (catalog_revision_id, offer_key);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS billing_catalog_revision_items_revision_price_uidx
  ON billing_catalog_revision_items (catalog_revision_id, billing_price_entry_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS billing_provider_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  payer_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  payer_email text NOT NULL DEFAULT '',
  provider_customer_id text,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'creating',
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_provider_customers_status_check CHECK (status IN ('creating', 'active', 'conflicted'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS billing_provider_customers_provider_payer_uidx
  ON billing_provider_customers (provider, payer_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS billing_provider_customers_idempotency_uidx
  ON billing_provider_customers (idempotency_key);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS billing_checkout_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id text NOT NULL UNIQUE,
  billable_entity_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  payer_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  payer_email text NOT NULL DEFAULT '',
  return_url text NOT NULL DEFAULT '',
  provider text NOT NULL,
  catalog_revision integer NOT NULL,
  offer_key text NOT NULL,
  requested_plan text NOT NULL,
  requested_interval text NOT NULL,
  billing_price_entry_id uuid NOT NULL REFERENCES billing_price_entries(id) ON DELETE RESTRICT,
  quoted_amount_minor integer NOT NULL,
  quoted_currency text NOT NULL,
  billing_customer_id uuid REFERENCES billing_provider_customers(id) ON DELETE RESTRICT,
  provider_checkout_session_id text,
  checkout_url_encrypted text,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'creating',
  expires_at timestamptz NOT NULL,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  consumer_reference text,
  CONSTRAINT billing_checkout_attempts_status_check CHECK (status IN ('creating', 'open', 'completed', 'expired', 'abandoned', 'conflicted')),
  CONSTRAINT billing_checkout_attempts_amount_check CHECK (quoted_amount_minor > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS billing_checkout_attempts_idempotency_uidx
  ON billing_checkout_attempts (idempotency_key);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  subscription_id text,
  checkout_attempt_id text,
  payload_encrypted text,
  payload_key_version text,
  verified_key_version text,
  status text NOT NULL DEFAULT 'pending',
  processing_attempts integer NOT NULL DEFAULT 0,
  last_error text,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  lease_expires_at timestamptz,
  worker_id text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT billing_webhook_events_status_check CHECK (status IN ('pending', 'processing', 'processed', 'ignored', 'quarantined', 'failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS billing_webhook_events_provider_event_uidx
  ON billing_webhook_events (provider, provider_event_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billable_entity_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  billing_customer_id uuid NOT NULL REFERENCES billing_provider_customers(id) ON DELETE RESTRICT,
  payer_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  origin_checkout_attempt_id uuid REFERENCES billing_checkout_attempts(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  provider_subscription_id text NOT NULL,
  provider_product_id text NOT NULL,
  billing_price_entry_id uuid NOT NULL REFERENCES billing_price_entries(id) ON DELETE RESTRICT,
  catalog_revision integer NOT NULL,
  offer_key text NOT NULL,
  plan text NOT NULL,
  billing_interval text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  paid_through_at timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  is_entitlement_source boolean NOT NULL DEFAULT false,
  provider_occurred_at timestamptz,
  provider_version text,
  last_observed_at timestamptz,
  last_reconciled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS billing_subscriptions_provider_subscription_uidx
  ON billing_subscriptions (provider, provider_subscription_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS billing_subscriptions_entity_source_uidx
  ON billing_subscriptions (billable_entity_id) WHERE is_entitlement_source = true;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS billing_plan_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billable_entity_id uuid NOT NULL UNIQUE REFERENCES schools(id) ON DELETE RESTRICT,
  active_subscription_id uuid REFERENCES billing_subscriptions(id) ON DELETE RESTRICT,
  projection_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS billing_plan_change_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id text NOT NULL UNIQUE,
  billable_entity_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  subscription_id uuid NOT NULL REFERENCES billing_subscriptions(id) ON DELETE RESTRICT,
  actor_id text NOT NULL,
  payer_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  idempotency_key text NOT NULL,
  current_catalog_revision integer NOT NULL,
  current_billing_price_entry_id uuid NOT NULL REFERENCES billing_price_entries(id) ON DELETE RESTRICT,
  current_plan text NOT NULL,
  current_interval text NOT NULL,
  target_catalog_revision integer NOT NULL,
  target_billing_price_entry_id uuid NOT NULL REFERENCES billing_price_entries(id) ON DELETE RESTRICT,
  target_plan text NOT NULL,
  target_interval text NOT NULL,
  target_offer_key text NOT NULL,
  effective_at text NOT NULL,
  proration_mode text NOT NULL,
  provider_payment_id text,
  payment_url_encrypted text,
  status text NOT NULL DEFAULT 'creating',
  last_error text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS billing_plan_change_attempts_idempotency_uidx
  ON billing_plan_change_attempts (idempotency_key);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS billing_reconciliation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  checkout_attempt_id uuid REFERENCES billing_checkout_attempts(id) ON DELETE RESTRICT,
  plan_change_attempt_id uuid REFERENCES billing_plan_change_attempts(id) ON DELETE RESTRICT,
  subscription_id uuid REFERENCES billing_subscriptions(id) ON DELETE RESTRICT,
  provider_customer_id uuid REFERENCES billing_provider_customers(id) ON DELETE RESTRICT,
  operation text NOT NULL DEFAULT 'reconcile',
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  lease_expires_at timestamptz,
  worker_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_reconciliation_jobs_exactly_one_subject CHECK (
    ((CASE WHEN checkout_attempt_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN plan_change_attempt_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN subscription_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN provider_customer_id IS NOT NULL THEN 1 ELSE 0 END)) = 1
  )
);
