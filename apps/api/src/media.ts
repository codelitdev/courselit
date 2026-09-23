import { createHash, randomBytes } from "node:crypto";
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
import { and, asc, count, desc, eq, ilike, inArray, lt, or } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { CourseLitPermission } from "./permissions.js";
import type { AppDb } from "./types.js";

export const MEDIA_RESOURCE_TYPES = [
  "school_branding",
  "blog_artwork",
  "product_artwork",
  "product_content",
  "lesson_media",
  "lesson_content",
  "downloadable_file",
  "community_artwork",
  "community_content",
  "learner_avatar",
  "certificate_template",
] as const;

export type MediaResourceType = (typeof MEDIA_RESOURCE_TYPES)[number];
export type MediaKind = "image" | "video" | "audio" | "document" | "other";
export type MediaAccessPolicy = "public" | "private";
export type MediaCategory = "library" | "user_uploads";

/** Convert a catalog row into the platform's shared media reference. */
export function mediaRefFromCatalog(
  row: Pick<
    typeof schema.media.$inferSelect,
    | "publicId"
    | "canonicalUrl"
    | "thumbnailUrl"
    | "altText"
    | "fileName"
    | "mimeType"
    | "byteSize"
    | "caption"
    | "kind"
  >,
): MediaRef {
  return {
    mediaId: row.publicId,
    url: row.canonicalUrl,
    ...(row.thumbnailUrl ? { thumbnailUrl: row.thumbnailUrl } : {}),
    ...(row.altText ? { alt: row.altText } : {}),
    ...(row.fileName ? { fileName: row.fileName } : {}),
    ...(row.mimeType ? { mimeType: row.mimeType } : {}),
    ...(row.byteSize !== null ? { byteSize: row.byteSize } : {}),
    ...(row.caption ? { title: row.caption } : {}),
    kind: row.kind,
  };
}

export function normalizeMediaRef(input: unknown): MediaRef | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  const url = typeof value.url === "string" ? value.url.trim() : "";
  if (!url) return null;
  const mediaId = typeof value.mediaId === "string" ? value.mediaId.trim() : "";
  const thumbnailUrl =
    typeof value.thumbnailUrl === "string" ? value.thumbnailUrl.trim() : "";
  const alt = typeof value.alt === "string" ? value.alt.trim() : "";
  const fileName = typeof value.fileName === "string" ? value.fileName.trim() : "";
  const mimeType = typeof value.mimeType === "string" ? value.mimeType.trim() : "";
  const byteSize = typeof value.byteSize === "number" ? value.byteSize : undefined;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const kind =
    value.kind === "image" ||
    value.kind === "video" ||
    value.kind === "audio" ||
    value.kind === "document" ||
    value.kind === "other"
      ? value.kind
      : undefined;
  return {
    ...(mediaId ? { mediaId } : {}),
    url,
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(alt ? { alt } : {}),
    ...(fileName ? { fileName } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(byteSize !== undefined ? { byteSize } : {}),
    ...(title ? { title } : {}),
    ...(kind ? { kind } : {}),
  };
}

export type MediaLitAsset = {
  mediaLitId: string;
  group: string;
  canonicalUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
};

export type MediaLitClient = {
  authorizeUpload(input: {
    schoolId: string;
    fileName: string;
    mimeType: string;
    byteSize: number;
    purpose: MediaResourceType;
    accessPolicy: MediaAccessPolicy;
    expiresAt: Date;
  }): Promise<{
    uploadId: string;
    uploadUrl: string;
    uploadProtocol: "direct" | "tus";
    uploadMethod: "PUT" | "POST";
    uploadHeaders: Record<string, string>;
    uploadFields: Record<string, string>;
    expiresAt: Date;
  }>;
  finalizeUpload(input: { schoolId: string; uploadId: string }): Promise<MediaLitAsset>;
  getAsset(input: { schoolId: string; mediaLitId: string }): Promise<MediaLitAsset>;
  deleteAsset(input: { schoolId: string; mediaLitId: string }): Promise<void>;
};

/**
 * Local/test provider. The production API injects the MediaLit adapter at its
 * composition boundary; this provider keeps the generated reference app
 * deployable without requiring a MediaLit service during development.
 */
export class MemoryMediaLitClient implements MediaLitClient {
  constructor(private readonly now: () => Date = () => new Date()) {}

  private readonly uploads = new Map<
    string,
    {
      schoolId: string;
      fileName: string;
      mimeType: string;
      byteSize: number;
      accessPolicy: MediaAccessPolicy;
      expiresAt: Date;
    }
  >();
  private readonly assets = new Map<string, MediaLitAsset>();

  async authorizeUpload(input: {
    schoolId: string;
    fileName: string;
    mimeType: string;
    byteSize: number;
    purpose: MediaResourceType;
    accessPolicy: MediaAccessPolicy;
    expiresAt: Date;
  }) {
    const uploadId = `upload_${randomBytes(18).toString("base64url")}`;
    this.uploads.set(uploadId, input);
    return {
      uploadId,
      uploadUrl: `https://media.test/uploads/${uploadId}`,
      uploadProtocol: "direct" as const,
      uploadMethod: "PUT" as const,
      uploadHeaders: {},
      uploadFields: {},
      expiresAt: input.expiresAt,
    };
  }

  async finalizeUpload(input: { schoolId: string; uploadId: string }) {
    const upload = this.uploads.get(input.uploadId);
    if (
      !upload ||
      upload.schoolId !== input.schoolId ||
      upload.expiresAt <= this.now()
    ) {
      throw new Error("media_upload_invalid_or_expired");
    }
    this.uploads.delete(input.uploadId);
    const mediaLitId = `asset_${randomBytes(18).toString("base64url")}`;
    const asset = {
      mediaLitId,
      group: upload.schoolId,
      canonicalUrl: `https://media.test/assets/${mediaLitId}`,
      thumbnailUrl: upload.mimeType.startsWith("image/")
        ? `https://media.test/assets/${mediaLitId}/thumbnail`
        : null,
      fileName: upload.fileName,
      mimeType: upload.mimeType,
      byteSize: upload.byteSize,
      width: null,
      height: null,
    };
    this.assets.set(mediaLitId, asset);
    return asset;
  }

  async getAsset(input: { schoolId: string; mediaLitId: string }) {
    const asset = this.assets.get(input.mediaLitId);
    if (!asset || asset.group !== input.schoolId) {
      throw new Error("media_asset_not_found");
    }
    return asset;
  }

  async deleteAsset(input: { schoolId: string; mediaLitId: string }) {
    void input.schoolId;
    this.assets.delete(input.mediaLitId);
  }
}

type Ctx = PlatformRequestContext<string, string, CourseLitPermission>;

export type MediaDto = {
  id: string;
  schoolId: string;
  canonicalUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  kind: MediaKind;
  category: MediaCategory;
  altText: string;
  caption: string;
  accessPolicy: MediaAccessPolicy;
  status: "active" | "deleting";
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MediaReferenceDto = {
  resourceType: MediaResourceType;
  resourceId: string;
  parentResourceId: string | null;
};

export type UploadAuthorizationDto = {
  uploadId: string;
  uploadUrl: string;
  uploadProtocol: "direct" | "tus";
  uploadMethod: "PUT" | "POST";
  uploadHeaders: Record<string, string>;
  uploadFields: Record<string, string>;
  expiresAt: string;
};

export type LearnerMediaViewer = {
  schoolId: string;
  schoolAccountId?: string;
  learnerId: string;
  learnerPublicId: string;
};

function kindForMime(mimeType: string): MediaKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType === "application/pdf" ||
    mimeType.startsWith("text/") ||
    mimeType.includes("document")
  ) {
    return "document";
  }
  return "other";
}

function toDto(
  row: typeof schema.media.$inferSelect,
  publicSchoolId: string,
  usageCount: number,
): MediaDto {
  return {
    id: row.publicId,
    schoolId: publicSchoolId,
    canonicalUrl: row.canonicalUrl,
    thumbnailUrl: row.thumbnailUrl,
    fileName: row.fileName,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    width: row.width,
    height: row.height,
    kind: row.kind,
    category: row.category,
    altText: row.altText,
    caption: row.caption,
    accessPolicy: row.accessPolicy,
    status: row.status,
    usageCount,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  };
}

function has(ctx: Ctx, permission: CourseLitPermission) {
  return Boolean(ctx.tenantId && ctx.permissions.has(permission));
}

function invalid(reason: string): { ok: false; error: PlatformError } {
  return {
    ok: false,
    error: createPlatformError("validation_failed", { safeDetails: { reason } }),
  };
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      createdAt?: unknown;
      id?: unknown;
    };
    if (typeof value.createdAt !== "string" || typeof value.id !== "string") {
      return null;
    }
    const createdAt = new Date(value.createdAt);
    return Number.isNaN(createdAt.getTime()) ? null : { createdAt, id: value.id };
  } catch {
    return null;
  }
}

function encodeCursor(row: typeof schema.media.$inferSelect): string {
  return Buffer.from(
    JSON.stringify({ createdAt: row.createdAt.toISOString(), id: row.id }),
  ).toString("base64url");
}

async function usageCount(
  db: AppDb,
  schoolId: string,
  mediaId: string,
): Promise<number> {
  const rows = await db
    .select({ count: count(schema.mediaReferences.id) })
    .from(schema.mediaReferences)
    .where(
      and(
        eq(schema.mediaReferences.schoolId, schoolId),
        eq(schema.mediaReferences.mediaId, mediaId),
      ),
    );
  return Number(rows[0]?.count ?? 0);
}

/**
 * Replace references while the owning CourseLit resource is being saved.
 * Public media IDs are resolved inside the tenant transaction so callers
 * cannot attach another school's asset or leave a dangling reference.
 */
export async function reconcileMediaReferencesInTransaction(
  db: AppDb,
  schoolId: string,
  mediaPublicIds: readonly string[],
  resourceType: MediaResourceType,
  resourceInternalId: string,
  resourcePublicId: string,
  clock: Clock,
  options: {
    allowedKinds?: readonly MediaKind[];
    allowedMimeTypes?: readonly string[];
    allowedMimePrefixes?: readonly string[];
    parentResourceInternalId?: string | null;
    parentResourcePublicId?: string | null;
  } = {},
): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  if (mediaPublicIds.length > 100) return invalid("too_many_media_references");
  const uniqueIds = [...new Set(mediaPublicIds)];
  if (uniqueIds.length !== mediaPublicIds.length) {
    return invalid("duplicate_media_reference");
  }

  const mediaRows =
    uniqueIds.length === 0
      ? []
      : await db
          .select({
            id: schema.media.id,
            publicId: schema.media.publicId,
            kind: schema.media.kind,
            mimeType: schema.media.mimeType,
          })
          .from(schema.media)
          .where(
            and(
              eq(schema.media.schoolId, schoolId),
              eq(schema.media.status, "active"),
              inArray(schema.media.publicId, uniqueIds),
            ),
          );
  const allowedKinds = options.allowedKinds ?? ["image"];
  if (
    mediaRows.length !== uniqueIds.length ||
    mediaRows.some(
      (media) =>
        !allowedKinds.includes(media.kind) ||
        (options.allowedMimeTypes &&
          !options.allowedMimeTypes.includes(media.mimeType) &&
          !options.allowedMimePrefixes?.some((prefix) =>
            media.mimeType.startsWith(prefix),
          )),
    )
  ) {
    return { ok: false, error: createPlatformError("not_found") };
  }

  const now = clock.now();
  await db
    .delete(schema.mediaReferences)
    .where(
      and(
        eq(schema.mediaReferences.schoolId, schoolId),
        eq(schema.mediaReferences.resourceType, resourceType),
        eq(schema.mediaReferences.resourceInternalId, resourceInternalId),
      ),
    );
  if (mediaRows.length > 0) {
    await db.insert(schema.mediaReferences).values(
      mediaRows.map((media) => ({
        id: uuidv7(clock),
        schoolId,
        mediaId: media.id,
        resourceType,
        resourceInternalId,
        resourcePublicId,
        parentResourceInternalId: options.parentResourceInternalId ?? null,
        parentResourcePublicId: options.parentResourcePublicId ?? null,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }
  return { ok: true };
}

export async function mediaIdsForRichTextContent(
  db: AppDb,
  schoolId: string,
  content: unknown,
): Promise<string[]> {
  let document = content;
  if (typeof content === "string") {
    try {
      document = JSON.parse(content) as unknown;
    } catch {
      return [];
    }
  }

  const sources = new Set<string>();
  const mediaIds = new Set<string>();
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const attrs = record.attrs;
    if (
      record.type === "image" &&
      attrs &&
      typeof attrs === "object" &&
      !Array.isArray(attrs)
    ) {
      const imageAttrs = attrs as Record<string, unknown>;
      if (typeof imageAttrs.src === "string") sources.add(imageAttrs.src);
      if (typeof imageAttrs.mediaId === "string" && imageAttrs.mediaId.trim()) {
        mediaIds.add(imageAttrs.mediaId.trim());
      }
    }
    if (Array.isArray(record.content)) {
      for (const child of record.content) visit(child);
    }
  };
  visit(document);
  if (sources.size === 0 && mediaIds.size === 0) return [];

  const sourceConditions = [];
  if (sources.size > 0) {
    sourceConditions.push(inArray(schema.media.canonicalUrl, [...sources]));
  }
  if (mediaIds.size > 0) {
    sourceConditions.push(inArray(schema.media.publicId, [...mediaIds]));
  }

  const rows = await db
    .select({ publicId: schema.media.publicId })
    .from(schema.media)
    .where(
      and(
        eq(schema.media.schoolId, schoolId),
        eq(schema.media.status, "active"),
        eq(schema.media.kind, "image"),
        or(...sourceConditions),
      ),
    );
  return rows.map((row) => row.publicId);
}

async function mediaForSchool(
  db: AppDb,
  schoolId: string,
  mediaPublicId: string,
  includeDeleting = false,
) {
  const rows = await db
    .select()
    .from(schema.media)
    .where(
      and(
        eq(schema.media.schoolId, schoolId),
        eq(schema.media.publicId, mediaPublicId),
        ...(includeDeleting ? [] : [eq(schema.media.status, "active")]),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function authorizeMediaUpload(
  ctx: Ctx,
  client: MediaLitClient,
  clock: Clock,
  input: {
    fileName: string;
    mimeType: string;
    byteSize: number;
    purpose: MediaResourceType;
    accessPolicy: MediaAccessPolicy;
  },
): Promise<
  { ok: true; value: UploadAuthorizationDto } | { ok: false; error: PlatformError }
> {
  if (!has(ctx, "media:write")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  if (!input.fileName.trim() || input.fileName.length > 255)
    return invalid("invalid_file_name");
  if (!input.mimeType.trim() || input.mimeType.length > 200)
    return invalid("invalid_mime_type");
  if (
    !Number.isSafeInteger(input.byteSize) ||
    input.byteSize < 1 ||
    input.byteSize > 1_000_000_000
  ) {
    return invalid("invalid_file_size");
  }
  const expiresAt = new Date(clock.now().getTime() + 10 * 60 * 1000);
  try {
    const authorization = await client.authorizeUpload({
      ...input,
      expiresAt,
      schoolId: ctx.tenantId!,
    });
    return {
      ok: true,
      value: {
        uploadId: authorization.uploadId,
        uploadUrl: authorization.uploadUrl,
        uploadProtocol: authorization.uploadProtocol,
        uploadMethod: authorization.uploadMethod,
        uploadHeaders: authorization.uploadHeaders,
        uploadFields: authorization.uploadFields,
        expiresAt: serializeDate(authorization.expiresAt),
      },
    };
  } catch {
    return { ok: false, error: createPlatformError("internal_error") };
  }
}

export async function finalizeMediaUpload(
  db: AppDb,
  ctx: Ctx,
  publicSchoolId: string,
  client: MediaLitClient,
  clock: Clock,
  input: {
    uploadId: string;
    altText: string;
    caption: string;
    accessPolicy: MediaAccessPolicy;
  },
): Promise<{ ok: true; value: MediaDto } | { ok: false; error: PlatformError }> {
  if (!has(ctx, "media:write")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  let asset: MediaLitAsset;
  try {
    asset = await client.finalizeUpload({
      schoolId: ctx.tenantId!,
      uploadId: input.uploadId,
    });
  } catch {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "upload_not_ready" },
      }),
    };
  }
  if (
    !asset.mediaLitId ||
    asset.group !== ctx.tenantId ||
    !asset.canonicalUrl ||
    !asset.fileName ||
    !asset.mimeType ||
    !Number.isSafeInteger(asset.byteSize) ||
    asset.byteSize < 1
  ) {
    return invalid(
      asset.group === ctx.tenantId ? "invalid_media_asset" : "media_school_mismatch",
    );
  }
  const duplicate = await db
    .select({ id: schema.media.id })
    .from(schema.media)
    .where(
      and(
        eq(schema.media.schoolId, ctx.tenantId!),
        eq(schema.media.mediaLitId, asset.mediaLitId),
      ),
    )
    .limit(1);
  if (duplicate[0]) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "media_already_registered" },
      }),
    };
  }
  const now = clock.now();
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("med", clock),
    schoolId: ctx.tenantId!,
    mediaLitId: asset.mediaLitId,
    canonicalUrl: asset.canonicalUrl,
    thumbnailUrl: asset.thumbnailUrl,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    byteSize: asset.byteSize,
    width: asset.width,
    height: asset.height,
    kind: kindForMime(asset.mimeType),
    category: "library" as const,
    altText: input.altText,
    caption: input.caption,
    accessPolicy: input.accessPolicy,
    status: "active" as const,
    createdBy: ctx.principalId,
    createdBySchoolAccountId: null,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await db.transaction(async (tx) => {
      await tx.insert(schema.media).values(row);
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId: ctx.tenantId,
        actorId: ctx.principalId,
        action: "media.created",
        resourceType: "media",
        resourceId: row.publicId,
        requestId: ctx.requestId,
        createdAt: now,
      });
    });
  } catch (error) {
    if (String(error).includes("media_school_media_lit_uidx")) {
      return {
        ok: false,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "media_already_registered" },
        }),
      };
    }
    throw error;
  }
  return { ok: true, value: toDto(row, publicSchoolId, 0) };
}

const COMMUNITY_MEDIA_KINDS: readonly MediaKind[] = ["image", "video", "document"];

function isCommunityMediaKind(kind: MediaKind): boolean {
  return COMMUNITY_MEDIA_KINDS.includes(kind);
}

export async function authorizeLearnerCommunityMediaUpload(
  viewer: LearnerMediaViewer,
  client: MediaLitClient,
  clock: Clock,
  input: {
    fileName: string;
    mimeType: string;
    byteSize: number;
    accessPolicy: MediaAccessPolicy;
  },
): Promise<
  { ok: true; value: UploadAuthorizationDto } | { ok: false; error: PlatformError }
> {
  if (!input.fileName.trim() || input.fileName.length > 255)
    return invalid("invalid_file_name");
  if (!input.mimeType.trim() || input.mimeType.length > 200)
    return invalid("invalid_mime_type");
  if (!isCommunityMediaKind(kindForMime(input.mimeType))) {
    return invalid("unsupported_community_media_type");
  }
  if (
    !Number.isSafeInteger(input.byteSize) ||
    input.byteSize < 1 ||
    input.byteSize > 100_000_000
  ) {
    return invalid("invalid_file_size");
  }
  const expiresAt = new Date(clock.now().getTime() + 10 * 60 * 1000);
  try {
    const authorization = await client.authorizeUpload({
      ...input,
      purpose: "community_content",
      schoolId: viewer.schoolId,
      expiresAt,
    });
    return {
      ok: true,
      value: {
        uploadId: authorization.uploadId,
        uploadUrl: authorization.uploadUrl,
        uploadProtocol: authorization.uploadProtocol,
        uploadMethod: authorization.uploadMethod,
        uploadHeaders: authorization.uploadHeaders,
        uploadFields: authorization.uploadFields,
        expiresAt: serializeDate(authorization.expiresAt),
      },
    };
  } catch {
    return { ok: false, error: createPlatformError("internal_error") };
  }
}

export async function authorizeLearnerAvatarUpload(
  viewer: LearnerMediaViewer,
  client: MediaLitClient,
  clock: Clock,
  input: { fileName: string; mimeType: string; byteSize: number },
): Promise<
  { ok: true; value: UploadAuthorizationDto } | { ok: false; error: PlatformError }
> {
  if (!input.fileName.trim() || input.fileName.length > 255) {
    return invalid("invalid_file_name");
  }
  if (!input.mimeType.trim() || input.mimeType.length > 200) {
    return invalid("invalid_mime_type");
  }
  if (![
    "image/png",
    "image/jpeg",
    "image/webp",
  ].includes(input.mimeType.toLowerCase())) {
    return invalid("unsupported_avatar_type");
  }
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize < 1 || input.byteSize > 2_000_000) {
    return invalid("invalid_file_size");
  }
  const expiresAt = new Date(clock.now().getTime() + 10 * 60 * 1000);
  try {
    const authorization = await client.authorizeUpload({
      ...input,
      purpose: "learner_avatar",
      accessPolicy: "public",
      schoolId: viewer.schoolId,
      expiresAt,
    });
    return {
      ok: true,
      value: {
        uploadId: authorization.uploadId,
        uploadUrl: authorization.uploadUrl,
        uploadProtocol: authorization.uploadProtocol,
        uploadMethod: authorization.uploadMethod,
        uploadHeaders: authorization.uploadHeaders,
        uploadFields: authorization.uploadFields,
        expiresAt: serializeDate(authorization.expiresAt),
      },
    };
  } catch {
    return { ok: false, error: createPlatformError("internal_error") };
  }
}

export async function finalizeLearnerAvatarUpload(
  db: AppDb,
  viewer: LearnerMediaViewer,
  publicSchoolId: string,
  client: MediaLitClient,
  clock: Clock,
  requestId: string,
  input: { uploadId: string; altText: string; caption: string },
): Promise<{ ok: true; value: MediaDto } | { ok: false; error: PlatformError }> {
  let asset: MediaLitAsset;
  try {
    asset = await client.finalizeUpload({
      schoolId: viewer.schoolId,
      uploadId: input.uploadId,
    });
  } catch {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "upload_not_ready" },
      }),
    };
  }
  const kind = kindForMime(asset.mimeType);
  if (
    !asset.mediaLitId ||
    asset.group !== viewer.schoolId ||
    !asset.canonicalUrl ||
    !asset.fileName ||
    !asset.mimeType ||
    kind !== "image" ||
    !Number.isSafeInteger(asset.byteSize) ||
    asset.byteSize < 1
  ) {
    return invalid(
      asset.group === viewer.schoolId ? "invalid_avatar_asset" : "media_school_mismatch",
    );
  }
  const duplicate = await db
    .select({ id: schema.media.id })
    .from(schema.media)
    .where(
      and(
        eq(schema.media.schoolId, viewer.schoolId),
        eq(schema.media.mediaLitId, asset.mediaLitId),
      ),
    )
    .limit(1);
  if (duplicate[0]) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "media_already_registered" },
      }),
    };
  }
  const now = clock.now();
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("med", clock),
    schoolId: viewer.schoolId,
    mediaLitId: asset.mediaLitId,
    canonicalUrl: asset.canonicalUrl,
    thumbnailUrl: asset.thumbnailUrl,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    byteSize: asset.byteSize,
    width: asset.width,
    height: asset.height,
    kind: "image" as const,
    category: "user_uploads" as const,
    altText: input.altText,
    caption: input.caption,
    accessPolicy: "public" as const,
    status: "active" as const,
    createdBy: null,
    createdBySchoolAccountId: viewer.schoolAccountId ?? viewer.learnerId,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await db.transaction(async (tx) => {
      await tx.insert(schema.media).values(row);
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId: viewer.schoolId,
        actorId: viewer.learnerPublicId,
        action: "media.created",
        resourceType: "media",
        resourceId: row.publicId,
        requestId,
        createdAt: now,
      });
    });
  } catch (error) {
    if (String(error).includes("media_school_media_lit_uidx")) {
      return {
        ok: false,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "media_already_registered" },
        }),
      };
    }
    throw error;
  }
  return { ok: true, value: toDto(row, publicSchoolId, 0) };
}

export async function finalizeLearnerCommunityMediaUpload(
  db: AppDb,
  viewer: LearnerMediaViewer,
  publicSchoolId: string,
  client: MediaLitClient,
  clock: Clock,
  requestId: string,
  input: {
    uploadId: string;
    altText: string;
    caption: string;
    accessPolicy: MediaAccessPolicy;
  },
): Promise<{ ok: true; value: MediaDto } | { ok: false; error: PlatformError }> {
  let asset: MediaLitAsset;
  try {
    asset = await client.finalizeUpload({
      schoolId: viewer.schoolId,
      uploadId: input.uploadId,
    });
  } catch {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "upload_not_ready" },
      }),
    };
  }
  const kind = kindForMime(asset.mimeType);
  if (
    !asset.mediaLitId ||
    asset.group !== viewer.schoolId ||
    !asset.canonicalUrl ||
    !asset.fileName ||
    !asset.mimeType ||
    !isCommunityMediaKind(kind) ||
    !Number.isSafeInteger(asset.byteSize) ||
    asset.byteSize < 1
  ) {
    return invalid(
      asset.group === viewer.schoolId
        ? "invalid_community_media_asset"
        : "media_school_mismatch",
    );
  }
  const duplicate = await db
    .select({ id: schema.media.id })
    .from(schema.media)
    .where(
      and(
        eq(schema.media.schoolId, viewer.schoolId),
        eq(schema.media.mediaLitId, asset.mediaLitId),
      ),
    )
    .limit(1);
  if (duplicate[0]) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "media_already_registered" },
      }),
    };
  }
  const now = clock.now();
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("med", clock),
    schoolId: viewer.schoolId,
    mediaLitId: asset.mediaLitId,
    canonicalUrl: asset.canonicalUrl,
    thumbnailUrl: asset.thumbnailUrl,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    byteSize: asset.byteSize,
    width: asset.width,
    height: asset.height,
    kind,
    category: "user_uploads" as const,
    altText: input.altText,
    caption: input.caption,
    accessPolicy: input.accessPolicy,
    status: "active" as const,
    createdBy: null,
    createdBySchoolAccountId: viewer.schoolAccountId ?? viewer.learnerId,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await db.transaction(async (tx) => {
      await tx.insert(schema.media).values(row);
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId: viewer.schoolId,
        actorId: viewer.learnerPublicId,
        action: "media.created",
        resourceType: "media",
        resourceId: row.publicId,
        requestId,
        createdAt: now,
      });
    });
  } catch (error) {
    if (String(error).includes("media_school_media_lit_uidx")) {
      return {
        ok: false,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "media_already_registered" },
        }),
      };
    }
    throw error;
  }
  return { ok: true, value: toDto(row, publicSchoolId, 0) };
}

export async function listLearnerCommunityMedia(
  db: AppDb,
  viewer: LearnerMediaViewer,
  publicSchoolId: string,
  input: { search?: string; cursor?: string; limit: number },
): Promise<
  | { ok: true; value: { items: MediaDto[]; nextCursor: string | null } }
  | { ok: false; error: PlatformError }
> {
  const conditions = [
    eq(schema.media.schoolId, viewer.schoolId),
    eq(schema.media.createdBySchoolAccountId, viewer.schoolAccountId ?? viewer.learnerId),
    eq(schema.media.status, "active"),
  ];
  const search = input.search?.trim();
  if (search) {
    const term = `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    conditions.push(
      or(ilike(schema.media.fileName, term), ilike(schema.media.mimeType, term))!,
    );
  }
  if (input.cursor) {
    const cursor = decodeCursor(input.cursor);
    if (!cursor) return invalid("invalid_cursor");
    conditions.push(
      or(
        lt(schema.media.createdAt, cursor.createdAt),
        and(
          eq(schema.media.createdAt, cursor.createdAt),
          lt(schema.media.id, cursor.id),
        ),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(schema.media)
    .where(and(...conditions))
    .orderBy(desc(schema.media.createdAt), desc(schema.media.id))
    .limit(input.limit + 1);
  const page = rows.slice(0, input.limit);
  const counts = await Promise.all(
    page.map((row) => usageCount(db, viewer.schoolId, row.id)),
  );
  return {
    ok: true,
    value: {
      items: page.map((row, index) => toDto(row, publicSchoolId, counts[index] ?? 0)),
      nextCursor:
        rows.length > input.limit && page.at(-1) ? encodeCursor(page.at(-1)!) : null,
    },
  };
}

export async function listMedia(
  db: AppDb,
  ctx: Ctx,
  publicSchoolId: string,
  input: {
    search?: string;
    cursor?: string;
    limit: number;
    category?: MediaCategory;
  },
): Promise<
  | { ok: true; value: { items: MediaDto[]; nextCursor: string | null } }
  | { ok: false; error: PlatformError }
> {
  if (!has(ctx, "media:read")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const conditions = [
    eq(schema.media.schoolId, ctx.tenantId!),
    eq(schema.media.status, "active"),
    eq(schema.media.category, input.category ?? "library"),
  ];
  const search = input.search?.trim();
  if (search) {
    const term = `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    conditions.push(
      or(ilike(schema.media.fileName, term), ilike(schema.media.mimeType, term))!,
    );
  }
  if (input.cursor) {
    const cursor = decodeCursor(input.cursor);
    if (!cursor) return invalid("invalid_cursor");
    conditions.push(
      or(
        lt(schema.media.createdAt, cursor.createdAt),
        and(
          eq(schema.media.createdAt, cursor.createdAt),
          lt(schema.media.id, cursor.id),
        ),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(schema.media)
    .where(and(...conditions))
    .orderBy(desc(schema.media.createdAt), desc(schema.media.id))
    .limit(input.limit + 1);
  const page = rows.slice(0, input.limit);
  const counts = await Promise.all(
    page.map((row) => usageCount(db, ctx.tenantId!, row.id)),
  );
  return {
    ok: true,
    value: {
      items: page.map((row, index) => toDto(row, publicSchoolId, counts[index] ?? 0)),
      nextCursor:
        rows.length > input.limit && page.at(-1) ? encodeCursor(page.at(-1)!) : null,
    },
  };
}

export async function getMedia(
  db: AppDb,
  ctx: Ctx,
  publicSchoolId: string,
  mediaPublicId: string,
): Promise<{ ok: true; value: MediaDto } | { ok: false; error: PlatformError }> {
  if (!has(ctx, "media:read")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const row = await mediaForSchool(db, ctx.tenantId!, mediaPublicId);
  if (!row) return { ok: false, error: createPlatformError("not_found") };
  return {
    ok: true,
    value: toDto(row, publicSchoolId, await usageCount(db, ctx.tenantId!, row.id)),
  };
}

export async function updateMedia(
  db: AppDb,
  ctx: Ctx,
  publicSchoolId: string,
  mediaPublicId: string,
  input: { altText?: string; caption?: string; accessPolicy?: MediaAccessPolicy },
  clock: Clock,
): Promise<{ ok: true; value: MediaDto } | { ok: false; error: PlatformError }> {
  if (!has(ctx, "media:write")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  return db.transaction(async (tx) => {
    const row = await mediaForSchool(tx as AppDb, ctx.tenantId!, mediaPublicId);
    if (!row) return { ok: false as const, error: createPlatformError("not_found") };
    const now = clock.now();
    const next = {
      altText: input.altText ?? row.altText,
      caption: input.caption ?? row.caption,
      accessPolicy: input.accessPolicy ?? row.accessPolicy,
      updatedAt: now,
    };
    await tx.update(schema.media).set(next).where(eq(schema.media.id, row.id));
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "media.updated",
      resourceType: "media",
      resourceId: row.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    return {
      ok: true as const,
      value: toDto(
        { ...row, ...next },
        publicSchoolId,
        await usageCount(tx as AppDb, ctx.tenantId!, row.id),
      ),
    };
  });
}

export async function listMediaReferences(
  db: AppDb,
  ctx: Ctx,
  mediaPublicId: string,
): Promise<
  { ok: true; value: MediaReferenceDto[] } | { ok: false; error: PlatformError }
> {
  if (!has(ctx, "media:read")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const mediaRow = await mediaForSchool(db, ctx.tenantId!, mediaPublicId, true);
  if (!mediaRow) return { ok: false, error: createPlatformError("not_found") };
  const rows = await db
    .select()
    .from(schema.mediaReferences)
    .where(
      and(
        eq(schema.mediaReferences.schoolId, ctx.tenantId!),
        eq(schema.mediaReferences.mediaId, mediaRow.id),
      ),
    )
    .orderBy(asc(schema.mediaReferences.createdAt));
  return {
    ok: true,
    value: rows.map((row) => ({
      resourceType: row.resourceType as MediaResourceType,
      resourceId: row.resourcePublicId,
      parentResourceId: row.parentResourcePublicId,
    })),
  };
}

export async function reconcileMediaReferences(
  db: AppDb,
  ctx: Ctx,
  mediaPublicId: string,
  references: readonly {
    resourceType: MediaResourceType;
    resourceId: string;
    parentResourceId?: string | null;
  }[],
  clock: Clock,
): Promise<
  { ok: true; value: MediaReferenceDto[] } | { ok: false; error: PlatformError }
> {
  if (!has(ctx, "media:write")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  if (references.length > 100) return invalid("too_many_media_references");
  const unique = new Set(
    references.map((reference) => `${reference.resourceType}:${reference.resourceId}`),
  );
  if (unique.size !== references.length) return invalid("duplicate_media_reference");
  if (
    references.some(
      (reference) => !reference.resourceId.trim() || reference.resourceId.length > 255,
    )
  ) {
    return invalid("invalid_media_reference");
  }
  return db.transaction(async (tx) => {
    const row = await mediaForSchool(tx as AppDb, ctx.tenantId!, mediaPublicId);
    if (!row) return { ok: false as const, error: createPlatformError("not_found") };
    const now = clock.now();
    await tx
      .delete(schema.mediaReferences)
      .where(
        and(
          eq(schema.mediaReferences.schoolId, ctx.tenantId!),
          eq(schema.mediaReferences.mediaId, row.id),
        ),
      );
    if (references.length > 0) {
      await tx.insert(schema.mediaReferences).values(
        references.map((reference) => ({
          id: uuidv7(clock),
          schoolId: ctx.tenantId!,
          mediaId: row.id,
          resourceType: reference.resourceType,
          resourceInternalId: reference.resourceId,
          resourcePublicId: reference.resourceId,
          parentResourceInternalId: reference.parentResourceId ?? null,
          parentResourcePublicId: reference.parentResourceId ?? null,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "media.references_reconciled",
      resourceType: "media",
      resourceId: row.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    return {
      ok: true as const,
      value: references.map((reference) => ({
        resourceType: reference.resourceType,
        resourceId: reference.resourceId,
        parentResourceId: reference.parentResourceId ?? null,
      })),
    };
  });
}

export async function deleteMedia(
  db: AppDb,
  ctx: Ctx,
  client: MediaLitClient,
  mediaPublicId: string,
  clock: Clock,
): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  if (!has(ctx, "media:delete")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const row = await mediaForSchool(db, ctx.tenantId!, mediaPublicId, true);
  if (!row) return { ok: false, error: createPlatformError("not_found") };
  const references = await db
    .select({ id: schema.mediaReferences.id })
    .from(schema.mediaReferences)
    .where(
      and(
        eq(schema.mediaReferences.schoolId, ctx.tenantId!),
        eq(schema.mediaReferences.mediaId, row.id),
      ),
    )
    .limit(1);
  if (references[0]) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "media_in_use" },
      }),
    };
  }
  await db
    .update(schema.media)
    .set({ status: "deleting", updatedAt: clock.now() })
    .where(eq(schema.media.id, row.id));
  try {
    await client.deleteAsset({ schoolId: ctx.tenantId!, mediaLitId: row.mediaLitId });
  } catch {
    return { ok: false, error: createPlatformError("internal_error") };
  }
  await db.transaction(async (tx) => {
    await tx.delete(schema.media).where(eq(schema.media.id, row.id));
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "media.deleted",
      resourceType: "media",
      resourceId: row.publicId,
      requestId: ctx.requestId,
      createdAt: clock.now(),
    });
  });
  return { ok: true };
}

export function digestMediaUploadToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
