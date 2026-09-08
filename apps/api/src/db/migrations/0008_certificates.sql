CREATE TABLE IF NOT EXISTS "certificate_templates" (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  template text NOT NULL DEFAULT '{}',
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS certificate_templates_school_name_uidx
  ON certificate_templates (school_id, name);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "certificates" (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  verification_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  template_id uuid REFERENCES certificate_templates(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL,
  revoked_at timestamptz
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS certificates_learner_product_uidx
  ON certificates (learner_id, product_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS certificates_verification_idx ON certificates (verification_id);
