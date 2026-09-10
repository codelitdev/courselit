import {
  computeEffectiveCourseLitPermissions,
  normalizeCourseLitPermissions,
} from "@courselit/api-contract/team-permissions";
import {
  type Clock,
  createPlatformError,
  serializeDate,
  type PlatformError,
  type PlatformRequestContext,
  uuidv7,
} from "@codelitdev/platform";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  type CourseLitPermission,
  OWNER_PERMISSIONS,
  parsePermissions,
  serializePermissions,
} from "./permissions.js";
import type { AppDb } from "./types.js";

type Ctx = PlatformRequestContext<string, string, CourseLitPermission>;

export type SchoolTeamDto = {
  members: Array<{
    id: string;
    name: string;
    email: string;
    image: string | null;
    isOwner: boolean;
    permissions: CourseLitPermission[];
    createdAt: string;
  }>;
  invitations: Array<{
    invitationId: string;
    email: string;
    permissions: CourseLitPermission[];
    expiresAt: string;
    createdAt: string;
  }>;
  viewer: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    isOwner: boolean;
    permissions: CourseLitPermission[];
    createdAt: string;
  };
};

export async function listSchoolTeam(
  db: AppDb,
  ctx: Ctx,
): Promise<{ ok: true; value: SchoolTeamDto } | { ok: false; error: PlatformError }> {
  if (
    !ctx.tenantId ||
    (!ctx.permissions.has("school:admin") && !ctx.permissions.has("members:read"))
  ) {
    return { ok: false, error: createPlatformError("forbidden") };
  }

  const members = await db
    .select({
      membership: schema.memberships,
      userId: schema.user.id,
      userName: schema.user.name,
      userEmail: schema.user.email,
      userImage: schema.user.image,
    })
    .from(schema.memberships)
    .innerJoin(schema.user, eq(schema.user.id, schema.memberships.userId))
    .where(eq(schema.memberships.schoolId, ctx.tenantId))
    .orderBy(asc(schema.user.name), asc(schema.user.email));

  const invitations = await db
    .select()
    .from(schema.invitations)
    .where(
      and(
        eq(schema.invitations.schoolId, ctx.tenantId),
        isNull(schema.invitations.acceptedAt),
        isNull(schema.invitations.revokedAt),
      ),
    )
    .orderBy(desc(schema.invitations.createdAt));

  const viewer = members.find((row) => row.userId === ctx.principalId);
  if (!viewer) return { ok: false, error: createPlatformError("forbidden") };

  const toMember = (row: (typeof members)[number]) => ({
    id: row.userId,
    name: row.userName,
    email: row.userEmail,
    image: row.userImage,
    isOwner: row.membership.isOwner,
    permissions: row.membership.isOwner
      ? [...OWNER_PERMISSIONS]
      : [...parsePermissions(row.membership.permissions)],
    createdAt: serializeDate(row.membership.createdAt),
  });

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
      viewer: toMember(viewer),
    },
  };
}

export async function updateSchoolTeamMember(
  db: AppDb,
  ctx: Ctx,
  memberUserId: string,
  permissions: readonly CourseLitPermission[],
  clock: Clock,
): Promise<
  | { ok: true; value: SchoolTeamDto["members"][number] }
  | { ok: false; error: PlatformError }
> {
  if (
    (!ctx.permissions.has("school:admin") && !ctx.permissions.has("members:manage")) ||
    !ctx.tenantId
  ) {
    return { ok: false, error: createPlatformError("forbidden") };
  }

  const proposed = normalizeCourseLitPermissions(permissions);
  const proposedEffective = computeEffectiveCourseLitPermissions(proposed);

  return db.transaction(async (tx) => {
    // Serialize membership administration with removals and ownership checks.
    await tx.execute(sql`SELECT id FROM schools WHERE id = ${ctx.tenantId} FOR UPDATE`);

    const actorRows = await tx
      .select()
      .from(schema.memberships)
      .where(
        and(
          eq(schema.memberships.schoolId, ctx.tenantId!),
          eq(schema.memberships.userId, ctx.principalId),
        ),
      )
      .limit(1);
    const actor = actorRows[0];
    if (!actor) return { ok: false as const, error: createPlatformError("forbidden") };

    const targetRows = await tx
      .select()
      .from(schema.memberships)
      .where(
        and(
          eq(schema.memberships.schoolId, ctx.tenantId!),
          eq(schema.memberships.userId, memberUserId),
        ),
      )
      .limit(1);
    const target = targetRows[0];
    if (!target) return { ok: false as const, error: createPlatformError("not_found") };
    if (target.isOwner || target.userId === ctx.principalId) {
      return { ok: false as const, error: createPlatformError("forbidden") };
    }

    const actorPermissions = actor.isOwner
      ? [...OWNER_PERMISSIONS]
      : [...parsePermissions(actor.permissions)];
    const currentEffective = computeEffectiveCourseLitPermissions(
      target.permissions.split(","),
    );
    const canEditAnyMember = actor.isOwner || actorPermissions.includes("school:admin");
    if (
      !canEditAnyMember &&
      (currentEffective.some((permission) => !actorPermissions.includes(permission)) ||
        proposedEffective.some((permission) => !actorPermissions.includes(permission)))
    ) {
      return { ok: false as const, error: createPlatformError("forbidden") };
    }

    const [updated] = await tx
      .update(schema.memberships)
      .set({
        permissions: serializePermissions(proposedEffective),
        role: "member",
      })
      .where(eq(schema.memberships.id, target.id))
      .returning();
    if (!updated)
      return { ok: false as const, error: createPlatformError("not_found") };

    const users = await tx
      .select({
        name: schema.user.name,
        email: schema.user.email,
        image: schema.user.image,
      })
      .from(schema.user)
      .where(eq(schema.user.id, updated.userId))
      .limit(1);
    const member = users[0];
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "member.permissions_changed",
      resourceType: "membership",
      resourceId: updated.userId,
      requestId: ctx.requestId,
      createdAt: clock.now(),
    });
    return {
      ok: true as const,
      value: {
        id: updated.userId,
        name: member?.name ?? "",
        email: member?.email ?? "",
        image: member?.image ?? null,
        isOwner: updated.isOwner,
        permissions: [...parsePermissions(updated.permissions)],
        createdAt: serializeDate(updated.createdAt),
      },
    };
  });
}
