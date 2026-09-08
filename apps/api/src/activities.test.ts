import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { ActivityType, getSchoolOverview, recordActivity } from "./activities.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe.serial("activities", () => {
  it("records one-time events idempotently and allows repeatable events", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-05T15:30:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const purchase = {
      schoolId: world.schoolA.id,
      actorId: "learner-1",
      type: ActivityType.PURCHASED,
      entityId: world.noteA.publicId,
      metadata: { amountMinor: 1250, currency: "USD", paymentId: "pay-1" },
    } as const;
    await recordActivity(runtime.db, purchase, clock);
    await recordActivity(runtime.db, purchase, clock);
    await recordActivity(runtime.db, {
      ...purchase,
      type: ActivityType.COMMUNITY_JOINED,
      entityId: "community-1",
    }, clock);
    await recordActivity(runtime.db, {
      ...purchase,
      type: ActivityType.COMMUNITY_JOINED,
      entityId: "community-1",
    }, clock);

    const rows = await runtime.db
      .select()
      .from(schema.activities)
      .where(eq(schema.activities.schoolId, world.schoolA.id));
    expect(rows.filter((row) => row.type === ActivityType.PURCHASED)).toHaveLength(1);
    expect(rows.filter((row) => row.type === ActivityType.COMMUNITY_JOINED)).toHaveLength(2);

    await runtime.close();
  });

  it("aggregates activity metrics for the admin overview", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-05T15:30:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const common = { schoolId: world.schoolA.id, actorId: "learner-1" };
    await recordActivity(runtime.db, {
      ...common,
      type: ActivityType.PURCHASED,
      entityId: world.noteA.publicId,
      metadata: { amountMinor: 1250 },
    }, clock);
    await recordActivity(runtime.db, { ...common, type: ActivityType.ENROLLED, entityId: world.noteA.publicId }, clock);
    await recordActivity(runtime.db, { ...common, type: ActivityType.COMMUNITY_JOINED, entityId: "community-1" }, clock);
    await recordActivity(runtime.db, { ...common, type: ActivityType.NEWSLETTER_SUBSCRIBED, entityId: "contact-1" }, clock);

    const result = await getSchoolOverview(runtime.db, world.schoolA.id, "7d", clock);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sales.amountMinor).toBe(1250);
      expect(result.value.sales.points).toHaveLength(7);
      expect(result.value.customers.count).toBe(1);
      expect(result.value.communityMembers.count).toBe(1);
      expect(result.value.subscribers.count).toBe(1);
    }

    const response = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/overview?range=7d",
      headers: { cookie: world.owner.sessionCookie, "x-school-id": world.schoolA.publicId },
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ sales: { amountMinor: 1250 }, customers: { count: 1 } });
    await runtime.close();
  });
});
