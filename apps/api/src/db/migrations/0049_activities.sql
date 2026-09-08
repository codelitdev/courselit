CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  actor_id text NOT NULL,
  type text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS activities_dedupe_uidx
  ON activities (dedupe_key);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS activities_school_type_date_idx
  ON activities (school_id, type, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS activities_school_entity_date_idx
  ON activities (school_id, entity_id, created_at);
