import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  type PlatformRequestContext,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import {
  computeEffectiveCourseLitPermissions,
  filterDelegableCourseLitPermissions,
  normalizeCourseLitPermissions,
  COURSELIT_PERMISSIONS,
  type CourseLitPermission,
} from "@courselit/api-contract/team-permissions";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { ensureSchoolAccount } from "./learners.js";
import { parsePermissions } from "./permissions.js";
import type { AppDb } from "./types.js";

type Ctx = PlatformRequestContext<string, string, CourseLitPermission>;

function digestToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function equalHex(left: string, right: string): boolean {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type InvitationPreviewDto = {
  invitationId: string;
  schoolName: string;
  inviterName: string | null;
  expiresAt: string;
  permissions: CourseLitPermission[];
  email: string;
};

export async function createInvitation(
  db: AppDb,
  ctx: Ctx,
  input: {
    email: string;
    permissions: readonly CourseLitPermission[];
    presetId?: string;
  },
  clock: Clock,
): Promise<
  | { ok: true; token: string; id: string; expiresAt: Date }
  | { ok: false; error: PlatformError }
> {
  const canInvite =
    ctx.permissions.has("members:invite") ||
    ctx.permissions.has("members:manage");
  if (!canInvite || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }

  const normalized = normalizeEmail(input.email);
  const effectivePermissions = computeEffectiveCourseLitPermissions(input.permissions);

  return db.transaction(async (tx) => {
    // 1. Check if actor can delegate these permissions
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

    if (!actor.membership.isOwner) {
      const actorEffective = computeEffectiveCourseLitPermissions(actor.membership.permissions);
      const delegable = new Set(filterDelegableCourseLitPermissions(actorEffective, false));
      if (effectivePermissions.some((permission) => !delegable.has(permission))) {
        return { ok: false as const, error: createPlatformError("forbidden") };
      }
    }

    // 2. Check if normalizedEmail is already an active staff member
    const existingMember = await tx
      .select({ id: schema.memberships.id })
      .from(schema.memberships)
      .innerJoin(
        schema.schoolAccounts,
        eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
      )
      .where(
        and(
          eq(schema.memberships.schoolId, ctx.tenantId!),
          eq(schema.schoolAccounts.email, normalized),
        ),
      )
      .limit(1);
    if (existingMember[0]) {
      return {
        ok: false as const,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "already_member" },
        }),
      };
    }

    // 3. Check if there's already a pending invitation
    const existingInvitation = await tx
      .select({ id: schema.invitations.id })
      .from(schema.invitations)
      .where(
        and(
          eq(schema.invitations.schoolId, ctx.tenantId!),
          eq(schema.invitations.normalizedEmail, normalized),
          eq(schema.invitations.status, "pending"),
        ),
      )
      .limit(1);
    if (existingInvitation[0]) {
      return {
        ok: false as const,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "already_invited" },
        }),
      };
    }

    const token = randomBytes(32).toString("base64url");
    const id = uuidv7(clock);
    const publicId = createPublicId("tinv", clock);
    const now = clock.now();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await tx.insert(schema.invitations).values({
      id,
      publicId,
      schoolId: ctx.tenantId!,
      email: input.email.trim(),
      normalizedEmail: normalized,
      permissions: effectivePermissions,
      presetId: input.presetId ?? null,
      tokenDigest: digestToken(token),
      invitedBySchoolAccountId: actor.schoolAccount.id,
      status: "pending",
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "invitation.created",
      resourceType: "invitation",
      resourceId: publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });

    return { ok: true as const, token, id: publicId, expiresAt };
  });
}

export async function resendInvitation(
  db: AppDb,
  ctx: Ctx,
  invitationIdentifier: string,
  clock: Clock,
): Promise<
  | { ok: true; token: string; id: string; expiresAt: Date }
  | { ok: false; error: PlatformError }
> {
  if (!ctx.permissions.has("members:invite") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }

  return db.transaction(async (tx) => {
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

    const invRows = await tx
      .select()
      .from(schema.invitations)
      .where(
        and(
          eq(schema.invitations.schoolId, ctx.tenantId!),
          eq(schema.invitations.status, "pending"),
          sql`(${schema.invitations.publicId} = ${invitationIdentifier} OR ${schema.invitations.id}::text = ${invitationIdentifier})`,
        ),
      )
      .limit(1);
    const invitation = invRows[0];
    if (!invitation) return { ok: false as const, error: createPlatformError("not_found") };

    if (!actor.membership.isOwner) {
      const actorEffective = computeEffectiveCourseLitPermissions(actor.membership.permissions);
      const delegable = new Set(filterDelegableCourseLitPermissions(actorEffective, false));
      const invitationEffective = computeEffectiveCourseLitPermissions(invitation.permissions);
      if (invitationEffective.some((p) => !delegable.has(p))) {
        return { ok: false as const, error: createPlatformError("forbidden") };
      }
    }

    const token = randomBytes(32).toString("base64url");
    const now = clock.now();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await tx
      .update(schema.invitations)
      .set({
        tokenDigest: digestToken(token),
        expiresAt,
        updatedAt: now,
      })
      .where(eq(schema.invitations.id, invitation.id));

    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "invitation.resent",
      resourceType: "invitation",
      resourceId: invitation.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });

    return { ok: true as const, token, id: invitation.publicId, expiresAt };
  });
}

export async function revokeInvitation(
  db: AppDb,
  ctx: Ctx,
  invitationIdentifier: string,
  clock: Clock,
): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  if (
    (!ctx.permissions.has("members:manage") && !ctx.permissions.has("members:invite")) ||
    !ctx.tenantId
  ) {
    return { ok: false, error: createPlatformError("forbidden") };
  }

  const schoolId = ctx.tenantId;
  const now = clock.now();

  return db.transaction(async (tx) => {
    const invRows = await tx
      .select()
      .from(schema.invitations)
      .where(
        and(
          eq(schema.invitations.schoolId, schoolId),
          eq(schema.invitations.status, "pending"),
          sql`(${schema.invitations.publicId} = ${invitationIdentifier} OR ${schema.invitations.id}::text = ${invitationIdentifier})`,
        ),
      )
      .limit(1);
    const invitation = invRows[0];
    if (!invitation) return { ok: false, error: createPlatformError("not_found") };

    await tx
      .update(schema.invitations)
      .set({
        status: "revoked",
        revokedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.invitations.id, invitation.id));

    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId,
      actorId: ctx.principalId,
      action: "invitation.revoked",
      resourceType: "invitation",
      resourceId: invitation.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });

    return { ok: true as const };
  });
}

async function invitationActor(
  db: AppDb,
  ctx: Ctx,
  invitation: typeof schema.invitations.$inferSelect,
) {
  const users = await db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      name: schema.user.name,
      image: schema.user.image,
      emailVerified: schema.user.emailVerified,
    })
    .from(schema.user)
    .where(eq(schema.user.id, ctx.principalId))
    .limit(1);
  const actor = users[0];
  if (!actor?.emailVerified || normalizeEmail(actor.email) !== invitation.normalizedEmail) {
    return null;
  }
  return actor;
}

export async function previewInvitation(
  db: AppDb,
  ctx: Ctx,
  invitationIdentifier: string,
  token: string,
  clock: Clock,
): Promise<
  { ok: true; value: InvitationPreviewDto } | { ok: false; error: PlatformError }
> {
  const rows = await db
    .select()
    .from(schema.invitations)
    .where(
      and(
        sql`(${schema.invitations.publicId} = ${invitationIdentifier} OR ${schema.invitations.id}::text = ${invitationIdentifier})`,
        eq(schema.invitations.status, "pending"),
      ),
    )
    .limit(1);
  const invitation = rows[0];
  const now = clock.now();
  if (
    !invitation ||
    invitation.expiresAt.getTime() <= now.getTime() ||
    !equalHex(invitation.tokenDigest, digestToken(token))
  ) {
    return { ok: false, error: createPlatformError("not_found") };
  }

  const actor = await invitationActor(db, ctx, invitation);
  if (!actor) {
    return { ok: false, error: createPlatformError("forbidden") };
  }

  const schoolRows = await db
    .select({ name: schema.schools.name })
    .from(schema.schools)
    .where(eq(schema.schools.id, invitation.schoolId))
    .limit(1);

  let inviterName: string | null = null;
  if (invitation.invitedBySchoolAccountId) {
    const inviterRows = await db
      .select({ name: schema.schoolAccounts.displayName })
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.id, invitation.invitedBySchoolAccountId))
      .limit(1);
    inviterName = inviterRows[0]?.name ?? null;
  }

  return {
    ok: true,
    value: {
      invitationId: invitation.publicId,
      schoolName: schoolRows[0]?.name ?? "this school",
      inviterName,
      expiresAt: serializeDate(invitation.expiresAt),
      permissions: [...parsePermissions(invitation.permissions)],
      email: invitation.email,
    },
  };
}

export const previewTeamInvitation = previewInvitation;

export async function acceptTeamInvitation(
  db: AppDb,
  ctx: Ctx,
  invitationIdentifier: string,
  token: string,
  clock: Clock,
): Promise<{ ok: true; schoolId: string } | { ok: false; error: PlatformError }> {
  const digest = digestToken(token);
  const now = clock.now();

  return db.transaction(async (tx) => {
    // 1. Lock school
    const invRows = await tx
      .select()
      .from(schema.invitations)
      .where(
        and(
          sql`(${schema.invitations.publicId} = ${invitationIdentifier} OR ${schema.invitations.id}::text = ${invitationIdentifier})`,
          eq(schema.invitations.status, "pending"),
        ),
      )
      .limit(1);
    const invitation = invRows[0];
    if (
      !invitation ||
      invitation.expiresAt.getTime() <= now.getTime() ||
      !equalHex(invitation.tokenDigest, digest)
    ) {
      return { ok: false as const, error: createPlatformError("not_found") };
    }

    await tx.execute(sql`SELECT id FROM schools WHERE id = ${invitation.schoolId} FOR UPDATE`);

    const actor = await invitationActor(tx as unknown as AppDb, ctx, invitation);
    if (!actor) {
      return { ok: false as const, error: createPlatformError("forbidden") };
    }

    // 2. Recheck inviter eligibility if inviter was recorded
    if (invitation.invitedBySchoolAccountId) {
      const inviterRows = await tx
        .select()
        .from(schema.memberships)
        .where(
          and(
            eq(schema.memberships.schoolId, invitation.schoolId),
            eq(schema.memberships.schoolAccountId, invitation.invitedBySchoolAccountId),
          ),
        )
        .limit(1);
      const inviterMembership = inviterRows[0];
      if (!inviterMembership) {
        return {
          ok: false as const,
          error: createPlatformError("conflict", {
            safeDetails: { reason: "inviter_ineligible" },
          }),
        };
      }
      if (!inviterMembership.isOwner) {
        const inviterEffective = computeEffectiveCourseLitPermissions(inviterMembership.permissions);
        const delegable = new Set(filterDelegableCourseLitPermissions(inviterEffective, false));
        const proposed = computeEffectiveCourseLitPermissions(invitation.permissions);
        if (proposed.some((p) => !delegable.has(p))) {
          return {
            ok: false as const,
            error: createPlatformError("conflict", {
              safeDetails: { reason: "inviter_ineligible" },
            }),
          };
        }
      }
    }

    // 3. Ensure actor's school account exists
    const schoolAccount = await ensureSchoolAccount(tx as unknown as AppDb, {
      schoolId: invitation.schoolId,
      userId: ctx.principalId,
      email: actor.email,
      displayName: actor.name,
      image: actor.image,
      clock,
    });

    // 4. Ensure no existing staff membership
    const existing = await tx
      .select({ id: schema.memberships.id })
      .from(schema.memberships)
      .where(
        and(
          eq(schema.memberships.schoolId, invitation.schoolId),
          eq(schema.memberships.schoolAccountId, schoolAccount.id),
        ),
      )
      .limit(1);
    if (existing[0]) {
      return {
        ok: false as const,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "already_member" },
        }),
      };
    }

    // 5. Create membership
    const newMembershipId = uuidv7(clock);
    const newPublicId = createPublicId("mbr", clock);

    await tx.insert(schema.memberships).values({
      id: newMembershipId,
      publicId: newPublicId,
      schoolId: invitation.schoolId,
      schoolAccountId: schoolAccount.id,
      isOwner: false,
      permissions: invitation.permissions,
      presetId: invitation.presetId,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    // 6. Update invitation status
    await tx
      .update(schema.invitations)
      .set({
        status: "accepted",
        acceptedAt: now,
        acceptedBySchoolAccountId: schoolAccount.id,
        updatedAt: now,
      })
      .where(eq(schema.invitations.id, invitation.id));

    // 7. Update selected school if none selected
    const currentSelected = await tx
      .select({ schoolId: schema.selectedSchools.schoolId })
      .from(schema.selectedSchools)
      .where(eq(schema.selectedSchools.userId, ctx.principalId))
      .limit(1);
    if (!currentSelected[0]) {
      await tx.insert(schema.selectedSchools).values({
        userId: ctx.principalId,
        schoolId: invitation.schoolId,
      });
    }

    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: invitation.schoolId,
      actorId: ctx.principalId,
      action: "invitation.accepted",
      resourceType: "invitation",
      resourceId: invitation.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });

    const school = await tx
      .select({ publicId: schema.schools.publicId })
      .from(schema.schools)
      .where(eq(schema.schools.id, invitation.schoolId))
      .limit(1);

    return { ok: true as const, schoolId: school[0]?.publicId ?? invitation.schoolId };
  });
}

export async function rejectTeamInvitation(
  db: AppDb,
  ctx: Ctx,
  invitationIdentifier: string,
  token: string,
  clock: Clock,
): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  const preview = await previewInvitation(db, ctx, invitationIdentifier, token, clock);
  if (!preview.ok) return preview;

  const now = clock.now();
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(schema.invitations)
      .where(
        and(
          sql`(${schema.invitations.publicId} = ${invitationIdentifier} OR ${schema.invitations.id}::text = ${invitationIdentifier})`,
          eq(schema.invitations.status, "pending"),
        ),
      )
      .limit(1);
    const invitation = rows[0];
    if (!invitation) return { ok: false as const, error: createPlatformError("not_found") };

    await tx
      .update(schema.invitations)
      .set({
        status: "rejected",
        rejectedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.invitations.id, invitation.id));

    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: invitation.schoolId,
      actorId: ctx.principalId,
      action: "invitation.rejected",
      resourceType: "invitation",
      resourceId: invitation.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });

    return { ok: true as const };
  });
}

export const rejectInvitation = rejectTeamInvitation;

export async function acceptInvitation(
  db: AppDb,
  ctx: Ctx,
  token: string,
  actorEmail: string | undefined,
  clock: Clock,
  invitationId?: string,
): Promise<{ ok: true; schoolId: string } | { ok: false; error: PlatformError }> {
  const digest = digestToken(token);
  let resolvedId = invitationId;
  if (!resolvedId) {
    const rows = await db
      .select({ publicId: schema.invitations.publicId, tokenDigest: schema.invitations.tokenDigest })
      .from(schema.invitations)
      .where(eq(schema.invitations.status, "pending"));
    const match = rows.find((row) => equalHex(row.tokenDigest, digest));
    if (!match) {
      return { ok: false, error: createPlatformError("not_found") };
    }
    resolvedId = match.publicId;
  }
  return acceptTeamInvitation(db, ctx, resolvedId, token, clock);
}
