ALTER TABLE "download_links" DROP CONSTRAINT IF EXISTS "download_links_enrollment_id_enrollments_id_fk";
--> statement-breakpoint
ALTER TABLE "lesson_progress" DROP CONSTRAINT IF EXISTS "lesson_progress_enrollment_id_enrollments_id_fk";
--> statement-breakpoint
ALTER TABLE "lesson_evaluations" DROP CONSTRAINT IF EXISTS "lesson_evaluations_enrollment_id_enrollments_id_fk";
--> statement-breakpoint
ALTER TABLE "scorm_runtime_states" DROP CONSTRAINT IF EXISTS "scorm_runtime_states_enrollment_id_enrollments_id_fk";
--> statement-breakpoint
ALTER TABLE "download_links" RENAME COLUMN "enrollment_id" TO "membership_id";
--> statement-breakpoint
ALTER TABLE "lesson_progress" RENAME COLUMN "enrollment_id" TO "membership_id";
--> statement-breakpoint
ALTER TABLE "lesson_evaluations" RENAME COLUMN "enrollment_id" TO "membership_id";
--> statement-breakpoint
ALTER TABLE "scorm_runtime_states" RENAME COLUMN "enrollment_id" TO "membership_id";
--> statement-breakpoint
DROP TABLE "enrollment_access_grants";
--> statement-breakpoint
DROP TABLE "enrollments";
--> statement-breakpoint
ALTER TABLE "download_links" ADD CONSTRAINT "download_links_membership_id_learner_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."learner_memberships"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_membership_id_learner_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."learner_memberships"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lesson_evaluations" ADD CONSTRAINT "lesson_evaluations_membership_id_learner_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."learner_memberships"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scorm_runtime_states" ADD CONSTRAINT "scorm_runtime_states_membership_id_learner_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."learner_memberships"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
DROP INDEX IF EXISTS "lesson_progress_enrollment_lesson_uidx";
--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_progress_membership_lesson_uidx" ON "lesson_progress" ("membership_id", "lesson_id");
--> statement-breakpoint
DROP INDEX IF EXISTS "lesson_evaluations_enrollment_lesson_idx";
--> statement-breakpoint
CREATE INDEX "lesson_evaluations_membership_lesson_idx" ON "lesson_evaluations" ("membership_id", "lesson_id");
--> statement-breakpoint
DROP INDEX IF EXISTS "scorm_runtime_states_enrollment_lesson_uidx";
--> statement-breakpoint
CREATE UNIQUE INDEX "scorm_runtime_states_membership_lesson_uidx" ON "scorm_runtime_states" ("membership_id", "lesson_id");
