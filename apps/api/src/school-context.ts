import {
  type Clock,
  createPlatformError,
  type PlatformCredential,
  type PlatformError,
} from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  type CourseLitPermission,
  narrowToScopes,
  OWNER_PERMISSIONS,
  parsePermissions,
} from "./permissions.js";
import { isApiKeyExpired, loadActiveApiKey } from "./auth/api-keys.js";
import { loadSchoolByPublicId } from "./schools.js";
import type { AppDb } from "./types.js";

export type ResolvedSchool = {
  schoolId: string;
  publicId: string;
  schoolAccountId: string;
  schoolAccountPublicId: string;
  staffMembershipId: string;
  staffMembershipPublicId: string;
  isOwner: boolean;
  membershipVersion: number;
  directPermissions: readonly CourseLitPermission[];
  permissions: ReadonlySet<CourseLitPermission>;
};

type SchoolContextInput = {
  db: AppDb;
  principalId: string;
  credential: PlatformCredential;
  requestedPublicSchoolId: string | null;
  clock: Clock;
};

export async function resolveSchoolContext(
  input: SchoolContextInput,
): Promise<{ ok: true; value: ResolvedSchool } | { ok: false; error: PlatformError }> {
  const resolved = await resolveSchool(input);
  if (!resolved.ok || input.credential.kind !== "oauth") return resolved;
  return {
    ok: true,
    value: {
      ...resolved.value,
      permissions: narrowToScopes(
        resolved.value.permissions,
        input.credential.scopes ?? [],
      ),
    },
  };
}

async function resolveSchool(
  input: SchoolContextInput,
): Promise<{ ok: true; value: ResolvedSchool } | { ok: false; error: PlatformError }> {
  if (input.credential.kind === "api_key") {
    if (!input.credential.credentialId) {
      return { ok: false, error: createPlatformError("unauthenticated") };
    }
    const row = await loadActiveApiKey(input.db, { id: input.credential.credentialId });
    // A key is pinned to its school (X-School-ID is ignored) and carries
    // exactly its own stored permissions. It belongs to the school, so it
    // does not depend on the creator's membership; it acts through the
    // school owner's account but is never treated as the owner.
    if (!row || isApiKeyExpired(row.key.expiresAt, input.clock.now())) {
      return { ok: false, error: createPlatformError("unauthenticated") };
    }
    const permissions = parsePermissions(row.key.permissions);
    return {
      ok: true,
      value: {
        schoolId: row.school.id,
        publicId: row.school.publicId,
        schoolAccountId: row.ownerAccount.id,
        schoolAccountPublicId: row.ownerAccount.publicId,
        staffMembershipId: row.ownerMembership.id,
        staffMembershipPublicId: row.ownerMembership.publicId,
        isOwner: false,
        membershipVersion: row.ownerMembership.version,
        directPermissions: [...permissions],
        permissions,
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
      schoolAccount: schema.schoolAccounts,
    })
    .from(schema.memberships)
    .innerJoin(schema.schools, eq(schema.schools.id, schema.memberships.schoolId))
    .innerJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
    )
    .where(
      and(
        eq(schema.memberships.schoolId, schoolId),
        eq(schema.schoolAccounts.userId, principalId),
        eq(schema.schoolAccounts.status, "active"),
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
      schoolAccountId: row.schoolAccount.id,
      schoolAccountPublicId: row.schoolAccount.publicId,
      staffMembershipId: row.membership.id,
      staffMembershipPublicId: row.membership.publicId,
      isOwner: row.membership.isOwner,
      membershipVersion: row.membership.version,
      directPermissions: row.membership.permissions as CourseLitPermission[],
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
