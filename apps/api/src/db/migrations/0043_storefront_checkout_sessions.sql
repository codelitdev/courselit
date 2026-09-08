CREATE TABLE IF NOT EXISTS storefront_checkout_sessions (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES storefront_plans(id) ON DELETE RESTRICT,
  learner_id uuid REFERENCES learners(id) ON DELETE SET NULL,
  checkout_id uuid REFERENCES storefront_checkout_attempts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'completed', 'expired')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS storefront_checkout_sessions_school_expiry_idx
  ON storefront_checkout_sessions (school_id, expires_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS storefront_checkout_sessions_learner_idx
  ON storefront_checkout_sessions (school_id, learner_id);
