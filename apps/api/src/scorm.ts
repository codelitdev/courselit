import type { PlatformRequestContext } from "@codelitdev/platform";
import {
  type Clock,
  createPlatformError,
  type PlatformError,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import { and, asc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { unzipSync } from "fflate";
import { lessonUnlockAt, sectionUnlockAt } from "./catalog.js";
import * as schema from "./db/schema/index.js";
import type { CourseLitPermission } from "./permissions.js";
import type { AppDb } from "./types.js";

const DEFAULT_SCORM_STATE: Record<string, unknown> = { cmi: {} };
const UNSAFE_PATH_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);
const MAX_UPDATE_COUNT = 100;
const MAX_PATH_LENGTH = 255;
const MAX_STATE_BYTES = 256 * 1024;
const MAX_PACKAGE_BYTES = 300 * 1024 * 1024;

export type ScormRuntimeStateDto = Record<string, unknown>;

export type ScormPackageInfoDto = {
  version: "1.2" | "2004";
  title: string;
  entryPoint: string;
  scoCount: number;
  fileCount: number;
};

export type ScormRuntimeInput = {
  schoolId: string;
  learnerId: string;
  productPublicId: string;
  lessonPublicId: string;
};

type ScormLessonAccess = {
  lesson: typeof schema.lessons.$inferSelect;
  product: typeof schema.products.$inferSelect;
  enrollment: typeof schema.enrollments.$inferSelect;
};

type AdminContext = PlatformRequestContext<string, string, CourseLitPermission>;

function latestUnlockAt(...dates: (Date | null)[]): Date | null {
  return dates.reduce<Date | null>((latest, date) => {
    if (!date) return latest;
    return !latest || date > latest ? date : latest;
  }, null);
}

function invalid(reason: string): { ok: false; error: PlatformError } {
  return {
    ok: false,
    error: createPlatformError("validation_failed", { safeDetails: { reason } }),
  };
}

type ScormPackageValidationDetails = {
  entryPoint?: string;
};

class ScormPackageValidationError extends Error {
  constructor(
    readonly reason: string,
    readonly details: ScormPackageValidationDetails = {},
  ) {
    super(reason);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cloneState(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return { ...DEFAULT_SCORM_STATE, cmi: {} };
  try {
    const cloned = structuredClone(value);
    return isRecord(cloned) ? cloned : { ...DEFAULT_SCORM_STATE, cmi: {} };
  } catch {
    return { ...DEFAULT_SCORM_STATE, cmi: {} };
  }
}

function pathSegments(path: string): string[] | null {
  if (path.length === 0 || path.length > MAX_PATH_LENGTH) return null;
  const segments = path.split(".");
  if (
    segments.length === 0 ||
    segments.length > 32 ||
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment.length > 128 ||
        UNSAFE_PATH_SEGMENTS.has(segment),
    )
  ) {
    return null;
  }
  return segments;
}

function setNestedValue(
  state: Record<string, unknown>,
  path: string,
  value: string,
): boolean {
  const segments = pathSegments(path);
  if (!segments) return false;
  let current: Record<string, unknown> = state;
  for (const segment of segments.slice(0, -1)) {
    const existing = current[segment];
    if (!isRecord(existing)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }
  current[segments[segments.length - 1]!] = value;
  return true;
}

async function loadScormLessonAccess(
  db: AppDb,
  input: ScormRuntimeInput,
  now: Date,
): Promise<
  { ok: true; value: ScormLessonAccess } | { ok: false; error: PlatformError }
> {
  const rows = await db
    .select({ lesson: schema.lessons, product: schema.products })
    .from(schema.lessons)
    .innerJoin(schema.products, eq(schema.products.id, schema.lessons.productId))
    .where(
      and(
        eq(schema.lessons.schoolId, input.schoolId),
        eq(schema.lessons.publicId, input.lessonPublicId),
        eq(schema.products.schoolId, input.schoolId),
        eq(schema.products.publicId, input.productPublicId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (
    row?.product.status !== "published" ||
    row.lesson.status !== "published" ||
    row.lesson.type !== "scorm"
  ) {
    return { ok: false, error: createPlatformError("not_found") };
  }

  const enrollments = await db
    .select({ enrollment: schema.enrollments, grant: schema.enrollmentAccessGrants })
    .from(schema.enrollments)
    .innerJoin(
      schema.enrollmentAccessGrants,
      eq(schema.enrollmentAccessGrants.enrollmentId, schema.enrollments.id),
    )
    .where(
      and(
        eq(schema.enrollments.schoolId, input.schoolId),
        eq(schema.enrollments.learnerId, input.learnerId),
        eq(schema.enrollments.productId, row.product.id),
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
  const enrollmentRow = enrollments[0];
  if (!enrollmentRow) {
    return { ok: false, error: createPlatformError("forbidden") };
  }

  const enrollmentStartedAt =
    enrollmentRow.enrollment.createdAt > enrollmentRow.grant.startsAt
      ? enrollmentRow.enrollment.createdAt
      : enrollmentRow.grant.startsAt;
  const sections = row.lesson.sectionId
    ? await db
        .select()
        .from(schema.productSections)
        .where(eq(schema.productSections.productId, row.product.id))
        .orderBy(asc(schema.productSections.position))
    : [];
  const section = sections.find((candidate) => candidate.id === row.lesson.sectionId);
  const sectionAvailableAt = section?.dripEnabled
    ? sectionUnlockAt(sections, section.id, enrollmentStartedAt)
    : null;
  const availableAt = latestUnlockAt(
    lessonUnlockAt(row.lesson, enrollmentStartedAt),
    sectionAvailableAt,
  );
  if (availableAt && availableAt > now) {
    return {
      ok: false,
      error: createPlatformError("forbidden", {
        safeDetails: {
          reason: "lesson_locked",
          availableAt: serializeDate(availableAt),
        },
      }),
    };
  }
  return {
    ok: true,
    value: {
      lesson: row.lesson,
      product: row.product,
      enrollment: enrollmentRow.enrollment,
    },
  };
}

export async function getScormRuntimeState(
  db: AppDb,
  input: ScormRuntimeInput,
  now: Date,
): Promise<
  { ok: true; value: ScormRuntimeStateDto } | { ok: false; error: PlatformError }
> {
  const access = await loadScormLessonAccess(db, input, now);
  if (!access.ok) return access;
  const rows = await db
    .select({ state: schema.scormRuntimeStates.state })
    .from(schema.scormRuntimeStates)
    .where(
      and(
        eq(schema.scormRuntimeStates.schoolId, input.schoolId),
        eq(schema.scormRuntimeStates.enrollmentId, access.value.enrollment.id),
        eq(schema.scormRuntimeStates.lessonId, access.value.lesson.id),
      ),
    )
    .limit(1);
  return { ok: true, value: cloneState(rows[0]?.state ?? DEFAULT_SCORM_STATE) };
}

export async function updateScormRuntimeState(
  db: AppDb,
  input: ScormRuntimeInput,
  updates: Record<string, string>,
  clock: Clock,
): Promise<
  { ok: true; value: ScormRuntimeStateDto } | { ok: false; error: PlatformError }
> {
  const updateEntries = Object.entries(updates);
  if (updateEntries.length === 0 || updateEntries.length > MAX_UPDATE_COUNT) {
    return invalid("invalid_update_count");
  }
  if (
    updateEntries.some(
      ([path, value]) => typeof value !== "string" || !pathSegments(path),
    )
  ) {
    return invalid("invalid_update_path");
  }

  const access = await loadScormLessonAccess(db, input, clock.now());
  if (!access.ok) return access;
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ state: schema.scormRuntimeStates.state })
      .from(schema.scormRuntimeStates)
      .where(
        and(
          eq(schema.scormRuntimeStates.schoolId, input.schoolId),
          eq(schema.scormRuntimeStates.enrollmentId, access.value.enrollment.id),
          eq(schema.scormRuntimeStates.lessonId, access.value.lesson.id),
        ),
      )
      .limit(1);
    const state = cloneState(rows[0]?.state ?? DEFAULT_SCORM_STATE);
    for (const [path, value] of updateEntries) {
      if (!setNestedValue(state, path, value)) return invalid("invalid_update_path");
    }
    if (JSON.stringify(state).length > MAX_STATE_BYTES) {
      return invalid("scorm_state_too_large");
    }
    const now = clock.now();
    if (rows[0]) {
      await tx
        .update(schema.scormRuntimeStates)
        .set({ state, updatedAt: now })
        .where(
          and(
            eq(schema.scormRuntimeStates.schoolId, input.schoolId),
            eq(schema.scormRuntimeStates.enrollmentId, access.value.enrollment.id),
            eq(schema.scormRuntimeStates.lessonId, access.value.lesson.id),
          ),
        );
    } else {
      await tx.insert(schema.scormRuntimeStates).values({
        id: uuidv7(clock),
        schoolId: input.schoolId,
        enrollmentId: access.value.enrollment.id,
        lessonId: access.value.lesson.id,
        state,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { ok: true as const, value: state };
  });
}

function attributeValue(attributes: string, name: string): string | null {
  const match = new RegExp(
    `(?:^|\\s)${name.replace(":", "\\:")}\\s*=\\s*[\\"']([^\\"']+)[\\"']`,
    "i",
  ).exec(attributes);
  return match?.[1] ?? null;
}

function safeManifestPath(value: string): string | null {
  if (
    !value ||
    value.includes("\\") ||
    value.startsWith("/") ||
    /^[a-zA-Z]:/.test(value)
  ) {
    return null;
  }
  const segments = value.split("/").filter(Boolean);
  if (
    segments.length === 0 ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    return null;
  }
  return segments.join("/");
}

export function parseScormManifest(bytes: Uint8Array): ScormPackageInfoDto {
  if (bytes.byteLength > MAX_PACKAGE_BYTES) throw new Error("scorm_package_too_large");
  const files = unzipSync(bytes);
  const fileNames = (Object.keys(files) as string[]).filter(
    (name) => name.length > 0 && !name.endsWith("/"),
  );
  const manifestName = fileNames.find(
    (name) => name.toLowerCase() === "imsmanifest.xml",
  );
  if (!manifestName) throw new Error("scorm_manifest_missing");
  const manifest = new TextDecoder().decode(files[manifestName]);
  const version: "1.2" | "2004" =
    /adlcp_v1p3|adlseq_v1p3|adlnav_v1p3|imsss|(?:schemaVersion|schemaversion)[^>]*>[^<]*2004/i.test(
      manifest,
    )
      ? "2004"
      : "1.2";
  const resourceById = new Map<string, { href: string; isSco: boolean }>();
  for (const match of manifest.matchAll(/<resource\b([^>]*)>/gi)) {
    const attributes = match[1] ?? "";
    const identifier = attributeValue(attributes, "identifier");
    const href = attributeValue(attributes, "href");
    if (!identifier || !href) continue;
    const scormType =
      attributeValue(attributes, "adlcp:scormtype") ??
      attributeValue(attributes, "adlcp:scormType") ??
      attributeValue(attributes, "scormtype") ??
      attributeValue(attributes, "scormType");
    resourceById.set(identifier, {
      href,
      isSco: scormType ? scormType.toLowerCase() !== "asset" : true,
    });
  }
  const scoResourceIds = new Set(
    [...resourceById.entries()]
      .filter(([, resource]) => resource.isSco)
      .map(([identifier]) => identifier),
  );
  const orderedLaunches: string[] = [];
  for (const match of manifest.matchAll(/<item\b([^>]*)>/gi)) {
    const identifierRef = attributeValue(match[1] ?? "", "identifierref");
    if (!identifierRef || !scoResourceIds.has(identifierRef)) continue;
    const resource = resourceById.get(identifierRef);
    if (resource) orderedLaunches.push(resource.href);
  }
  if (orderedLaunches.length === 0) {
    const firstResource = [...resourceById.values()].find((resource) => resource.isSco);
    if (firstResource) orderedLaunches.push(firstResource.href);
  }
  const entryPoint = safeManifestPath(orderedLaunches[0] ?? "");
  if (!entryPoint) throw new Error("scorm_entry_point_missing");
  if (!fileNames.some((name) => name.toLowerCase() === entryPoint.toLowerCase())) {
    throw new ScormPackageValidationError("scorm_entry_point_not_found", {
      entryPoint,
    });
  }
  const organizationTitle =
    /<organization\b[^>]*>[\s\S]*?<title\b[^>]*>([\s\S]*?)<\/title>/i
      .exec(manifest)?.[1]
      ?.replace(/<[^>]+>/g, "")
      .trim();
  return {
    version,
    title: organizationTitle || "Untitled SCORM Course",
    entryPoint,
    scoCount: orderedLaunches.length,
    fileCount: fileNames.length,
  };
}

export async function processScormPackage(
  db: AppDb,
  ctx: AdminContext,
  lessonPublicId: string,
  mediaPublicId: string,
  client: {
    getAsset(input: { schoolId: string; mediaLitId: string }): Promise<{
      canonicalUrl: string;
      byteSize: number;
    }>;
  },
  clock: Clock,
): Promise<
  { ok: true; value: ScormPackageInfoDto } | { ok: false; error: PlatformError }
> {
  if (!ctx.tenantId || !ctx.permissions.has("products:write")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const rows = await db
    .select({ lesson: schema.lessons, media: schema.media })
    .from(schema.lessons)
    .innerJoin(
      schema.media,
      and(
        eq(schema.media.publicId, mediaPublicId),
        eq(schema.media.schoolId, ctx.tenantId),
        eq(schema.media.status, "active"),
      ),
    )
    .where(
      and(
        eq(schema.lessons.publicId, lessonPublicId),
        eq(schema.lessons.schoolId, ctx.tenantId),
        eq(schema.lessons.type, "scorm"),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: createPlatformError("not_found") };
  if (row.media.kind === "image") {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "scorm_media_must_be_a_package" },
      }),
    };
  }
  try {
    const asset = await client.getAsset({
      schoolId: ctx.tenantId,
      mediaLitId: row.media.mediaLitId,
    });
    if (asset.byteSize > MAX_PACKAGE_BYTES) {
      return {
        ok: false,
        error: createPlatformError("validation_failed", {
          safeDetails: { reason: "scorm_package_too_large" },
        }),
      };
    }
    const response = await fetch(asset.canonicalUrl, { redirect: "follow" });
    if (!response.ok) throw new Error("scorm_package_fetch_failed");
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_PACKAGE_BYTES) throw new Error("scorm_package_too_large");
    const bytes = new Uint8Array(await response.arrayBuffer());
    const packageInfo = parseScormManifest(bytes);
    const now = clock.now();
    const content = {
      ...(row.lesson.content ?? {}),
      mediaId: row.media.publicId,
      launchUrl: packageInfo.entryPoint,
      title: packageInfo.title,
      version: packageInfo.version,
      scoCount: packageInfo.scoCount,
      fileCount: packageInfo.fileCount,
    };
    await db
      .update(schema.lessons)
      .set({ content, updatedAt: now })
      .where(eq(schema.lessons.id, row.lesson.id));
    return { ok: true, value: packageInfo };
  } catch (error) {
    const reason =
      error instanceof ScormPackageValidationError
        ? error.reason
        : error instanceof Error
          ? error.message
          : "scorm_package_invalid";
    const details =
      error instanceof ScormPackageValidationError ? error.details : undefined;
    if (reason === "scorm_package_too_large") {
      return {
        ok: false,
        error: createPlatformError("validation_failed", {
          safeDetails: { reason, ...details },
        }),
      };
    }
    if (
      reason === "scorm_manifest_missing" ||
      reason === "scorm_entry_point_missing" ||
      reason === "scorm_entry_point_not_found"
    ) {
      return {
        ok: false,
        error: createPlatformError("validation_failed", {
          safeDetails: { reason, ...details },
        }),
      };
    }
    return { ok: false, error: createPlatformError("internal_error") };
  }
}
