CREATE TABLE IF NOT EXISTS community_subscriptions (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  checkout_id uuid NOT NULL REFERENCES community_checkout_attempts(id) ON DELETE RESTRICT,
  provider_subscription_id text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
  current_period_end timestamptz,
  cancel_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
ALTER TABLE community_memberships
  DROP CONSTRAINT IF EXISTS community_memberships_status_check;
--> statement-breakpoint
ALTER TABLE community_memberships
  ADD CONSTRAINT community_memberships_status_check
  CHECK (status IN ('active', 'payment_failed', 'expired', 'pending', 'rejected', 'paused'));
