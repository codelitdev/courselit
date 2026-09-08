CREATE TABLE IF NOT EXISTS learner_otp_challenges (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  email text NOT NULL,
  code_digest text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS learner_otp_challenges_lookup_idx
  ON learner_otp_challenges (school_id, email, created_at);
