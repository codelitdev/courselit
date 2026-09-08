ALTER TABLE school_integrations DROP CONSTRAINT IF EXISTS school_integrations_provider_check;
--> statement-breakpoint
ALTER TABLE school_integrations ADD CONSTRAINT school_integrations_provider_check CHECK (provider IN ('frontlit', 'sendlit'));
--> statement-breakpoint
ALTER TABLE integration_outbox_jobs DROP CONSTRAINT IF EXISTS integration_outbox_jobs_provider_check;
--> statement-breakpoint
ALTER TABLE integration_outbox_jobs ADD CONSTRAINT integration_outbox_jobs_provider_check CHECK (provider IN ('frontlit', 'sendlit'));
--> statement-breakpoint
ALTER TABLE integration_outbox_jobs DROP CONSTRAINT IF EXISTS integration_outbox_jobs_type_check;
--> statement-breakpoint
ALTER TABLE integration_outbox_jobs ADD CONSTRAINT integration_outbox_jobs_type_check CHECK (type IN ('provision_frontlit', 'provision_sendlit'));
