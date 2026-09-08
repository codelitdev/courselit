CREATE TABLE IF NOT EXISTS "school_hosts" (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  hostname text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('subdomain', 'custom')),
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'unverified')),
  verified_at timestamptz,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS school_hosts_school_hostname_uidx ON school_hosts (school_id, hostname);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS migration_runs (
  id uuid PRIMARY KEY,
  source_system text NOT NULL,
  scope text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('dry_run', 'apply')),
  status text NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_code text,
  started_at timestamptz NOT NULL,
  completed_at timestamptz
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS migration_mappings (
  id uuid PRIMARY KEY,
  source_system text NOT NULL,
  source_collection text NOT NULL,
  source_id text NOT NULL,
  target_table text NOT NULL,
  target_id text NOT NULL,
  school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
  run_id uuid NOT NULL REFERENCES migration_runs(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS migration_mappings_source_target_uidx
  ON migration_mappings (source_system, source_collection, source_id, target_table);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS migration_rejections (
  id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES migration_runs(id) ON DELETE CASCADE,
  source_system text NOT NULL,
  source_collection text NOT NULL,
  source_id text,
  code text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL
);
