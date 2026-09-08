CREATE TABLE IF NOT EXISTS "schools" (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  name text NOT NULL,
  subdomain text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'read_only', 'maintenance', 'migrating', 'deleted')),
  locale text NOT NULL DEFAULT 'en',
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "memberships" (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL,
  is_owner boolean NOT NULL DEFAULT false,
  permissions text NOT NULL,
  created_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS memberships_school_user_uidx ON memberships (school_id, user_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "selected_schools" (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invitations" (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL,
  permissions text NOT NULL,
  token_digest text NOT NULL,
  inviter_id text NOT NULL REFERENCES "user"(id),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  digest text NOT NULL,
  permissions text NOT NULL,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('course', 'download')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  slug text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_by text NOT NULL REFERENCES "user"(id),
  published_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS products_school_slug_uidx ON products (school_id, slug);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_events" (
  id uuid PRIMARY KEY,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  actor_id text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  request_id text NOT NULL,
  created_at timestamptz NOT NULL
);
