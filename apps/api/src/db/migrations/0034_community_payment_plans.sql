CREATE TABLE IF NOT EXISTS community_payment_plans (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  included_products text[] NOT NULL DEFAULT '{}',
  provider_product_id text,
  kind text NOT NULL CHECK (kind IN ('free', 'one_time', 'subscription', 'installment')),
  one_time_amount numeric,
  emi_amount numeric,
  emi_total_installments integer,
  subscription_monthly_amount numeric,
  subscription_yearly_amount numeric,
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  billing_interval text CHECK (billing_interval IN ('month', 'year')),
  installment_count integer,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  is_default boolean NOT NULL DEFAULT false,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS community_payment_plans_name_uidx
  ON community_payment_plans (community_id, name);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS community_payment_plans_active_default_uidx
  ON community_payment_plans (community_id)
  WHERE status = 'active' AND is_default = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS community_payment_plans_lookup_idx
  ON community_payment_plans (school_id, community_id, status, created_at);
