import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import { createPgliteRuntime, freezeRuntimeClock } from "../runtime.js";
import { seedWorld } from "../seed.js";
import { importLegacyDomains } from "./domains.js";
import { importLegacyLearners } from "./learners.js";
import { importLegacyNotifications } from "./notifications.js";

describe.serial("legacy notification migration", () => {
  it("imports recent/unread notifications, preferences, links, and read state", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    await importLegacyDomains(runtime.db, {
      clock,
      mode: "apply",
      records: [{ _id: "legacy-domain-notifications", name: "notifications-school", email: world.owner.email }],
    });
    await importLegacyLearners(runtime.db, {
      clock,
      mode: "apply",
      records: [{ _id: "legacy-notification-learner", domain: "legacy-domain-notifications", email: "notify@example.com", name: "Notify Learner" }],
    });

    const result = await importLegacyNotifications(runtime.db, {
      clock,
      mode: "apply",
      exportData: {
        notifications: [
          {
            notificationId: "legacy-notification-1",
            domain: "legacy-domain-notifications",
            forUserId: "legacy-notification-learner",
            activityType: "community_post_created",
            message: "A new post is waiting.",
            href: "/community/legacy-community/legacy-post",
            metadata: { communityId: "legacy-community", postId: "legacy-post" },
            read: true,
            createdAt: "2026-02-15T00:00:00.000Z",
            updatedAt: "2026-02-16T00:00:00.000Z",
          },
          {
            notificationId: "legacy-notification-old",
            forUserId: "legacy-notification-learner",
            activityType: "community_reply_created",
            message: "An old reply.",
            read: true,
            createdAt: "2020-01-01T00:00:00.000Z",
            updatedAt: "2020-01-01T00:00:00.000Z",
          },
          {
            notificationId: "legacy-notification-unsupported",
            forUserId: "legacy-notification-learner",
            activityType: "course_completed",
            message: "Completed.",
            read: false,
          },
        ],
        preferences: [
          {
            preferenceId: "legacy-notification-preference-1",
            userId: "legacy-notification-learner",
            activityType: "community_post_created",
            channels: ["email"],
          },
        ],
      },
    });
    expect(result.counts).toMatchObject({
      seen: 4,
      ready: 2,
      imported: 2,
      skippedArchived: 1,
      preferencesImported: 1,
      rejected: 1,
    });
    expect(result.rejectionByCode.unsupported_type).toBe(1);
    const notification = (
      await runtime.db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.publicId, "legacy-notification-1"))
    )[0]!;
    expect(notification).toMatchObject({
      type: "community_post_created",
      body: "A new post is waiting.",
      href: "/dashboard",
    });
    expect(notification.readAt).toEqual(new Date("2026-02-16T00:00:00.000Z"));
    const learner = (
      await runtime.db
        .select({ id: schema.schoolAccounts.id })
        .from(schema.schoolAccounts)
        .where(eq(schema.schoolAccounts.publicId, "legacy-notification-learner"))
    )[0]!;
    expect(
      await runtime.db
        .select()
        .from(schema.learnerNotificationPreferences)
        .where(
          and(
            eq(schema.learnerNotificationPreferences.schoolAccountId, learner.id),
            eq(schema.learnerNotificationPreferences.type, "community_post_created"),
          ),
        ),
    ).toHaveLength(1);
    expect(
      (
        await runtime.db
          .select()
          .from(schema.learnerNotificationPreferences)
          .where(eq(schema.learnerNotificationPreferences.schoolAccountId, learner.id))
      )[0]!.appEnabled,
    ).toBe(false);
    expect(
      (
        await runtime.db
          .select()
          .from(schema.learnerNotificationPreferences)
          .where(eq(schema.learnerNotificationPreferences.schoolAccountId, learner.id))
      )[0]!.emailEnabled,
    ).toBe(true);

    const second = await importLegacyNotifications(runtime.db, {
      clock,
      mode: "apply",
      exportData: {
        notifications: [{ notificationId: "legacy-notification-1", forUserId: "legacy-notification-learner", activityType: "community_post_created" }],
        preferences: [{ preferenceId: "legacy-notification-preference-1", userId: "legacy-notification-learner", activityType: "community_post_created", channels: ["email"] }],
      },
    });
    expect(second.counts).toMatchObject({ alreadyMapped: 2, imported: 0, rejected: 0 });
    await runtime.close();
  });
});
