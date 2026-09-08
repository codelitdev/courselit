CREATE TABLE IF NOT EXISTS storefront_plans (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL,
  currency text NOT NULL,
  amount_minor integer NOT NULL,
  billing_interval text,
  installment_count integer,
  status text NOT NULL DEFAULT 'active',
  is_default boolean NOT NULL DEFAULT false,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT storefront_plans_amount_check CHECK (amount_minor >= 0),
  CONSTRAINT storefront_plans_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT storefront_plans_kind_check CHECK (kind IN ('free', 'one_time', 'subscription', 'installment')),
  CONSTRAINT storefront_plans_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT storefront_plans_shape_check CHECK (
    (kind = 'free' AND amount_minor = 0 AND billing_interval IS NULL AND installment_count IS NULL)
    OR (kind = 'one_time' AND amount_minor > 0 AND billing_interval IS NULL AND installment_count IS NULL)
    OR (kind = 'subscription' AND amount_minor > 0 AND billing_interval IN ('month', 'year') AND installment_count IS NULL)
    OR (kind = 'installment' AND amount_minor > 0 AND billing_interval IN ('month', 'year') AND installment_count >= 2)
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS storefront_plans_product_name_uidx
  ON storefront_plans (product_id, name);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS storefront_plans_active_default_uidx
  ON storefront_plans (product_id)
  WHERE status = 'active' AND is_default = true;
