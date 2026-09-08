CREATE TABLE IF NOT EXISTS learner_admin_links (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  admin_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS learner_admin_links_school_learner_uidx
  ON learner_admin_links (school_id, learner_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS learner_admin_links_school_admin_uidx
  ON learner_admin_links (school_id, admin_user_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS learner_identity_link_tokens (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  admin_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token_digest text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS learner_identity_link_tokens_lookup_idx
  ON learner_identity_link_tokens (school_id, admin_user_id, created_at);
--> statement-breakpoint
ALTER TABLE community_memberships
  DROP CONSTRAINT IF EXISTS community_memberships_one_identity_check;
