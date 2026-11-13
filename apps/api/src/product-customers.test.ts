import { describe, expect, it } from "bun:test";
import { createPublicId, uuidv7 } from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe.serial("product customers", () => {
  it("lists school-scoped customers with an empty progress view", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-05T15:30:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const response = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/customers`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [], total: 0, page: 1, limit: 25 });

    const wrongSchool = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/customers`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolB.publicId,
      },
    });
    expect(wrongSchool.status).toBe(404);

    const missingProgress = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/customers/cnt_missing/progress`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(missingProgress.status).toBe(404);

    await runtime.close();
  });

  it("shows whether each customer of a download has downloaded it", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-05T15:30:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const [product] = await runtime.db
      .update(schema.products)
      .set({ kind: "download" })
      .where(eq(schema.products.publicId, world.noteA.publicId))
      .returning({ id: schema.products.id });

    const addCustomer = async (email: string) => {
      const userId = uuidv7(clock);
      const accountId = uuidv7(clock);
      const membershipId = uuidv7(clock);
      await runtime.db.insert(schema.user).values({
        id: userId,
        email,
        name: email,
        emailVerified: true,
        createdAt: clock.now(),
        updatedAt: clock.now(),
      });
      await runtime.db.insert(schema.schoolAccounts).values({
        id: accountId,
        publicId: createPublicId("sca", clock),
        schoolId: world.schoolA.id,
        userId,
        email,
        displayName: email,
        status: "active",
        createdAt: clock.now(),
        updatedAt: clock.now(),
      });
      await runtime.db.insert(schema.learnerMemberships).values({
        id: membershipId,
        publicId: createPublicId("lrm", clock),
        schoolId: world.schoolA.id,
        schoolAccountId: accountId,
        entityType: "product",
        entityId: world.noteA.publicId,
        paymentPlanId: null,
        status: "active",
        role: null,
        subscriptionId: null,
        subscriptionMethod: null,
        joiningReason: "",
        rejectionReason: null,
        sessionId: null,
        isIncludedInPlan: false,
        parentMembershipId: null,
        createdAt: clock.now(),
        updatedAt: clock.now(),
      });
      return { accountId, membershipId };
    };
    const downloader = await addCustomer("a-downloader@example.com");
    const waiting = await addCustomer("b-waiting@example.com");
    // An unused link doesn't count; only a used one does.
    for (const [customer, consumed, digest] of [
      [downloader, true, "used"],
      [waiting, false, "unused"],
    ] as const) {
      await runtime.db.insert(schema.downloadLinks).values({
        id: uuidv7(clock),
        schoolId: world.schoolA.id,
        membershipId: customer.membershipId,
        schoolAccountId: customer.accountId,
        productId: product!.id,
        tokenDigest: digest,
        expiresAt: new Date("2026-03-06T00:00:00.000Z"),
        consumed,
        createdAt: clock.now(),
      });
    }

    const response = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/customers`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(response.status).toBe(200);
    expect(
      (response.body as { items: Array<{ email: string; downloaded: boolean }> }).items.map(
        ({ email, downloaded }) => ({ email, downloaded }),
      ),
    ).toEqual([
      { email: "a-downloader@example.com", downloaded: true },
      { email: "b-waiting@example.com", downloaded: false },
    ]);

    await runtime.close();
  });
});
