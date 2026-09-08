CREATE TABLE IF NOT EXISTS frontlit_sales_pages (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  resource_public_id text NOT NULL,
  slug text NOT NULL,
  remote_page_id text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz NOT NULL,
  last_error text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT frontlit_sales_pages_resource_type_check
    CHECK (resource_type IN ('product', 'community')),
  CONSTRAINT frontlit_sales_pages_status_check
    CHECK (status IN ('pending', 'provisioning', 'ready', 'failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS frontlit_sales_pages_resource_uidx
  ON frontlit_sales_pages (school_id, resource_type, resource_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS frontlit_sales_pages_public_resource_uidx
  ON frontlit_sales_pages (school_id, resource_type, resource_public_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS frontlit_sales_pages_slug_uidx
  ON frontlit_sales_pages (school_id, slug);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS frontlit_sales_pages_pending_idx
  ON frontlit_sales_pages (status, next_attempt_at);
