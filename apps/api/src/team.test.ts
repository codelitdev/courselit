import { describe, expect, it } from "bun:test";
import { COURSELIT_PERMISSIONS } from "@courselit/api-contract/team-permissions";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe.serial("school team memberships and permissions", () => {
  it("lists team members and viewer context with PBAC-derived effective permissions", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const res = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/team",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });

    expect(res.status).toBe(200);
    const body = res.body as {
      members: Array<{
        id: string;
        name: string;
        isOwner: boolean;
        permissions: string[];
        effectivePermissions?: string[];
        version?: number;
      }>;
      viewer: {
        id: string;
        name: string;
        isOwner: boolean;
        permissions: string[];
      };
    };

    expect(body.members.length).toBe(2);
    const ownerMember = body.members.find((m) => m.name === "Owner");
    const regularMember = body.members.find((m) => m.name === "Member");
    expect(ownerMember).toBeDefined();
    expect(ownerMember?.isOwner).toBe(true);
    expect(ownerMember?.effectivePermissions?.length).toBe(36);
    expect(regularMember).toBeDefined();
    expect(regularMember?.isOwner).toBe(false);
    expect(regularMember?.version).toBe(1);

    expect(body.viewer.name).toBe("Owner");
    expect(body.viewer.isOwner).toBe(true);
    expect(body.viewer.permissions.length).toBe(36);

    await runtime.close();
  });

  it("updates member permissions with optimistic concurrency version checking", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    // Initial update with version 1 -> should succeed and bump to 2
    const updateRes = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/school/team/members/${world.member.id}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: {
        permissions: ["products:read", "products:write"],
        expectedVersion: 1,
      },
    });

    expect(updateRes.status).toBe(200);
    const updatedMember = updateRes.body as {
      id: string;
      version: number;
      permissions: string[];
    };
    expect(updatedMember.version).toBe(2);
    expect(updatedMember.permissions).toEqual(
      expect.arrayContaining(["products:read", "products:write"]),
    );

    // Stale update with version 1 -> should fail with 409 conflict
    const staleRes = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/school/team/members/${world.member.id}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: {
        permissions: ["products:read"],
        expectedVersion: 1,
      },
    });

    expect(staleRes.status).toBe(409);

    // Update with version 2 -> should succeed and bump to 3
    const correctRes = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/school/team/members/${world.member.id}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: {
        permissions: ["products:read"],
        expectedVersion: 2,
      },
    });

    expect(correctRes.status).toBe(200);
    expect((correctRes.body as { version: number }).version).toBe(3);

    await runtime.close();
  });

  it("prevents removing the school owner with 409 conflict", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const deleteRes = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/school/team/members/${world.owner.id}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });

    expect(deleteRes.status).toBe(409);
    await runtime.close();
  });

  it("prevents the sole school owner from leaving the school with 409 conflict", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const leaveRes = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/team/leave",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });

    expect(leaveRes.status).toBe(409);
    await runtime.close();
  });

  it("allows a non-owner member to leave the school", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const leaveRes = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/team/leave",
      headers: {
        cookie: world.member.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });

    expect(leaveRes.status).toBe(204);

    // Verify member is gone
    const teamRes = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/team",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });

    expect(teamRes.status).toBe(200);
    const members = (teamRes.body as { members: Array<{ name: string }> }).members;
    expect(members.some((m) => m.name === "Member")).toBe(false);

    await runtime.close();
  });

  it("transfers ownership atomically to another team member", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    // Non-owner cannot transfer ownership
    const forbiddenTransfer = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/team/transfer-ownership",
      headers: {
        cookie: world.member.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { targetMemberId: world.member.id },
    });
    expect(forbiddenTransfer.status).toBe(403);

    // Owner transfers ownership to member
    const transferRes = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/team/transfer-ownership",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { targetMemberId: world.member.id },
    });
    expect(transferRes.status).toBe(200);

    // Check team list from new owner's perspective
    const teamRes = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/team",
      headers: {
        cookie: world.member.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(teamRes.status).toBe(200);
    const body = teamRes.body as {
      members: Array<{ name: string; isOwner: boolean }>;
      viewer: { name: string; isOwner: boolean };
    };

    const newOwner = body.members.find((m) => m.name === "Member");
    const formerOwner = body.members.find((m) => m.name === "Owner");

    expect(newOwner?.isOwner).toBe(true);
    expect(formerOwner?.isOwner).toBe(false);
    expect(body.viewer.isOwner).toBe(true);
    expect(body.viewer.name).toBe("Member");

    // Former owner can now leave the school
    const formerOwnerLeave = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/team/leave",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(formerOwnerLeave.status).toBe(204);

    await runtime.close();
  });

  it("enforces database partial unique index for single owner per school", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const [account] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, world.schoolA.id),
          eq(schema.schoolAccounts.userId, world.member.id),
        ),
      );

    // Attempting to set isOwner = true on another membership in the same school should fail at DB level
    let dbFailed = false;
    try {
      await runtime.db
        .update(schema.memberships)
        .set({ isOwner: true })
        .where(
          and(
            eq(schema.memberships.schoolId, world.schoolA.id),
            eq(schema.memberships.schoolAccountId, account!.id),
          ),
        );
    } catch {
      dbFailed = true;
    }
    expect(dbFailed).toBe(true);

    await runtime.close();
  });

  it("handles team invitation lifecycle: create, resend, preview, and reject", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    // 1. Create invitation
    const inviteRes = await dispatch(runtime, {
      method: "POST",
      path: "/v1/school/team/invitations",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: {
        email: world.outsider.email,
        permissions: ["products:read", "products:write"],
      },
    });
    expect(inviteRes.status).toBe(201);
    const invitation = inviteRes.body as { id: string; token: string };
    expect(invitation.id).toBeDefined();
    expect(invitation.token).toBeDefined();

    // 2. Resend invitation
    const resendRes = await dispatch(runtime, {
      method: "POST",
      path: `/v1/school/team/invitations/${invitation.id}/resend`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(resendRes.status).toBe(200);
    const resent = resendRes.body as { token: string; id: string };

    // 3. Unverified email cannot preview (returns 403)
    const unverifiedPreview = await dispatch(runtime, {
      method: "POST",
      path: "/v1/team-invitations/preview",
      headers: {
        cookie: world.outsider.sessionCookie,
      },
      body: {
        invitationId: invitation.id,
        token: resent.token,
      },
    });
    expect(unverifiedPreview.status).toBe(403);

    // Verify outsider email
    await runtime.db
      .update(schema.user)
      .set({ emailVerified: true })
      .where(eq(schema.user.id, world.outsider.id));

    // Now preview succeeds with resent token
    const previewRes = await dispatch(runtime, {
      method: "POST",
      path: "/v1/team-invitations/preview",
      headers: {
        cookie: world.outsider.sessionCookie,
      },
      body: {
        invitationId: invitation.id,
        token: resent.token,
      },
    });
    expect(previewRes.status).toBe(200);
    const previewBody = previewRes.body as {
      schoolName: string;
      email: string;
      permissions: string[];
    };
    expect(previewBody.schoolName).toBe("School A");
    expect(previewBody.email).toBe(world.outsider.email);
    expect(previewBody.permissions).toEqual(
      expect.arrayContaining(["products:read", "products:write"]),
    );

    // 4. Reject invitation
    const rejectRes = await dispatch(runtime, {
      method: "POST",
      path: "/v1/team-invitations/reject",
      headers: {
        cookie: world.outsider.sessionCookie,
      },
      body: {
        invitationId: invitation.id,
        token: resent.token,
      },
    });
    expect(rejectRes.status).toBe(204);

    // After rejection, preview should fail (not found)
    const afterRejectPreview = await dispatch(runtime, {
      method: "POST",
      path: "/v1/team-invitations/preview",
      headers: {
        cookie: world.outsider.sessionCookie,
      },
      body: {
        invitationId: invitation.id,
        token: resent.token,
      },
    });
    expect(afterRejectPreview.status).toBe(404);

    await runtime.close();
  });
});
