import {
  createPlatformError,
  type PlatformCredential,
  type PlatformError,
} from "@codelitdev/platform";
import { and, eq, isNull } from "drizzle-orm";
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
  schoolAccountId: string;
  schoolAccountPublicId: string;
  staffMembershipId: string;
  staffMembershipPublicId: string;
  isOwner: boolean;
  membershipVersion: number;
  directPermissions: readonly CourseLitPermission[];
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
      .select({
        apiKey: schema.apiKeys,
        school: schema.schools,
        membership: schema.memberships,
        schoolAccount: schema.schoolAccounts,
      })
      .from(schema.apiKeys)
      .innerJoin(schema.schools, eq(schema.schools.id, schema.apiKeys.schoolId))
      .leftJoin(
        schema.memberships,
        eq(schema.memberships.id, schema.apiKeys.membershipId),
      )
      .leftJoin(
        schema.schoolAccounts,
        eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
      )
      .where(
        and(
          eq(schema.apiKeys.id, input.credential.credentialId),
          isNull(schema.apiKeys.revokedAt),
        ),
      )
      .limit(1);
    const row = keys[0];
    if (!row) {
      return { ok: false, error: createPlatformError("unauthenticated") };
    }
    if (row.apiKey.expiresAt && row.apiKey.expiresAt.valueOf() <= Date.now()) {
      return { ok: false, error: createPlatformError("unauthenticated") };
    }
    if (row.membership && row.schoolAccount) {
      if (row.schoolAccount.status !== "active") {
        return { ok: false, error: createPlatformError("tenant_forbidden") };
      }
      const memberEffective = row.membership.isOwner
        ? new Set(OWNER_PERMISSIONS)
        : parsePermissions(row.membership.permissions);
      const keyEffective = parsePermissions(row.apiKey.permissions);
      const intersected = new Set<CourseLitPermission>();
      for (const p of keyEffective) {
        if (memberEffective.has(p)) intersected.add(p);
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
          isOwner: false,
          membershipVersion: row.membership.version,
          directPermissions: row.apiKey.permissions as CourseLitPermission[],
          permissions: intersected,
        },
      };
    }
    return {
      ok: true,
      value: {
        schoolId: row.school.id,
        publicId: row.school.publicId,
        schoolAccountId: row.apiKey.createdBySchoolAccountId ?? "",
        schoolAccountPublicId: "",
        staffMembershipId: row.apiKey.membershipId ?? "",
        staffMembershipPublicId: "",
        isOwner: false,
        membershipVersion: 1,
        directPermissions: row.apiKey.permissions as CourseLitPermission[],
        permissions: parsePermissions(row.apiKey.permissions),
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
