CREATE TABLE IF NOT EXISTS scorm_runtime_states (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS scorm_runtime_states_enrollment_lesson_uidx
  ON scorm_runtime_states (enrollment_id, lesson_id);
