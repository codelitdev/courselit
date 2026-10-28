import { describe, expect, it } from "bun:test";
import { uuidv7 } from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import {
  processNextIntegrationJob,
  type SendLitOperations,
} from "./integration-provisioning.js";
import { createLearnerNotification } from "./notifications.js";
import { createLearnerSpacePost, followSpace } from "./spaces.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import type { SendSchoolEmailPayload } from "./school-emails.js";
import { seedWorld } from "./seed.js";
import { encryptIntegrationSecret } from "./utils/integration-secrets.js";

const sendLitConfig = {
  server: "http://sendlit.test",
  provisioningApiKey: "provisioning-key",
};

async function setUp() {
  process.env.AUTH_SECRET ??= "integration-test-auth-secret";
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
  const world = await seedWorld(runtime, clock);
  const now = clock.now();
  await runtime.db.insert(schema.schoolIntegrations).values({
    id: uuidv7(clock),
    schoolId: world.schoolA.id,
    provider: "sendlit",
    server: sendLitConfig.server,
    externalId: world.schoolA.publicId,
    remoteTeamId: "team_a",
    encryptedTeamKey: encryptIntegrationSecret("sl_team_key"),
    status: "ready",
    createdAt: now,
    updatedAt: now,
  });
  const adminHeaders = {
    cookie: world.owner.sessionCookie,
    "x-school-id": world.schoolA.publicId,
  };
  const created = await dispatch(runtime, {
    method: "POST",
    path: "/v1/products",
    headers: adminHeaders,
    body: { kind: "download", title: "Starter kit", slug: "starter-kit" },
  });
  expect(created.status).toBe(201);
  const productId = (created.body as { id: string }).id;
  await dispatch(runtime, {
    method: "POST",
    path: `/v1/products/${productId}/plans`,
    headers: adminHeaders,
    body: { name: "Free", kind: "free", amountMinor: 0 },
  });
  await dispatch(runtime, {
    method: "PATCH",
    path: `/v1/products/${productId}`,
    headers: adminHeaders,
    body: { status: "published" },
  });
  return { clock, runtime, world, adminHeaders, productId };
}

async function queuedEmails(runtime: Awaited<ReturnType<typeof setUp>>["runtime"]) {
  const jobs = await runtime.db
    .select()
    .from(schema.integrationOutboxJobs)
    .where(eq(schema.integrationOutboxJobs.type, "send_school_email"));
  return jobs.map((job) => job.payload as SendSchoolEmailPayload);
}

describe("school emails", () => {
  it("tells a learner once when a creator gives them access", async () => {
    const { runtime, adminHeaders, productId } = await setUp();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const granted = await dispatch(runtime, {
        method: "POST",
        path: "/v1/memberships",
        headers: adminHeaders,
        body: { productId, email: "buyer@example.com", name: "Buyer" },
      });
      expect(granted.status).toBe(201);
    }
    const emails = await queuedEmails(runtime);
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({
      to: "buyer@example.com",
      subject: "You have been invited to Starter kit",
    });
    expect(emails[0]!.html).toContain(`/dashboard/courses/${productId}`);
    await runtime.close();
  });

  it("delivers a lead magnet to the email a visitor enters", async () => {
    const { runtime, adminHeaders, productId, world, clock } = await setUp();
    const publicRequest = {
      method: "POST" as const,
      path: "/v1/storefront/lead-magnets",
      headers: { "x-school-id": world.schoolA.publicId },
      body: { productId, email: "Visitor@Example.com" },
    };

    // Only products marked as lead magnets qualify.
    expect((await dispatch(runtime, publicRequest)).status).toBe(404);
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { leadMagnet: true },
    });

    const signedUp = await dispatch(runtime, publicRequest);
    expect(signedUp.status).toBe(200);
    const [account] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.email, "visitor@example.com"));
    const [membership] = await runtime.db
      .select()
      .from(schema.learnerMemberships)
      .where(
        and(
          eq(schema.learnerMemberships.schoolAccountId, account!.id),
          eq(schema.learnerMemberships.entityId, productId),
        ),
      );
    expect(membership?.status).toBe("active");
    const emails = await queuedEmails(runtime);
    expect(emails).toEqual([
      expect.objectContaining({
        to: "visitor@example.com",
        subject: "Thank you for signing up for Starter kit",
      }),
    ]);
    expect(emails[0]!.html).toContain("Download now");

    // The worker sends it through the school's mailing team.
    await runtime.db
      .update(schema.integrationOutboxJobs)
      .set({ status: "done" })
      .where(eq(schema.integrationOutboxJobs.type, "sync_sendlit_contact"));
    await runtime.db
      .update(schema.integrationOutboxJobs)
      .set({ status: "done" })
      .where(eq(schema.integrationOutboxJobs.type, "track_sendlit_event"));
    const sent: unknown[] = [];
    const operations: SendLitOperations = {
      provisionTeam: async () => {
        throw new Error("unexpected");
      },
      rotateKey: async () => {
        throw new Error("unexpected");
      },
      sendEmail: async (key, input) => {
        sent.push({ key, ...input });
        return { txeId: "txe_1" };
      },
    };
    await processNextIntegrationJob(
      runtime.db,
      clock,
      runtime.logger,
      operations,
      sendLitConfig,
    );
    expect(sent).toEqual([
      expect.objectContaining({
        key: "sl_team_key",
        to: "visitor@example.com",
        subject: "Thank you for signing up for Starter kit",
      }),
    ]);
    await runtime.close();
  });

  it("emails notifications unless the recipient turned emails off", async () => {
    const { runtime, world, clock } = await setUp();
    const [account] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.schoolId, world.schoolA.id))
      .limit(1);
    const target = { schoolId: world.schoolA.id, schoolAccountId: account!.id };
    const notification = {
      type: "community_reply",
      title: "New reply",
      body: "Someone replied to “Week 1”.",
      href: "/communities/com_1/posts/pst_1",
    };

    await createLearnerNotification(runtime.db, target, notification, clock);
    let emails = await queuedEmails(runtime);
    expect(emails).toEqual([
      expect.objectContaining({ to: account!.email, subject: "New reply" }),
    ]);
    expect(emails[0]!.html).toContain("/communities/com_1/posts/pst_1");
    expect(emails[0]!.html).toContain("/dashboard/account/notifications");

    const now = clock.now();
    await runtime.db.insert(schema.learnerNotificationPreferences).values({
      id: uuidv7(clock),
      schoolId: world.schoolA.id,
      schoolAccountId: account!.id,
      type: "community_reply",
      appEnabled: true,
      emailEnabled: false,
      createdAt: now,
      updatedAt: now,
    });
    await createLearnerNotification(runtime.db, target, notification, clock);
    emails = await queuedEmails(runtime);
    expect(emails).toHaveLength(1);
    await runtime.close();
  });

  it("lets team members turn notification emails off", async () => {
    const { runtime, adminHeaders } = await setUp();
    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/notification-preferences",
      headers: adminHeaders,
    });
    expect(listed.status).toBe(200);
    expect((listed.body as { items: unknown[] }).items).toContainEqual({
      type: "community_post_created",
      appEnabled: true,
      emailEnabled: true,
    });

    const updated = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/notification-preferences/community_post_created",
      headers: adminHeaders,
      body: { appEnabled: true, emailEnabled: false },
    });
    expect(updated.status).toBe(200);
    const relisted = await dispatch(runtime, {
      method: "GET",
      path: "/v1/notification-preferences",
      headers: adminHeaders,
    });
    expect((relisted.body as { items: unknown[] }).items).toContainEqual({
      type: "community_post_created",
      appEnabled: true,
      emailEnabled: false,
    });

    const invalid = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/notification-preferences/not_a_type",
      headers: adminHeaders,
      body: { appEnabled: true, emailEnabled: false },
    });
    expect(invalid.status).toBe(400);
    await runtime.close();
  });
});

describe("space post notifications", () => {
  it("emails staff and the space's followers, but not the author", async () => {
    const { runtime, adminHeaders, productId, world, clock } = await setUp();
    const learners = [];
    for (const email of ["author@example.com", "follower@example.com"]) {
      await dispatch(runtime, {
        method: "POST",
        path: "/v1/memberships",
        headers: adminHeaders,
        body: { productId, email, name: email },
      });
      const [account] = await runtime.db
        .select()
        .from(schema.schoolAccounts)
        .where(eq(schema.schoolAccounts.email, email));
      learners.push(account!);
    }
    const [community] = await runtime.db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.schoolId, world.schoolA.id));
    const [space] = await runtime.db
      .select()
      .from(schema.spaces)
      .where(eq(schema.spaces.schoolId, world.schoolA.id));
    const viewers = [];
    for (const account of learners) {
      const now = clock.now();
      await runtime.db.insert(schema.learnerMemberships).values({
        id: uuidv7(clock),
        publicId: `lrm_${account.id}`,
        schoolId: world.schoolA.id,
        schoolAccountId: account.id,
        entityType: "community",
        entityId: community!.publicId,
        status: "active",
        role: "post",
        isIncludedInPlan: false,
        createdAt: now,
        updatedAt: now,
      });
      viewers.push({
        kind: "learner" as const,
        schoolId: world.schoolA.id,
        schoolPublicId: world.schoolA.publicId,
        learnerId: account.id,
        learnerPublicId: account.publicId,
      });
    }
    expect(
      (await followSpace(runtime.db, viewers[1]!, space!.publicId, clock)).ok,
    ).toBe(true);
    await runtime.db
      .delete(schema.integrationOutboxJobs)
      .where(eq(schema.integrationOutboxJobs.type, "send_school_email"));

    const posted = await createLearnerSpacePost(
      runtime.db,
      viewers[0]!,
      space!.publicId,
      { title: "Hello", content: "<p>Hi</p>" },
      clock,
    );
    expect(posted.ok).toBe(true);
    const emails = await queuedEmails(runtime);
    const recipients = emails.map((email) => email.to).sort();
    expect(recipients).toContain("follower@example.com");
    expect(recipients).not.toContain("author@example.com");
    expect(emails.every((email) => email.subject === "New space post")).toBe(true);
    // Staff get a link to the post on the school site.
    const staffEmail = emails.find((email) => email.to !== "follower@example.com");
    expect(staffEmail?.html).toContain(`/dashboard/s/${space!.publicId}/`);
    await runtime.close();
  });
});
