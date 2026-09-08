ALTER TABLE community_memberships
  ADD COLUMN IF NOT EXISTS payment_plan_id uuid;
--> statement-breakpoint
ALTER TABLE community_memberships
  DROP CONSTRAINT IF EXISTS community_memberships_payment_plan_id_fkey;
--> statement-breakpoint
ALTER TABLE community_memberships
  ADD CONSTRAINT community_memberships_payment_plan_id_fkey
  FOREIGN KEY (payment_plan_id) REFERENCES community_payment_plans(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS community_memberships_payment_plan_idx
  ON community_memberships (school_id, community_id, payment_plan_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS community_checkout_attempts (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES community_payment_plans(id) ON DELETE RESTRICT,
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
CREATE UNIQUE INDEX IF NOT EXISTS community_checkout_school_idempotency_uidx
  ON community_checkout_attempts (school_id, idempotency_key);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS community_checkout_provider_checkout_uidx
  ON community_checkout_attempts (provider_checkout_id)
  WHERE provider_checkout_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS community_payments (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  checkout_id uuid NOT NULL REFERENCES community_checkout_attempts(id) ON DELETE RESTRICT,
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
CREATE TABLE IF NOT EXISTS community_invoices (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  payment_id uuid NOT NULL UNIQUE REFERENCES community_payments(id) ON DELETE RESTRICT,
  checkout_id uuid NOT NULL REFERENCES community_checkout_attempts(id) ON DELETE RESTRICT,
  provider_invoice_id text,
  status text NOT NULL CHECK (status IN ('paid', 'refunded', 'void')),
  currency text NOT NULL,
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  issued_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS community_invoices_provider_invoice_uidx
  ON community_invoices (provider_invoice_id)
  WHERE provider_invoice_id IS NOT NULL;
