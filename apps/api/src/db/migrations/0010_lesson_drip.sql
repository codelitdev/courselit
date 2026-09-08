ALTER TABLE lessons ADD COLUMN IF NOT EXISTS drip_delay_seconds integer;
--> statement-breakpoint
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS drip_at timestamptz;
--> statement-breakpoint
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_drip_delay_seconds_check;
--> statement-breakpoint
ALTER TABLE lessons ADD CONSTRAINT lessons_drip_delay_seconds_check
  CHECK (drip_delay_seconds IS NULL OR drip_delay_seconds >= 0);
