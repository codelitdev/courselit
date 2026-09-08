ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS requires_enrollment boolean NOT NULL DEFAULT true;
