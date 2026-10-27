import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  processNextIntegrationJob,
  type SendLitOperations,
} from "./integration-provisioning.js";
import { signUpLearner } from "./learners.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { createSchool } from "./schools.js";
import { seedWorld } from "./seed.js";
import { SendLitApiError } from "./sendlit-client.js";
import { encryptIntegrationSecret } from "./utils/integration-secrets.js";

describe("CourseLit website provisioning", () => {
  it("creates the website in the school transaction without an integration job", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);
    process.env.AUTH_SECRET ??= "integration-test-auth-secret";

    const created = await createSchool(
      runtime.db,
      {
        name: "Website School",
        subdomain: "website-school",
        locale: "en",
        currency: "USD",
        principalId: world.owner.id,
        requestId: "request-1",
      },
      clock,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error("school_creation_failed");
    const [school] = await runtime.db
      .select({ id: schema.schools.id })
      .from(schema.schools)
      .where(eq(schema.schools.publicId, created.value.id));

    const [settings] = await runtime.db
      .select()
      .from(schema.websiteSettings)
      .where(eq(schema.websiteSettings.schoolId, school!.id));
    expect(settings?.sharedWidgets.header.name).toBe("header");

    const pages = await runtime.db
      .select({
        slug: schema.websitePages.slug,
        communityId: schema.websitePages.communityId,
        publishedAt: schema.websitePages.publishedAt,
      })
      .from(schema.websitePages)
      .where(eq(schema.websitePages.schoolId, school!.id));
    expect(pages.map((page) => page.slug).sort()).toEqual([
      "",
      "community",
      "privacy",
      "terms",
    ]);
    expect(pages.every((page) => page.publishedAt !== null)).toBe(true);
    expect(pages.find((page) => page.slug === "community")?.communityId).toBeTruthy();

    const jobs = await runtime.db
      .select({ type: schema.integrationOutboxJobs.type })
      .from(schema.integrationOutboxJobs)
      .where(eq(schema.integrationOutboxJobs.schoolId, school!.id));
    expect(jobs.map((job) => job.type)).toEqual(["provision_sendlit"]);
    await runtime.close();
  }, 20000);
});

describe("CourseLit SendLit provisioning", () => {
  it("provisions a SendLit team and stores the encrypted team key", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);
    process.env.AUTH_SECRET ??= "integration-test-auth-secret";

    const created = await createSchool(
      runtime.db,
      {
        name: "SendLit School",
        subdomain: "sendlit-school",
        locale: "en",
        currency: "USD",
        principalId: world.owner.id,
        requestId: "request-sendlit-1",
      },
      clock,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error("school_creation_failed");

    const sendLitOperations: SendLitOperations = {
      provisionTeam: async (input) => ({
        teamId: "sl_team_1",
        externalId: input.externalId,
        name: input.name,
        created: true,
        apiKey: "sl_live_key_999",
      }),
      rotateKey: async () => ({ keyId: "key_1", key: "sl_live_rotated_key" }),
    };

    const processed = await processNextIntegrationJob(
      runtime.db,
      clock,
      runtime.logger,
      sendLitOperations,
      { server: "http://127.0.0.1:4101", provisioningApiKey: "sl_org_key" },
    );
    expect(processed).toBe(true);

    const [ready] = await runtime.db
      .select()
      .from(schema.schoolIntegrations)
      .where(
        and(
          eq(schema.schoolIntegrations.externalId, created.value.id),
          eq(schema.schoolIntegrations.provider, "sendlit"),
        ),
      );
    expect(ready).toMatchObject({ status: "ready", remoteTeamId: "sl_team_1" });
    expect(ready!.encryptedTeamKey).not.toContain("sl_live_key_999");
    await runtime.close();
  }, 20000);

  it("syncs new learner contact to SendLit via outbox with deferred retries if SendLit is unavailable", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);
    process.env.AUTH_SECRET ??= "integration-test-auth-secret";

    const created = await createSchool(
      runtime.db,
      {
        name: "Sync Contact School",
        subdomain: "sync-contact-school",
        locale: "en",
        currency: "USD",
        principalId: world.owner.id,
        requestId: "request-sync-1",
      },
      clock,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error("school_creation_failed");

    const [initialIntegration] = await runtime.db
      .select()
      .from(schema.schoolIntegrations)
      .where(
        and(
          eq(schema.schoolIntegrations.externalId, created.value.id),
          eq(schema.schoolIntegrations.provider, "sendlit"),
        ),
      );
    const internalSchoolId = initialIntegration!.schoolId;

    // Put SendLit integration into ready state with encrypted team key
    await runtime.db
      .update(schema.schoolIntegrations)
      .set({
        status: "ready",
        remoteTeamId: "sl_team_test",
        encryptedTeamKey: encryptIntegrationSecret("sl_team_key_123"),
      })
      .where(
        and(
          eq(schema.schoolIntegrations.schoolId, internalSchoolId),
          eq(schema.schoolIntegrations.provider, "sendlit"),
        ),
      );

    // Delete the initial provision job so only contact sync jobs are processed
    await runtime.db
      .delete(schema.integrationOutboxJobs)
      .where(eq(schema.integrationOutboxJobs.schoolId, internalSchoolId));

    // Sign up a new learner
    const signedUp = await signUpLearner(
      runtime.db,
      {
        email: "alice.learner@example.com",
        password: "securepassword123",
        name: "Alice Learner",
        schoolPublicId: created.value.id,
      },
      clock,
      "req-learner-signup",
    );
    expect(signedUp.ok).toBe(true);

    // Verify outbox job was enqueued
    const [contactJob] = await runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(
        and(
          eq(schema.integrationOutboxJobs.schoolId, internalSchoolId),
          eq(schema.integrationOutboxJobs.provider, "sendlit"),
          eq(schema.integrationOutboxJobs.type, "sync_sendlit_contact"),
        ),
      );
    expect(contactJob).toBeDefined();
    expect(contactJob.payload).toMatchObject({
      schoolAccountId: expect.any(String),
      ensureSubscribed: true,
      reason: "learner_signup",
    });
    expect(contactJob.status).toBe("pending");

    // 1. Attempt sync when SendLit is down (503 Service Unavailable)
    let syncAttempts = 0;
    const syncedContacts: Array<{ email: string; name?: string }> = [];
    const updatedContacts: Array<any> = [];

    const sendLitOps: SendLitOperations = {
      provisionTeam: async () => ({
        teamId: "sl_team_test",
        externalId: created.value.id,
        name: "Test",
        created: true,
        apiKey: "sl_live_key",
      }),
      rotateKey: async () => ({ keyId: "kid_1", key: "sl_live_key" }),
      listContacts: async () => ({ items: [], total: 0 }),
      createContact: async (_key, input) => {
        syncAttempts += 1;
        if (syncAttempts === 1) {
          throw new SendLitApiError("SendLit is temporarily unavailable", 503, true);
        }
        syncedContacts.push(input);
        return {
          contactId: "cnt_alice_1",
          email: input.email,
          name: input.name ?? null,
          subscribed: true,
          tags: [],
          customFields: {},
          createdAt: clock.now().toISOString(),
          updatedAt: clock.now().toISOString(),
        };
      },
      updateContact: async (_key, contactId, input) => {
        updatedContacts.push({ contactId, ...input });
        return {
          contactId,
          email: "alice.learner@example.com",
          name: input.name ?? null,
          subscribed: input.subscribed ?? true,
          tags: input.tags ?? [],
          customFields: input.customFields ?? {},
          createdAt: clock.now().toISOString(),
          updatedAt: clock.now().toISOString(),
        };
      },
    };

    // First worker run fails gracefully and sets exponential backoff
    const processedFirst = await processNextIntegrationJob(
      runtime.db,
      clock,
      runtime.logger,
      sendLitOps,
      { server: "http://sendlit.test", provisioningApiKey: "dummy_provisioning_key" },
    );
    expect(processedFirst).toBe(true);

    const [retryingJob] = await runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(eq(schema.integrationOutboxJobs.id, contactJob.id));
    expect(retryingJob.status).toBe("pending");
    expect(retryingJob.attempts).toBe(1);
    expect(retryingJob.lastError).toContain("SendLit is temporarily unavailable");

    // 2. Second worker run after SendLit recovers
    await runtime.db
      .update(schema.integrationOutboxJobs)
      .set({ nextAttemptAt: clock.now() })
      .where(eq(schema.integrationOutboxJobs.id, contactJob.id));

    const processedSecond = await processNextIntegrationJob(
      runtime.db,
      clock,
      runtime.logger,
      sendLitOps,
      { server: "http://sendlit.test", provisioningApiKey: "dummy_provisioning_key" },
    );
    expect(processedSecond).toBe(true);

    const [doneJob] = await runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(eq(schema.integrationOutboxJobs.id, contactJob.id));
    expect(doneJob.status).toBe("done");
    expect(doneJob.attempts).toBe(1);
    expect(syncedContacts).toEqual([
      { email: "alice.learner@example.com", name: "Alice Learner" },
    ]);
    expect(updatedContacts[0]).toMatchObject({
      contactId: "cnt_alice_1",
      name: "Alice Learner",
      subscribed: true,
      customFields: expect.objectContaining({
        "courselit.isCommunityMember": "false",
        "courselit.productIds": [],
      }),
    });

    await runtime.close();
  }, 20000);
});
