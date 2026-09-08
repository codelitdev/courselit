ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_source_check;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_source_check
  CHECK (source IN ('free_signup', 'admin_grant', 'storefront_purchase', 'included_product', 'import', 'integration'));
--> statement-breakpoint
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_status_check
  CHECK (status IN ('active', 'payment_failed', 'expired', 'pending', 'rejected', 'paused'));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrollment_access_grants" (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('free_signup', 'admin_grant', 'storefront_purchase', 'included_product', 'import', 'integration')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  created_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS enrollment_access_grants_enrollment_uidx
  ON enrollment_access_grants (enrollment_id);
--> statement-breakpoint
INSERT INTO enrollment_access_grants (
  id, public_id, school_id, enrollment_id, source, status, starts_at, created_at
)
SELECT id, 'grant_' || public_id, school_id, id, source, 'active', created_at, created_at
FROM enrollments
ON CONFLICT (enrollment_id) DO NOTHING;
