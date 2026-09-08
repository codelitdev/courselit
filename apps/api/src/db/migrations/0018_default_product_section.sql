-- CourseLit creates the first group while setting up every course-like
-- product. Backfill products created before that behavior was ported.
INSERT INTO product_sections (
  id,
  public_id,
  school_id,
  product_id,
  title,
  position,
  created_by,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'sec_' || replace(gen_random_uuid()::text, '-', ''),
  products.school_id,
  products.id,
  'First section',
  1,
  products.created_by,
  products.created_at,
  products.updated_at
FROM products
WHERE NOT EXISTS (
  SELECT 1
  FROM product_sections
  WHERE product_sections.product_id = products.id
);
