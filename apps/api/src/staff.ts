import { type Clock, uuidv7 } from "@codelitdev/platform";
import { eq, or } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { enqueuePlanFeatureSync } from "./plan-features.js";
import { createSchool } from "./schools.js";
import type { AppDb } from "./types.js";

/**
 * Platform-staff actions (docs/wip/plan-limits.md, S26). They are run from the
 * staff CLI on the API server, never from a request: no school permission, API
 * key or MCP tool can reach them. Each one is recorded in
 * `platform_audit_events`, which outlives the school.
 */
export type StaffResult = { ok: true; message: string } | { ok: false; error: string };

async function findSchool(db: AppDb, ref: string) {
  const [school] = await db
    .select()
    .from(schema.schools)
    .where(or(eq(schema.schools.subdomain, ref), eq(schema.schools.publicId, ref)))
    .limit(1);
  return school ?? null;
}

async function audit(
  db: AppDb,
  clock: Clock,
  input: { actor: string; command: string; schoolId: string | null; subdomain: string | null; reason?: string },
) {
  await db.insert(schema.platformAuditEvents).values({
    id: uuidv7(clock),
    actor: input.actor,
    command: input.command,
    schoolId: input.schoolId,
    schoolSubdomain: input.subdomain,
    reason: input.reason ?? null,
    createdAt: clock.now(),
  });
}

function requireActor(actor: string | undefined): string | null {
  const trimmed = actor?.trim();
  return trimmed ? trimmed : null;
}

/** Takes a school offline straight away: storefront, learners and email. */
export async function suspendSchool(
  db: AppDb,
  clock: Clock,
  input: { school: string; reason: string; actor: string },
): Promise<StaffResult> {
  const actor = requireActor(input.actor);
  if (!actor) return { ok: false, error: "actor_required" };
  if (!input.reason.trim()) return { ok: false, error: "reason_required" };
  const school = await findSchool(db, input.school);
  if (!school || school.status === "deleted") return { ok: false, error: "school_not_found" };
  if (school.status === "suspended") return { ok: false, error: "already_suspended" };
  await db
    .update(schema.schools)
    .set({ status: "suspended", suspendedReason: input.reason.trim(), updatedAt: clock.now() })
    .where(eq(schema.schools.id, school.id));
  // The plan sync sets its SendLit marketing quota to 0.
  await enqueuePlanFeatureSync(db, school.id, clock);
  await audit(db, clock, {
    actor,
    command: "suspend",
    schoolId: school.id,
    subdomain: school.subdomain,
    reason: input.reason.trim(),
  });
  return { ok: true, message: `Suspended ${school.subdomain}.` };
}

/** Lifts a suspension. The lifecycle job then puts the school in the state its plan calls for. */
export async function unsuspendSchool(
  db: AppDb,
  clock: Clock,
  input: { school: string; actor: string; reason?: string },
): Promise<StaffResult> {
  const actor = requireActor(input.actor);
  if (!actor) return { ok: false, error: "actor_required" };
  const school = await findSchool(db, input.school);
  if (!school || school.status !== "suspended") return { ok: false, error: "school_not_suspended" };
  await db
    .update(schema.schools)
    .set({ status: "active", suspendedReason: null, updatedAt: clock.now() })
    .where(eq(schema.schools.id, school.id));
  await enqueuePlanFeatureSync(db, school.id, clock);
  await audit(db, clock, {
    actor,
    command: "unsuspend",
    schoolId: school.id,
    subdomain: school.subdomain,
    reason: input.reason,
  });
  return { ok: true, message: `Unsuspended ${school.subdomain}.` };
}

/**
 * Creates a school for a customer moving over from `main` by hand. It starts
 * `imported`: offline, with no trial (the owner's trial isn't used), until the
 * owner's first checkout. The owner must have signed in to CourseLit once.
 */
export async function importSchool(
  db: AppDb,
  clock: Clock,
  input: {
    ownerEmail: string;
    name: string;
    subdomain: string;
    mainSchool: string;
    actor: string;
    currency?: string;
    locale?: string;
  },
): Promise<StaffResult> {
  const actor = requireActor(input.actor);
  if (!actor) return { ok: false, error: "actor_required" };
  const [owner] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, input.ownerEmail.trim().toLowerCase()))
    .limit(1);
  if (!owner) return { ok: false, error: "owner_must_sign_in_first" };
  const created = await createSchool(
    db,
    {
      name: input.name,
      subdomain: input.subdomain,
      locale: input.locale ?? "en",
      currency: input.currency ?? "USD",
      principalId: owner.id,
      requestId: `staff-import-${uuidv7(clock)}`,
    },
    clock,
  );
  if (!created.ok) return { ok: false, error: String(created.error.safeDetails?.reason ?? created.error.code) };
  const school = await findSchool(db, created.value.id);
  await db
    .update(schema.schools)
    .set({ status: "imported", updatedAt: clock.now() })
    .where(eq(schema.schools.id, school!.id));
  await audit(db, clock, {
    actor,
    command: "import-school",
    schoolId: school!.id,
    subdomain: school!.subdomain,
    reason: `main school ${input.mainSchool}`,
  });
  return {
    ok: true,
    message: `Created imported school ${school!.subdomain} (${created.value.id}). Run the content importers for main school ${input.mainSchool} next.`,
  };
}

/** Removes an imported school that never went live. */
export async function removeImportedSchool(
  db: AppDb,
  clock: Clock,
  input: { school: string; actor: string; reason?: string },
): Promise<StaffResult> {
  const actor = requireActor(input.actor);
  if (!actor) return { ok: false, error: "actor_required" };
  const school = await findSchool(db, input.school);
  if (!school || school.status !== "imported") return { ok: false, error: "school_not_imported" };
  await db
    .update(schema.schools)
    .set({ status: "deleted", updatedAt: clock.now() })
    .where(eq(schema.schools.id, school.id));
  await audit(db, clock, {
    actor,
    command: "remove-imported",
    schoolId: school.id,
    subdomain: school.subdomain,
    reason: input.reason,
  });
  return { ok: true, message: `Removed imported school ${school.subdomain}.` };
}
