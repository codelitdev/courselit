import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { createPgliteRuntime, freezeRuntimeClock, type Runtime } from "./runtime.js";
import { type SeededWorld, seedWorld } from "./seed.js";
import { dispatch } from "./test-learner-auth.js";
import { MemoryPaymentProvider } from "./test-payment-provider.js";

/** A provider whose cancellation can be made to fail, like a provider outage. */
class FlakyPaymentProvider extends MemoryPaymentProvider {
  failCancellation = false;
  cancelAttempts = 0;

  override async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    this.cancelAttempts += 1;
    if (this.failCancellation) throw new Error("provider_down");
    await super.cancelSubscription(providerSubscriptionId);
  }
}

type PlanKind = "free" | "subscription" | "installment";

type Setup = {
  runtime: Runtime;
  world: SeededWorld;
  provider: FlakyPaymentProvider;
  adminHeaders: Record<string, string>;
  learnerHeaders: Record<string, string>;
  communityId: string;
  communityInternalId: string;
  learnerAccountId: string;
  membershipId: string;
  providerSubscriptionId: string | null;
  postId: string;
  spaceId: string;
};

function learnerCookie(response: { headers?: Record<string, string> }) {
  const value = response.headers?.["Set-Cookie"];
  if (!value) throw new Error("missing_learner_cookie");
  return value.split(";", 1)[0]!;
}

function planBody(kind: PlanKind) {
  if (kind === "free") return { name: "Free access", kind: "free", type: "free" };
  if (kind === "installment") {
    return {
      name: "Three payments",
      kind: "installment",
      amountMinor: 3000,
      billingInterval: "month",
      installmentCount: 3,
      providerProductId: "community-installments",
    };
  }
  return {
    name: "Monthly access",
    kind: "subscription",
    type: "subscription",
    subscriptionMonthlyAmount: 10,
    amountMinor: 1000,
    billingInterval: "month",
    providerProductId: "community-monthly",
  };
}

/** Puts a learner into the seeded school community on a plan of `kind`. */
async function setupMember(kind: PlanKind): Promise<Setup> {
  const clock = freezeRuntimeClock(new Date("2026-03-10T00:00:00.000Z"));
  const provider = new FlakyPaymentProvider();
  const runtime = await createPgliteRuntime({ clock, paymentProvider: provider });
  const world = await seedWorld(runtime, clock);
  const adminHeaders = {
    cookie: world.owner.sessionCookie,
    "x-school-id": world.schoolA.publicId,
  };
  const [community] = await runtime.db
    .select()
    .from(schema.communities)
    .where(eq(schema.communities.schoolId, world.schoolA.id));
  await runtime.db
    .update(schema.communities)
    .set({ enabled: true })
    .where(eq(schema.communities.id, community!.id));
  const communityId = community!.publicId;

  const plan = await dispatch(runtime, {
    method: "POST",
    path: `/v1/communities/${communityId}/plans`,
    headers: adminHeaders,
    body: planBody(kind),
  });
  expect(plan.status).toBe(201);
  const planId = (plan.body as { id: string }).id;

  const email = `${kind}-member@example.com`;
  const signUp = await dispatch(runtime, {
    method: "POST",
    path: "/v1/learner/auth/sign-up",
    headers: { "x-school-id": world.schoolA.publicId },
    body: {
      schoolId: world.schoolA.publicId,
      email,
      password: "learner-password-1",
      name: "Community Member",
    },
  });
  const learnerHeaders = {
    cookie: learnerCookie(signUp),
    "x-school-id": world.schoolA.publicId,
  };
  const checkout = await dispatch(runtime, {
    method: "POST",
    path: `/v1/learner/communities/${communityId}/checkout`,
    headers: { ...learnerHeaders, "idempotency-key": `${kind}-community-checkout` },
    body: { planId },
  });
  expect(checkout.status).toBe(201);

  let providerSubscriptionId: string | null = null;
  if (kind !== "free") {
    providerSubscriptionId = `${kind}-provider-subscription`;
    const event = {
      type: "payment.succeeded",
      data: {
        payment_id: `${kind}-community-payment`,
        subscription_id: providerSubscriptionId,
        amount: kind === "installment" ? 3000 : 1000,
        currency: "USD",
        metadata: {
          courselit_community_checkout_id: (checkout.body as { id: string }).id,
        },
      },
    };
    expect(
      await dispatch(runtime, {
        method: "POST",
        path: "/v1/storefront/webhooks/stripe",
        headers: { "stripe-event-id": `${kind}-community-paid` },
        rawBody: JSON.stringify(event),
      }),
    ).toMatchObject({ status: 200 });
  }

  const [account] = await runtime.db
    .select({ id: schema.schoolAccounts.id })
    .from(schema.schoolAccounts)
    .where(
      and(
        eq(schema.schoolAccounts.schoolId, world.schoolA.id),
        eq(schema.schoolAccounts.email, email),
      ),
    );
  const membership = await communityMembership(runtime, account!.id);
  expect(membership?.status).toBe("active");

  // The community membership unlocks the school's spaces; post in one so the
  // test can check the learner loses access to it later.
  const spaces = await dispatch(runtime, {
    method: "GET",
    path: "/v1/learner/spaces",
    headers: learnerHeaders,
  });
  const spaceId = (spaces.body as { items: Array<{ id: string }> }).items[0]!.id;
  const post = await dispatch(runtime, {
    method: "POST",
    path: `/v1/learner/spaces/${spaceId}/posts`,
    headers: learnerHeaders,
    body: { title: "Hello members", content: "First post" },
  });
  expect(post.status).toBe(201);

  return {
    runtime,
    world,
    provider,
    adminHeaders,
    learnerHeaders,
    communityId,
    communityInternalId: community!.id,
    learnerAccountId: account!.id,
    membershipId: membership!.publicId,
    providerSubscriptionId,
    postId: (post.body as { id: string }).id,
    spaceId,
  };
}

async function communityMembership(runtime: Runtime, schoolAccountId: string) {
  const [row] = await runtime.db
    .select()
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.schoolAccountId, schoolAccountId),
        eq(schema.learnerMemberships.entityType, "community"),
        eq(schema.learnerMemberships.isIncludedInPlan, false),
      ),
    );
  return row;
}

async function subscriptionRows(runtime: Runtime) {
  return runtime.db.select().from(schema.communitySubscriptions);
}

function removeMember(setup: Setup, headers: Record<string, string>) {
  return dispatch(setup.runtime, {
    method: "PATCH",
    path: `/v1/community-memberships/${setup.membershipId}`,
    headers,
    body: { status: "rejected", rejectionReason: "Removed by staff" },
  });
}

async function learnerCanReadCommunity(setup: Setup) {
  const spaces = await dispatch(setup.runtime, {
    method: "GET",
    path: "/v1/learner/spaces",
    headers: setup.learnerHeaders,
  });
  const post = await dispatch(setup.runtime, {
    method: "GET",
    path: `/v1/learner/spaces/${setup.spaceId}/posts/${setup.postId}`,
    headers: setup.learnerHeaders,
  });
  return {
    spaces: (spaces.body as { items?: unknown[] }).items?.length ?? 0,
    postStatus: post.status,
  };
}

describe.serial("community billing when access ends", () => {
  for (const kind of ["subscription", "installment"] as const) {
    it(`cancels a ${kind} at the provider when staff remove the member`, async () => {
      const setup = await setupMember(kind);
      try {
        expect(await subscriptionRows(setup.runtime)).toMatchObject([
          { providerSubscriptionId: setup.providerSubscriptionId, status: "active" },
        ]);
        const before = await learnerCanReadCommunity(setup);
        expect(before.postStatus).toBe(200);
        expect(before.spaces).toBeGreaterThan(0);

        const removed = await removeMember(setup, setup.adminHeaders);
        expect(removed).toMatchObject({ status: 200, body: { status: "rejected" } });

        expect(setup.provider.cancelledSubscriptions).toEqual([
          setup.providerSubscriptionId!,
        ]);
        expect(await subscriptionRows(setup.runtime)).toMatchObject([
          { status: "cancelled", cancelAt: expect.any(Date) },
        ]);
        expect(
          (await communityMembership(setup.runtime, setup.learnerAccountId))?.status,
        ).toBe("rejected");
        const audit = await setup.runtime.db
          .select()
          .from(schema.auditEvents)
          .where(eq(schema.auditEvents.action, "community.subscription_cancelled"));
        expect(audit).toHaveLength(1);

        const after = await learnerCanReadCommunity(setup);
        expect(after.postStatus).not.toBe(200);
        expect(after.spaces).toBe(0);
        const listed = await dispatch(setup.runtime, {
          method: "GET",
          path: "/v1/learner/communities",
          headers: setup.learnerHeaders,
        });
        expect(listed).toMatchObject({ status: 200, body: { items: [] } });
      } finally {
        await setup.runtime.close();
      }
    }, 60_000);
  }

  it("does not call the provider when a free member is removed", async () => {
    const setup = await setupMember("free");
    try {
      const removed = await removeMember(setup, setup.adminHeaders);
      expect(removed.status).toBe(200);
      expect(setup.provider.cancelAttempts).toBe(0);
      expect(await subscriptionRows(setup.runtime)).toEqual([]);
      expect(
        (await communityMembership(setup.runtime, setup.learnerAccountId))?.status,
      ).toBe("rejected");
    } finally {
      await setup.runtime.close();
    }
  }, 60_000);

  it("does not list a turned-off community to its members", async () => {
    const setup = await setupMember("free");
    try {
      const list = () =>
        dispatch(setup.runtime, {
          method: "GET",
          path: "/v1/learner/communities",
          headers: setup.learnerHeaders,
        });
      expect((await list()).body).toMatchObject({ items: [expect.any(Object)] });
      await setup.runtime.db.update(schema.communities).set({ enabled: false });
      expect(await list()).toMatchObject({ status: 200, body: { items: [] } });
    } finally {
      await setup.runtime.close();
    }
  }, 60_000);

  it("keeps the member and their billing untouched when the provider cannot cancel", async () => {
    const setup = await setupMember("subscription");
    try {
      setup.provider.failCancellation = true;
      const removed = await removeMember(setup, setup.adminHeaders);
      expect(removed).toMatchObject({
        status: 409,
        body: { code: "conflict" },
      });
      expect(setup.provider.cancelAttempts).toBe(1);
      expect(await subscriptionRows(setup.runtime)).toMatchObject([
        { status: "active", cancelAt: null },
      ]);
      expect(
        (await communityMembership(setup.runtime, setup.learnerAccountId))?.status,
      ).toBe("active");
      expect((await learnerCanReadCommunity(setup)).postStatus).toBe(200);

      // Once the provider recovers, the same removal goes through.
      setup.provider.failCancellation = false;
      expect((await removeMember(setup, setup.adminHeaders)).status).toBe(200);
      expect(await subscriptionRows(setup.runtime)).toMatchObject([
        { status: "cancelled" },
      ]);
    } finally {
      await setup.runtime.close();
    }
  }, 60_000);

  it("does not let staff without the moderation permission remove a member", async () => {
    const setup = await setupMember("subscription");
    try {
      const key = await dispatch(setup.runtime, {
        method: "POST",
        path: "/v1/api-keys",
        headers: setup.adminHeaders,
        body: { name: "Community writer", permissions: ["communities:write"] },
      });
      expect(key.status).toBe(201);
      const removed = await removeMember(setup, {
        "x-api-key": (key.body as { key: string }).key,
      });
      expect(removed.status).toBe(403);
      expect(setup.provider.cancelAttempts).toBe(0);
      expect(await subscriptionRows(setup.runtime)).toMatchObject([
        { status: "active" },
      ]);
      expect(
        (await communityMembership(setup.runtime, setup.learnerAccountId))?.status,
      ).toBe("active");
    } finally {
      await setup.runtime.close();
    }
  }, 60_000);

  it("lists the learner's paid community and cancels billing when they leave", async () => {
    const setup = await setupMember("installment");
    try {
      const listed = await dispatch(setup.runtime, {
        method: "GET",
        path: "/v1/learner/communities",
        headers: setup.learnerHeaders,
      });
      expect(listed).toMatchObject({
        status: 200,
        body: {
          items: [
            {
              id: setup.communityId,
              membership: { status: "active" },
              billing: { kind: "installment", planName: "Three payments" },
            },
          ],
          nextCursor: null,
        },
      });

      const leave = () =>
        dispatch(setup.runtime, {
          method: "POST",
          path: `/v1/learner/communities/${setup.communityId}/leave`,
          headers: setup.learnerHeaders,
          body: {},
        });
      expect(await leave()).toMatchObject({ status: 200, body: { left: true } });
      expect(setup.provider.cancelledSubscriptions).toEqual([
        setup.providerSubscriptionId!,
      ]);
      expect(await subscriptionRows(setup.runtime)).toMatchObject([
        { status: "cancelled" },
      ]);
      expect(
        (await communityMembership(setup.runtime, setup.learnerAccountId))?.status,
      ).toBe("expired");
      expect((await learnerCanReadCommunity(setup)).postStatus).not.toBe(200);

      // Leaving again is a no-op: no second provider call.
      expect(await leave()).toMatchObject({ status: 200, body: { left: true } });
      expect(setup.provider.cancelAttempts).toBe(1);
      expect(
        await dispatch(setup.runtime, {
          method: "GET",
          path: "/v1/learner/communities",
          headers: setup.learnerHeaders,
        }),
      ).toMatchObject({ status: 200, body: { items: [] } });
    } finally {
      await setup.runtime.close();
    }
  }, 60_000);

  it("keeps the learner in the community when the provider cannot cancel on leave", async () => {
    const setup = await setupMember("subscription");
    try {
      setup.provider.failCancellation = true;
      const left = await dispatch(setup.runtime, {
        method: "POST",
        path: `/v1/learner/communities/${setup.communityId}/leave`,
        headers: setup.learnerHeaders,
        body: {},
      });
      expect(left.status).toBe(409);
      expect(await subscriptionRows(setup.runtime)).toMatchObject([
        { status: "active" },
      ]);
      expect(
        (await communityMembership(setup.runtime, setup.learnerAccountId))?.status,
      ).toBe("active");
    } finally {
      await setup.runtime.close();
    }
  }, 60_000);

  it("cancels billing when staff delete the learner's contact", async () => {
    const setup = await setupMember("subscription");
    try {
      const [account] = await setup.runtime.db
        .select({ publicId: schema.schoolAccounts.publicId })
        .from(schema.schoolAccounts)
        .where(eq(schema.schoolAccounts.id, setup.learnerAccountId));
      const deleted = await dispatch(setup.runtime, {
        method: "DELETE",
        path: `/v1/contacts/${account!.publicId}`,
        headers: setup.adminHeaders,
      });
      expect(deleted.status).toBe(200);
      expect(setup.provider.cancelledSubscriptions).toEqual([
        setup.providerSubscriptionId!,
      ]);
      expect(await subscriptionRows(setup.runtime)).toMatchObject([
        { status: "cancelled" },
      ]);
    } finally {
      await setup.runtime.close();
    }
  }, 60_000);

  it("cancels every member's billing when staff delete the community", async () => {
    const setup = await setupMember("subscription");
    try {
      setup.provider.failCancellation = true;
      const blocked = await dispatch(setup.runtime, {
        method: "DELETE",
        path: `/v1/communities/${setup.communityId}`,
        headers: setup.adminHeaders,
      });
      expect(blocked.status).toBe(409);
      const [stillThere] = await setup.runtime.db
        .select({ deletedAt: schema.communities.deletedAt })
        .from(schema.communities)
        .where(eq(schema.communities.id, setup.communityInternalId));
      expect(stillThere?.deletedAt).toBeNull();

      setup.provider.failCancellation = false;
      const deleted = await dispatch(setup.runtime, {
        method: "DELETE",
        path: `/v1/communities/${setup.communityId}`,
        headers: setup.adminHeaders,
      });
      expect(deleted.status).toBe(200);
      expect(setup.provider.cancelledSubscriptions).toEqual([
        setup.providerSubscriptionId!,
      ]);
      expect(await subscriptionRows(setup.runtime)).toMatchObject([
        { status: "cancelled" },
      ]);
    } finally {
      await setup.runtime.close();
    }
  }, 60_000);
});
