import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import { and, asc, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { CourseLitPermission } from "./permissions.js";
import type { AppDb } from "./types.js";
import { ActivityType, recordActivity } from "./activities.js";

type Ctx = {
  requestId: string;
  principalId: string;
  tenantId: string | null;
  permissions: ReadonlySet<CourseLitPermission>;
};

export type CertificateTemplateDto = {
  id: string;
  schoolId: string;
  name: string;
  template: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type CertificateDto = {
  id: string;
  verificationId: string;
  schoolId: string;
  productId: string;
  learnerId: string;
  learnerName: string;
  productTitle: string;
  issuedAt: string;
  revokedAt: string | null;
};

export type CertificateVerificationDto = CertificateDto & {
  title: string;
  subtitle: string;
  description: string;
  signatureName: string;
  signatureDesignation: string | null;
  signatureImageUrl: string | null;
  logoUrl: string | null;
};

export type ProductCertificateTemplateDto = {
  id: string;
  productId: string;
  title: string;
  subtitle: string;
  description: string;
  signatureName: string;
  signatureDesignation: string;
  signatureImageId: string | null;
  logoId: string | null;
};

export type CompletionCertificate = {
  courseCompleted: boolean;
  certificateId: string | null;
};

function forbidden(): { ok: false; error: PlatformError } {
  return { ok: false, error: createPlatformError("forbidden") };
}

function templateToDto(
  row: typeof schema.certificateTemplates.$inferSelect,
  publicSchoolId: string,
): CertificateTemplateDto {
  let template: Record<string, string> = {};
  try {
    const parsed = JSON.parse(row.template) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      template = Object.fromEntries(
        Object.entries(parsed).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );
    }
  } catch {
    // Keep malformed imported templates inspectable without failing the API.
  }
  return {
    id: row.publicId,
    schoolId: publicSchoolId,
    name: row.name,
    template,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  };
}

function parseTemplate(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );
    }
  } catch {
    // Keep malformed imported templates editable with empty values.
  }
  return {};
}

function productTemplateToDto(
  row: typeof schema.certificateTemplates.$inferSelect,
  productPublicId: string,
): ProductCertificateTemplateDto {
  const template = parseTemplate(row.template);
  return {
    id: row.publicId,
    productId: productPublicId,
    title: template.title ?? "",
    subtitle: template.subtitle ?? "",
    description: template.description ?? "",
    signatureName: template.signatureName ?? "",
    signatureDesignation: template.signatureDesignation ?? "",
    signatureImageId: template.signatureImageId ?? null,
    logoId: template.logoId ?? null,
  };
}

export async function getProductCertificateTemplate(
  db: AppDb,
  ctx: Ctx,
  productPublicId: string,
): Promise<
  | { ok: true; value: ProductCertificateTemplateDto | null }
  | { ok: false; error: PlatformError }
> {
  if (!ctx.tenantId || !ctx.permissions.has("certificates:read")) return forbidden();
  const rows = await db
    .select({ template: schema.certificateTemplates, product: schema.products })
    .from(schema.products)
    .leftJoin(
      schema.certificateTemplates,
      and(
        eq(schema.certificateTemplates.productId, schema.products.id),
        eq(schema.certificateTemplates.schoolId, ctx.tenantId),
      ),
    )
    .where(
      and(
        eq(schema.products.publicId, productPublicId),
        eq(schema.products.schoolId, ctx.tenantId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: createPlatformError("not_found") };
  if (!row.template) return { ok: true, value: null };
  return {
    ok: true,
    value: productTemplateToDto(row.template, row.product.publicId),
  };
}

export async function upsertProductCertificateTemplate(
  db: AppDb,
  ctx: Ctx,
  productPublicId: string,
  input: {
    title: string;
    subtitle: string;
    description: string;
    signatureName: string;
    signatureDesignation: string;
    signatureImageId: string | null;
    logoId: string | null;
  },
  clock: Clock,
): Promise<
  | { ok: true; value: ProductCertificateTemplateDto }
  | { ok: false; error: PlatformError }
> {
  if (!ctx.tenantId || !ctx.permissions.has("certificates:write")) return forbidden();
  return db.transaction(async (tx) => {
    const products = await tx
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.publicId, productPublicId),
          eq(schema.products.schoolId, ctx.tenantId!),
        ),
      )
      .limit(1);
    const product = products[0];
    if (!product)
      return { ok: false as const, error: createPlatformError("not_found") };
    if (product.kind !== "course") {
      return {
        ok: false as const,
        error: createPlatformError("validation_failed", {
          safeDetails: { reason: "certificate_invalid_settings" },
        }),
      };
    }
    const mediaIds = [input.signatureImageId, input.logoId].filter((id): id is string =>
      Boolean(id),
    );
    const mediaRows = mediaIds.length
      ? await tx
          .select({ id: schema.media.id, publicId: schema.media.publicId })
          .from(schema.media)
          .where(
            and(
              eq(schema.media.schoolId, ctx.tenantId!),
              eq(schema.media.status, "active"),
              eq(schema.media.kind, "image"),
            ),
          )
      : [];
    if (
      mediaIds.some((mediaId) => !mediaRows.some((media) => media.publicId === mediaId))
    ) {
      return { ok: false as const, error: createPlatformError("not_found") };
    }
    const current = await tx
      .select()
      .from(schema.certificateTemplates)
      .where(
        and(
          eq(schema.certificateTemplates.schoolId, ctx.tenantId!),
          eq(schema.certificateTemplates.productId, product.id),
        ),
      )
      .limit(1);
    const now = clock.now();
    const template = JSON.stringify({
      title: input.title,
      subtitle: input.subtitle,
      description: input.description,
      signatureName: input.signatureName,
      signatureDesignation: input.signatureDesignation,
      signatureImageId: input.signatureImageId,
      logoId: input.logoId,
    });
    const row = current[0]
      ? (
          await tx
            .update(schema.certificateTemplates)
            .set({ template, updatedAt: now })
            .where(eq(schema.certificateTemplates.id, current[0].id))
            .returning()
        )[0]!
      : (
          await tx
            .insert(schema.certificateTemplates)
            .values({
              id: uuidv7(clock),
              publicId: createPublicId("ctm", clock),
              schoolId: ctx.tenantId!,
              productId: product.id,
              name: `product:${product.publicId}`,
              template,
              createdBy: ctx.principalId,
              createdAt: now,
              updatedAt: now,
            })
            .returning()
        )[0]!;
    await tx
      .delete(schema.mediaReferences)
      .where(
        and(
          eq(schema.mediaReferences.schoolId, ctx.tenantId!),
          eq(schema.mediaReferences.resourceType, "certificate_template"),
          eq(schema.mediaReferences.resourceInternalId, row.id),
        ),
      );
    const mediaByPublicId = new Map(
      mediaRows.map((media) => [media.publicId, media.id]),
    );
    const refs = [input.signatureImageId, input.logoId].reduce<
      { mediaId: string; role: string }[]
    >((entries, mediaId, index) => {
      if (!mediaId || entries.some((entry) => entry.mediaId === mediaId)) {
        return entries;
      }
      entries.push({
        mediaId,
        role: index === 0 ? "signature_image" : "logo",
      });
      return entries;
    }, []);
    if (refs.length) {
      await tx.insert(schema.mediaReferences).values(
        refs.map((entry) => ({
          id: uuidv7(clock),
          schoolId: ctx.tenantId!,
          mediaId: mediaByPublicId.get(entry.mediaId)!,
          resourceType: "certificate_template" as const,
          resourceInternalId: row.id,
          resourcePublicId: row.publicId,
          parentResourceInternalId: entry.role,
          parentResourcePublicId: entry.role,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: current[0]
        ? "certificate_template.updated"
        : "certificate_template.created",
      resourceType: "certificate_template",
      resourceId: row.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    return {
      ok: true as const,
      value: productTemplateToDto(row, product.publicId),
    };
  });
}

export async function listCertificateTemplates(
  db: AppDb,
  ctx: Ctx,
  publicSchoolId: string,
): Promise<
  { ok: true; value: CertificateTemplateDto[] } | { ok: false; error: PlatformError }
> {
  if (!ctx.tenantId || !ctx.permissions.has("certificates:read")) return forbidden();
  const rows = await db
    .select()
    .from(schema.certificateTemplates)
    .where(
      and(
        eq(schema.certificateTemplates.schoolId, ctx.tenantId),
        isNull(schema.certificateTemplates.productId),
      ),
    )
    .orderBy(asc(schema.certificateTemplates.createdAt));
  return { ok: true, value: rows.map((row) => templateToDto(row, publicSchoolId)) };
}

export async function createCertificateTemplate(
  db: AppDb,
  ctx: Ctx,
  publicSchoolId: string,
  input: { name: string; template: Record<string, string> },
  clock: Clock,
): Promise<
  { ok: true; value: CertificateTemplateDto } | { ok: false; error: PlatformError }
> {
  if (!ctx.tenantId || !ctx.permissions.has("certificates:write")) return forbidden();
  const name = input.name.trim();
  if (!name || name.length > 200) {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "invalid_template_name" },
      }),
    };
  }
  const now = clock.now();
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("ctm", clock),
    schoolId: ctx.tenantId,
    productId: null,
    name,
    template: JSON.stringify(input.template),
    createdBy: ctx.principalId,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await db.transaction(async (tx) => {
      await tx.insert(schema.certificateTemplates).values(row);
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId: ctx.tenantId,
        actorId: ctx.principalId,
        action: "certificate_template.created",
        resourceType: "certificate_template",
        resourceId: row.publicId,
        requestId: ctx.requestId,
        createdAt: now,
      });
    });
  } catch (error) {
    if (String(error).includes("certificate_templates_school_name_uidx")) {
      return {
        ok: false,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "template_name_taken" },
        }),
      };
    }
    throw error;
  }
  return { ok: true, value: templateToDto(row, publicSchoolId) };
}

export async function updateCertificateTemplate(
  db: AppDb,
  ctx: Ctx,
  publicSchoolId: string,
  templatePublicId: string,
  input: { name?: string; template?: Record<string, string> },
  clock: Clock,
): Promise<
  { ok: true; value: CertificateTemplateDto } | { ok: false; error: PlatformError }
> {
  if (!ctx.tenantId || !ctx.permissions.has("certificates:write")) return forbidden();
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(schema.certificateTemplates)
      .where(
        and(
          eq(schema.certificateTemplates.schoolId, ctx.tenantId!),
          eq(schema.certificateTemplates.publicId, templatePublicId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return { ok: false as const, error: createPlatformError("not_found") };
    const name = input.name?.trim() ?? row.name;
    if (!name || name.length > 200) {
      return {
        ok: false as const,
        error: createPlatformError("validation_failed", {
          safeDetails: { reason: "invalid_template_name" },
        }),
      };
    }
    const now = clock.now();
    const next = {
      name,
      template: input.template ? JSON.stringify(input.template) : row.template,
      updatedAt: now,
    };
    try {
      await tx
        .update(schema.certificateTemplates)
        .set(next)
        .where(eq(schema.certificateTemplates.id, row.id));
    } catch (error) {
      if (String(error).includes("certificate_templates_school_name_uidx")) {
        return {
          ok: false as const,
          error: createPlatformError("conflict", {
            safeDetails: { reason: "template_name_taken" },
          }),
        };
      }
      throw error;
    }
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "certificate_template.updated",
      resourceType: "certificate_template",
      resourceId: row.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    return {
      ok: true as const,
      value: templateToDto({ ...row, ...next }, publicSchoolId),
    };
  });
}

export async function issueCertificateIfComplete(
  db: AppDb,
  input: {
    schoolId: string;
    productId: string;
    schoolAccountId?: string;
    learnerId?: string;
    membershipId: string;
    actorId: string;
    requestId: string;
  },
  clock: Clock,
): Promise<CompletionCertificate> {
  const schoolAccountId = input.schoolAccountId ?? input.learnerId!;
  const product = await db
    .select({ kind: schema.products.kind, certificate: schema.products.certificate })
    .from(schema.products)
    .where(
      and(
        eq(schema.products.id, input.productId),
        eq(schema.products.schoolId, input.schoolId),
      ),
    )
    .limit(1);
  if (!product[0]) {
    return { courseCompleted: false, certificateId: null };
  }
  if (product[0].kind !== "course") {
    return { courseCompleted: false, certificateId: null };
  }
  const lessons = await db
    .select({ id: schema.lessons.id })
    .from(schema.lessons)
    .where(
      and(
        eq(schema.lessons.schoolId, input.schoolId),
        eq(schema.lessons.productId, input.productId),
        eq(schema.lessons.status, "published"),
      ),
    );
  if (lessons.length === 0) return { courseCompleted: false, certificateId: null };
  const progress = await db
    .select({ lessonId: schema.lessonProgress.lessonId })
    .from(schema.lessonProgress)
    .where(
      and(
        eq(schema.lessonProgress.membershipId, input.membershipId),
        isNotNull(schema.lessonProgress.completedAt),
      ),
    );
  const completed = new Set(progress.map((row) => row.lessonId));
  if (!lessons.every((lesson) => completed.has(lesson.id))) {
    return { courseCompleted: false, certificateId: null };
  }
  if (!product[0].certificate) return { courseCompleted: true, certificateId: null };
  const existing = await db
    .select()
    .from(schema.certificates)
    .where(
      and(
        eq(schema.certificates.schoolAccountId, schoolAccountId),
        eq(schema.certificates.productId, input.productId),
      ),
    )
    .limit(1);
  if (existing[0]) {
    return { courseCompleted: true, certificateId: existing[0].publicId };
  }
  const productTemplate = await db
    .select({ id: schema.certificateTemplates.id })
    .from(schema.certificateTemplates)
    .where(
      and(
        eq(schema.certificateTemplates.schoolId, input.schoolId),
        eq(schema.certificateTemplates.productId, input.productId),
      ),
    )
    .limit(1);
  const template = productTemplate.length
    ? productTemplate
    : await db
        .select({ id: schema.certificateTemplates.id })
        .from(schema.certificateTemplates)
        .where(
          and(
            eq(schema.certificateTemplates.schoolId, input.schoolId),
            isNull(schema.certificateTemplates.productId),
          ),
        )
        .orderBy(asc(schema.certificateTemplates.createdAt))
        .limit(1);
  const now = clock.now();
  const candidate = {
    id: uuidv7(clock),
    publicId: createPublicId("cert", clock),
    verificationId: createPublicId("ver", clock),
    schoolId: input.schoolId,
    productId: input.productId,
    schoolAccountId,
    templateId: template[0]?.id ?? null,
    issuedAt: now,
    revokedAt: null,
  };
  const inserted = await db
    .insert(schema.certificates)
    .values(candidate)
    .onConflictDoNothing({
      target: [schema.certificates.schoolAccountId, schema.certificates.productId],
    })
    .returning();
  const certificate =
    inserted[0] ??
    (
      await db
        .select()
        .from(schema.certificates)
        .where(
          and(
            eq(schema.certificates.schoolAccountId, schoolAccountId),
            eq(schema.certificates.productId, input.productId),
          ),
        )
        .limit(1)
    )[0];
  if (!certificate) return { courseCompleted: true, certificateId: null };
  if (inserted[0]) {
    await db.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: input.schoolId,
      actorId: input.actorId,
      action: "certificate.issued",
      resourceType: "certificate",
      resourceId: certificate.publicId,
      requestId: input.requestId,
      createdAt: now,
    });
    await recordActivity(
      db,
      {
        schoolId: input.schoolId,
        actorId: schoolAccountId,
        type: ActivityType.CERTIFICATE_ISSUED,
        entityId: input.productId,
        metadata: { certificateId: certificate.publicId },
      },
      clock,
    );
  }
  return { courseCompleted: true, certificateId: certificate.publicId };
}

export async function listLearnerCertificates(
  db: AppDb,
  input: { schoolId: string; schoolAccountId?: string; learnerId?: string; publicSchoolId: string },
): Promise<CertificateDto[]> {
  const accountId = input.schoolAccountId ?? input.learnerId!;
  const rows = await db
    .select({
      certificate: schema.certificates,
      product: schema.products,
      learner: schema.schoolAccounts,
    })
    .from(schema.certificates)
    .innerJoin(schema.products, eq(schema.products.id, schema.certificates.productId))
    .innerJoin(schema.schoolAccounts, eq(schema.schoolAccounts.id, schema.certificates.schoolAccountId))
    .where(
      and(
        eq(schema.certificates.schoolId, input.schoolId),
        eq(schema.certificates.schoolAccountId, accountId),
      ),
    )
    .orderBy(asc(schema.certificates.issuedAt));
  return rows.map((row) =>
    certificateToDto(row.certificate, row.product, row.learner, input.publicSchoolId),
  );
}

export async function verifyCertificate(
  db: AppDb,
  verificationId: string,
): Promise<CertificateVerificationDto | null> {
  const rows = await db
    .select({
      certificate: schema.certificates,
      school: schema.schools,
      product: schema.products,
      learner: schema.schoolAccounts,
      template: schema.certificateTemplates,
      creator: schema.user,
    })
    .from(schema.certificates)
    .innerJoin(schema.schools, eq(schema.schools.id, schema.certificates.schoolId))
    .innerJoin(schema.products, eq(schema.products.id, schema.certificates.productId))
    .innerJoin(schema.schoolAccounts, eq(schema.schoolAccounts.id, schema.certificates.schoolAccountId))
    .leftJoin(
      schema.certificateTemplates,
      eq(schema.certificateTemplates.id, schema.certificates.templateId),
    )
    .innerJoin(schema.user, eq(schema.user.id, schema.products.createdBy))
    .where(
      and(
        // The source public certificate page is addressed by certificateId.
        // Keep verificationId as the canonical target route key while also
        // accepting the completion response's stable public certificate ID.
        or(
          eq(schema.certificates.verificationId, verificationId),
          eq(schema.certificates.publicId, verificationId),
        ),
        isNull(schema.certificates.revokedAt),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const template = parseTemplate(row.template?.template ?? "{}");
  const templateMediaIds = [template.signatureImageId, template.logoId].filter(
    (mediaId): mediaId is string => Boolean(mediaId),
  );
  const mediaRows = templateMediaIds.length
    ? await db
        .select({
          media: schema.media,
        })
        .from(schema.media)
        .where(
          and(
            eq(schema.media.schoolId, row.school.id),
            inArray(schema.media.publicId, templateMediaIds),
            eq(schema.media.status, "active"),
            eq(schema.media.kind, "image"),
          ),
        )
    : [];
  const mediaByPublicId = new Map(
    mediaRows.map((item) => [item.media.publicId, item.media.canonicalUrl]),
  );
  return {
    ...certificateToDto(row.certificate, row.product, row.learner, row.school.publicId),
    title: template.title || "Certificate of Completion",
    subtitle: template.subtitle || "This certificate is awarded to",
    description: template.description || "for completing the course.",
    signatureName: template.signatureName || row.creator.name,
    signatureDesignation: template.signatureDesignation || null,
    signatureImageUrl: mediaByPublicId.get(template.signatureImageId ?? "") ?? null,
    logoUrl: mediaByPublicId.get(template.logoId ?? "") ?? null,
  };
}

function certificateToDto(
  certificate: typeof schema.certificates.$inferSelect,
  product: typeof schema.products.$inferSelect,
  account: typeof schema.schoolAccounts.$inferSelect,
  publicSchoolId: string,
): CertificateDto {
  return {
    id: certificate.publicId,
    verificationId: certificate.verificationId,
    schoolId: publicSchoolId,
    productId: product.publicId,
    learnerId: account.publicId,
    learnerName: account.displayName,
    productTitle: product.title,
    issuedAt: serializeDate(certificate.issuedAt),
    revokedAt: certificate.revokedAt ? serializeDate(certificate.revokedAt) : null,
  };
}
