CREATE INDEX IF NOT EXISTS community_posts_listing_idx
  ON community_posts (community_id, pinned DESC, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS community_posts_learner_feed_idx
  ON community_posts (school_id, updated_at DESC, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;
