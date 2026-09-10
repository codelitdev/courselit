ALTER TABLE "storefront_invoices" ALTER COLUMN "payment_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "community_invoices" ALTER COLUMN "payment_id" DROP NOT NULL;
