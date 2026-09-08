ALTER TABLE media
  ALTER COLUMN created_by DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE media
  ADD COLUMN IF NOT EXISTS created_by_learner_id uuid
  REFERENCES learners(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS media_school_learner_idx
  ON media (school_id, created_by_learner_id, created_at, id);
