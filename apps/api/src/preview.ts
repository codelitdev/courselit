import { createHash, randomBytes } from "node:crypto";
import {
  type Clock,
  createPlatformError,
  type PlatformError,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getProduct, type ProductDetailDto } from "./catalog.js";
import * as schema from "./db/schema/index.js";
import type { CourseLitPermission } from "./permissions.js";
import type { AppDb } from "./types.js";

const DEFAULT_TTL_SECONDS = 15 * 60;
const MAX_TTL_SECONDS = 60 * 60;

type PreviewContext = {
  tenantId: string | null;
  principalId: string;
  permissions: ReadonlySet<CourseLitPermission>;
  requestId: string;
};

export type PreviewGrantDto = {
  token: string;
  schoolId: string;
  productId: string;
  expiresAt: string;
};

function digestToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function createPreviewGrant(
  db: AppDb,
  ctx: PreviewContext,
  productPublicId: string,
  clock: Clock,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<{ ok: true; value: PreviewGrantDto } | { ok: false; error: PlatformError }> {
  if (!ctx.tenantId || !ctx.permissions.has("products:write")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  if (
    !Number.isInteger(ttlSeconds) ||
    ttlSeconds < 60 ||
    ttlSeconds > MAX_TTL_SECONDS
  ) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const products = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.schoolId, ctx.tenantId),
        eq(schema.products.publicId, productPublicId),
      ),
    )
    .limit(1);
  const product = products[0];
  if (!product) return { ok: false, error: createPlatformError("not_found") };

  const token = randomBytes(32).toString("base64url");
  const now = clock.now();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  await db.transaction(async (tx) => {
    await tx.insert(schema.previewGrants).values({
      id: uuidv7(clock),
      tokenDigest: digestToken(token),
      schoolId: ctx.tenantId!,
      productId: product.id,
      issuedBy: ctx.principalId,
      expiresAt,
      createdAt: now,
    });
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "preview.grant_created",
      resourceType: "product",
      resourceId: product.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
  });
  return {
    ok: true,
    value: {
      token,
      schoolId: ctx.tenantId,
      productId: product.publicId,
      expiresAt: serializeDate(expiresAt),
    },
  };
}

export async function readPreviewProduct(
  db: AppDb,
  input: { token: string; productPublicId: string },
  clock: Clock,
): Promise<
  { ok: true; value: ProductDetailDto } | { ok: false; error: PlatformError }
> {
  const token = input.token.trim();
  if (!token) return { ok: false, error: createPlatformError("unauthenticated") };
  const now = clock.now();
  const rows = await db
    .select({
      grant: schema.previewGrants,
      product: schema.products,
      school: schema.schools,
    })
    .from(schema.previewGrants)
    .innerJoin(schema.products, eq(schema.products.id, schema.previewGrants.productId))
    .innerJoin(schema.schools, eq(schema.schools.id, schema.previewGrants.schoolId))
    .where(
      and(
        eq(schema.previewGrants.tokenDigest, digestToken(token)),
        eq(schema.products.publicId, input.productPublicId),
        eq(schema.products.schoolId, schema.previewGrants.schoolId),
        gt(schema.previewGrants.expiresAt, now),
        isNull(schema.previewGrants.revokedAt),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: createPlatformError("not_found") };
  return getProduct(
    db,
    { schoolId: row.school.id, publicId: row.school.publicId },
    row.product.publicId,
    { kind: "preview" },
    clock.now(),
  );
}
