CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"alg" text,
	"crv" text
);
--> statement-breakpoint
CREATE TABLE "oauth_access_token" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text,
	"client_id" text NOT NULL,
	"session_id" text,
	"user_id" text,
	"reference_id" text,
	"authorization_code_id" text,
	"resources" text[],
	"requested_user_info_claims" text[],
	"refresh_id" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"revoked" timestamp with time zone,
	"confirmation" jsonb,
	"scopes" text[] NOT NULL,
	CONSTRAINT "oauth_access_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "oauth_client" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text,
	"client_discovery_id" text,
	"disabled" boolean,
	"skip_consent" boolean,
	"enable_end_session" boolean,
	"subject_type" text,
	"scopes" text[],
	"client_credentials_scopes" text[],
	"user_id" text,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"name" text,
	"uri" text,
	"icon" text,
	"contacts" text[],
	"tos" text,
	"policy" text,
	"software_id" text,
	"software_version" text,
	"software_statement" text,
	"redirect_uris" text[] NOT NULL,
	"post_logout_redirect_uris" text[],
	"backchannel_logout_uri" text,
	"backchannel_logout_session_required" boolean,
	"token_endpoint_auth_method" text,
	"application_type" text,
	"jwks" text,
	"jwks_uri" text,
	"grant_types" text[],
	"response_types" text[],
	"require_pkce" boolean,
	"dpop_bound_access_tokens" boolean,
	"reference_id" text,
	"metadata" jsonb,
	CONSTRAINT "oauth_client_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "oauth_client_assertion" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_client_resource" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oauth_consent" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text,
	"reference_id" text,
	"resources" text[],
	"requested_user_info_claims" text[],
	"scopes" text[] NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oauth_refresh_token" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"client_id" text NOT NULL,
	"session_id" text,
	"user_id" text NOT NULL,
	"reference_id" text,
	"authorization_code_id" text,
	"resources" text[],
	"requested_user_info_claims" text[],
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"revoked" timestamp with time zone,
	"rotated_at" timestamp with time zone,
	"rotation_replay_response" text,
	"rotation_replay_expires_at" timestamp with time zone,
	"auth_time" timestamp with time zone,
	"confirmation" jsonb,
	"scopes" text[] NOT NULL,
	CONSTRAINT "oauth_refresh_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "oauth_resource" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"name" text NOT NULL,
	"access_token_ttl" integer,
	"refresh_token_ttl" integer,
	"signing_algorithm" text,
	"signing_key_id" text,
	"allowed_scopes" text[],
	"custom_claims" jsonb,
	"dpop_bound_access_tokens_required" boolean,
	"disabled" boolean,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"policy_version" integer,
	"metadata" jsonb,
	CONSTRAINT "oauth_resource_identifier_unique" UNIQUE("identifier")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificate_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"product_id" uuid,
	"name" text NOT NULL,
	"template" text DEFAULT '{}' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "certificate_templates_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"verification_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"school_account_id" uuid NOT NULL,
	"template_id" uuid,
	"issued_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "certificates_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "certificates_verification_id_unique" UNIQUE("verification_id")
);
--> statement-breakpoint
CREATE TABLE "download_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"school_account_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"token_digest" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "download_links_token_digest_unique" UNIQUE("token_digest")
);
--> statement-breakpoint
CREATE TABLE "lesson_evaluations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"school_account_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"pass" boolean NOT NULL,
	"score" real,
	"requires_passing_grade" boolean NOT NULL,
	"passing_grade" real,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"section_id" uuid,
	"title" text NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"downloadable" boolean DEFAULT false NOT NULL,
	"requires_enrollment" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"position" integer DEFAULT 1 NOT NULL,
	"drip_delay_seconds" integer,
	"drip_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "lessons_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"media_lit_id" text NOT NULL,
	"canonical_url" text NOT NULL,
	"thumbnail_url" text,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"kind" text NOT NULL,
	"category" text DEFAULT 'library' NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"access_policy" text DEFAULT 'private' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text,
	"created_by_school_account_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "media_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "media_references" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"resource_type" text NOT NULL,
	"resource_internal_id" text NOT NULL,
	"resource_public_id" text NOT NULL,
	"parent_resource_internal_id" text,
	"parent_resource_public_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preview_grants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token_digest" text NOT NULL,
	"school_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"issued_by" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "preview_grants_token_digest_unique" UNIQUE("token_digest")
);
--> statement-breakpoint
CREATE TABLE "product_sections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"title" text NOT NULL,
	"position" integer DEFAULT 1 NOT NULL,
	"drip_enabled" boolean DEFAULT false NOT NULL,
	"drip_type" text,
	"drip_delay_seconds" integer,
	"drip_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "product_sections_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "scorm_runtime_states" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"sales_page_id" text DEFAULT null,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"banner" text DEFAULT '' NOT NULL,
	"featured_image" jsonb,
	"categories" text DEFAULT '["General"]' NOT NULL,
	"auto_accept_members" boolean DEFAULT true NOT NULL,
	"joining_reason_text" text DEFAULT '' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "communities_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "community_comments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"parent_comment_id" uuid,
	"school_account_id" uuid,
	"content" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "community_comments_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "community_post_subscribers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"school_account_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"school_account_id" uuid,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"space_id" uuid,
	"pinned" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "community_posts_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "community_reactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	"school_account_id" uuid NOT NULL,
	CONSTRAINT "community_reactions_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "community_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"content_type" text NOT NULL,
	"content_id" uuid NOT NULL,
	"content_parent_id" uuid,
	"school_account_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "community_reports_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "community_checkout_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"school_account_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"membership_id" uuid,
	"provider" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_checkout_id" text,
	"provider_checkout_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"currency" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "community_checkout_attempts_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "community_invoices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"payment_id" uuid,
	"checkout_id" uuid NOT NULL,
	"membership_id" uuid,
	"provider_invoice_id" text,
	"status" text NOT NULL,
	"currency" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "community_invoices_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "community_payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"checkout_id" uuid NOT NULL,
	"membership_id" uuid,
	"provider_payment_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"currency" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "community_payments_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "community_payments_provider_payment_id_unique" UNIQUE("provider_payment_id")
);
--> statement-breakpoint
CREATE TABLE "community_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"checkout_id" uuid NOT NULL,
	"membership_id" uuid,
	"provider_subscription_id" text NOT NULL,
	"status" text NOT NULL,
	"current_period_end" timestamp with time zone,
	"cancel_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "community_subscriptions_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "integration_outbox_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"next_attempt_at" timestamp with time zone NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_integrations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"server" text NOT NULL,
	"external_id" text NOT NULL,
	"remote_team_id" text,
	"encrypted_team_key" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"last_successful_sync_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learner_memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"school_account_id" uuid NOT NULL,
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
	"parent_membership_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "learner_memberships_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "learner_memberships_entity_type_check" CHECK ("learner_memberships"."entity_type" IN ('product', 'community')),
	CONSTRAINT "learner_memberships_status_check" CHECK ("learner_memberships"."status" IN ('active', 'payment_failed', 'expired', 'pending', 'rejected', 'paused')),
	CONSTRAINT "learner_memberships_role_check" CHECK ((
        ("learner_memberships"."entity_type" = 'product' AND "learner_memberships"."role" IS NULL)
        OR
        ("learner_memberships"."entity_type" = 'community' AND "learner_memberships"."role" IN ('comment', 'post', 'moderate'))
      )),
	CONSTRAINT "learner_memberships_included_parent_check" CHECK ("learner_memberships"."is_included_in_plan" = false OR ("learner_memberships"."entity_type" = 'product' AND "learner_memberships"."parent_membership_id" IS NOT NULL AND "learner_memberships"."payment_plan_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "migration_mappings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_system" text NOT NULL,
	"source_collection" text NOT NULL,
	"source_id" text NOT NULL,
	"target_table" text NOT NULL,
	"target_id" text NOT NULL,
	"school_id" uuid,
	"run_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migration_rejections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"source_system" text NOT NULL,
	"source_collection" text NOT NULL,
	"source_id" text,
	"code" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migration_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_system" text NOT NULL,
	"scope" text NOT NULL,
	"mode" text NOT NULL,
	"status" text NOT NULL,
	"counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_code" text,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "learner_notification_preferences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"school_account_id" uuid NOT NULL,
	"type" text NOT NULL,
	"app_enabled" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"school_account_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "notifications_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "staff_notification_preferences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"type" text NOT NULL,
	"app_enabled" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"request_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"sales_page_id" text DEFAULT null,
	"kind" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"featured_image" jsonb,
	"privacy" text DEFAULT 'unlisted' NOT NULL,
	"lead_magnet" boolean DEFAULT false NOT NULL,
	"certificate" boolean DEFAULT false NOT NULL,
	"discussions" boolean DEFAULT false NOT NULL,
	"included_with_community" boolean DEFAULT false NOT NULL,
	"discussion_space_id" uuid,
	"created_by" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "products_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"scope" text NOT NULL,
	"action" text NOT NULL,
	"subject_id" text NOT NULL,
	"fingerprint" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"membership_id" uuid,
	"created_by_school_account_id" uuid,
	"user_id" text,
	"name" text DEFAULT 'Default' NOT NULL,
	"digest" text NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"preset_id" text,
	"token_digest" text NOT NULL,
	"invited_by_school_account_id" uuid,
	"inviter_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_by_school_account_id" uuid,
	"accepted_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "invitations_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"school_account_id" uuid NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"preset_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "memberships_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "school_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"avatar" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"learner_registered_at" timestamp with time zone,
	"last_active_at" timestamp with time zone,
	"contact_activated_at" timestamp with time zone,
	"sendlit_contact_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "school_accounts_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "school_accounts_contact_activated_check" CHECK ("school_accounts"."sendlit_contact_id" IS NULL OR "school_accounts"."contact_activated_at" IS NOT NULL),
	CONSTRAINT "school_accounts_status_check" CHECK ("school_accounts"."status" IN ('active', 'deactivated', 'deletion_pending'))
);
--> statement-breakpoint
CREATE TABLE "school_auth_tickets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_digest" text NOT NULL,
	"school_id" uuid NOT NULL,
	"school_account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"authentication_method" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "school_auth_tickets_ticket_digest_unique" UNIQUE("ticket_digest")
);
--> statement-breakpoint
CREATE TABLE "school_hosts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"hostname" text NOT NULL,
	"kind" text NOT NULL,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"verification_token_digest" text,
	"verified_at" timestamp with time zone,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "school_hosts_hostname_unique" UNIQUE("hostname")
);
--> statement-breakpoint
CREATE TABLE "school_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"school_account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"token_digest" text NOT NULL,
	"authentication_method" text NOT NULL,
	"authenticated_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "school_sessions_token_digest_unique" UNIQUE("token_digest")
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"name" text NOT NULL,
	"subdomain" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"payment_settings_encrypted" text,
	"code_injection_head" text DEFAULT '' NOT NULL,
	"code_injection_body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "schools_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "schools_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "selected_schools" (
	"user_id" text PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "space_followers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"school_account_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "space_unlock_plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"unlock_id" uuid NOT NULL,
	"payment_plan_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "space_unlocks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "space_unlocks_entity_check" CHECK ("space_unlocks"."entity_type" IN ('community', 'product'))
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"logo" text DEFAULT 'MessagesSquare' NOT NULL,
	"featured_image" jsonb,
	"follow" boolean DEFAULT false NOT NULL,
	"who_can_post" text DEFAULT 'members' NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "spaces_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "storefront_checkout_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"school_account_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"membership_id" uuid,
	"provider" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_checkout_id" text,
	"provider_checkout_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"currency" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "storefront_checkout_attempts_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "storefront_checkout_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"product_id" uuid,
	"community_id" uuid,
	"plan_id" uuid NOT NULL,
	"school_account_id" uuid,
	"checkout_id" uuid,
	"community_checkout_id" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "storefront_checkout_sessions_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "storefront_checkout_sessions_resource_check" CHECK (("storefront_checkout_sessions"."entity_type" = 'product' AND "storefront_checkout_sessions"."product_id" IS NOT NULL AND "storefront_checkout_sessions"."community_id" IS NULL) OR ("storefront_checkout_sessions"."entity_type" = 'community' AND "storefront_checkout_sessions"."product_id" IS NULL AND "storefront_checkout_sessions"."community_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "storefront_invoices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"payment_id" uuid,
	"checkout_id" uuid NOT NULL,
	"membership_id" uuid,
	"provider_invoice_id" text,
	"status" text NOT NULL,
	"currency" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"pdf_url" text,
	"hosted_invoice_url" text,
	"issued_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "storefront_invoices_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "storefront_invoices_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "storefront_payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"checkout_id" uuid NOT NULL,
	"membership_id" uuid,
	"provider_payment_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"currency" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "storefront_payments_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "storefront_plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"included_products" text[] DEFAULT '{}' NOT NULL,
	"provider_product_id" text,
	"kind" text NOT NULL,
	"one_time_amount" numeric,
	"emi_amount" numeric,
	"emi_total_installments" integer,
	"subscription_monthly_amount" numeric,
	"subscription_yearly_amount" numeric,
	"amount_minor" integer NOT NULL,
	"billing_interval" text,
	"installment_count" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "storefront_plans_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "storefront_plans_amount_check" CHECK ("storefront_plans"."amount_minor" >= 0),
	CONSTRAINT "storefront_plans_entity_type_check" CHECK ("storefront_plans"."entity_type" IN ('product', 'community')),
	CONSTRAINT "storefront_plans_entity_id_check" CHECK (length(trim("storefront_plans"."entity_id")) > 0),
	CONSTRAINT "storefront_plans_kind_check" CHECK ("storefront_plans"."kind" IN ('free', 'one_time', 'subscription', 'installment')),
	CONSTRAINT "storefront_plans_status_check" CHECK ("storefront_plans"."status" IN ('active', 'archived')),
	CONSTRAINT "storefront_plans_shape_check" CHECK ((
        ("storefront_plans"."kind" = 'free' AND "storefront_plans"."amount_minor" = 0 AND "storefront_plans"."billing_interval" IS NULL AND "storefront_plans"."installment_count" IS NULL)
        OR ("storefront_plans"."kind" = 'one_time' AND "storefront_plans"."amount_minor" > 0 AND "storefront_plans"."billing_interval" IS NULL AND "storefront_plans"."installment_count" IS NULL)
        OR ("storefront_plans"."kind" = 'subscription' AND "storefront_plans"."amount_minor" > 0 AND "storefront_plans"."billing_interval" IN ('month', 'year') AND "storefront_plans"."installment_count" IS NULL)
        OR ("storefront_plans"."kind" = 'installment' AND "storefront_plans"."amount_minor" > 0 AND "storefront_plans"."billing_interval" IN ('month', 'year') AND "storefront_plans"."installment_count" >= 2)
      ))
);
--> statement-breakpoint
CREATE TABLE "storefront_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"checkout_id" uuid NOT NULL,
	"provider_subscription_id" text NOT NULL,
	"status" text NOT NULL,
	"current_period_end" timestamp with time zone,
	"cancel_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "storefront_subscriptions_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "storefront_webhook_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"error" text,
	"received_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "storefront_webhook_events_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "billing_catalog_revision_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_revision_id" uuid NOT NULL,
	"offer_key" text NOT NULL,
	"billing_price_entry_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_catalog_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision" integer NOT NULL,
	"checkout_provider" text NOT NULL,
	"status" text DEFAULT 'pending_verification' NOT NULL,
	"verified_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_catalog_revisions_revision_unique" UNIQUE("revision"),
	CONSTRAINT "billing_catalog_revisions_status_check" CHECK ("billing_catalog_revisions"."status" IN ('pending_verification', 'active', 'retired', 'invalid', 'abandoned')),
	CONSTRAINT "billing_catalog_revisions_revision_check" CHECK ("billing_catalog_revisions"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "billing_checkout_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" text NOT NULL,
	"billable_entity_id" uuid NOT NULL,
	"payer_id" text NOT NULL,
	"payer_email" text DEFAULT '' NOT NULL,
	"return_url" text DEFAULT '' NOT NULL,
	"provider" text NOT NULL,
	"catalog_revision" integer NOT NULL,
	"offer_key" text NOT NULL,
	"requested_plan" text NOT NULL,
	"requested_interval" text NOT NULL,
	"billing_price_entry_id" uuid NOT NULL,
	"quoted_amount_minor" integer NOT NULL,
	"quoted_currency" text NOT NULL,
	"billing_customer_id" uuid,
	"provider_checkout_session_id" text,
	"checkout_url_encrypted" text,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'creating' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_error" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_checkout_attempts_attempt_id_unique" UNIQUE("attempt_id"),
	CONSTRAINT "billing_checkout_attempts_status_check" CHECK ("billing_checkout_attempts"."status" IN ('creating', 'open', 'completed', 'expired', 'abandoned', 'conflicted')),
	CONSTRAINT "billing_checkout_attempts_amount_check" CHECK ("billing_checkout_attempts"."quoted_amount_minor" > 0),
	CONSTRAINT "billing_checkout_attempts_plan_check" CHECK ("billing_checkout_attempts"."requested_plan" IN ('pro', 'business')),
	CONSTRAINT "billing_checkout_attempts_interval_check" CHECK ("billing_checkout_attempts"."requested_interval" IN ('month', 'year'))
);
--> statement-breakpoint
CREATE TABLE "billing_plan_change_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_id" text NOT NULL,
	"billable_entity_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"payer_id" text NOT NULL,
	"provider" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"current_catalog_revision" integer NOT NULL,
	"current_billing_price_entry_id" uuid NOT NULL,
	"current_plan" text NOT NULL,
	"current_interval" text NOT NULL,
	"target_catalog_revision" integer NOT NULL,
	"target_billing_price_entry_id" uuid NOT NULL,
	"target_plan" text NOT NULL,
	"target_interval" text NOT NULL,
	"target_offer_key" text NOT NULL,
	"effective_at" text NOT NULL,
	"proration_mode" text NOT NULL,
	"provider_payment_id" text,
	"payment_url_encrypted" text,
	"status" text DEFAULT 'creating' NOT NULL,
	"last_error" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_plan_change_attempts_change_id_unique" UNIQUE("change_id"),
	CONSTRAINT "billing_plan_change_attempts_status_check" CHECK ("billing_plan_change_attempts"."status" IN ('creating', 'pending', 'succeeded', 'failed', 'conflicted')),
	CONSTRAINT "billing_plan_change_attempts_effective_at_check" CHECK ("billing_plan_change_attempts"."effective_at" IN ('immediately', 'next_billing_date')),
	CONSTRAINT "billing_plan_change_attempts_proration_mode_check" CHECK ("billing_plan_change_attempts"."proration_mode" IN ('prorated_immediately', 'do_not_bill')),
	CONSTRAINT "billing_plan_change_attempts_current_plan_check" CHECK ("billing_plan_change_attempts"."current_plan" IN ('pro', 'business')),
	CONSTRAINT "billing_plan_change_attempts_target_plan_check" CHECK ("billing_plan_change_attempts"."target_plan" IN ('pro', 'business'))
);
--> statement-breakpoint
CREATE TABLE "billing_plan_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billable_entity_id" uuid NOT NULL,
	"active_subscription_id" uuid,
	"projection_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_plan_states_billable_entity_id_unique" UNIQUE("billable_entity_id")
);
--> statement-breakpoint
CREATE TABLE "billing_price_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_key" text NOT NULL,
	"plan" text NOT NULL,
	"billing_interval" text NOT NULL,
	"currency" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"provider_trial_days" integer DEFAULT 0 NOT NULL,
	"provider" text NOT NULL,
	"provider_product_id" text NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_price_entries_amount_check" CHECK ("billing_price_entries"."amount_minor" > 0),
	CONSTRAINT "billing_price_entries_trial_days_check" CHECK ("billing_price_entries"."provider_trial_days" >= 0),
	CONSTRAINT "billing_price_entries_currency_check" CHECK ("billing_price_entries"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "billing_price_entries_plan_check" CHECK ("billing_price_entries"."plan" IN ('pro', 'business')),
	CONSTRAINT "billing_price_entries_interval_check" CHECK ("billing_price_entries"."billing_interval" IN ('month', 'year'))
);
--> statement-breakpoint
CREATE TABLE "billing_provider_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"payer_id" text NOT NULL,
	"payer_email" text DEFAULT '' NOT NULL,
	"provider_customer_id" text,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'creating' NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_provider_customers_status_check" CHECK ("billing_provider_customers"."status" IN ('creating', 'active', 'conflicted'))
);
--> statement-breakpoint
CREATE TABLE "billing_reconciliation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"checkout_attempt_id" uuid,
	"plan_change_attempt_id" uuid,
	"subscription_id" uuid,
	"provider_customer_id" uuid,
	"operation" text DEFAULT 'reconcile' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"lease_expires_at" timestamp with time zone,
	"worker_id" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_reconciliation_jobs_exactly_one_subject" CHECK (((CASE WHEN "billing_reconciliation_jobs"."checkout_attempt_id" IS NOT NULL THEN 1 ELSE 0 END) + (CASE WHEN "billing_reconciliation_jobs"."plan_change_attempt_id" IS NOT NULL THEN 1 ELSE 0 END) + (CASE WHEN "billing_reconciliation_jobs"."subscription_id" IS NOT NULL THEN 1 ELSE 0 END) + (CASE WHEN "billing_reconciliation_jobs"."provider_customer_id" IS NOT NULL THEN 1 ELSE 0 END)) = 1),
	CONSTRAINT "billing_reconciliation_jobs_status_check" CHECK ("billing_reconciliation_jobs"."status" IN ('pending', 'processing', 'failed', 'completed', 'quarantined')),
	CONSTRAINT "billing_reconciliation_jobs_operation_check" CHECK ("billing_reconciliation_jobs"."operation" = 'reconcile' OR ("billing_reconciliation_jobs"."operation" = 'cancellation' AND "billing_reconciliation_jobs"."subscription_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "billing_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billable_entity_id" uuid NOT NULL,
	"billing_customer_id" uuid NOT NULL,
	"payer_id" text NOT NULL,
	"origin_checkout_attempt_id" uuid,
	"provider" text NOT NULL,
	"provider_subscription_id" text NOT NULL,
	"provider_product_id" text NOT NULL,
	"billing_price_entry_id" uuid NOT NULL,
	"catalog_revision" integer NOT NULL,
	"offer_key" text NOT NULL,
	"plan" text NOT NULL,
	"billing_interval" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"current_period_starts_at" timestamp with time zone,
	"current_period_ends_at" timestamp with time zone,
	"paid_through_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"is_entitlement_source" boolean DEFAULT false NOT NULL,
	"provider_occurred_at" timestamp with time zone,
	"provider_version" text,
	"last_observed_at" timestamp with time zone,
	"last_reconciled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_subscriptions_status_check" CHECK ("billing_subscriptions"."status" IN ('pending', 'trialing', 'active', 'past_due', 'cancelled', 'expired')),
	CONSTRAINT "billing_subscriptions_plan_check" CHECK ("billing_subscriptions"."plan" IN ('pro', 'business')),
	CONSTRAINT "billing_subscriptions_interval_check" CHECK ("billing_subscriptions"."billing_interval" IN ('month', 'year'))
);
--> statement-breakpoint
CREATE TABLE "billing_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"subscription_id" text,
	"checkout_attempt_id" text,
	"payload_encrypted" text,
	"payload_key_version" text,
	"verified_key_version" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"processing_attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"lease_expires_at" timestamp with time zone,
	"worker_id" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "billing_webhook_events_status_check" CHECK ("billing_webhook_events"."status" IN ('pending', 'processing', 'processed', 'ignored', 'quarantined', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_refresh_id_oauth_refresh_token_id_fk" FOREIGN KEY ("refresh_id") REFERENCES "public"."oauth_refresh_token"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_client" ADD CONSTRAINT "oauth_client_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_client_resource" ADD CONSTRAINT "oauth_client_resource_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_client_resource" ADD CONSTRAINT "oauth_client_resource_resource_id_oauth_resource_identifier_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."oauth_resource"("identifier") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_template_id_certificate_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."certificate_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_links" ADD CONSTRAINT "download_links_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_links" ADD CONSTRAINT "download_links_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_links" ADD CONSTRAINT "download_links_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_evaluations" ADD CONSTRAINT "lesson_evaluations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_evaluations" ADD CONSTRAINT "lesson_evaluations_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_evaluations" ADD CONSTRAINT "lesson_evaluations_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_section_id_product_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."product_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_created_by_school_account_id_school_accounts_id_fk" FOREIGN KEY ("created_by_school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_references" ADD CONSTRAINT "media_references_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_references" ADD CONSTRAINT "media_references_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preview_grants" ADD CONSTRAINT "preview_grants_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preview_grants" ADD CONSTRAINT "preview_grants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preview_grants" ADD CONSTRAINT "preview_grants_issued_by_user_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sections" ADD CONSTRAINT "product_sections_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sections" ADD CONSTRAINT "product_sections_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sections" ADD CONSTRAINT "product_sections_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorm_runtime_states" ADD CONSTRAINT "scorm_runtime_states_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorm_runtime_states" ADD CONSTRAINT "scorm_runtime_states_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_post_subscribers" ADD CONSTRAINT "community_post_subscribers_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_post_subscribers" ADD CONSTRAINT "community_post_subscribers_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_post_subscribers" ADD CONSTRAINT "community_post_subscribers_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_post_subscribers" ADD CONSTRAINT "community_post_subscribers_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reactions" ADD CONSTRAINT "community_reactions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reactions" ADD CONSTRAINT "community_reactions_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reactions" ADD CONSTRAINT "community_reactions_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_checkout_attempts" ADD CONSTRAINT "community_checkout_attempts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_checkout_attempts" ADD CONSTRAINT "community_checkout_attempts_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_checkout_attempts" ADD CONSTRAINT "community_checkout_attempts_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_checkout_attempts" ADD CONSTRAINT "community_checkout_attempts_plan_id_storefront_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."storefront_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_invoices" ADD CONSTRAINT "community_invoices_payment_id_community_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."community_payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_invoices" ADD CONSTRAINT "community_invoices_checkout_id_community_checkout_attempts_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."community_checkout_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_payments" ADD CONSTRAINT "community_payments_checkout_id_community_checkout_attempts_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."community_checkout_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_subscriptions" ADD CONSTRAINT "community_subscriptions_checkout_id_community_checkout_attempts_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."community_checkout_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_outbox_jobs" ADD CONSTRAINT "integration_outbox_jobs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_integrations" ADD CONSTRAINT "school_integrations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_memberships" ADD CONSTRAINT "learner_memberships_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_memberships" ADD CONSTRAINT "learner_memberships_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_mappings" ADD CONSTRAINT "migration_mappings_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_mappings" ADD CONSTRAINT "migration_mappings_run_id_migration_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."migration_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_rejections" ADD CONSTRAINT "migration_rejections_run_id_migration_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."migration_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_notification_preferences" ADD CONSTRAINT "learner_notification_preferences_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_notification_preferences" ADD CONSTRAINT "learner_notification_preferences_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_notification_preferences" ADD CONSTRAINT "staff_notification_preferences_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_notification_preferences" ADD CONSTRAINT "staff_notification_preferences_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_limit_events" ADD CONSTRAINT "rate_limit_events_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_school_account_id_school_accounts_id_fk" FOREIGN KEY ("created_by_school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_school_account_id_school_accounts_id_fk" FOREIGN KEY ("invited_by_school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_by_school_account_id_school_accounts_id_fk" FOREIGN KEY ("accepted_by_school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_accounts" ADD CONSTRAINT "school_accounts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_accounts" ADD CONSTRAINT "school_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_auth_tickets" ADD CONSTRAINT "school_auth_tickets_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_auth_tickets" ADD CONSTRAINT "school_auth_tickets_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_auth_tickets" ADD CONSTRAINT "school_auth_tickets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_hosts" ADD CONSTRAINT "school_hosts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_sessions" ADD CONSTRAINT "school_sessions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_sessions" ADD CONSTRAINT "school_sessions_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_sessions" ADD CONSTRAINT "school_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_schools" ADD CONSTRAINT "selected_schools_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_schools" ADD CONSTRAINT "selected_schools_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_followers" ADD CONSTRAINT "space_followers_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_followers" ADD CONSTRAINT "space_followers_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_followers" ADD CONSTRAINT "space_followers_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_unlock_plans" ADD CONSTRAINT "space_unlock_plans_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_unlock_plans" ADD CONSTRAINT "space_unlock_plans_unlock_id_space_unlocks_id_fk" FOREIGN KEY ("unlock_id") REFERENCES "public"."space_unlocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_unlock_plans" ADD CONSTRAINT "space_unlock_plans_payment_plan_id_storefront_plans_id_fk" FOREIGN KEY ("payment_plan_id") REFERENCES "public"."storefront_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_unlocks" ADD CONSTRAINT "space_unlocks_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_unlocks" ADD CONSTRAINT "space_unlocks_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_checkout_attempts" ADD CONSTRAINT "storefront_checkout_attempts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_checkout_attempts" ADD CONSTRAINT "storefront_checkout_attempts_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_checkout_attempts" ADD CONSTRAINT "storefront_checkout_attempts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_checkout_attempts" ADD CONSTRAINT "storefront_checkout_attempts_plan_id_storefront_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."storefront_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_checkout_sessions" ADD CONSTRAINT "storefront_checkout_sessions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_checkout_sessions" ADD CONSTRAINT "storefront_checkout_sessions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_checkout_sessions" ADD CONSTRAINT "storefront_checkout_sessions_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_checkout_sessions" ADD CONSTRAINT "storefront_checkout_sessions_plan_id_storefront_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."storefront_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_checkout_sessions" ADD CONSTRAINT "storefront_checkout_sessions_school_account_id_school_accounts_id_fk" FOREIGN KEY ("school_account_id") REFERENCES "public"."school_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_checkout_sessions" ADD CONSTRAINT "storefront_checkout_sessions_checkout_id_storefront_checkout_attempts_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."storefront_checkout_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_invoices" ADD CONSTRAINT "storefront_invoices_payment_id_storefront_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."storefront_payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_invoices" ADD CONSTRAINT "storefront_invoices_checkout_id_storefront_checkout_attempts_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."storefront_checkout_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_payments" ADD CONSTRAINT "storefront_payments_checkout_id_storefront_checkout_attempts_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."storefront_checkout_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_plans" ADD CONSTRAINT "storefront_plans_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_plans" ADD CONSTRAINT "storefront_plans_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_subscriptions" ADD CONSTRAINT "storefront_subscriptions_checkout_id_storefront_checkout_attempts_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."storefront_checkout_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_catalog_revision_items" ADD CONSTRAINT "billing_catalog_revision_items_catalog_revision_id_billing_catalog_revisions_id_fk" FOREIGN KEY ("catalog_revision_id") REFERENCES "public"."billing_catalog_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_catalog_revision_items" ADD CONSTRAINT "billing_catalog_revision_items_billing_price_entry_id_billing_price_entries_id_fk" FOREIGN KEY ("billing_price_entry_id") REFERENCES "public"."billing_price_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_checkout_attempts" ADD CONSTRAINT "billing_checkout_attempts_billable_entity_id_schools_id_fk" FOREIGN KEY ("billable_entity_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_checkout_attempts" ADD CONSTRAINT "billing_checkout_attempts_payer_id_user_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_checkout_attempts" ADD CONSTRAINT "billing_checkout_attempts_billing_price_entry_id_billing_price_entries_id_fk" FOREIGN KEY ("billing_price_entry_id") REFERENCES "public"."billing_price_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_checkout_attempts" ADD CONSTRAINT "billing_checkout_attempts_billing_customer_id_billing_provider_customers_id_fk" FOREIGN KEY ("billing_customer_id") REFERENCES "public"."billing_provider_customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_plan_change_attempts" ADD CONSTRAINT "billing_plan_change_attempts_billable_entity_id_schools_id_fk" FOREIGN KEY ("billable_entity_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_plan_change_attempts" ADD CONSTRAINT "billing_plan_change_attempts_subscription_id_billing_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."billing_subscriptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_plan_change_attempts" ADD CONSTRAINT "billing_plan_change_attempts_payer_id_user_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_plan_change_attempts" ADD CONSTRAINT "billing_plan_change_attempts_current_billing_price_entry_id_billing_price_entries_id_fk" FOREIGN KEY ("current_billing_price_entry_id") REFERENCES "public"."billing_price_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_plan_change_attempts" ADD CONSTRAINT "billing_plan_change_attempts_target_billing_price_entry_id_billing_price_entries_id_fk" FOREIGN KEY ("target_billing_price_entry_id") REFERENCES "public"."billing_price_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_plan_states" ADD CONSTRAINT "billing_plan_states_billable_entity_id_schools_id_fk" FOREIGN KEY ("billable_entity_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_plan_states" ADD CONSTRAINT "billing_plan_states_active_subscription_id_billing_subscriptions_id_fk" FOREIGN KEY ("active_subscription_id") REFERENCES "public"."billing_subscriptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_provider_customers" ADD CONSTRAINT "billing_provider_customers_payer_id_user_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_reconciliation_jobs" ADD CONSTRAINT "billing_reconciliation_jobs_checkout_attempt_id_billing_checkout_attempts_id_fk" FOREIGN KEY ("checkout_attempt_id") REFERENCES "public"."billing_checkout_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_reconciliation_jobs" ADD CONSTRAINT "billing_reconciliation_jobs_plan_change_attempt_id_billing_plan_change_attempts_id_fk" FOREIGN KEY ("plan_change_attempt_id") REFERENCES "public"."billing_plan_change_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_reconciliation_jobs" ADD CONSTRAINT "billing_reconciliation_jobs_subscription_id_billing_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."billing_subscriptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_reconciliation_jobs" ADD CONSTRAINT "billing_reconciliation_jobs_provider_customer_id_billing_provider_customers_id_fk" FOREIGN KEY ("provider_customer_id") REFERENCES "public"."billing_provider_customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_billable_entity_id_schools_id_fk" FOREIGN KEY ("billable_entity_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_billing_customer_id_billing_provider_customers_id_fk" FOREIGN KEY ("billing_customer_id") REFERENCES "public"."billing_provider_customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_payer_id_user_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_origin_checkout_attempt_id_billing_checkout_attempts_id_fk" FOREIGN KEY ("origin_checkout_attempt_id") REFERENCES "public"."billing_checkout_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_billing_price_entry_id_billing_price_entries_id_fk" FOREIGN KEY ("billing_price_entry_id") REFERENCES "public"."billing_price_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activities_dedupe_uidx" ON "activities" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "activities_school_type_date_idx" ON "activities" USING btree ("school_id","type","created_at");--> statement-breakpoint
CREATE INDEX "activities_school_entity_date_idx" ON "activities" USING btree ("school_id","entity_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "certificate_templates_school_name_uidx" ON "certificate_templates" USING btree ("school_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "certificate_templates_school_product_uidx" ON "certificate_templates" USING btree ("school_id","product_id") WHERE "certificate_templates"."product_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_school_account_product_uidx" ON "certificates" USING btree ("school_account_id","product_id");--> statement-breakpoint
CREATE INDEX "download_links_active_lookup_idx" ON "download_links" USING btree ("school_id","school_account_id","product_id","expires_at");--> statement-breakpoint
CREATE INDEX "lesson_evaluations_membership_lesson_idx" ON "lesson_evaluations" USING btree ("membership_id","lesson_id");--> statement-breakpoint
CREATE INDEX "lesson_evaluations_school_lesson_idx" ON "lesson_evaluations" USING btree ("school_id","lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_progress_membership_lesson_uidx" ON "lesson_progress" USING btree ("membership_id","lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_product_position_uidx" ON "lessons" USING btree ("product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "media_school_media_lit_uidx" ON "media" USING btree ("school_id","media_lit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_references_resource_media_uidx" ON "media_references" USING btree ("school_id","resource_type","resource_internal_id","media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_sections_product_position_uidx" ON "product_sections" USING btree ("product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "scorm_runtime_states_membership_lesson_uidx" ON "scorm_runtime_states" USING btree ("membership_id","lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "communities_school_slug_uidx" ON "communities" USING btree ("school_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "communities_school_uidx" ON "communities" USING btree ("school_id") WHERE "communities"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "community_comments_post_idx" ON "community_comments" USING btree ("post_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_subscribers_account_uidx" ON "community_post_subscribers" USING btree ("post_id","school_account_id");--> statement-breakpoint
CREATE INDEX "community_posts_feed_idx" ON "community_posts" USING btree ("community_id","created_at","id");--> statement-breakpoint
CREATE INDEX "community_posts_listing_idx" ON "community_posts" USING btree ("community_id","pinned","created_at","id");--> statement-breakpoint
CREATE INDEX "community_posts_account_feed_idx" ON "community_posts" USING btree ("school_id","updated_at","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_reactions_account_uidx" ON "community_reactions" USING btree ("community_id","entity_type","entity_id","emoji","school_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_reports_account_uidx" ON "community_reports" USING btree ("community_id","content_type","content_id","school_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_checkout_school_idempotency_uidx" ON "community_checkout_attempts" USING btree ("school_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "community_checkout_provider_checkout_uidx" ON "community_checkout_attempts" USING btree ("provider_checkout_id") WHERE "community_checkout_attempts"."provider_checkout_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "community_invoices_provider_invoice_uidx" ON "community_invoices" USING btree ("provider_invoice_id") WHERE "community_invoices"."provider_invoice_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "community_invoices_payment_uidx" ON "community_invoices" USING btree ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_subscriptions_provider_subscription_uidx" ON "community_subscriptions" USING btree ("provider_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_outbox_jobs_provision_uidx" ON "integration_outbox_jobs" USING btree ("school_id","provider","type") WHERE type IN ('provision_frontlit', 'provision_sendlit');--> statement-breakpoint
CREATE UNIQUE INDEX "integration_outbox_jobs_sales_page_uidx" ON "integration_outbox_jobs" USING btree ("school_id",("payload"->>'resourceType'),("payload"->>'resourceId')) WHERE type = 'provision_sales_page';--> statement-breakpoint
CREATE UNIQUE INDEX "integration_outbox_jobs_contact_sync_uidx" ON "integration_outbox_jobs" USING btree ("school_id","provider","type",("payload"->>'schoolAccountId')) WHERE status = 'pending' AND type = 'sync_sendlit_contact';--> statement-breakpoint
CREATE INDEX "integration_outbox_jobs_pending_idx" ON "integration_outbox_jobs" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "school_integrations_school_provider_uidx" ON "school_integrations" USING btree ("school_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "school_integrations_provider_external_uidx" ON "school_integrations" USING btree ("provider","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learner_memberships_direct_entity_uidx" ON "learner_memberships" USING btree ("school_id","school_account_id","entity_type","entity_id") WHERE "learner_memberships"."is_included_in_plan" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "learner_memberships_included_entity_uidx" ON "learner_memberships" USING btree ("school_id","school_account_id","entity_type","entity_id","parent_membership_id") WHERE "learner_memberships"."is_included_in_plan" = true;--> statement-breakpoint
CREATE INDEX "learner_memberships_school_account_lookup_idx" ON "learner_memberships" USING btree ("school_id","school_account_id","status");--> statement-breakpoint
CREATE INDEX "learner_memberships_parent_lookup_idx" ON "learner_memberships" USING btree ("parent_membership_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "migration_mappings_source_target_uidx" ON "migration_mappings" USING btree ("source_system","source_collection","source_id","target_table");--> statement-breakpoint
CREATE UNIQUE INDEX "learner_notification_preferences_type_uidx" ON "learner_notification_preferences" USING btree ("school_id","school_account_id","type");--> statement-breakpoint
CREATE INDEX "notifications_feed_idx" ON "notifications" USING btree ("school_id","school_account_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_notification_preferences_type_uidx" ON "staff_notification_preferences" USING btree ("school_id","membership_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "products_school_slug_uidx" ON "products" USING btree ("school_id","slug");--> statement-breakpoint
CREATE INDEX "rate_limit_events_lookup_idx" ON "rate_limit_events" USING btree ("school_id","user_id","scope","action","subject_id","created_at");--> statement-breakpoint
CREATE INDEX "rate_limit_events_fingerprint_idx" ON "rate_limit_events" USING btree ("school_id","user_id","scope","subject_id","fingerprint","created_at");--> statement-breakpoint
CREATE INDEX "invitations_school_email_idx" ON "invitations" USING btree ("school_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_school_pending_email_uidx" ON "invitations" USING btree ("school_id","normalized_email") WHERE "invitations"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_school_account_uidx" ON "memberships" USING btree ("school_id","school_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_school_single_owner_uidx" ON "memberships" USING btree ("school_id") WHERE "memberships"."is_owner" = true;--> statement-breakpoint
CREATE INDEX "memberships_school_account_idx" ON "memberships" USING btree ("school_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_accounts_school_user_uidx" ON "school_accounts" USING btree ("school_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_accounts_school_email_uidx" ON "school_accounts" USING btree ("school_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "school_accounts_school_sendlit_contact_uidx" ON "school_accounts" USING btree ("school_id","sendlit_contact_id") WHERE "school_accounts"."sendlit_contact_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "school_hosts_school_hostname_uidx" ON "school_hosts" USING btree ("school_id","hostname");--> statement-breakpoint
CREATE INDEX "school_sessions_school_account_idx" ON "school_sessions" USING btree ("school_id","school_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "space_followers_space_account_uidx" ON "space_followers" USING btree ("space_id","school_account_id");--> statement-breakpoint
CREATE INDEX "space_followers_account_idx" ON "space_followers" USING btree ("school_id","school_account_id","space_id");--> statement-breakpoint
CREATE UNIQUE INDEX "space_unlock_plans_unlock_plan_uidx" ON "space_unlock_plans" USING btree ("unlock_id","payment_plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "space_unlocks_space_entity_uidx" ON "space_unlocks" USING btree ("space_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "space_unlocks_school_entity_idx" ON "space_unlocks" USING btree ("school_id","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spaces_school_slug_uidx" ON "spaces" USING btree ("school_id","slug");--> statement-breakpoint
CREATE INDEX "spaces_school_position_idx" ON "spaces" USING btree ("school_id","position","id");--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_checkout_school_idempotency_uidx" ON "storefront_checkout_attempts" USING btree ("school_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_checkout_provider_checkout_uidx" ON "storefront_checkout_attempts" USING btree ("provider_checkout_id") WHERE "storefront_checkout_attempts"."provider_checkout_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_checkout_sessions_school_id_uidx" ON "storefront_checkout_sessions" USING btree ("school_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_invoices_provider_invoice_uidx" ON "storefront_invoices" USING btree ("provider_invoice_id") WHERE "storefront_invoices"."provider_invoice_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_payments_provider_payment_uidx" ON "storefront_payments" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_plans_active_free_type_uidx" ON "storefront_plans" USING btree ("entity_type","entity_id") WHERE "storefront_plans"."entity_type" = 'product' AND "storefront_plans"."status" = 'active' AND "storefront_plans"."kind" = 'free';--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_plans_active_one_time_type_uidx" ON "storefront_plans" USING btree ("entity_type","entity_id") WHERE "storefront_plans"."entity_type" = 'product' AND "storefront_plans"."status" = 'active' AND "storefront_plans"."kind" = 'one_time';--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_plans_active_installment_type_uidx" ON "storefront_plans" USING btree ("entity_type","entity_id") WHERE "storefront_plans"."entity_type" = 'product' AND "storefront_plans"."status" = 'active' AND "storefront_plans"."kind" = 'installment';--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_plans_active_subscription_monthly_uidx" ON "storefront_plans" USING btree ("entity_type","entity_id") WHERE "storefront_plans"."entity_type" = 'product' AND "storefront_plans"."status" = 'active' AND "storefront_plans"."kind" = 'subscription' AND "storefront_plans"."subscription_monthly_amount" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_plans_active_subscription_yearly_uidx" ON "storefront_plans" USING btree ("entity_type","entity_id") WHERE "storefront_plans"."entity_type" = 'product' AND "storefront_plans"."status" = 'active' AND "storefront_plans"."kind" = 'subscription' AND "storefront_plans"."subscription_yearly_amount" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_plans_active_default_uidx" ON "storefront_plans" USING btree ("entity_type","entity_id") WHERE "storefront_plans"."status" = 'active' AND "storefront_plans"."is_default" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_subscriptions_provider_subscription_uidx" ON "storefront_subscriptions" USING btree ("provider_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_catalog_revision_items_revision_key_uidx" ON "billing_catalog_revision_items" USING btree ("catalog_revision_id","offer_key");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_catalog_revision_items_revision_price_uidx" ON "billing_catalog_revision_items" USING btree ("catalog_revision_id","billing_price_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_catalog_revisions_active_provider_uidx" ON "billing_catalog_revisions" USING btree ("checkout_provider") WHERE "billing_catalog_revisions"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "billing_checkout_attempts_provider_session_uidx" ON "billing_checkout_attempts" USING btree ("provider","provider_checkout_session_id") WHERE "billing_checkout_attempts"."provider_checkout_session_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_checkout_attempts_idempotency_uidx" ON "billing_checkout_attempts" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_checkout_attempts_entity_nonterminal_uidx" ON "billing_checkout_attempts" USING btree ("billable_entity_id") WHERE "billing_checkout_attempts"."status" IN ('creating', 'open');--> statement-breakpoint
CREATE UNIQUE INDEX "billing_plan_change_attempts_idempotency_uidx" ON "billing_plan_change_attempts" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_plan_change_attempts_entity_nonterminal_uidx" ON "billing_plan_change_attempts" USING btree ("billable_entity_id") WHERE "billing_plan_change_attempts"."status" IN ('creating', 'pending');--> statement-breakpoint
CREATE UNIQUE INDEX "billing_price_entries_provider_product_uidx" ON "billing_price_entries" USING btree ("provider","provider_product_id");--> statement-breakpoint
CREATE INDEX "billing_price_entries_offer_key_idx" ON "billing_price_entries" USING btree ("offer_key");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_provider_customers_provider_payer_uidx" ON "billing_provider_customers" USING btree ("provider","payer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_provider_customers_provider_customer_uidx" ON "billing_provider_customers" USING btree ("provider","provider_customer_id") WHERE "billing_provider_customers"."provider_customer_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_provider_customers_idempotency_uidx" ON "billing_provider_customers" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_reconciliation_jobs_live_checkout_uidx" ON "billing_reconciliation_jobs" USING btree ("checkout_attempt_id") WHERE "billing_reconciliation_jobs"."checkout_attempt_id" IS NOT NULL AND "billing_reconciliation_jobs"."status" IN ('pending', 'processing', 'failed');--> statement-breakpoint
CREATE UNIQUE INDEX "billing_reconciliation_jobs_live_plan_change_uidx" ON "billing_reconciliation_jobs" USING btree ("plan_change_attempt_id") WHERE "billing_reconciliation_jobs"."plan_change_attempt_id" IS NOT NULL AND "billing_reconciliation_jobs"."status" IN ('pending', 'processing', 'failed');--> statement-breakpoint
CREATE UNIQUE INDEX "billing_reconciliation_jobs_live_subscription_uidx" ON "billing_reconciliation_jobs" USING btree ("subscription_id") WHERE "billing_reconciliation_jobs"."subscription_id" IS NOT NULL AND "billing_reconciliation_jobs"."status" IN ('pending', 'processing', 'failed');--> statement-breakpoint
CREATE UNIQUE INDEX "billing_reconciliation_jobs_live_customer_uidx" ON "billing_reconciliation_jobs" USING btree ("provider_customer_id") WHERE "billing_reconciliation_jobs"."provider_customer_id" IS NOT NULL AND "billing_reconciliation_jobs"."status" IN ('pending', 'processing', 'failed');--> statement-breakpoint
CREATE UNIQUE INDEX "billing_subscriptions_provider_subscription_uidx" ON "billing_subscriptions" USING btree ("provider","provider_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_subscriptions_entity_source_uidx" ON "billing_subscriptions" USING btree ("billable_entity_id") WHERE "billing_subscriptions"."is_entitlement_source" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_webhook_events_provider_event_uidx" ON "billing_webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "billing_webhook_events_queue_idx" ON "billing_webhook_events" USING btree ("status","available_at");