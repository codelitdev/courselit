import {
  computeEffectiveCourseLitPermissions,
  normalizeCourseLitPermissions,
  filterDelegableCourseLitPermissions,
  COURSELIT_PERMISSIONS,
  type CourseLitPermission,
} from "@courselit/api-contract/team-permissions";
import {
  type Clock,
  createPlatformError,
  serializeDate,
  type PlatformError,
  type PlatformRequestContext,
  uuidv7,
} from "@codelitdev/platform";
import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { parsePermissions } from "./permissions.js";
import type { AppDb } from "./types.js";

type Ctx = PlatformRequestContext<string, string, CourseLitPermission>;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function memberIdentifierCondition(identifier: string) {
  return UUID_REGEX.test(identifier)
    ? or(
        eq(schema.memberships.id, identifier),
        eq(schema.memberships.publicId, identifier),
        eq(schema.schoolAccounts.userId, identifier),
      )
    : or(
        eq(schema.memberships.publicId, identifier),
        eq(schema.schoolAccounts.userId, identifier),
      );
}

export type SchoolTeamMemberDto = {
  id: string;
  membershipId?: string;
  schoolAccountId?: string;
  name: string;
  email: string;
  image: string | null;
  isOwner: boolean;
  permissions: CourseLitPermission[];
  effectivePermissions?: CourseLitPermission[];
  presetId?: string | null;
  version?: number;
  createdAt: string;
  updatedAt?: string;
};

export type SchoolTeamInvitationDto = {
  invitationId: string;
  email: string;
  permissions: CourseLitPermission[];
  expiresAt: string;
  createdAt: string;
};

export type SchoolTeamDto = {
  members: SchoolTeamMemberDto[];
  invitations: SchoolTeamInvitationDto[];
  viewer: SchoolTeamMemberDto;
};

export async function listSchoolTeam(
  db: AppDb,
  ctx: Ctx,
): Promise<{ ok: true; value: SchoolTeamDto } | { ok: false; error: PlatformError }> {
  if (!ctx.tenantId || !ctx.permissions.has("members:read")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }

  const members = await db
    .select({
      membership: schema.memberships,
      schoolAccount: schema.schoolAccounts,
      userName: schema.user.name,
      userEmail: schema.user.email,
      userImage: schema.user.image,
    })
    .from(schema.memberships)
    .innerJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
    )
    .leftJoin(schema.user, eq(schema.user.id, schema.schoolAccounts.userId))
    .where(eq(schema.memberships.schoolId, ctx.tenantId))
    .orderBy(asc(schema.schoolAccounts.displayName), asc(schema.schoolAccounts.email));

  const invitations = await db
    .select()
    .from(schema.invitations)
    .where(
      and(
        eq(schema.invitations.schoolId, ctx.tenantId),
        eq(schema.invitations.status, "pending"),
        isNull(schema.invitations.acceptedAt),
        isNull(schema.invitations.revokedAt),
      ),
    )
    .orderBy(desc(schema.invitations.createdAt));

  const viewerRow = members.find(
    (row) => row.schoolAccount.userId === ctx.principalId,
  );
  if (!viewerRow) return { ok: false, error: createPlatformError("forbidden") };

  const toMember = (row: (typeof members)[number]): SchoolTeamMemberDto => {
    const effective = row.membership.isOwner
      ? [...COURSELIT_PERMISSIONS]
      : [...parsePermissions(row.membership.permissions)];
    return {
      id: row.membership.publicId,
      membershipId: row.membership.publicId,
      schoolAccountId: row.schoolAccount.publicId,
      name: row.schoolAccount.displayName || row.userName || "",
      email: row.schoolAccount.email || row.userEmail || "",
      image: row.schoolAccount.avatar?.url || row.userImage || null,
      isOwner: row.membership.isOwner,
      permissions: effective,
      effectivePermissions: effective,
      presetId: row.membership.presetId,
      version: row.membership.version,
      createdAt: serializeDate(row.membership.createdAt),
      updatedAt: serializeDate(row.membership.updatedAt),
    };
  };

  return {
    ok: true,
    value: {
      members: members.map(toMember),
      invitations: invitations.map((invitation) => ({
        invitationId: invitation.publicId,
        email: invitation.email,
        permissions: [...parsePermissions(invitation.permissions)],
        expiresAt: serializeDate(invitation.expiresAt),
        createdAt: serializeDate(invitation.createdAt),
      })),
      viewer: toMember(viewerRow),
    },
  };
}

export async function updateSchoolTeamMember(
  db: AppDb,
  ctx: Ctx,
  memberIdentifier: string,
  permissions: readonly CourseLitPermission[],
  clock: Clock,
  expectedVersion?: number,
): Promise<
  | { ok: true; value: SchoolTeamMemberDto }
  | { ok: false; error: PlatformError }
> {
  if (!ctx.permissions.has("members:manage") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }

  const proposed = normalizeCourseLitPermissions(permissions);
  const proposedEffective = computeEffectiveCourseLitPermissions(proposed);

  return db.transaction(async (tx) => {
    // Serialize membership administration with removals and ownership checks.
    await tx.execute(sql`SELECT id FROM schools WHERE id = ${ctx.tenantId} FOR UPDATE`);

    const actorRows = await tx
      .select({
        membership: schema.memberships,
        schoolAccount: schema.schoolAccounts,
      })
      .from(schema.memberships)
      .innerJoin(
        schema.schoolAccounts,
        eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
      )
      .where(
        and(
          eq(schema.memberships.schoolId, ctx.tenantId!),
          eq(schema.schoolAccounts.userId, ctx.principalId),
        ),
      )
      .limit(1);
    const actor = actorRows[0];
    if (!actor) return { ok: false as const, error: createPlatformError("forbidden") };

    const targetRows = await tx
      .select({
        membership: schema.memberships,
        schoolAccount: schema.schoolAccounts,
      })
      .from(schema.memberships)
      .innerJoin(
        schema.schoolAccounts,
        eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
      )
      .where(
        and(
          eq(schema.memberships.schoolId, ctx.tenantId!),
          memberIdentifierCondition(memberIdentifier),
        ),
      )
      .limit(1);
    const target = targetRows[0];
    if (!target) return { ok: false as const, error: createPlatformError("not_found") };

    if (target.membership.isOwner || target.schoolAccount.userId === ctx.principalId) {
      return { ok: false as const, error: createPlatformError("forbidden") };
    }

    if (
      expectedVersion !== undefined &&
      target.membership.version !== expectedVersion
    ) {
      return {
        ok: false as const,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "version_conflict" },
        }),
      };
    }

    if (!actor.membership.isOwner) {
      const actorEffective = computeEffectiveCourseLitPermissions(actor.membership.permissions);
      const delegable = new Set(filterDelegableCourseLitPermissions(actorEffective, false));
      const targetEffective = computeEffectiveCourseLitPermissions(target.membership.permissions);

      if (
        targetEffective.some((p) => !delegable.has(p)) ||
        proposedEffective.some((p) => !delegable.has(p))
      ) {
        return { ok: false as const, error: createPlatformError("forbidden") };
      }
    }

    const versionQuery = expectedVersion !== undefined
      ? and(
          eq(schema.memberships.id, target.membership.id),
          eq(schema.memberships.version, expectedVersion),
        )
      : eq(schema.memberships.id, target.membership.id);

    const [updated] = await tx
      .update(schema.memberships)
      .set({
        permissions: proposed,
        version: target.membership.version + 1,
        updatedAt: clock.now(),
      })
      .where(versionQuery)
      .returning();

    if (!updated) {
      return {
        ok: false as const,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "version_conflict" },
        }),
      };
    }

    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "member.permissions_changed",
      resourceType: "membership",
      resourceId: updated.publicId,
      requestId: ctx.requestId,
      createdAt: clock.now(),
    });

    const effective = computeEffectiveCourseLitPermissions(updated.permissions);
    return {
      ok: true as const,
      value: {
        id: updated.publicId,
        membershipId: updated.publicId,
        schoolAccountId: target.schoolAccount.publicId,
        name: target.schoolAccount.displayName || "",
        email: target.schoolAccount.email || "",
        image: target.schoolAccount.avatar?.url || null,
        isOwner: updated.isOwner,
        permissions: effective,
        effectivePermissions: effective,
        presetId: updated.presetId,
        version: updated.version,
        createdAt: serializeDate(updated.createdAt),
        updatedAt: serializeDate(updated.updatedAt),
      },
    };
  });
}

export async function removeSchoolTeamMember(
  db: AppDb,
  ctx: Ctx,
  memberIdentifier: string,
  clock: Clock,
): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  if (!ctx.permissions.has("members:manage") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM schools WHERE id = ${ctx.tenantId} FOR UPDATE`);

    const actorRows = await tx
      .select({
        membership: schema.memberships,
        schoolAccount: schema.schoolAccounts,
      })
      .from(schema.memberships)
      .innerJoin(
        schema.schoolAccounts,
        eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
      )
      .where(
        and(
          eq(schema.memberships.schoolId, ctx.tenantId!),
          eq(schema.schoolAccounts.userId, ctx.principalId),
        ),
      )
      .limit(1);
    const actor = actorRows[0];
    if (!actor) return { ok: false as const, error: createPlatformError("forbidden") };

    const targetRows = await tx
      .select({
        membership: schema.memberships,
        schoolAccount: schema.schoolAccounts,
      })
      .from(schema.memberships)
      .innerJoin(
        schema.schoolAccounts,
        eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
      )
      .where(
        and(
          eq(schema.memberships.schoolId, ctx.tenantId!),
          memberIdentifierCondition(memberIdentifier),
        ),
      )
      .limit(1);
    const target = targetRows[0];
    if (!target) {
      return { ok: false as const, error: createPlatformError("not_found") };
    }

    if (target.membership.isOwner) {
      return {
        ok: false as const,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "owner_cannot_be_removed" },
        }),
      };
    }

    if (!actor.membership.isOwner) {
      const actorEffective = computeEffectiveCourseLitPermissions(actor.membership.permissions);
      const delegable = new Set(filterDelegableCourseLitPermissions(actorEffective, false));
      const targetEffective = computeEffectiveCourseLitPermissions(target.membership.permissions);
      if (targetEffective.some((p) => !delegable.has(p))) {
        return { ok: false as const, error: createPlatformError("forbidden") };
      }
    }

    await tx.delete(schema.memberships).where(eq(schema.memberships.id, target.membership.id));

    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "membership.removed",
      resourceType: "membership",
      resourceId: target.membership.publicId,
      requestId: ctx.requestId,
      createdAt: clock.now(),
    });

    return { ok: true as const };
  });
}

export async function leaveSchoolTeam(
  db: AppDb,
  ctx: Ctx,
  clock: Clock,
): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  if (!ctx.tenantId) {
    return { ok: false, error: createPlatformError("unauthenticated") };
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM schools WHERE id = ${ctx.tenantId} FOR UPDATE`);

    const actorRows = await tx
      .select({
        membership: schema.memberships,
        schoolAccount: schema.schoolAccounts,
      })
      .from(schema.memberships)
      .innerJoin(
        schema.schoolAccounts,
        eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
      )
      .where(
        and(
          eq(schema.memberships.schoolId, ctx.tenantId!),
          eq(schema.schoolAccounts.userId, ctx.principalId),
        ),
      )
      .limit(1);
    const actor = actorRows[0];
    if (!actor) return { ok: false as const, error: createPlatformError("forbidden") };

    if (actor.membership.isOwner) {
      return {
        ok: false as const,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "sole_owner" },
        }),
      };
    }

    await tx.delete(schema.memberships).where(eq(schema.memberships.id, actor.membership.id));

    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "membership.left",
      resourceType: "membership",
      resourceId: actor.membership.publicId,
      requestId: ctx.requestId,
      createdAt: clock.now(),
    });

    return { ok: true as const };
  });
}

export async function transferSchoolOwnership(
  db: AppDb,
  ctx: Ctx,
  targetMembershipIdentifier: string,
  clock: Clock,
  postTransferPermissions: readonly CourseLitPermission[] = [],
): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  const schoolId = ctx.tenantId;
  if (!schoolId) {
    return { ok: false, error: createPlatformError("unauthenticated") };
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM schools WHERE id = ${schoolId} FOR UPDATE`);

    const ownerRows = await tx
      .select({
        membership: schema.memberships,
        schoolAccount: schema.schoolAccounts,
      })
      .from(schema.memberships)
      .innerJoin(
        schema.schoolAccounts,
        eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
      )
      .where(
        and(
          eq(schema.memberships.schoolId, ctx.tenantId!),
          eq(schema.schoolAccounts.userId, ctx.principalId),
        ),
      )
      .limit(1);
    const currentOwner = ownerRows[0];
    if (!currentOwner || !currentOwner.membership.isOwner) {
      return { ok: false as const, error: createPlatformError("forbidden") };
    }

    const targetRows = await tx
      .select({
        membership: schema.memberships,
        schoolAccount: schema.schoolAccounts,
      })
      .from(schema.memberships)
      .innerJoin(
        schema.schoolAccounts,
        eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
      )
      .where(
        and(
          eq(schema.memberships.schoolId, ctx.tenantId!),
          memberIdentifierCondition(targetMembershipIdentifier),
        ),
      )
      .limit(1);
    const target = targetRows[0];
    if (!target) {
      return { ok: false as const, error: createPlatformError("not_found") };
    }

    if (target.membership.id === currentOwner.membership.id || target.membership.isOwner) {
      return {
        ok: false as const,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "already_owner" },
        }),
      };
    }

    const now = clock.now();

    // 1. Demote current owner to non-owner with postTransferPermissions
    await tx
      .update(schema.memberships)
      .set({
        isOwner: false,
        permissions: normalizeCourseLitPermissions(postTransferPermissions),
        presetId: "custom",
        version: currentOwner.membership.version + 1,
        updatedAt: now,
      })
      .where(eq(schema.memberships.id, currentOwner.membership.id));

    // 2. Promote target to owner
    await tx
      .update(schema.memberships)
      .set({
        isOwner: true,
        permissions: [],
        presetId: "full_access",
        version: target.membership.version + 1,
        updatedAt: now,
      })
      .where(eq(schema.memberships.id, target.membership.id));

    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId,
      actorId: ctx.principalId,
      action: "school.ownership_transferred",
      resourceType: "school",
      resourceId: schoolId,
      requestId: ctx.requestId,
      createdAt: now,
    });

    return { ok: true as const };
  });
}
