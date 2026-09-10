ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_page_id text DEFAULT null;
--> statement-breakpoint
ALTER TABLE communities ADD COLUMN IF NOT EXISTS sales_page_id text DEFAULT null;
--> statement-breakpoint
ALTER TABLE integration_outbox_jobs DROP CONSTRAINT IF EXISTS integration_outbox_jobs_type_check;
--> statement-breakpoint
ALTER TABLE integration_outbox_jobs
  ADD CONSTRAINT integration_outbox_jobs_type_check
  CHECK (type IN ('provision_frontlit', 'provision_sales_page', 'provision_sendlit', 'sync_sendlit_contact'));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS integration_outbox_jobs_sales_page_uidx
  ON integration_outbox_jobs (
    school_id,
    (payload->>'resourceType'),
    (payload->>'resourceId')
  )
  WHERE type = 'provision_sales_page';
--> statement-breakpoint

DO $$
BEGIN
  IF to_regclass('public.frontlit_sales_pages') IS NOT NULL THEN
    EXECUTE $migration$
      UPDATE products AS product
      SET sales_page_id = mapping.remote_page_id
      FROM frontlit_sales_pages AS mapping
      WHERE mapping.school_id = product.school_id
        AND mapping.resource_type = 'product'
        AND mapping.resource_id = product.id
        AND product.sales_page_id IS NULL
        AND mapping.remote_page_id IS NOT NULL
    $migration$;
    EXECUTE $migration$
      UPDATE communities AS community
      SET sales_page_id = mapping.remote_page_id
      FROM frontlit_sales_pages AS mapping
      WHERE mapping.school_id = community.school_id
        AND mapping.resource_type = 'community'
        AND mapping.resource_id = community.id
        AND community.sales_page_id IS NULL
        AND mapping.remote_page_id IS NOT NULL
    $migration$;
    EXECUTE 'DROP TABLE frontlit_sales_pages';
  END IF;
END $$;
