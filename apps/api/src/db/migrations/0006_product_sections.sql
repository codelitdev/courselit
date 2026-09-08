CREATE TABLE IF NOT EXISTS product_sections (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title text NOT NULL,
  position integer NOT NULL DEFAULT 1,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS product_sections_product_position_uidx
  ON product_sections (product_id, position);
--> statement-breakpoint
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES product_sections(id) ON DELETE SET NULL;
