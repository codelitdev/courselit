import { createHash, randomBytes } from "node:crypto";
import { type Clock, createPlatformError, serializeDate, uuidv7 } from "@codelitdev/platform";
import { and, asc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { zipSync } from "fflate";
import { ActivityType, recordActivity } from "./activities.js";
import * as schema from "./db/schema/index.js";
import type { MediaLitClient } from "./media.js";
import type { AppDb } from "./types.js";

export const DOWNLOAD_LINK_TTL_MS = 2 * 24 * 60 * 60 * 1000;
const MAX_DOWNLOAD_BYTES = 300 * 1024 * 1024;

export type LearnerDownloadLinkDto = {
  token: string;
  expiresAt: string;
};

export type LearnerDownloadResult =
  | { kind: "empty"; message: "digital_download_no_files" }
  | { kind: "zip"; bytes: Uint8Array; fileName: string };

function digestToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function generatedToken(): string {
  // The legacy DownloadLink model uses a 128-character hex token. Keep that
  // externally visible shape while storing only its digest in PostgreSQL.
  return randomBytes(64).toString("hex");
}

function safeFileName(value: string, fallback: string): string {
  const normalized = value
    .replace(/[\\/\0]/g, "-")
    .replace(/[^a-zA-Z0-9._() -]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+$/, "");
  return (normalized || fallback).slice(0, 240);
}

function safeArchiveName(value: string): string {
  return safeFileName(value, "download").replace(/\.zip$/i, "");
}

function forbidden(): { ok: false; error: ReturnType<typeof createPlatformError> } {
  return { ok: false, error: createPlatformError("forbidden") };
}

export async function createLearnerDownloadLink(
  db: AppDb,
  input: {
    schoolId: string;
    learnerId: string;
    productPublicId: string;
    actorId: string;
    requestId: string;
  },
  clock: Clock,
): Promise<
  | { ok: true; value: LearnerDownloadLinkDto }
  | { ok: false; error: ReturnType<typeof createPlatformError> }
> {
  const productRows = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.schoolId, input.schoolId),
        eq(schema.products.publicId, input.productPublicId),
      ),
    )
    .limit(1);
  const product = productRows[0];
  if (!product || product.status !== "published" || product.kind !== "download") {
    return { ok: false, error: createPlatformError("not_found") };
  }

  const now = clock.now();
  const accessRows = await db
    .select({ enrollment: schema.enrollments })
    .from(schema.enrollments)
    .innerJoin(
      schema.enrollmentAccessGrants,
      eq(schema.enrollmentAccessGrants.enrollmentId, schema.enrollments.id),
    )
    .where(
      and(
        eq(schema.enrollments.schoolId, input.schoolId),
        eq(schema.enrollments.learnerId, input.learnerId),
        eq(schema.enrollments.productId, product.id),
        eq(schema.enrollments.status, "active"),
        eq(schema.enrollmentAccessGrants.schoolId, input.schoolId),
        eq(schema.enrollmentAccessGrants.status, "active"),
        lte(schema.enrollmentAccessGrants.startsAt, now),
        or(
          isNull(schema.enrollmentAccessGrants.endsAt),
          gt(schema.enrollmentAccessGrants.endsAt, now),
        ),
      ),
    )
    .limit(1);
  const enrollment = accessRows[0]?.enrollment;
  if (!enrollment) return forbidden();

  const token = generatedToken();
  const expiresAt = new Date(now.getTime() + DOWNLOAD_LINK_TTL_MS);
  await db.transaction(async (tx) => {
    await tx.insert(schema.downloadLinks).values({
      id: uuidv7(clock),
      schoolId: input.schoolId,
      enrollmentId: enrollment.id,
      learnerId: input.learnerId,
      productId: product.id,
      tokenDigest: digestToken(token),
      expiresAt,
      consumed: false,
      createdAt: now,
    });
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: input.schoolId,
      actorId: input.actorId,
      action: "download.link_created",
      resourceType: "download_link",
      resourceId: enrollment.publicId,
      requestId: input.requestId,
      createdAt: now,
    });
  });

  return { ok: true, value: { token, expiresAt: serializeDate(expiresAt) } };
}

async function fetchBinary(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download_asset_failed_${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

function assetFileName(value: string, fallback: string): string {
  return safeFileName(value, fallback);
}

export async function serveLearnerDownload(
  db: AppDb,
  mediaLit: MediaLitClient,
  input: {
    schoolId: string;
    learnerId: string;
    token: string;
    requestId: string;
    fetchAsset?: (url: string) => Promise<Uint8Array>;
  },
  clock: Clock,
): Promise<
  | { ok: true; value: LearnerDownloadResult }
  | { ok: false; error: ReturnType<typeof createPlatformError> }
> {
  if (!/^[a-f0-9]{128}$/i.test(input.token)) {
    return { ok: false, error: createPlatformError("not_found") };
  }
  const now = clock.now();
  const rows = await db
    .select({
      link: schema.downloadLinks,
      enrollment: schema.enrollments,
      grant: schema.enrollmentAccessGrants,
      product: schema.products,
    })
    .from(schema.downloadLinks)
    .innerJoin(
      schema.enrollments,
      eq(schema.enrollments.id, schema.downloadLinks.enrollmentId),
    )
    .innerJoin(
      schema.enrollmentAccessGrants,
      eq(schema.enrollmentAccessGrants.enrollmentId, schema.enrollments.id),
    )
    .innerJoin(schema.products, eq(schema.products.id, schema.downloadLinks.productId))
    .where(
      and(
        eq(schema.downloadLinks.tokenDigest, digestToken(input.token)),
        eq(schema.downloadLinks.schoolId, input.schoolId),
        eq(schema.downloadLinks.learnerId, input.learnerId),
        eq(schema.downloadLinks.consumed, false),
        gt(schema.downloadLinks.expiresAt, now),
        eq(schema.enrollments.schoolId, input.schoolId),
        eq(schema.enrollments.learnerId, input.learnerId),
        eq(schema.enrollments.status, "active"),
        eq(schema.enrollmentAccessGrants.schoolId, input.schoolId),
        eq(schema.enrollmentAccessGrants.status, "active"),
        lte(schema.enrollmentAccessGrants.startsAt, now),
        or(
          isNull(schema.enrollmentAccessGrants.endsAt),
          gt(schema.enrollmentAccessGrants.endsAt, now),
        ),
        eq(schema.products.schoolId, input.schoolId),
        eq(schema.products.status, "published"),
        eq(schema.products.kind, "download"),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: createPlatformError("not_found") };

  const lessons = await db
    .select({ id: schema.lessons.id, position: schema.lessons.position })
    .from(schema.lessons)
    .where(
      and(
        eq(schema.lessons.schoolId, input.schoolId),
        eq(schema.lessons.productId, row.product.id),
        eq(schema.lessons.status, "published"),
      ),
    )
    .orderBy(asc(schema.lessons.position), asc(schema.lessons.id));
  if (lessons.length === 0) {
    return { ok: true, value: { kind: "empty", message: "digital_download_no_files" } };
  }

  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const references = await db
    .select({
      resourceInternalId: schema.mediaReferences.resourceInternalId,
      media: schema.media,
    })
    .from(schema.mediaReferences)
    .innerJoin(schema.media, eq(schema.media.id, schema.mediaReferences.mediaId))
    .where(
      and(
        eq(schema.mediaReferences.schoolId, input.schoolId),
        eq(schema.mediaReferences.resourceType, "lesson_media"),
        eq(schema.media.status, "active"),
      ),
    );
  const mediaByLesson = new Map<string, (typeof references)[number]["media"]>();
  for (const reference of references) {
    if (lessonIds.has(reference.resourceInternalId)) {
      mediaByLesson.set(reference.resourceInternalId, reference.media);
    }
  }

  const files: Record<string, Uint8Array> = {};
  const usedNames = new Set<string>();
  let totalBytes = 0;
  const readAsset = input.fetchAsset ?? fetchBinary;
  for (const lesson of lessons) {
    const media = mediaByLesson.get(lesson.id);
    if (!media) continue;
    if (totalBytes + media.byteSize > MAX_DOWNLOAD_BYTES) {
      return {
        ok: false,
        error: createPlatformError("validation_failed", {
          safeDetails: { reason: "download_too_large" },
        }),
      };
    }
    try {
      const asset =
        media.accessPolicy === "private"
          ? await mediaLit.getAsset({
              schoolId: input.schoolId,
              mediaLitId: media.mediaLitId,
            })
          : {
              mediaLitId: media.mediaLitId,
              group: input.schoolId,
              canonicalUrl: media.canonicalUrl,
              thumbnailUrl: media.thumbnailUrl,
              fileName: media.fileName,
              mimeType: media.mimeType,
              byteSize: media.byteSize,
              width: media.width,
              height: media.height,
            };
      if (asset.group !== input.schoolId) continue;
      const content = await readAsset(asset.canonicalUrl);
      totalBytes += content.byteLength;
      if (totalBytes > MAX_DOWNLOAD_BYTES) {
        return {
          ok: false,
          error: createPlatformError("validation_failed", {
            safeDetails: { reason: "download_too_large" },
          }),
        };
      }
      const baseName = assetFileName(asset.fileName, `file-${lesson.position}`);
      let fileName = baseName;
      let suffix = 2;
      while (usedNames.has(fileName)) {
        const dot = baseName.lastIndexOf(".");
        fileName =
          dot > 0
            ? `${baseName.slice(0, dot)}-${suffix}${baseName.slice(dot)}`
            : `${baseName}-${suffix}`;
        suffix += 1;
      }
      usedNames.add(fileName);
      files[`files/${fileName}`] = content;
    } catch {
      // The legacy route skips an individual unavailable media asset and
      // still returns the remaining files in the archive.
    }
  }

  const bytes = zipSync(files, { level: 6 });
  const consumed = await db.transaction(async (tx) => {
    const current = await tx
      .select({ id: schema.downloadLinks.id })
      .from(schema.downloadLinks)
      .where(
        and(
          eq(schema.downloadLinks.id, row.link.id),
          eq(schema.downloadLinks.schoolId, input.schoolId),
          eq(schema.downloadLinks.learnerId, input.learnerId),
          eq(schema.downloadLinks.consumed, false),
          gt(schema.downloadLinks.expiresAt, now),
        ),
      )
      .limit(1);
    if (!current[0]) return false;
    await tx
      .update(schema.downloadLinks)
      .set({ consumed: true })
      .where(eq(schema.downloadLinks.id, row.link.id));
    await tx
      .update(schema.enrollments)
      .set({ downloaded: true })
      .where(eq(schema.enrollments.id, row.enrollment.id));
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: input.schoolId,
      actorId: input.learnerId,
      action: "download.completed",
      resourceType: "product",
      resourceId: row.product.publicId,
      requestId: input.requestId,
      createdAt: now,
    });
    await recordActivity(tx as unknown as AppDb, {
      schoolId: input.schoolId,
      actorId: input.learnerId,
      type: ActivityType.DOWNLOADED,
      entityId: row.product.publicId,
      metadata: { downloadLinkId: row.link.id },
    }, clock);
    return true;
  });
  if (!consumed) return { ok: false, error: createPlatformError("not_found") };

  return {
    ok: true,
    value: {
      kind: "zip",
      bytes,
      fileName: `${safeArchiveName(row.product.title)}.zip`,
    },
  };
}
