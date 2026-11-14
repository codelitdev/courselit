import { createPlatformError, type PlatformError } from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { type Billing, schoolHasFeature } from "./plan-features.js";
import { SCORM_FEATURE } from "./school-plan.js";
import type { AppDb } from "./types.js";

/**
 * Which lesson changes need SCORM on the plan (docs/wip/plan-limits.md,
 * section 4): adding a SCORM lesson, and uploading or replacing a lesson's
 * package. Existing SCORM lessons keep playing, and their title, status and
 * other settings can still change.
 */
export type ScormChange =
  | { kind: "create"; type: string }
  | { kind: "process_package" }
  | { kind: "update"; lessonType: string | null; mediaId?: unknown; content?: unknown };

export function scormChangeNeedsPlan(change: ScormChange): boolean {
  switch (change.kind) {
    case "create":
      return change.type === "scorm";
    case "process_package":
      return true;
    case "update":
      return (
        change.lessonType === "scorm" &&
        (change.mediaId !== undefined || change.content !== undefined)
      );
  }
}

/** Refuses a SCORM change the school's plan doesn't include; null when allowed. */
export async function scormPlanError(
  deps: { db: AppDb; billing: Billing; now: Date },
  schoolInternalId: string,
  change: ScormChange,
): Promise<PlatformError | null> {
  if (!scormChangeNeedsPlan(change)) return null;
  if (
    await schoolHasFeature(
      deps.billing,
      schoolInternalId,
      SCORM_FEATURE,
      deps.db,
      deps.now,
    )
  ) {
    return null;
  }
  return createPlatformError("forbidden", { safeDetails: { reason: "plan_required" } });
}

/** A lesson's type, or null when the school has no such lesson. */
export async function lessonType(
  db: AppDb,
  schoolInternalId: string,
  lessonPublicId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ type: schema.lessons.type })
    .from(schema.lessons)
    .where(
      and(
        eq(schema.lessons.schoolId, schoolInternalId),
        eq(schema.lessons.publicId, lessonPublicId),
      ),
    )
    .limit(1);
  return row?.type ?? null;
}
