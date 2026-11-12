import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  type PlatformRequestContext,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import type { MediaRef } from "@courselit/api-contract";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  deleteUnreferencedMedia,
  type MediaLitClient,
  mediaIdsForRichTextContent,
  mediaRefFromCatalog,
  normalizeMediaRef,
  reconcileMediaReferencesInTransaction,
} from "./media.js";
import { removeSchoolTeamMember } from "./team.js";
import type { CourseLitPermission } from "./permissions.js";
import { resourceSlugTaken } from "./resource-slugs.js";
import { amountMinorForPlan, validatePlan } from "./storefront.js";
import {
  enableProductDiscussionSpace,
  syncIncludedProductMemberships,
} from "./spaces.js";
import type { AppDb } from "./types.js";
import { ensureSalesPage } from "./website.js";

export type ProductDto = {
  id: string;
  schoolId: string;
  kind: "course" | "download";
  status: "draft" | "published";
  slug: string;
  title: string;
  description: string;
  featuredImage: MediaRef | null;
  privacy: "public" | "unlisted";
  leadMagnet: boolean;
  certificate: boolean;
  discussions: boolean;
  newLessonStatus: "draft" | "published";
  includedWithCommunity: boolean;
  discussionSpaceId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductListItemDto = ProductDto & {
  currency: string;
  salesAmountMinor: number;
  customers: number;
};

export type PublicProductListItemDto = ProductDto & {
  currency: string;
  priceMinor: number | null;
};

type Ctx = PlatformRequestContext<string, string, CourseLitPermission>;

export async function productFeaturedImageFor(
  db: AppDb,
  row: typeof schema.products.$inferSelect,
): Promise<MediaRef | null> {
  const rows = await db
    .select({ media: schema.media })
    .from(schema.mediaReferences)
    .innerJoin(schema.media, eq(schema.media.id, schema.mediaReferences.mediaId))
    .where(
      and(
        eq(schema.mediaReferences.schoolId, row.schoolId),
        eq(schema.mediaReferences.resourceType, "product_artwork"),
        eq(schema.mediaReferences.resourceInternalId, row.id),
        eq(schema.media.status, "active"),
      ),
    )
    .limit(1);
  const media = rows[0]?.media;
  if (media) return mediaRefFromCatalog(media);
  const stored = normalizeMediaRef(row.featuredImage);
  return stored?.mediaId ? null : stored;
}

async function toDto(
  db: AppDb,
  row: typeof schema.products.$inferSelect,
  publicSchoolId: string,
  featuredImage?: MediaRef | null,
): Promise<ProductDto> {
  return {
    id: row.publicId,
    schoolId: publicSchoolId,
    kind: row.kind,
    status: row.status,
    slug: row.slug,
    title: row.title,
    description: row.description,
    featuredImage:
      featuredImage === undefined
        ? await productFeaturedImageFor(db, row)
        : featuredImage,
    privacy: row.privacy,
    leadMagnet: row.leadMagnet,
    certificate: row.certificate,
    discussions: row.discussions,
    newLessonStatus: row.newLessonStatus,
    includedWithCommunity: row.includedWithCommunity,
    discussionSpaceId: row.discussionSpaceId
      ? ((
          await db
            .select({ publicId: schema.spaces.publicId })
            .from(schema.spaces)
            .where(eq(schema.spaces.id, row.discussionSpaceId))
            .limit(1)
        )[0]?.publicId ?? null)
      : null,
    publishedAt: row.publishedAt ? serializeDate(row.publishedAt) : null,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  };
}

export async function listProducts(
  db: AppDb,
  ctx: Ctx,
  publicSchoolId: string,
  input: {
    cursor?: string;
    limit: number;
    kind?: "course" | "download";
  } = { limit: 25 },
): Promise<
  | { ok: true; value: ProductListItemDto[]; nextCursor: string | null }
  | { ok: false; error: PlatformError }
> {
  if (!ctx.permissions.has("products:read")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const conditions = [eq(schema.products.schoolId, ctx.tenantId!)];
  if (input.kind) conditions.push(eq(schema.products.kind, input.kind));
  if (input.cursor) {
    const cursor = decodeProductCursor(input.cursor);
    if (!cursor) {
      return {
        ok: false,
        error: createPlatformError("validation_failed", {
          safeDetails: { reason: "invalid_cursor" },
        }),
      };
    }
    conditions.push(
      or(
        lt(schema.products.updatedAt, cursor.updatedAt),
        and(
          eq(schema.products.updatedAt, cursor.updatedAt),
          lt(schema.products.id, cursor.id),
        ),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(schema.products)
    .where(and(...conditions))
    .orderBy(desc(schema.products.updatedAt), desc(schema.products.id))
    .limit(input.limit + 1);
  const page = rows.slice(0, input.limit);
  const productIds = page.map((row) => row.id);
  const schoolRows = await db
    .select({ currency: schema.schools.currency })
    .from(schema.schools)
    .where(eq(schema.schools.id, ctx.tenantId!))
    .limit(1);
  const currency = normalizeCurrency(schoolRows[0]?.currency);
  const [customerRows, salesRows] = await Promise.all([
    productIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            productId: schema.learnerMemberships.entityId,
            count: count(schema.learnerMemberships.id),
          })
          .from(schema.learnerMemberships)
          .where(
            and(
              eq(schema.learnerMemberships.schoolId, ctx.tenantId!),
              eq(schema.learnerMemberships.entityType, "product"),
              inArray(
                schema.learnerMemberships.entityId,
                page.map((row) => row.publicId),
              ),
            ),
          )
          .groupBy(schema.learnerMemberships.entityId),
    productIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            productId: schema.storefrontCheckoutAttempts.productId,
            amountMinor: sql<string>`coalesce(sum(${schema.storefrontPayments.amountMinor}), 0)`,
          })
          .from(schema.storefrontPayments)
          .innerJoin(
            schema.storefrontCheckoutAttempts,
            eq(
              schema.storefrontCheckoutAttempts.id,
              schema.storefrontPayments.checkoutId,
            ),
          )
          .where(
            and(
              eq(schema.storefrontCheckoutAttempts.schoolId, ctx.tenantId!),
              inArray(schema.storefrontCheckoutAttempts.productId, productIds),
              eq(schema.storefrontPayments.status, "succeeded"),
              // Only money in the school's currency adds up to its sales.
              eq(sql`upper(${schema.storefrontPayments.currency})`, currency),
            ),
          )
          .groupBy(schema.storefrontCheckoutAttempts.productId),
  ]);
  const customersByProduct = new Map(
    customerRows.map((row) => [row.productId, Number(row.count)]),
  );
  // Revenue, like main's product card: what succeeded payments brought in.
  // Free sign-ups are payments of 0, so they don't count as sales.
  const salesByProduct = new Map(
    salesRows.map((row) => [row.productId, Number(row.amountMinor)]),
  );
  return {
    ok: true,
    value: await Promise.all(
      page.map(async (row) => ({
        ...(await toDto(db, row, publicSchoolId)),
        currency,
        salesAmountMinor: salesByProduct.get(row.id) ?? 0,
        customers: customersByProduct.get(row.publicId) ?? 0,
      })),
    ),
    nextCursor:
      rows.length > input.limit && page.at(-1)
        ? encodeProductCursor(page.at(-1)!)
        : null,
  };
}

/**
 * Public storefront catalog. This deliberately has a separate operation from
 * the admin product list: public visitors can only see published/public
 * products and must never receive admin metrics or require an admin
 * credential.
 */
export async function listPublicProducts(
  db: AppDb,
  school: { schoolId: string; publicId: string; currency: string },
  input: {
    cursor?: string;
    limit: number;
    kind?: "course" | "download";
  } = { limit: 25 },
): Promise<
  | { ok: true; value: PublicProductListItemDto[]; nextCursor: string | null }
  | { ok: false; error: PlatformError }
> {
  const conditions = [
    eq(schema.products.schoolId, school.schoolId),
    eq(schema.products.status, "published"),
    eq(schema.products.privacy, "public"),
  ];
  if (input.kind) conditions.push(eq(schema.products.kind, input.kind));
  if (input.cursor) {
    const cursor = decodeProductCursor(input.cursor);
    if (!cursor) {
      return {
        ok: false,
        error: createPlatformError("validation_failed", {
          safeDetails: { reason: "invalid_cursor" },
        }),
      };
    }
    conditions.push(
      or(
        lt(schema.products.updatedAt, cursor.updatedAt),
        and(
          eq(schema.products.updatedAt, cursor.updatedAt),
          lt(schema.products.id, cursor.id),
        ),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(schema.products)
    .where(and(...conditions))
    .orderBy(desc(schema.products.updatedAt), desc(schema.products.id))
    .limit(input.limit + 1);
  const page = rows.slice(0, input.limit);
  const productIds = page.map((row) => row.id);
  const planRows =
    productIds.length === 0
      ? []
      : await db
          .select()
          .from(schema.storefrontPlans)
          .where(
            and(
              eq(schema.storefrontPlans.schoolId, school.schoolId),
              eq(schema.storefrontPlans.entityType, "product"),
              inArray(
                schema.storefrontPlans.entityId,
                page.map((product) => product.publicId),
              ),
              eq(schema.storefrontPlans.status, "active"),
            ),
          )
          .orderBy(
            desc(schema.storefrontPlans.isDefault),
            asc(schema.storefrontPlans.createdAt),
          );
  const currency = normalizeCurrency(school.currency);
  // The price shown is what checkout charges for the plan shown first.
  const priceByProduct = new Map<string, number>();
  for (const plan of planRows) {
    if (!priceByProduct.has(plan.entityId)) {
      priceByProduct.set(plan.entityId, amountMinorForPlan(plan, currency));
    }
  }

  return {
    ok: true,
    value: await Promise.all(
      page.map(async (row) => ({
        ...(await toDto(db, row, school.publicId)),
        currency,
        priceMinor: priceByProduct.get(row.publicId) ?? null,
      })),
    ),
    nextCursor:
      rows.length > input.limit && page.at(-1)
        ? encodeProductCursor(page.at(-1)!)
        : null,
  };
}

function normalizeCurrency(value: string | null | undefined): string {
  const currency = value?.trim().toUpperCase();
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : "USD";
}

function encodeProductCursor(row: typeof schema.products.$inferSelect): string {
  return Buffer.from(
    JSON.stringify({ updatedAt: row.updatedAt.toISOString(), id: row.id }),
  ).toString("base64url");
}

function decodeProductCursor(value: string): { updatedAt: Date; id: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      updatedAt?: unknown;
      id?: unknown;
    };
    if (typeof decoded.updatedAt !== "string" || typeof decoded.id !== "string") {
      return null;
    }
    const updatedAt = new Date(decoded.updatedAt);
    if (Number.isNaN(updatedAt.getTime()) || decoded.id.length === 0) return null;
    return { updatedAt, id: decoded.id };
  } catch {
    return null;
  }
}

export async function createProduct(
  db: AppDb,
  ctx: Ctx,
  publicSchoolId: string,
  input: {
    kind: "course" | "download";
    title: string;
    slug?: string;
    description: string;
    privacy?: "public" | "unlisted";
    leadMagnet?: boolean;
    certificate?: boolean;
    discussions?: boolean;
  },
  clock: Clock,
): Promise<{ ok: true; value: ProductDto } | { ok: false; error: PlatformError }> {
  if (!ctx.permissions.has("products:write")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  if (input.leadMagnet && input.kind !== "download") {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "lead_magnet_invalid_settings" },
      }),
    };
  }
  const now = clock.now();
  const publicId = createPublicId("prd", clock);
  const requestedSlug = input.slug?.trim();
  const slug = slugify(requestedSlug || input.title, requestedSlug ? "" : publicId);
  if (!slug) {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "invalid_slug" },
      }),
    };
  }
  if (
    await resourceSlugTaken(db, {
      schoolId: ctx.tenantId!,
      slug,
      resourceType: "product",
    })
  ) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "slug_taken" },
      }),
    };
  }
  const row = {
    id: uuidv7(clock),
    publicId,
    schoolId: ctx.tenantId!,
    kind: input.kind,
    status: "draft" as const,
    slug,
    title: input.title,
    description: input.description,
    featuredImage: null,
    privacy: input.privacy ?? "unlisted",
    leadMagnet: input.leadMagnet ?? false,
    certificate: input.certificate ?? false,
    discussions: false,
    newLessonStatus: "draft" as const,
    includedWithCommunity: false,
    discussionSpaceId: null,
    publishedAt: null,
    createdBy: ctx.principalId,
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction(async (tx) => {
    await tx.insert(schema.products).values(row);
    await ensureSalesPage(
      tx as AppDb,
      {
        schoolId: row.schoolId,
        resourceType: "product",
        resourceId: row.id,
        resourcePublicId: row.publicId,
        name: row.title,
        description: row.description,
        slug: row.slug,
        productKind: row.kind,
      },
      clock,
    );
    // A course starts blank: its Content tab asks the creator to add a first
    // section. A digital download always keeps one section for its files.
    const firstSection =
      row.kind === "download"
        ? {
            id: uuidv7(clock),
            publicId: createPublicId("sec", clock),
            schoolId: ctx.tenantId!,
            productId: row.id,
            title: "First section",
            position: 1,
            createdBy: ctx.principalId,
            createdAt: now,
            updatedAt: now,
          }
        : null;
    if (firstSection) await tx.insert(schema.productSections).values(firstSection);
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "product.created",
      resourceType: "product",
      resourceId: row.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    if (firstSection) {
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId: ctx.tenantId,
        actorId: ctx.principalId,
        action: "section.created",
        resourceType: "product_section",
        resourceId: firstSection.publicId,
        requestId: ctx.requestId,
        createdAt: now,
      });
    }
    // A lead magnet needs exactly one free plan, so it starts with one.
    if (row.leadMagnet) {
      // A free plan has no amounts, so the currency doesn't change it.
      const free = validatePlan({ name: "Free", type: "free" }, { currency: "USD" });
      if (!free.ok) throw new Error("The free plan shape is invalid.");
      const plan = {
        id: uuidv7(clock),
        publicId: createPublicId("pln", clock),
        schoolId: row.schoolId,
        entityType: "product" as const,
        entityId: row.publicId,
        name: "Free",
        description: "",
        includedProducts: [],
        kind: free.value.kind,
        oneTimeAmount: free.value.oneTimeAmount,
        emiAmount: free.value.emiAmount,
        emiTotalInstallments: free.value.emiTotalInstallments,
        subscriptionMonthlyAmount: free.value.subscriptionMonthlyAmount,
        subscriptionYearlyAmount: free.value.subscriptionYearlyAmount,
        amountMinor: free.value.amountMinor,
        billingInterval: free.value.billingInterval,
        installmentCount: free.value.installmentCount,
        providerProductId: null,
        status: "active" as const,
        isDefault: true,
        createdBy: ctx.principalId,
        createdAt: now,
        updatedAt: now,
      };
      await tx.insert(schema.storefrontPlans).values(plan);
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId: ctx.tenantId,
        actorId: ctx.principalId,
        action: "storefront_plan.created",
        resourceType: "storefront_plan",
        resourceId: plan.publicId,
        requestId: ctx.requestId,
        createdAt: now,
      });
    }
  });
  return { ok: true, value: await toDto(db, row, publicSchoolId, null) };
}

export async function updateProduct(
  db: AppDb,
  ctx: Ctx,
  publicSchoolId: string,
  productPublicId: string,
  input: {
    status?: "draft" | "published";
    slug?: string;
    title?: string;
    description?: string;
    featuredImage?: MediaRef | null;
    privacy?: "public" | "unlisted";
    leadMagnet?: boolean;
    certificate?: boolean;
    discussions?: boolean;
    newLessonStatus?: "draft" | "published";
    includedWithCommunity?: boolean;
  },
  clock: Clock,
): Promise<{ ok: true; value: ProductDto } | { ok: false; error: PlatformError }> {
  if (!ctx.permissions.has("products:write")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.publicId, productPublicId),
          eq(schema.products.schoolId, ctx.tenantId!),
        ),
      )
      .limit(1);
    const row = existing[0];
    if (!row) {
      return { ok: false as const, error: createPlatformError("not_found") };
    }
    const nextSlug = input.slug ? slugify(input.slug, "") : row.slug;
    if (input.slug && !nextSlug) {
      return {
        ok: false as const,
        error: createPlatformError("validation_failed", {
          safeDetails: { reason: "invalid_slug" },
        }),
      };
    }
    if (
      nextSlug !== row.slug &&
      (await resourceSlugTaken(tx as AppDb, {
        schoolId: ctx.tenantId!,
        slug: nextSlug,
        resourceType: "product",
        resourceId: row.id,
      }))
    ) {
      return {
        ok: false as const,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "slug_taken" },
        }),
      };
    }
    const now = clock.now();
    const status = input.status ?? row.status;
    if (status === "published") {
      const activePlans = await tx
        .select({ id: schema.storefrontPlans.id })
        .from(schema.storefrontPlans)
        .where(
          and(
            eq(schema.storefrontPlans.schoolId, ctx.tenantId!),
            eq(schema.storefrontPlans.entityType, "product"),
            eq(schema.storefrontPlans.entityId, row.publicId),
            eq(schema.storefrontPlans.status, "active"),
          ),
        )
        .limit(1);
      const included = input.includedWithCommunity ?? row.includedWithCommunity;
      if (activePlans.length === 0 && !included) {
        return {
          ok: false as const,
          error: createPlatformError("validation_failed", {
            safeDetails: { reason: "payment_plan_required" },
          }),
        };
      }
    }
    let featuredImage: MediaRef | null | undefined;
    if (input.featuredImage !== undefined) {
      let selectedMedia: typeof schema.media.$inferSelect | null = null;
      if (input.featuredImage?.mediaId) {
        const media = await tx
          .select()
          .from(schema.media)
          .where(
            and(
              eq(schema.media.publicId, input.featuredImage.mediaId),
              eq(schema.media.schoolId, ctx.tenantId!),
              eq(schema.media.status, "active"),
              eq(schema.media.kind, "image"),
            ),
          )
          .limit(1);
        if (!media[0]) {
          return {
            ok: false as const,
            error: createPlatformError("not_found"),
          };
        }
        selectedMedia = media[0];
      }
      await tx
        .delete(schema.mediaReferences)
        .where(
          and(
            eq(schema.mediaReferences.schoolId, ctx.tenantId!),
            eq(schema.mediaReferences.resourceType, "product_artwork"),
            eq(schema.mediaReferences.resourceInternalId, row.id),
          ),
        );
      if (selectedMedia) {
        await tx.insert(schema.mediaReferences).values({
          id: uuidv7(clock),
          schoolId: ctx.tenantId!,
          mediaId: selectedMedia.id,
          resourceType: "product_artwork",
          resourceInternalId: row.id,
          resourcePublicId: row.publicId,
          parentResourceInternalId: null,
          parentResourcePublicId: null,
          createdAt: now,
          updatedAt: now,
        });
        featuredImage = mediaRefFromCatalog(selectedMedia);
      } else {
        featuredImage = normalizeMediaRef(input.featuredImage);
      }
    }
    const privacy = input.privacy ?? row.privacy;
    const leadMagnet = input.leadMagnet ?? row.leadMagnet;
    const certificate = input.certificate ?? row.certificate;
    if (leadMagnet && row.kind === "download") {
      const freePlans = await tx
        .select({ id: schema.storefrontPlans.id })
        .from(schema.storefrontPlans)
        .where(
          and(
            eq(schema.storefrontPlans.schoolId, ctx.tenantId!),
            eq(schema.storefrontPlans.entityType, "product"),
            eq(schema.storefrontPlans.entityId, row.publicId),
            eq(schema.storefrontPlans.kind, "free"),
            eq(schema.storefrontPlans.status, "active"),
          ),
        );
      if (freePlans.length !== 1) {
        return {
          ok: false as const,
          error: createPlatformError("validation_failed", {
            safeDetails: { reason: "lead_magnet_invalid_settings" },
          }),
        };
      }
      const activePlans = await tx
        .select({ id: schema.storefrontPlans.id })
        .from(schema.storefrontPlans)
        .where(
          and(
            eq(schema.storefrontPlans.schoolId, ctx.tenantId!),
            eq(schema.storefrontPlans.entityType, "product"),
            eq(schema.storefrontPlans.entityId, row.publicId),
            eq(schema.storefrontPlans.status, "active"),
          ),
        );
      if (activePlans.length !== 1) {
        return {
          ok: false as const,
          error: createPlatformError("validation_failed", {
            safeDetails: { reason: "lead_magnet_invalid_settings" },
          }),
        };
      }
    }
    if (certificate && row.kind !== "course") {
      return {
        ok: false as const,
        error: createPlatformError("validation_failed", {
          safeDetails: { reason: "certificate_invalid_settings" },
        }),
      };
    }
    const next = {
      status,
      slug: nextSlug,
      title: input.title ?? row.title,
      description: input.description ?? row.description,
      privacy,
      leadMagnet,
      certificate,
      discussions: input.discussions ?? row.discussions,
      newLessonStatus: input.newLessonStatus ?? row.newLessonStatus,
      includedWithCommunity: input.includedWithCommunity ?? row.includedWithCommunity,
      ...(input.featuredImage !== undefined ? { featuredImage } : {}),
      // Kept when going back to draft: it records that the product was live once.
      publishedAt: status === "published" ? (row.publishedAt ?? now) : row.publishedAt,
      updatedAt: now,
    };
    let discussionSpaceId = row.discussionSpaceId;
    if (next.discussions && row.kind === "course" && !discussionSpaceId) {
      discussionSpaceId = await enableProductDiscussionSpace(
        tx as AppDb,
        ctx.tenantId!,
        { ...row, title: next.title },
        clock,
      );
    } else if (discussionSpaceId && next.title !== row.title) {
      // A course's discussion space is named after the course.
      await tx
        .update(schema.spaces)
        .set({ name: next.title, updatedAt: now })
        .where(eq(schema.spaces.id, discussionSpaceId));
    }
    await tx
      .update(schema.products)
      .set({ ...next, discussionSpaceId })
      .where(eq(schema.products.id, row.id));
    if (input.includedWithCommunity !== undefined || status === "published") {
      await syncIncludedProductMemberships(tx as AppDb, ctx.tenantId!, clock);
    }
    if (input.slug !== undefined || input.title !== undefined) {
      const updated = { ...row, ...next };
      await ensureSalesPage(
        tx as AppDb,
        {
          schoolId: row.schoolId,
          resourceType: "product",
          resourceId: row.id,
          resourcePublicId: row.publicId,
          name: updated.title,
          description: updated.description,
          slug: updated.slug,
          productKind: row.kind,
        },
        clock,
      );
    }
    if (input.description !== undefined) {
      const contentMediaIds = await mediaIdsForRichTextContent(
        tx as AppDb,
        ctx.tenantId!,
        input.description,
      );
      const references = await reconcileMediaReferencesInTransaction(
        tx as AppDb,
        ctx.tenantId!,
        contentMediaIds,
        "product_content",
        row.id,
        row.publicId,
        clock,
      );
      if (!references.ok) return references;
    }
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action:
        status === "published" && row.status !== "published"
          ? "product.published"
          : "product.updated",
      resourceType: "product",
      resourceId: row.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    return {
      ok: true as const,
      value: await toDto(
        tx as AppDb,
        { ...row, ...next },
        publicSchoolId,
        featuredImage,
      ),
    };
  });
}

/** Deletes a product, then the media that only it, its lessons, its sales
 * page, or its certificate template used. */
export async function deleteProduct(
  db: AppDb,
  ctx: Ctx,
  mediaLit: MediaLitClient,
  productPublicId: string,
  clock: Clock,
): Promise<{ ok: true; value: { id: string } } | { ok: false; error: PlatformError }> {
  if (!ctx.permissions.has("products:delete")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const result = await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.publicId, productPublicId),
          eq(schema.products.schoolId, ctx.tenantId!),
        ),
      )
      .limit(1);
    const row = existing[0];
    if (!row) {
      return { ok: false as const, error: createPlatformError("not_found") };
    }
    const financialHistory = await tx
      .select({
        paymentId: schema.storefrontPayments.id,
        subscriptionId: schema.storefrontSubscriptions.id,
      })
      .from(schema.storefrontCheckoutAttempts)
      .leftJoin(
        schema.storefrontPayments,
        eq(schema.storefrontPayments.checkoutId, schema.storefrontCheckoutAttempts.id),
      )
      .leftJoin(
        schema.storefrontSubscriptions,
        eq(
          schema.storefrontSubscriptions.checkoutId,
          schema.storefrontCheckoutAttempts.id,
        ),
      )
      .where(
        and(
          eq(schema.storefrontCheckoutAttempts.schoolId, ctx.tenantId!),
          eq(schema.storefrontCheckoutAttempts.productId, row.id),
          or(
            isNotNull(schema.storefrontPayments.id),
            isNotNull(schema.storefrontSubscriptions.id),
          ),
        ),
      )
      .limit(1);
    if (financialHistory[0]) {
      return {
        ok: false as const,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "product_financial_history" },
        }),
      };
    }
    await tx
      .delete(schema.spaceUnlocks)
      .where(
        and(
          eq(schema.spaceUnlocks.schoolId, ctx.tenantId!),
          eq(schema.spaceUnlocks.entityType, "product"),
          eq(schema.spaceUnlocks.entityId, row.publicId),
        ),
      );
    const ownedIds = async (
      table:
        | typeof schema.lessons
        | typeof schema.websitePages
        | typeof schema.certificateTemplates,
    ) =>
      (
        await tx.select({ id: table.id }).from(table).where(eq(table.productId, row.id))
      ).map((owned) => owned.id);
    // The sales page and certificate template go by cascade, so their media
    // references are released here along with the product's own.
    const owners: Array<[string[], string[]]> = [
      [["product_artwork", "product_content"], [row.id]],
      [["lesson_media", "lesson_content"], await ownedIds(schema.lessons)],
      [["website_page"], await ownedIds(schema.websitePages)],
      [["certificate_template"], await ownedIds(schema.certificateTemplates)],
    ];
    const releasedMediaIds: string[] = [];
    for (const [resourceTypes, resourceIds] of owners) {
      if (resourceIds.length === 0) continue;
      const released = await tx
        .delete(schema.mediaReferences)
        .where(
          and(
            eq(schema.mediaReferences.schoolId, ctx.tenantId!),
            inArray(schema.mediaReferences.resourceType, resourceTypes),
            inArray(schema.mediaReferences.resourceInternalId, resourceIds),
          ),
        )
        .returning({ mediaId: schema.mediaReferences.mediaId });
      releasedMediaIds.push(...released.map((reference) => reference.mediaId));
    }
    await tx.delete(schema.products).where(eq(schema.products.id, row.id));
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "product.deleted",
      resourceType: "product",
      resourceId: row.publicId,
      requestId: ctx.requestId,
      createdAt: clock.now(),
    });
    return { ok: true as const, value: { id: row.publicId }, releasedMediaIds };
  });
  if (!result.ok) return result;
  await deleteUnreferencedMedia(
    db,
    mediaLit,
    {
      schoolId: ctx.tenantId!,
      mediaIds: result.releasedMediaIds,
      actorId: ctx.principalId,
      requestId: ctx.requestId,
    },
    clock,
  );
  return { ok: true, value: result.value };
}

function slugify(title: string, fallback: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200)
    .replace(/-$/g, "");
  return slug || (fallback ? `product-${fallback.slice(-8).toLowerCase()}` : "");
}

export async function countOwners(db: AppDb, schoolId: string): Promise<number> {
  const rows = await db
    .select()
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.schoolId, schoolId),
        eq(schema.memberships.isOwner, true),
      ),
    );
  return rows.length;
}

export async function removeMember(
  db: AppDb,
  ctx: Ctx,
  memberUserId: string,
  clock: Clock,
): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  return removeSchoolTeamMember(db, ctx, memberUserId, clock);
}
