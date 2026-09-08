ALTER TABLE product_sections
  ADD COLUMN IF NOT EXISTS drip_enabled boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE product_sections
  ADD COLUMN IF NOT EXISTS drip_type text;
--> statement-breakpoint
ALTER TABLE product_sections
  ADD COLUMN IF NOT EXISTS drip_delay_seconds integer;
--> statement-breakpoint
ALTER TABLE product_sections
  ADD COLUMN IF NOT EXISTS drip_at timestamptz;
--> statement-breakpoint
ALTER TABLE product_sections
  DROP CONSTRAINT IF EXISTS product_sections_drip_type_check;
--> statement-breakpoint
ALTER TABLE product_sections
  ADD CONSTRAINT product_sections_drip_type_check
  CHECK (
    drip_type IS NULL
    OR (
      drip_type = 'relative-date'
      AND drip_delay_seconds IS NOT NULL
      AND drip_delay_seconds >= 0
      AND drip_at IS NULL
    )
    OR (
      drip_type = 'exact-date'
      AND drip_delay_seconds IS NULL
      AND drip_at IS NOT NULL
    )
  );
