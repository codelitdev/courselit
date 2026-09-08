ALTER TABLE integration_outbox_jobs DROP CONSTRAINT IF EXISTS integration_outbox_jobs_type_check;
--> statement-breakpoint
ALTER TABLE integration_outbox_jobs ADD CONSTRAINT integration_outbox_jobs_type_check CHECK (type IN ('provision_frontlit', 'provision_sendlit', 'sync_sendlit_contact'));
--> statement-breakpoint
DROP INDEX IF EXISTS integration_outbox_jobs_identity_uidx;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS integration_outbox_jobs_provision_uidx
  ON integration_outbox_jobs (school_id, provider, type)
  WHERE type IN ('provision_frontlit', 'provision_sendlit');
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS integration_outbox_jobs_contact_sync_idx
  ON integration_outbox_jobs (school_id, provider, type);
