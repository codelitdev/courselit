ALTER TABLE products ADD COLUMN IF NOT EXISTS discussions boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS product_discussion_comments (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('lesson', 'product')),
  entity_id uuid NOT NULL,
  learner_id uuid REFERENCES learners(id) ON DELETE SET NULL,
  admin_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  content text NOT NULL,
  likes_count integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  deleted_by text,
  deleted_by_role text CHECK (deleted_by_role IN ('author', 'moderator', 'system')),
  delete_reason text,
  restored_at timestamptz,
  restored_by text,
  is_edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT product_discussion_comments_one_author_check CHECK (((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS product_discussion_comments_target_idx ON product_discussion_comments (school_id, product_id, entity_type, entity_id, created_at DESC, id DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS product_discussion_replies (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('lesson', 'product')),
  entity_id uuid NOT NULL,
  comment_id uuid NOT NULL REFERENCES product_discussion_comments(id) ON DELETE CASCADE,
  parent_reply_id uuid REFERENCES product_discussion_replies(id) ON DELETE SET NULL,
  learner_id uuid REFERENCES learners(id) ON DELETE SET NULL,
  admin_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  content text NOT NULL,
  likes_count integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  deleted_by text,
  deleted_by_role text CHECK (deleted_by_role IN ('author', 'moderator', 'system')),
  delete_reason text,
  restored_at timestamptz,
  restored_by text,
  is_edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT product_discussion_replies_one_author_check CHECK (((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS product_discussion_replies_comment_idx ON product_discussion_replies (comment_id, created_at ASC, id ASC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS product_discussion_replies_parent_idx ON product_discussion_replies (parent_reply_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS product_discussion_likes (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('lesson', 'product')),
  entity_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('comment', 'reply')),
  content_id uuid NOT NULL,
  comment_id uuid REFERENCES product_discussion_comments(id) ON DELETE CASCADE,
  learner_id uuid REFERENCES learners(id) ON DELETE CASCADE,
  admin_user_id text REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  CONSTRAINT product_discussion_likes_one_identity_check CHECK (((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS product_discussion_likes_learner_uidx ON product_discussion_likes (content_type, content_id, learner_id) WHERE learner_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS product_discussion_likes_admin_uidx ON product_discussion_likes (content_type, content_id, admin_user_id) WHERE admin_user_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS product_discussion_likes_target_idx ON product_discussion_likes (product_id, entity_type, entity_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS product_discussion_summaries (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('lesson', 'product')),
  entity_id uuid NOT NULL,
  comments_count integer NOT NULL DEFAULT 0,
  replies_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  activity_count_including_deleted integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz NOT NULL,
  last_comment_id text,
  last_reply_id text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (school_id, product_id, entity_type, entity_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS product_discussion_subscribers (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('lesson', 'product')),
  entity_id uuid NOT NULL,
  learner_id uuid REFERENCES learners(id) ON DELETE CASCADE,
  admin_user_id text REFERENCES "user"(id) ON DELETE CASCADE,
  subscription boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT product_discussion_subscribers_one_identity_check CHECK (((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS product_discussion_subscribers_learner_uidx ON product_discussion_subscribers (product_id, entity_type, entity_id, learner_id) WHERE learner_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS product_discussion_subscribers_admin_uidx ON product_discussion_subscribers (product_id, entity_type, entity_id, admin_user_id) WHERE admin_user_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS product_discussion_reports (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('lesson', 'product')),
  entity_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('comment', 'reply')),
  content_id uuid NOT NULL,
  comment_id uuid REFERENCES product_discussion_comments(id) ON DELETE CASCADE,
  learner_id uuid REFERENCES learners(id) ON DELETE CASCADE,
  admin_user_id text REFERENCES "user"(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  rejection_reason text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT product_discussion_reports_one_identity_check CHECK (((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS product_discussion_reports_learner_uidx ON product_discussion_reports (content_type, content_id, learner_id) WHERE learner_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS product_discussion_reports_admin_uidx ON product_discussion_reports (content_type, content_id, admin_user_id) WHERE admin_user_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS product_discussion_reports_target_idx ON product_discussion_reports (school_id, product_id, entity_type, entity_id, status, created_at DESC);
