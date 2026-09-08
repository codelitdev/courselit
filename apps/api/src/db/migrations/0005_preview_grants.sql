CREATE TABLE IF NOT EXISTS preview_grants (
  id uuid PRIMARY KEY,
  token_digest text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  issued_by text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL
);
