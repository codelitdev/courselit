-- CourseLit product Manage settings: source Course.privacy, leadMagnet, and
-- certificate are persisted as first-class product fields.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS privacy text NOT NULL DEFAULT 'unlisted';

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS lead_magnet boolean NOT NULL DEFAULT false;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS certificate boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_privacy_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_privacy_check CHECK (privacy IN ('public', 'unlisted'));
  END IF;
END $$;
