CREATE TABLE IF NOT EXISTS "media" (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  media_lit_id text NOT NULL,
  canonical_url text NOT NULL,
  thumbnail_url text,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size > 0),
  width integer,
  height integer,
  kind text NOT NULL CHECK (kind IN ('image', 'video', 'audio', 'document', 'other')),
  alt_text text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  access_policy text NOT NULL DEFAULT 'private' CHECK (access_policy IN ('public', 'private')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleting')),
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS media_school_media_lit_uidx
  ON media (school_id, media_lit_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_references" (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  resource_internal_id text NOT NULL,
  resource_public_id text NOT NULL,
  parent_resource_internal_id text,
  parent_resource_public_id text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS media_references_resource_media_uidx
  ON media_references (school_id, resource_type, resource_internal_id, media_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS media_references_media_idx ON media_references (media_id);
