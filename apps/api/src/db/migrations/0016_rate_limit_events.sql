CREATE TABLE IF NOT EXISTS rate_limit_events (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  scope text NOT NULL,
  action text NOT NULL,
  subject_id text NOT NULL,
  fingerprint text,
  created_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rate_limit_events_lookup_idx ON rate_limit_events (school_id, user_id, scope, action, subject_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rate_limit_events_fingerprint_idx ON rate_limit_events (school_id, user_id, scope, subject_id, fingerprint, created_at DESC);
