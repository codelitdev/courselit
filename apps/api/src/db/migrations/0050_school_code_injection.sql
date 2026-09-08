ALTER TABLE schools ADD COLUMN IF NOT EXISTS code_injection_head text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE schools ADD COLUMN IF NOT EXISTS code_injection_body text NOT NULL DEFAULT '';
