ALTER TABLE storefront_plans ADD COLUMN IF NOT EXISTS provider_product_id text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS storefront_checkout_attempts (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES storefront_plans(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider IN ('free', 'stripe', 'lemonsqueezy', 'razorpay')),
  idempotency_key text NOT NULL,
  provider_checkout_id text,
  provider_checkout_url text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'disputed')),
  currency text NOT NULL,
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  completed_at timestamptz
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS storefront_checkout_school_idempotency_uidx
  ON storefront_checkout_attempts (school_id, idempotency_key);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS storefront_checkout_provider_checkout_uidx
  ON storefront_checkout_attempts (provider_checkout_id)
  WHERE provider_checkout_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS storefront_payments (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  checkout_id uuid NOT NULL REFERENCES storefront_checkout_attempts(id) ON DELETE RESTRICT,
  provider_payment_id text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('one_time', 'subscription', 'installment')),
  status text NOT NULL CHECK (status IN ('succeeded', 'failed', 'refunded', 'disputed')),
  currency text NOT NULL,
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS storefront_invoices (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  payment_id uuid NOT NULL UNIQUE REFERENCES storefront_payments(id) ON DELETE RESTRICT,
  checkout_id uuid NOT NULL REFERENCES storefront_checkout_attempts(id) ON DELETE RESTRICT,
  provider_invoice_id text,
  status text NOT NULL CHECK (status IN ('paid', 'refunded', 'void')),
  currency text NOT NULL,
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  issued_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS storefront_invoices_provider_invoice_uidx
  ON storefront_invoices (provider_invoice_id)
  WHERE provider_invoice_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS storefront_subscriptions (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  checkout_id uuid NOT NULL REFERENCES storefront_checkout_attempts(id) ON DELETE RESTRICT,
  provider_subscription_id text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
  current_period_end timestamptz,
  cancel_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS storefront_webhook_events (
  id uuid PRIMARY KEY,
  provider text NOT NULL CHECK (provider IN ('stripe', 'lemonsqueezy', 'razorpay')),
  provider_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload text NOT NULL,
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  error text,
  received_at timestamptz NOT NULL,
  processed_at timestamptz
);
