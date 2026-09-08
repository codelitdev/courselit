import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  COURSELIT_FRONTLIT_PROVISION_PAGES,
  FrontLitApiError,
} from "./frontlit-client.js";
import {
  type FrontLitOperations,
  processNextIntegrationJob,
  type SendLitOperations,
} from "./integration-provisioning.js";
import { signUpLearner } from "./learners.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { createSchool } from "./schools.js";
import { seedWorld } from "./seed.js";
import { SendLitApiError } from "./sendlit-client.js";
import { encryptIntegrationSecret } from "./utils/integration-secrets.js";

describe("CourseLit FrontLit provisioning", () => {
  it("queues provisioning in the school transaction and stores the team key encrypted", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);
    process.env.AUTH_SECRET ??= "integration-test-auth-secret";

    const created = await createSchool(
      runtime.db,
      {
        name: "FrontLit School",
        subdomain: "frontlit-school",
        locale: "en",
        currency: "USD",
        principalId: world.owner.id,
        requestId: "request-1",
      },
      clock,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error("school_creation_failed");

    const [integration] = await runtime.db
      .select()
      .from(schema.schoolIntegrations)
      .where(
        and(
          eq(schema.schoolIntegrations.externalId, created.value.id),
          eq(schema.schoolIntegrations.provider, "frontlit"),
        ),
      );
    const [job] = await runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(
        and(
          eq(schema.integrationOutboxJobs.schoolId, integration!.schoolId),
          eq(schema.integrationOutboxJobs.provider, "frontlit"),
        ),
      );
    expect(integration).toMatchObject({
      provider: "frontlit",
      externalId: created.value.id,
      status: "action_required",
    });
    expect(job).toMatchObject({ provider: "frontlit", type: "provision_frontlit" });

    let provisionAttempts = 0;
    let requestedPages: unknown;
    const operations: FrontLitOperations = {
      provisionTeam: async (input) => {
        provisionAttempts += 1;
        requestedPages = input.pages;
        if (provisionAttempts === 1) {
          throw new FrontLitApiError("FrontLit is unreachable", 503);
        }
        return {
          teamId: "team_1",
          name: created.value.name,
          apiKey: "fl_live_school",
        };
      },
      setSubdomain: async () => undefined,
      listPages: async () =>
        ["", "terms", "privacy"].map((slug) => ({
          id: `page-${slug || "home"}`,
          name: slug || "Home",
          kind: "page",
          slug,
          status: "published",
        })),
    };

    await expect(
      processNextIntegrationJob(
        runtime.db,
        clock,
        runtime.logger,
        operations,
        {
          server: "http://frontlit.test",
          provisioningSecret: "secret",
        },
        undefined,
        { server: null, provisioningApiKey: null },
      ),
    ).resolves.toBe(true);
    expect(requestedPages).toEqual(COURSELIT_FRONTLIT_PROVISION_PAGES);

    const [retryingIntegration] = await runtime.db
      .select()
      .from(schema.schoolIntegrations)
      .where(
        and(
          eq(schema.schoolIntegrations.externalId, created.value.id),
          eq(schema.schoolIntegrations.provider, "frontlit"),
        ),
      );
    const [retryingJob] = await runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(
        and(
          eq(schema.integrationOutboxJobs.schoolId, integration!.schoolId),
          eq(schema.integrationOutboxJobs.provider, "frontlit"),
        ),
      );
    expect(retryingIntegration).toMatchObject({ status: "pending" });
    expect(retryingJob).toMatchObject({ status: "pending", attempts: 1 });
    await runtime.db
      .update(schema.integrationOutboxJobs)
      .set({ nextAttemptAt: clock.now() })
      .where(eq(schema.integrationOutboxJobs.id, retryingJob!.id));

    await expect(
      processNextIntegrationJob(
        runtime.db,
        clock,
        runtime.logger,
        operations,
        {
          server: "http://frontlit.test",
          provisioningSecret: "secret",
        },
        undefined,
        { server: null, provisioningApiKey: null },
      ),
    ).resolves.toBe(true);

    const [ready] = await runtime.db
      .select()
      .from(schema.schoolIntegrations)
      .where(
        and(
          eq(schema.schoolIntegrations.externalId, created.value.id),
          eq(schema.schoolIntegrations.provider, "frontlit"),
        ),
      );
    const [done] = await runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(
        and(
          eq(schema.integrationOutboxJobs.schoolId, integration!.schoolId),
          eq(schema.integrationOutboxJobs.provider, "frontlit"),
        ),
      );
    expect(ready).toMatchObject({ status: "ready", remoteTeamId: "team_1" });
    expect(ready!.encryptedTeamKey).not.toContain("fl_live_school");
    expect(done).toMatchObject({ status: "done", attempts: 1 });
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
      undefined,
      { server: null, provisioningSecret: null },
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
      email: "alice.learner@example.com",
      name: "Alice Learner",
      tags: ["learner"],
    });
    expect(contactJob.status).toBe("pending");

    // 1. Attempt sync when SendLit is down (503 Service Unavailable)
    let syncAttempts = 0;
    const syncedContacts: Array<{ email: string; name?: string }> = [];
    const taggedContacts: Array<{ contactId: string; tag: string }> = [];

    const sendLitOps: SendLitOperations = {
      provisionTeam: async () => ({
        teamId: "sl_team_test",
        externalId: created.value.id,
        name: "Test",
        created: true,
        apiKey: "sl_live_key",
      }),
      rotateKey: async () => ({ keyId: "kid_1", key: "sl_live_key" }),
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
      addContactTag: async (_key, contactId, tag) => {
        taggedContacts.push({ contactId, tag });
        return {
          contactId,
          email: "alice.learner@example.com",
          name: "Alice Learner",
          subscribed: true,
          tags: [tag],
          customFields: {},
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
      undefined,
      undefined,
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
      undefined,
      undefined,
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
    expect(taggedContacts).toEqual([{ contactId: "cnt_alice_1", tag: "learner" }]);

    await runtime.close();
  }, 20000);
});
