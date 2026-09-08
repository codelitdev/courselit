CREATE TABLE IF NOT EXISTS learner_notification_preferences (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  type text NOT NULL,
  app_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT learner_notification_preferences_type_unique
    UNIQUE (school_id, learner_id, type)
);
