CREATE TABLE IF NOT EXISTS lesson_evaluations (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  pass boolean NOT NULL,
  score real,
  requires_passing_grade boolean NOT NULL,
  passing_grade real,
  created_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS lesson_evaluations_enrollment_lesson_idx
  ON lesson_evaluations (enrollment_id, lesson_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS lesson_evaluations_school_lesson_idx
  ON lesson_evaluations (school_id, lesson_id);
