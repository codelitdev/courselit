import {
  createPlatformError,
  type PlatformCredential,
  type PlatformError,
} from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  type CourseLitPermission,
  OWNER_PERMISSIONS,
  parsePermissions,
} from "./permissions.js";
import { loadSchoolByPublicId } from "./schools.js";
import type { AppDb } from "./types.js";

export type ResolvedSchool = {
  schoolId: string;
  publicId: string;
  permissions: ReadonlySet<CourseLitPermission>;
};

export async function resolveSchoolContext(input: {
  db: AppDb;
  principalId: string;
  credential: PlatformCredential;
  requestedPublicSchoolId: string | null;
}): Promise<{ ok: true; value: ResolvedSchool } | { ok: false; error: PlatformError }> {
  if (input.credential.kind === "api_key") {
    if (!input.credential.credentialId) {
      return { ok: false, error: createPlatformError("unauthenticated") };
    }
    const keys = await input.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.id, input.credential.credentialId))
      .limit(1);
    const key = keys[0];
    if (!key) {
      return { ok: false, error: createPlatformError("unauthenticated") };
    }
    const schools = await input.db
      .select()
      .from(schema.schools)
      .where(eq(schema.schools.id, key.schoolId))
      .limit(1);
    const school = schools[0];
    if (!school) {
      return { ok: false, error: createPlatformError("tenant_forbidden") };
    }
    return {
      ok: true,
      value: {
        schoolId: school.id,
        publicId: school.publicId,
        permissions: parsePermissions(key.permissions),
      },
    };
  }
  if (!input.requestedPublicSchoolId) {
    const selected = await input.db
      .select()
      .from(schema.selectedSchools)
      .where(eq(schema.selectedSchools.userId, input.principalId))
      .limit(1);
    if (!selected[0]) {
      return { ok: false, error: createPlatformError("tenant_required") };
    }
    return loadMembership(input.db, input.principalId, selected[0].schoolId);
  }
  const school = await loadSchoolByPublicId(input.db, input.requestedPublicSchoolId);
  if (!school) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }
  return loadMembership(input.db, input.principalId, school.id);
}

async function loadMembership(
  db: AppDb,
  principalId: string,
  schoolId: string,
): Promise<{ ok: true; value: ResolvedSchool } | { ok: false; error: PlatformError }> {
  const rows = await db
    .select({
      membership: schema.memberships,
      school: schema.schools,
    })
    .from(schema.memberships)
    .innerJoin(schema.schools, eq(schema.schools.id, schema.memberships.schoolId))
    .where(
      and(
        eq(schema.memberships.schoolId, schoolId),
        eq(schema.memberships.userId, principalId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }
  return {
    ok: true,
    value: {
      schoolId: row.school.id,
      publicId: row.school.publicId,
      // Ownership is the stable authorization invariant. Older databases may
      // contain owner rows written before newer capabilities (such as the
      // MediaLit permissions) were added to the permission catalog.
      permissions: row.membership.isOwner
        ? new Set(OWNER_PERMISSIONS)
        : parsePermissions(row.membership.permissions),
    },
  };
}

export function headerSchoolId(
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const raw =
    headers["x-school-id"] ??
    headers["X-School-ID"] ??
    headers["x-tenant-id"] ??
    headers["X-Tenant-ID"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && value.trim().length > 0 ? value.trim() : null;
}
