ALTER TABLE schools ADD COLUMN IF NOT EXISTS login_methods text[] NOT NULL DEFAULT '{"email"}';
--> statement-breakpoint
ALTER TABLE schools ADD COLUMN IF NOT EXISTS sso_config jsonb;
--> statement-breakpoint
ALTER TABLE schools ADD COLUMN IF NOT EXISTS google_config jsonb;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sso_provider" (
  id text PRIMARY KEY,
  "issuer" text NOT NULL,
  "oidc_config" text,
  "saml_config" text,
  "user_id" text REFERENCES "user"("id") ON DELETE CASCADE,
  "provider_id" text NOT NULL UNIQUE,
  "organization_id" text,
  "domain_string" text NOT NULL
);
