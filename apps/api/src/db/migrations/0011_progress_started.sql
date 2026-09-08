ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS started_at timestamptz;
--> statement-breakpoint
ALTER TABLE lesson_progress ALTER COLUMN completed_at DROP NOT NULL;
--> statement-breakpoint
UPDATE lesson_progress
SET started_at = completed_at
WHERE started_at IS NULL;
--> statement-breakpoint
ALTER TABLE lesson_progress ALTER COLUMN started_at SET NOT NULL;
