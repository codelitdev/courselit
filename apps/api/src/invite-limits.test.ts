import { describe, expect, it } from "bun:test";
import { uuidv7 } from "@codelitdev/platform";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { INVITE_LIMITS, inviteLimitError, recordInvite } from "./invite-limits.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

async function setup(billingMode: "cloud" | "oss" = "cloud") {
  const clock = freezeRuntimeClock(new Date("2026-03-01T12:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock, billingMode });
  const world = await seedWorld(runtime, clock);
  return { clock, runtime, world };
}

type Setup = Awaited<ReturnType<typeof setup>>;

async function fillDay(t: Setup, sent: number) {
  for (let index = 0; index < sent; index += 1) {
    await recordInvite(
      t.runtime.db,
      { schoolId: t.world.schoolA.id, userId: t.world.owner.id, kind: "product" },
      t.clock,
    );
  }
}

const invite = (t: Setup, email: string) =>
  dispatch(t.runtime, {
    method: "POST",
    path: "/v1/school/team/invitations",
    headers: { cookie: t.world.owner.sessionCookie, "x-school-id": t.world.schoolA.publicId },
    body: { email, permissions: ["products:read"] },
  });

const reason = (body: unknown) => (body as { details?: { reason?: string } }).details?.reason;

describe("invite limits (S6)", () => {
  it("allows 50 invites a day per school, counting team, product and community invites together", async () => {
    const t = await setup();
    try {
      await fillDay(t, INVITE_LIMITS.perDay - 1);
      expect((await invite(t, "fiftieth@example.com")).status).toBe(201);
      const refused = await invite(t, "fifty-first@example.com");
      expect(refused.status).toBe(429);
      expect(reason(refused.body)).toBe("invite_limit_reached");
      // Product grants share the budget.
      const grant = await dispatch(t.runtime, {
        method: "POST",
        path: "/v1/memberships",
        headers: {
          cookie: t.world.owner.sessionCookie,
          "x-school-id": t.world.schoolA.publicId,
        },
        body: { productId: t.world.noteA.publicId, email: "buyer@example.com" },
      });
      expect(grant.status).toBe(429);
      // Another school has its own budget.
      expect(
        await inviteLimitError(
          t.runtime.db,
          t.world.schoolB.id,
          { newInvitation: true },
          t.clock.now(),
        ),
      ).toBeNull();
    } finally {
      await t.runtime.close();
    }
  });

  it("is a rolling day", async () => {
    const t = await setup();
    try {
      await fillDay(t, INVITE_LIMITS.perDay);
      const now = t.clock.now();
      const at = (hours: number) => new Date(now.getTime() + hours * 3_600_000);
      const check = (when: Date) =>
        inviteLimitError(t.runtime.db, t.world.schoolA.id, { newInvitation: false }, when);
      expect(await check(at(23))).not.toBeNull();
      expect(await check(at(25))).toBeNull();
    } finally {
      await t.runtime.close();
    }
  });

  it("caps pending team invitations at 200, but not other invites", async () => {
    const t = await setup();
    try {
      const now = t.clock.now();
      await t.runtime.db.insert(schema.invitations).values(
        Array.from({ length: INVITE_LIMITS.maxPending }, (_, index) => ({
          id: uuidv7(t.clock),
          publicId: `inv_pending_${index}`,
          schoolId: t.world.schoolA.id,
          email: `pending${index}@example.com`,
          normalizedEmail: `pending${index}@example.com`,
          tokenDigest: `digest_${index}`,
          status: "pending" as const,
          expiresAt: new Date(now.getTime() + 86_400_000),
          createdAt: now,
          updatedAt: now,
        })),
      );
      const refused = await invite(t, "one-more@example.com");
      expect(refused.status).toBe(409);
      expect(reason(refused.body)).toBe("too_many_pending_invites");
      expect(
        await inviteLimitError(t.runtime.db, t.world.schoolA.id, { newInvitation: false }, now),
      ).toBeNull();
    } finally {
      await t.runtime.close();
    }
  });

  it("doesn't apply to OSS installs, which send their own mail", async () => {
    const t = await setup("oss");
    try {
      await fillDay(t, INVITE_LIMITS.perDay);
      expect((await invite(t, "oss@example.com")).status).toBe(201);
    } finally {
      await t.runtime.close();
    }
  });
});
