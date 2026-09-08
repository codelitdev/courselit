import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.generated.js";
import { products } from "./products.js";
import { schools } from "./schools.js";

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    mediaLitId: text("media_lit_id").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    kind: text("kind")
      .$type<"image" | "video" | "audio" | "document" | "other">()
      .notNull(),
    altText: text("alt_text").notNull().default(""),
    caption: text("caption").notNull().default(""),
    accessPolicy: text("access_policy")
      .$type<"public" | "private">()
      .notNull()
      .default("private"),
    status: text("status").$type<"active" | "deleting">().notNull().default("active"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "restrict" }),
    // Community attachments may be uploaded by a learner rather than an
    // admin. Keep the existing admin owner column for compatibility and use
    // this column for the learner side of the polymorphic owner relation.
    createdByLearnerId: uuid("created_by_learner_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolMediaLit: uniqueIndex("media_school_media_lit_uidx").on(
      table.schoolId,
      table.mediaLitId,
    ),
  }),
);

export const mediaReferences = pgTable(
  "media_references",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    resourceType: text("resource_type").notNull(),
    resourceInternalId: text("resource_internal_id").notNull(),
    resourcePublicId: text("resource_public_id").notNull(),
    parentResourceInternalId: text("parent_resource_internal_id"),
    parentResourcePublicId: text("parent_resource_public_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    resourceMedia: uniqueIndex("media_references_resource_media_uidx").on(
      table.schoolId,
      table.resourceType,
      table.resourceInternalId,
      table.mediaId,
    ),
  }),
);

export const productSections = pgTable(
  "product_sections",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(1),
    dripEnabled: boolean("drip_enabled").notNull().default(false),
    dripType: text("drip_type").$type<"relative-date" | "exact-date">(),
    dripDelaySeconds: integer("drip_delay_seconds"),
    dripAt: timestamp("drip_at", { withTimezone: true }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    productPosition: uniqueIndex("product_sections_product_position_uidx").on(
      table.productId,
      table.position,
    ),
  }),
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id").references(() => productSections.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    type: text("type")
      .$type<"text" | "video" | "audio" | "pdf" | "file" | "embed" | "quiz" | "scorm">()
      .notNull()
      .default("text"),
    content: jsonb("content").$type<Record<string, unknown>>().notNull().default({}),
    downloadable: boolean("downloadable").notNull().default(false),
    requiresEnrollment: boolean("requires_enrollment").notNull().default(true),
    status: text("status").$type<"draft" | "published">().notNull().default("draft"),
    position: integer("position").notNull().default(1),
    dripDelaySeconds: integer("drip_delay_seconds"),
    dripAt: timestamp("drip_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    productPosition: uniqueIndex("lessons_product_position_uidx").on(
      table.productId,
      table.position,
    ),
  }),
);

export const learners = pgTable(
  "learners",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    status: text("status")
      .$type<"active" | "deactivated">()
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolEmail: uniqueIndex("learners_school_email_uidx").on(
      table.schoolId,
      table.email,
    ),
  }),
);

export const learnerCredentials = pgTable("learner_credentials", {
  learnerId: uuid("learner_id")
    .primaryKey()
    .references(() => learners.id, { onDelete: "cascade" }),
  passwordDigest: text("password_digest").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const learnerSessions = pgTable("learner_sessions", {
  id: uuid("id").primaryKey(),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => learners.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  tokenDigest: text("token_digest").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const learnerOtpChallenges = pgTable(
  "learner_otp_challenges",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    codeDigest: text("code_digest").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    lookup: index("learner_otp_challenges_lookup_idx").on(
      table.schoolId,
      table.email,
      table.createdAt,
    ),
  }),
);

/** Explicit, school-scoped relationship between an admin principal and a
 * learner principal. Email equality is deliberately not used for this link.
 */
export const learnerAdminLinks = pgTable(
  "learner_admin_links",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learners.id, { onDelete: "cascade" }),
    adminUserId: text("admin_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolLearner: uniqueIndex("learner_admin_links_school_learner_uidx").on(
      table.schoolId,
      table.learnerId,
    ),
    schoolAdmin: uniqueIndex("learner_admin_links_school_admin_uidx").on(
      table.schoolId,
      table.adminUserId,
    ),
  }),
);

/** Short-lived handoff created by the admin app and consumed by a learner
 * authentication request. Only the digest is persisted.
 */
export const learnerIdentityLinkTokens = pgTable(
  "learner_identity_link_tokens",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    adminUserId: text("admin_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tokenDigest: text("token_digest").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    lookup: index("learner_identity_link_tokens_lookup_idx").on(
      table.schoolId,
      table.adminUserId,
      table.createdAt,
    ),
  }),
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learners.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    source: text("source")
      .$type<
        | "free_signup"
        | "admin_grant"
        | "storefront_purchase"
        | "included_product"
        | "import"
        | "integration"
      >()
      .notNull(),
    status: text("status")
      .$type<
        "active" | "payment_failed" | "expired" | "pending" | "rejected" | "paused"
      >()
      .notNull()
      .default("active"),
    downloaded: boolean("downloaded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    learnerProduct: uniqueIndex("enrollments_learner_product_uidx").on(
      table.learnerId,
      table.productId,
    ),
  }),
);

export const downloadLinks = pgTable(
  "download_links",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learners.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tokenDigest: text("token_digest").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumed: boolean("consumed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    activeLookup: index("download_links_active_lookup_idx").on(
      table.schoolId,
      table.learnerId,
      table.productId,
      table.expiresAt,
    ),
  }),
);

export const enrollmentAccessGrants = pgTable(
  "enrollment_access_grants",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    source: text("source")
      .$type<
        | "free_signup"
        | "admin_grant"
        | "storefront_purchase"
        | "included_product"
        | "import"
        | "integration"
      >()
      .notNull(),
    status: text("status").$type<"active" | "revoked">().notNull().default("active"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    enrollment: uniqueIndex("enrollment_access_grants_enrollment_uidx").on(
      table.enrollmentId,
    ),
  }),
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    enrollmentLesson: uniqueIndex("lesson_progress_enrollment_lesson_uidx").on(
      table.enrollmentId,
      table.lessonId,
    ),
  }),
);

export const scormRuntimeStates = pgTable(
  "scorm_runtime_states",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    state: jsonb("state").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    enrollmentLesson: uniqueIndex("scorm_runtime_states_enrollment_lesson_uidx").on(
      table.enrollmentId,
      table.lessonId,
    ),
  }),
);

export const lessonEvaluations = pgTable(
  "lesson_evaluations",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learners.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    pass: boolean("pass").notNull(),
    score: real("score"),
    requiresPassingGrade: boolean("requires_passing_grade").notNull(),
    passingGrade: real("passing_grade"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    enrollmentLesson: index("lesson_evaluations_enrollment_lesson_idx").on(
      table.enrollmentId,
      table.lessonId,
    ),
    schoolLesson: index("lesson_evaluations_school_lesson_idx").on(
      table.schoolId,
      table.lessonId,
    ),
  }),
);

export const certificateTemplates = pgTable(
  "certificate_templates",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    template: text("template").notNull().default("{}"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolName: uniqueIndex("certificate_templates_school_name_uidx").on(
      table.schoolId,
      table.name,
    ),
    schoolProduct: uniqueIndex("certificate_templates_school_product_uidx")
      .on(table.schoolId, table.productId)
      .where(sql`${table.productId} IS NOT NULL`),
  }),
);

export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    verificationId: text("verification_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learners.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").references(() => certificateTemplates.id, {
      onDelete: "set null",
    }),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({
    learnerProduct: uniqueIndex("certificates_learner_product_uidx").on(
      table.learnerId,
      table.productId,
    ),
  }),
);

export const previewGrants = pgTable("preview_grants", {
  id: uuid("id").primaryKey(),
  tokenDigest: text("token_digest").notNull().unique(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  issuedBy: text("issued_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
