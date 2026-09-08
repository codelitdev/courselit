CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  categories text NOT NULL DEFAULT '["General"]',
  enabled boolean NOT NULL DEFAULT false,
  auto_accept_members boolean NOT NULL DEFAULT true,
  joining_reason_text text NOT NULL DEFAULT '',
  deleted_at timestamptz,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS communities_school_slug_uidx ON communities (school_id, slug);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS community_memberships (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  learner_id uuid REFERENCES learners(id) ON DELETE CASCADE,
  admin_user_id text REFERENCES "user"(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'rejected')),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'owner')),
  joining_reason text NOT NULL DEFAULT '',
  rejection_reason text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT community_memberships_one_identity_check CHECK (((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS community_memberships_community_learner_uidx ON community_memberships (community_id, learner_id) WHERE learner_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS community_memberships_community_admin_uidx ON community_memberships (community_id, admin_user_id) WHERE admin_user_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  learner_id uuid REFERENCES learners(id) ON DELETE SET NULL,
  admin_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  pinned boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT community_posts_one_author_check CHECK (((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS community_posts_feed_idx ON community_posts (community_id, created_at DESC, id DESC) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS community_comments (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES community_comments(id) ON DELETE CASCADE,
  learner_id uuid REFERENCES learners(id) ON DELETE SET NULL,
  admin_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  content text NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT community_comments_one_author_check CHECK (((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS community_comments_post_idx ON community_comments (post_id, created_at ASC, id ASC) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS community_reactions (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('post', 'comment', 'reply')),
  entity_id uuid NOT NULL,
  emoji text NOT NULL CHECK (emoji IN ('👍', '❤️', '😄', '🎉', '😢', '😮')),
  learner_id uuid REFERENCES learners(id) ON DELETE CASCADE,
  admin_user_id text REFERENCES "user"(id) ON DELETE CASCADE,
  CONSTRAINT community_reactions_one_identity_check CHECK (((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS community_reactions_learner_uidx ON community_reactions (community_id, entity_type, entity_id, emoji, learner_id) WHERE learner_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS community_reactions_admin_uidx ON community_reactions (community_id, entity_type, entity_id, emoji, admin_user_id) WHERE admin_user_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS community_post_subscribers (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  learner_id uuid REFERENCES learners(id) ON DELETE CASCADE,
  admin_user_id text REFERENCES "user"(id) ON DELETE CASCADE,
  CONSTRAINT community_subscribers_one_identity_check CHECK (((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS community_subscribers_learner_uidx ON community_post_subscribers (post_id, learner_id) WHERE learner_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS community_subscribers_admin_uidx ON community_post_subscribers (post_id, admin_user_id) WHERE admin_user_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS community_reports (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('post', 'comment', 'reply')),
  content_id uuid NOT NULL,
  content_parent_id uuid,
  learner_id uuid REFERENCES learners(id) ON DELETE CASCADE,
  admin_user_id text REFERENCES "user"(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  rejection_reason text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT community_reports_one_identity_check CHECK (((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS community_reports_learner_uidx ON community_reports (community_id, content_type, content_id, learner_id) WHERE learner_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS community_reports_admin_uidx ON community_reports (community_id, content_type, content_id, admin_user_id) WHERE admin_user_id IS NOT NULL;
