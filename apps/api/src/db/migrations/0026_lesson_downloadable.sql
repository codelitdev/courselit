-- CourseLit's production Lesson model stores this as a Boolean with a false default.
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS downloadable boolean NOT NULL DEFAULT false;
