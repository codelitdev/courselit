CREATE TABLE IF NOT EXISTS school_integrations (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  provider text NOT NULL,
  server text NOT NULL,
  external_id text NOT NULL,
  remote_team_id text,
  encrypted_team_key text,
  status text NOT NULL DEFAULT 'pending',
  last_attempt_at timestamptz,
  last_successful_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT school_integrations_provider_check CHECK (provider IN ('frontlit')),
  CONSTRAINT school_integrations_status_check CHECK (
    status IN ('pending', 'provisioning', 'ready', 'action_required')
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS school_integrations_school_provider_uidx
  ON school_integrations (school_id, provider);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS school_integrations_provider_external_uidx
  ON school_integrations (provider, external_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS integration_outbox_jobs (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  provider text NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL,
  last_error text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT integration_outbox_jobs_provider_check CHECK (provider IN ('frontlit')),
  CONSTRAINT integration_outbox_jobs_type_check CHECK (type IN ('provision_frontlit')),
  CONSTRAINT integration_outbox_jobs_status_check CHECK (
    status IN ('pending', 'processing', 'done', 'failed')
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS integration_outbox_jobs_identity_uidx
  ON integration_outbox_jobs (school_id, provider, type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS integration_outbox_jobs_pending_idx
  ON integration_outbox_jobs (status, next_attempt_at);
