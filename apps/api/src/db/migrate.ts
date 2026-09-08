import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const migrationDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

export const MIGRATION_FILES = [
  "0000_auth.sql",
  "0000_application.sql",
  "0001_billing.sql",
  "0002_catalog.sql",
  "0003_migration.sql",
  "0004_school_host_verification.sql",
  "0005_preview_grants.sql",
  "0006_product_sections.sql",
  "0007_media.sql",
  "0008_certificates.sql",
  "0009_enrollment_access_grants.sql",
  "0010_lesson_drip.sql",
  "0011_progress_started.sql",
  "0012_storefront_plans.sql",
  "0013_storefront_commerce.sql",
  "0014_communities.sql",
  "0015_product_discussions.sql",
  "0016_rate_limit_events.sql",
  "0017_lesson_content_json.sql",
  "0018_default_product_section.sql",
  "0019_lesson_enrollment_visibility.sql",
  "0020_section_drip.sql",
  "0021_storefront_plan_parity.sql",
  "0022_product_manage_parity.sql",
  "0023_product_certificate_templates.sql",
  "0024_storefront_plan_school_currency.sql",
  "0025_storefront_plan_source_amounts.sql",
  "0026_lesson_downloadable.sql",
  "0027_storefront_plan_source_uniqueness.sql",
  "0028_scorm_runtime_state.sql",
  "0029_lesson_evaluations.sql",
  "0030_learner_otp_challenges.sql",
  "0031_download_links.sql",
  "0032_backfill_owner_permissions.sql",
  "0033_frontlit_integrations.sql",
  "0034_community_payment_plans.sql",
  "0035_notifications.sql",
  "0036_learner_notification_preferences.sql",
  "0037_community_commerce.sql",
  "0038_community_subscriptions.sql",
  "0039_learner_media_ownership.sql",
  "0040_community_banner.sql",
  "0041_learner_admin_links.sql",
  "0042_sendlit_integrations.sql",
  "0043_storefront_checkout_sessions.sql",
  "0044_sendlit_contact_sync_outbox.sql",
  "0045_frontlit_sales_pages.sql",
  "0046_school_login_methods.sql",
  "0047_community_feed_ordering.sql",
  "0048_payment_providers.sql",
  "0049_activities.sql",
  "0050_school_code_injection.sql",
] as const;

export async function applyMigrations(
  exec: (sql: string) => Promise<unknown>,
): Promise<void> {
  for (const file of MIGRATION_FILES) {
    const sql = readFileSync(path.join(migrationDir, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) await exec(trimmed);
    }
  }
}
