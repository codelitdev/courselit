/**
 * Lesson pages on the server (docs/wip/lesson-pages.md, sections 4.3, 6, 7):
 * which blocks a school may add now, the media a page references, and how
 * content diagnostics become API errors. The format itself lives in
 * `@courselit/lesson-content`.
 */
import { createPlatformError, type PlatformError } from "@codelitdev/platform";
import {
  type Diagnostic,
  LESSON_MEDIA_ACCEPT,
  type LessonMediaUse,
  mediaMatchesAcceptedTypes,
} from "@courselit/lesson-content";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { type Billing, schoolHasFeature } from "./plan-features.js";
import { CODE_INJECTION_FEATURE } from "./school-plan.js";
import type { AppDb } from "./types.js";

export type LessonType = "page" | "scorm" | "file";
export type ProductKind = "course" | "download";

/**
 * Block name → the plan feature it needs (section 6). Embed is custom code
 * running in the school's lessons, so it follows code injection: a trial
 * doesn't have it (L4); self-hosted installs have every feature.
 */
export const LESSON_BLOCK_FEATURES: Readonly<Record<string, string>> = {
  embed: CODE_INJECTION_FEATURE,
};

/**
 * The `unavailable` list for the editor and the validator: each block whose
 * feature the plan lacks, with `trial` while the school is on its trial and
 * `plan_required` otherwise.
 */
export function unavailableLessonBlocks(
  hasFeature: (feature: string) => boolean,
  onTrial: boolean,
): Record<string, string> {
  const unavailable: Record<string, string> = {};
  for (const [block, feature] of Object.entries(LESSON_BLOCK_FEATURES)) {
    if (!hasFeature(feature)) unavailable[block] = onTrial ? "trial" : "plan_required";
  }
  return unavailable;
}

/** The school's unavailable lesson blocks, read from its plan. */
export async function lessonBlockAvailability(
  deps: { db: AppDb; billing: Billing; now: Date },
  schoolInternalId: string,
): Promise<Record<string, string>> {
  const features = new Set<string>();
  for (const feature of new Set(Object.values(LESSON_BLOCK_FEATURES))) {
    if (
      await schoolHasFeature(deps.billing, schoolInternalId, feature, deps.db, deps.now)
    ) {
      features.add(feature);
    }
  }
  if (features.size === new Set(Object.values(LESSON_BLOCK_FEATURES)).size) return {};
  const [trial] = await deps.db
    .select({ id: schema.schoolTrials.id })
    .from(schema.schoolTrials)
    .where(
      and(
        eq(schema.schoolTrials.schoolId, schoolInternalId),
        isNull(schema.schoolTrials.endedAt),
        gt(schema.schoolTrials.endsAt, deps.now),
      ),
    )
    .limit(1);
  return unavailableLessonBlocks((feature) => features.has(feature), Boolean(trial));
}

/** Course products take pages and SCORM; download products take files only (section 7). */
export function lessonTypeAllowed(kind: ProductKind, type: LessonType): boolean {
  return kind === "download" ? type === "file" : type === "page" || type === "scorm";
}

export function lessonValidationError(
  reason: string,
  extra: Record<string, string> = {},
) {
  return {
    ok: false as const,
    error: createPlatformError("validation_failed", {
      safeDetails: { reason, ...extra },
    }),
  };
}

const MAX_REPORTED_DIAGNOSTICS = 20;

/**
 * Content diagnostics as an API error (section 4.3). Error details are flat,
 * so the first diagnostic is spread out and every diagnostic (up to 20) is
 * in `diagnostics` as JSON. Adding a block the school may not add now is
 * `forbidden` with `plan_required` (section 6), and says why (`trial`).
 */
export function lessonContentError(diagnostics: Diagnostic[]): PlatformError {
  const first = diagnostics[0];
  const located = (item: Diagnostic) => ({
    code: item.code,
    message: item.message,
    ...(item.fieldPath ? { fieldPath: item.fieldPath } : {}),
    ...(item.line ? { line: item.line, column: item.column ?? 1 } : {}),
    ...(item.reason ? { reason: item.reason } : {}),
  });
  if (first && diagnostics.every((item) => item.code === "block_unavailable")) {
    return createPlatformError("forbidden", {
      safeDetails: {
        reason: "plan_required",
        blockReason: first.reason ?? "plan_required",
        message: first.message,
        fieldPath: first.fieldPath ?? null,
      },
    });
  }
  return createPlatformError("validation_failed", {
    safeDetails: {
      reason: "lesson_content_invalid",
      diagnosticCount: diagnostics.length,
      code: first?.code ?? "invalid_document",
      message: first?.message ?? "Content is invalid.",
      fieldPath: first?.fieldPath ?? null,
      line: first?.line ?? null,
      column: first?.line ? (first.column ?? 1) : null,
      diagnostics: JSON.stringify(
        diagnostics.slice(0, MAX_REPORTED_DIAGNOSTICS).map(located),
      ),
    },
  });
}

/**
 * Checks every media ID a page uses (L5): it belongs to the school, is
 * active, and matches its block's MIME family. Returns the media IDs to
 * record in `media_references`, each once.
 */
export async function checkLessonMedia(
  db: AppDb,
  schoolInternalId: string,
  uses: readonly LessonMediaUse[],
): Promise<{ ok: true; mediaIds: string[] } | { ok: false; error: PlatformError }> {
  const ids = [...new Set(uses.map((use) => use.mediaId))];
  if (ids.length > 100) return lessonValidationError("too_many_media_references");
  if (!ids.length) return { ok: true, mediaIds: [] };
  const rows = await db
    .select({
      publicId: schema.media.publicId,
      fileName: schema.media.fileName,
      mimeType: schema.media.mimeType,
    })
    .from(schema.media)
    .where(
      and(
        eq(schema.media.schoolId, schoolInternalId),
        eq(schema.media.status, "active"),
        inArray(schema.media.publicId, ids),
      ),
    );
  const byId = new Map(rows.map((row) => [row.publicId, row]));
  for (const use of uses) {
    const media = byId.get(use.mediaId);
    if (!media) {
      return lessonValidationError("lesson_media_not_found", { fieldPath: use.path });
    }
    const accepted = LESSON_MEDIA_ACCEPT[use.block];
    if (!accepted || !mediaMatchesAcceptedTypes(media, accepted)) {
      return lessonValidationError("lesson_media_type_mismatch", {
        fieldPath: use.path,
      });
    }
  }
  return { ok: true, mediaIds: ids };
}
