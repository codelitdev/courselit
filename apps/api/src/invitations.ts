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
import { computeEffectiveCourseLitPermissions } from "@courselit/api-contract";
import { and, eq, gt, isNull } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  type CourseLitPermission,
  OWNER_PERMISSIONS,
  parsePermissions,
  serializePermissions,
} from "./permissions.js";
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

export async function createInvitation(
  db: AppDb,
  ctx: Ctx,
  input: {
    email: string;
    permissions: readonly CourseLitPermission[];
  },
  clock: Clock,
): Promise<
  | { ok: true; token: string; id: string; expiresAt: Date }
  | { ok: false; error: PlatformError }
> {
  const canInvite =
    ctx.permissions.has("school:admin") ||
    ctx.permissions.has("members:invite") ||
    ctx.permissions.has("members:manage");
  if (!canInvite || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const effectivePermissions = computeEffectiveCourseLitPermissions(input.permissions);
  if (
    !ctx.permissions.has("school:admin") &&
    effectivePermissions.some((permission) => !ctx.permissions.has(permission))
  ) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const token = randomBytes(32).toString("base64url");
  const id = uuidv7(clock);
  const publicId = createPublicId("tinv", clock);
  const now = clock.now();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await db.transaction(async (tx) => {
    await tx
      .update(schema.invitations)
      .set({ revokedAt: now })
      .where(
        and(
          eq(schema.invitations.schoolId, ctx.tenantId!),
          eq(schema.invitations.email, normalizeEmail(input.email)),
          isNull(schema.invitations.acceptedAt),
          isNull(schema.invitations.revokedAt),
        ),
      );
    await tx.insert(schema.invitations).values({
      id,
      publicId,
      schoolId: ctx.tenantId!,
      email: normalizeEmail(input.email),
      // `role` is retained only as a transitional database column. Access is
      // determined exclusively by the invitation's permission scopes.
      role: "member",
      permissions: serializePermissions(effectivePermissions),
      tokenDigest: digestToken(token),
      inviterId: ctx.principalId,
      expiresAt,
      createdAt: now,
    });
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "invitation.created",
      resourceType: "invitation",
      resourceId: id,
      requestId: ctx.requestId,
      createdAt: now,
    });
  });
  return { ok: true, token, id: publicId, expiresAt };
}

export type InvitationPreviewDto = {
  invitationId: string;
  schoolName: string;
  inviterName: string | null;
  expiresAt: string;
  permissions: CourseLitPermission[];
  email: string;
};

async function invitationActor(
  db: AppDb,
  ctx: Ctx,
  invitation: typeof schema.invitations.$inferSelect,
) {
  const users = await db
    .select({
      email: schema.user.email,
      emailVerified: schema.user.emailVerified,
    })
    .from(schema.user)
    .where(eq(schema.user.id, ctx.principalId))
    .limit(1);
  const actor = users[0];
  if (!actor?.emailVerified || normalizeEmail(actor.email) !== invitation.email) {
    return null;
  }
  return actor;
}

export async function previewInvitation(
  db: AppDb,
  ctx: Ctx,
  invitationId: string,
  token: string,
  clock: Clock,
): Promise<
  { ok: true; value: InvitationPreviewDto } | { ok: false; error: PlatformError }
> {
  const rows = await db
    .select()
    .from(schema.invitations)
    .where(eq(schema.invitations.publicId, invitationId))
    .limit(1);
  const invitation = rows[0];
  const now = clock.now();
  if (
    !invitation ||
    invitation.revokedAt ||
    invitation.acceptedAt ||
    invitation.expiresAt.getTime() <= now.getTime() ||
    !equalHex(invitation.tokenDigest, digestToken(token))
  ) {
    return { ok: false, error: createPlatformError("not_found") };
  }
  if (!(await invitationActor(db, ctx, invitation))) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const schoolRows = await db
    .select({ name: schema.schools.name })
    .from(schema.schools)
    .where(eq(schema.schools.id, invitation.schoolId))
    .limit(1);
  const inviterRows = await db
    .select({ name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.id, invitation.inviterId))
    .limit(1);
  return {
    ok: true,
    value: {
      invitationId: invitation.publicId,
      schoolName: schoolRows[0]?.name ?? "this school",
      inviterName: inviterRows[0]?.name ?? null,
      expiresAt: serializeDate(invitation.expiresAt),
      permissions: [...parsePermissions(invitation.permissions)],
      email: invitation.email,
    },
  };
}

export async function acceptInvitation(
  db: AppDb,
  ctx: Ctx,
  token: string,
  actorEmail: string | undefined,
  clock: Clock,
  invitationId?: string,
): Promise<{ ok: true; schoolId: string } | { ok: false; error: PlatformError }> {
  const digest = digestToken(token);
  const now = clock.now();
  return db.transaction(async (tx) => {
    const rows = invitationId
      ? await tx
          .select()
          .from(schema.invitations)
          .where(eq(schema.invitations.publicId, invitationId))
          .limit(1)
      : await tx.select().from(schema.invitations);
    const invitation = invitationId
      ? rows[0]
      : rows.find((row) => equalHex(row.tokenDigest, digest));
    if (
      !invitation ||
      invitation.revokedAt ||
      invitation.acceptedAt ||
      invitation.expiresAt.getTime() <= now.getTime() ||
      !equalHex(invitation.tokenDigest, digest)
    ) {
      return {
        ok: false as const,
        error: createPlatformError("not_found"),
      };
    }
    const users = await tx
      .select({
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
      })
      .from(schema.user)
      .where(eq(schema.user.id, ctx.principalId))
      .limit(1);
    const actor = users[0];
    if (
      !actor?.emailVerified ||
      normalizeEmail(actor.email) !== invitation.email ||
      (actorEmail && normalizeEmail(actorEmail) !== invitation.email)
    ) {
      return {
        ok: false as const,
        error: createPlatformError("forbidden"),
      };
    }
    const inviterRows = await tx
      .select()
      .from(schema.memberships)
      .where(
        and(
          eq(schema.memberships.schoolId, invitation.schoolId),
          eq(schema.memberships.userId, invitation.inviterId),
        ),
      )
      .limit(1);
    const inviter = inviterRows[0];
    const inviterPermissions = inviter?.isOwner
      ? OWNER_PERMISSIONS
      : inviter
        ? [...parsePermissions(inviter.permissions)]
        : [];
    const proposedPermissions = computeEffectiveCourseLitPermissions(
      invitation.permissions.split(","),
    );
    const inviterCanDelegate = Boolean(
      inviter &&
        (inviter.isOwner ||
          inviterPermissions.includes("school:admin") ||
          inviterPermissions.includes("members:invite") ||
          inviterPermissions.includes("members:manage")),
    );
    if (
      !inviterCanDelegate ||
      (!inviterPermissions.includes("school:admin") &&
        proposedPermissions.some(
          (permission) => !inviterPermissions.includes(permission),
        ))
    ) {
      await tx
        .update(schema.invitations)
        .set({ revokedAt: now })
        .where(
          and(
            eq(schema.invitations.id, invitation.id),
            isNull(schema.invitations.acceptedAt),
            isNull(schema.invitations.revokedAt),
          ),
        );
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId: invitation.schoolId,
        actorId: invitation.inviterId,
        action: "invitation.revoked",
        resourceType: "invitation",
        resourceId: invitation.id,
        requestId: ctx.requestId,
        createdAt: now,
      });
      return {
        ok: false as const,
        error: createPlatformError("forbidden"),
      };
    }
    const consumed = await tx
      .update(schema.invitations)
      .set({ acceptedAt: now })
      .where(
        and(
          eq(schema.invitations.id, invitation.id),
          isNull(schema.invitations.acceptedAt),
          isNull(schema.invitations.revokedAt),
          gt(schema.invitations.expiresAt, now),
        ),
      )
      .returning();
    if (!consumed[0]) {
      return {
        ok: false as const,
        error: createPlatformError("not_found"),
      };
    }
    const existing = await tx
      .select()
      .from(schema.memberships)
      .where(
        and(
          eq(schema.memberships.schoolId, invitation.schoolId),
          eq(schema.memberships.userId, ctx.principalId),
        ),
      )
      .limit(1);
    if (!existing[0]) {
      await tx.insert(schema.memberships).values({
        id: uuidv7(clock),
        schoolId: invitation.schoolId,
        userId: ctx.principalId,
        role: "member",
        isOwner: false,
        permissions: invitation.permissions,
        createdAt: now,
      });
    }
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
      resourceId: invitation.id,
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

export async function rejectInvitation(
  db: AppDb,
  ctx: Ctx,
  invitationId: string,
  token: string,
  clock: Clock,
): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  const preview = await previewInvitation(db, ctx, invitationId, token, clock);
  if (!preview.ok) return preview;

  const now = clock.now();
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.publicId, invitationId))
      .limit(1);
    const invitation = rows[0];
    if (
      !invitation ||
      invitation.revokedAt ||
      invitation.acceptedAt ||
      invitation.expiresAt.getTime() <= now.getTime() ||
      !equalHex(invitation.tokenDigest, digestToken(token))
    ) {
      return { ok: false as const, error: createPlatformError("not_found") };
    }
    const rejected = await tx
      .update(schema.invitations)
      .set({ revokedAt: now })
      .where(
        and(
          eq(schema.invitations.id, invitation.id),
          isNull(schema.invitations.acceptedAt),
          isNull(schema.invitations.revokedAt),
          gt(schema.invitations.expiresAt, now),
        ),
      )
      .returning({ id: schema.invitations.id });
    if (!rejected[0]) {
      return { ok: false as const, error: createPlatformError("not_found") };
    }
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: invitation.schoolId,
      actorId: ctx.principalId,
      action: "invitation.rejected",
      resourceType: "invitation",
      resourceId: invitation.id,
      requestId: ctx.requestId,
      createdAt: now,
    });
    return { ok: true as const };
  });
}

export async function revokeInvitation(
  db: AppDb,
  ctx: Ctx,
  invitationId: string,
  clock: Clock,
): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  if (
    (!ctx.permissions.has("school:admin") && !ctx.permissions.has("members:manage")) ||
    !ctx.tenantId
  ) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const schoolId = ctx.tenantId;
  const now = clock.now();
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(schema.invitations)
      .set({ revokedAt: now })
      .where(
        and(
          eq(schema.invitations.publicId, invitationId),
          eq(schema.invitations.schoolId, schoolId),
          isNull(schema.invitations.acceptedAt),
          isNull(schema.invitations.revokedAt),
        ),
      )
      .returning({ id: schema.invitations.id });
    if (!rows[0]) return { ok: false, error: createPlatformError("not_found") };
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId,
      actorId: ctx.principalId,
      action: "invitation.revoked",
      resourceType: "invitation",
      resourceId: invitationId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    return { ok: true as const };
  });
}
