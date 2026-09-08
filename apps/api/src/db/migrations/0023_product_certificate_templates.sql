-- The production Course model owns one certificate template per course. Keep
-- existing school-level templates valid while adding the product association.
ALTER TABLE certificate_templates
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS certificate_templates_school_product_uidx
  ON certificate_templates (school_id, product_id)
  WHERE product_id IS NOT NULL;
