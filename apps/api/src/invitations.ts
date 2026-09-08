import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  type Clock,
  createPlatformError,
  type PlatformError,
  type PlatformRequestContext,
  uuidv7,
} from "@codelitdev/platform";
import { and, eq, gt, isNull } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { type CourseLitPermission, serializePermissions } from "./permissions.js";
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
    role: string;
    permissions: readonly CourseLitPermission[];
  },
  clock: Clock,
): Promise<
  { ok: true; token: string; id: string } | { ok: false; error: PlatformError }
> {
  if (!ctx.permissions.has("school:admin") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const token = randomBytes(32).toString("base64url");
  const id = uuidv7(clock);
  const now = clock.now();
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
      schoolId: ctx.tenantId!,
      email: normalizeEmail(input.email),
      role: input.role,
      permissions: serializePermissions(input.permissions),
      tokenDigest: digestToken(token),
      inviterId: ctx.principalId,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
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
  return { ok: true, token, id };
}

export async function acceptInvitation(
  db: AppDb,
  ctx: Ctx,
  token: string,
  actorEmail: string,
  clock: Clock,
): Promise<{ ok: true; schoolId: string } | { ok: false; error: PlatformError }> {
  const digest = digestToken(token);
  const now = clock.now();
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(schema.invitations);
    const invitation = rows.find((row) => equalHex(row.tokenDigest, digest));
    if (
      !invitation ||
      invitation.revokedAt ||
      invitation.acceptedAt ||
      invitation.expiresAt.getTime() <= now.getTime()
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
      normalizeEmail(actorEmail) !== invitation.email
    ) {
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
        role: invitation.role,
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

export async function revokeInvitation(
  db: AppDb,
  ctx: Ctx,
  invitationId: string,
  clock: Clock,
): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  if (!ctx.permissions.has("school:admin") || !ctx.tenantId) {
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
          eq(schema.invitations.id, invitationId),
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
