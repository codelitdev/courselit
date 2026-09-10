CREATE TABLE "learner_memberships" (
  "id" uuid PRIMARY KEY NOT NULL,
  "public_id" text NOT NULL,
  "school_id" uuid NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "learner_id" uuid NOT NULL REFERENCES "learners"("id") ON DELETE CASCADE,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "payment_plan_id" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "role" text,
  "subscription_id" text,
  "subscription_method" text,
  "joining_reason" text DEFAULT '' NOT NULL,
  "rejection_reason" text,
  "session_id" text,
  "is_included_in_plan" boolean DEFAULT false NOT NULL,
  "parent_membership_id" uuid REFERENCES "learner_memberships"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  CONSTRAINT "learner_memberships_public_id_unique" UNIQUE("public_id"),
  CONSTRAINT "learner_memberships_entity_type_check" CHECK ("entity_type" IN ('product', 'community')),
  CONSTRAINT "learner_memberships_status_check" CHECK ("status" IN ('active', 'payment_failed', 'expired', 'pending', 'rejected', 'paused')),
  CONSTRAINT "learner_memberships_role_check" CHECK ("role" IS NULL OR "role" IN ('comment', 'post', 'moderate')),
  CONSTRAINT "learner_memberships_included_parent_check" CHECK ("is_included_in_plan" = false OR ("entity_type" = 'product' AND "parent_membership_id" IS NOT NULL AND "payment_plan_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "learner_memberships_direct_entity_uidx"
  ON "learner_memberships" ("school_id", "learner_id", "entity_type", "entity_id")
  WHERE "is_included_in_plan" = false;
--> statement-breakpoint
CREATE UNIQUE INDEX "learner_memberships_included_entity_uidx"
  ON "learner_memberships" ("school_id", "learner_id", "entity_type", "entity_id", "parent_membership_id")
  WHERE "is_included_in_plan" = true;
--> statement-breakpoint
CREATE INDEX "learner_memberships_learner_lookup_idx"
  ON "learner_memberships" ("school_id", "learner_id", "status");
--> statement-breakpoint
CREATE INDEX "learner_memberships_parent_lookup_idx"
  ON "learner_memberships" ("parent_membership_id", "status");
--> statement-breakpoint
ALTER TABLE "storefront_checkout_attempts" ADD COLUMN "membership_id" uuid REFERENCES "learner_memberships"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "storefront_payments" ADD COLUMN "membership_id" uuid REFERENCES "learner_memberships"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "storefront_invoices" ADD COLUMN "membership_id" uuid REFERENCES "learner_memberships"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "storefront_subscriptions" ADD COLUMN "membership_id" uuid REFERENCES "learner_memberships"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "community_checkout_attempts" ADD COLUMN "membership_id" uuid REFERENCES "learner_memberships"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "community_payments" ADD COLUMN "membership_id" uuid REFERENCES "learner_memberships"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "community_invoices" ADD COLUMN "membership_id" uuid REFERENCES "learner_memberships"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "community_subscriptions" ADD COLUMN "membership_id" uuid REFERENCES "learner_memberships"("id") ON DELETE SET NULL;
