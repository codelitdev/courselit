import { describe, expect, it } from "bun:test";
import { uuidv7 } from "@codelitdev/platform";
import { and, eq, inArray } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { processDripEmails } from "./drip-emails.js";
import {
  processNextIntegrationJob,
  type SendLitOperations,
} from "./integration-provisioning.js";
import { fromSendLitTrigger, toSendLitTrigger } from "./mail-triggers.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
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
    body: { kind: "course", title: "Automation course", slug: "automation-course" },
  });
  expect(created.status).toBe(201);
  const productId = (created.body as { id: string }).id;
  await dispatch(runtime, {
    method: "POST",
    path: `/v1/products/${productId}/plans`,
    headers: adminHeaders,
    body: { name: "Free access", kind: "free", amountMinor: 0 },
  });
  await dispatch(runtime, {
    method: "PATCH",
    path: `/v1/products/${productId}`,
    headers: adminHeaders,
    body: { status: "published" },
  });
  return { clock, runtime, world, adminHeaders, productId };
}

async function grantMembership(
  runtime: Awaited<ReturnType<typeof setUp>>["runtime"],
  adminHeaders: Record<string, string>,
  productId: string,
) {
  const granted = await dispatch(runtime, {
    method: "POST",
    path: "/v1/memberships",
    headers: adminHeaders,
    body: { productId, email: "buyer@example.com", name: "Buyer" },
  });
  expect(granted.status).toBe(201);
  const [account] = await runtime.db
    .select()
    .from(schema.schoolAccounts)
    .where(eq(schema.schoolAccounts.email, "buyer@example.com"));
  return account!;
}

describe("mail triggers", () => {
  it("stores CourseLit triggers as custom events and reads them back", () => {
    const stored = toSendLitTrigger({
      triggerType: "product:purchased",
      triggerData: "prd_1",
    });
    expect(stored).toEqual({
      triggerType: "event:custom",
      triggerData: "product purchased",
      triggerFilter: {
        aggregator: "and",
        filters: [{ key: "productId", condition: "is", value: "prd_1" }],
      },
    });
    expect(fromSendLitTrigger(stored)).toMatchObject({
      triggerType: "product:purchased",
      triggerData: "prd_1",
    });

    const anyCommunity = toSendLitTrigger({
      triggerType: "community:left",
      triggerData: "",
    });
    expect(anyCommunity).toMatchObject({
      triggerType: "event:custom",
      triggerData: "community left",
      triggerFilter: null,
    });
    expect(fromSendLitTrigger(anyCommunity)).toMatchObject({
      triggerType: "community:left",
      triggerData: null,
    });

    expect(toSendLitTrigger({ triggerType: "tag:added", triggerData: "vip" })).toEqual({
      triggerType: "tag:added",
      triggerData: "vip",
    });
    // A filter CourseLit can't represent stays a plain custom event.
    const custom = {
      triggerType: "event:custom",
      triggerData: "product purchased",
      triggerFilter: {
        aggregator: "and",
        filters: [{ key: "price", condition: "gt", value: 10 }],
      },
    };
    expect(fromSendLitTrigger(custom)).toEqual(custom);
  });
});

describe("membership events", () => {
  it("reports a product purchase to the mailing service once the contact has synced", async () => {
    const { runtime, clock, adminHeaders, productId, world } = await setUp();
    const account = await grantMembership(runtime, adminHeaders, productId);

    const [job] = await runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(
        and(
          eq(schema.integrationOutboxJobs.schoolId, world.schoolA.id),
          eq(schema.integrationOutboxJobs.type, "track_sendlit_event"),
        ),
      );
    expect(job?.payload).toMatchObject({
      schoolAccountId: account.id,
      eventName: "product purchased",
      properties: {
        productId,
        productTitle: "Automation course",
        productType: "course",
        includedInPlan: false,
      },
    });

    // Only the event job is due, so the worker picks it.
    await runtime.db
      .update(schema.integrationOutboxJobs)
      .set({ status: "done" })
      .where(
        and(
          eq(schema.integrationOutboxJobs.schoolId, world.schoolA.id),
          inArray(schema.integrationOutboxJobs.type, [
            "sync_sendlit_contact",
            "send_school_email",
          ]),
        ),
      );

    const tracked: unknown[] = [];
    const operations: SendLitOperations = {
      provisionTeam: async () => {
        throw new Error("unexpected");
      },
      rotateKey: async () => {
        throw new Error("unexpected");
      },
      trackEvent: async (_key, input) => {
        tracked.push(input);
        return {
          eventId: "evt_1",
          contactId: "cnt_1",
          duplicate: false,
          contactCreated: false,
        };
      },
    };

    // No contact yet: the job waits instead of creating one.
    await processNextIntegrationJob(
      runtime.db,
      clock,
      runtime.logger,
      operations,
      sendLitConfig,
    );
    expect(tracked).toHaveLength(0);
    const [waiting] = await runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(eq(schema.integrationOutboxJobs.id, job!.id));
    expect(waiting?.status).toBe("pending");

    await runtime.db
      .update(schema.schoolAccounts)
      .set({ sendlitContactId: "cnt_1", contactActivatedAt: clock.now() })
      .where(eq(schema.schoolAccounts.id, account.id));
    await runtime.db
      .update(schema.integrationOutboxJobs)
      .set({ nextAttemptAt: clock.now() })
      .where(eq(schema.integrationOutboxJobs.id, job!.id));
    await processNextIntegrationJob(
      runtime.db,
      clock,
      runtime.logger,
      operations,
      sendLitConfig,
    );
    expect(tracked).toEqual([
      expect.objectContaining({
        contactId: "cnt_1",
        eventName: "product purchased",
        idempotencyKey: job!.id,
        properties: expect.objectContaining({ productId }),
      }),
    ]);
    const [done] = await runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(eq(schema.integrationOutboxJobs.id, job!.id));
    expect(done?.status).toBe("done");
    await runtime.close();
  });

  it("drops an event after a week if the learner never becomes a contact", async () => {
    const { runtime, adminHeaders, productId, world } = await setUp();
    await grantMembership(runtime, adminHeaders, productId);
    await runtime.db
      .update(schema.integrationOutboxJobs)
      .set({ status: "done" })
      .where(
        and(
          eq(schema.integrationOutboxJobs.schoolId, world.schoolA.id),
          inArray(schema.integrationOutboxJobs.type, [
            "sync_sendlit_contact",
            "send_school_email",
          ]),
        ),
      );
    const tracked: unknown[] = [];
    const operations: SendLitOperations = {
      provisionTeam: async () => {
        throw new Error("unexpected");
      },
      rotateKey: async () => {
        throw new Error("unexpected");
      },
      trackEvent: async (_key, input) => {
        tracked.push(input);
        return {
          eventId: "evt_1",
          contactId: "cnt_1",
          duplicate: false,
          contactCreated: false,
        };
      },
    };
    const later = freezeRuntimeClock(new Date("2026-03-09T00:00:00.000Z"));
    await processNextIntegrationJob(
      runtime.db,
      later,
      runtime.logger,
      operations,
      sendLitConfig,
    );
    expect(tracked).toHaveLength(0);
    const [job] = await runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(eq(schema.integrationOutboxJobs.type, "track_sendlit_event"));
    expect(job?.status).toBe("done");
    await runtime.close();
  });
});

describe("section drip emails", () => {
  it("emails each learner once when their dripped section unlocks", async () => {
    const { runtime, adminHeaders, productId } = await setUp();
    const detail = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
    });
    const sectionId = (detail.body as { sections: Array<{ id: string }> }).sections[0]!
      .id;
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/sections/${sectionId}`,
      headers: adminHeaders,
      body: { dripEnabled: true, dripType: "relative-date", dripDelaySeconds: 86_400 },
    });

    const incomplete = await dispatch(runtime, {
      method: "PUT",
      path: `/v1/sections/${sectionId}/drip-email`,
      headers: adminHeaders,
      body: { enabled: true, subject: "Week 2 is open" },
    });
    expect(incomplete.status).toBe(400);

    const saved = await dispatch(runtime, {
      method: "PUT",
      path: `/v1/sections/${sectionId}/drip-email`,
      headers: adminHeaders,
      body: {
        enabled: true,
        subject: "Week 2 is open",
        content: { content: [] },
        html: "<p>Week 2 is open</p>",
      },
    });
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({
      sectionId,
      enabled: true,
      subject: "Week 2 is open",
    });

    const fetched = await dispatch(runtime, {
      method: "GET",
      path: `/v1/sections/${sectionId}/drip-email`,
      headers: adminHeaders,
    });
    expect(fetched.body).toMatchObject({ enabled: true, content: { content: [] } });

    await grantMembership(runtime, adminHeaders, productId);

    const sent: Array<{ to: string; subject?: string; html?: string }> = [];
    const sendEmail = async (
      _key: string,
      input: { to: string; subject?: string; html?: string },
    ) => {
      sent.push(input);
      return { txeId: `txe_${sent.length}` };
    };

    const beforeUnlock = freezeRuntimeClock(new Date("2026-03-01T12:00:00.000Z"));
    expect(
      await processDripEmails(runtime.db, beforeUnlock, {
        config: sendLitConfig,
        sendEmail,
      }),
    ).toBe(0);

    const afterUnlock = freezeRuntimeClock(new Date("2026-03-02T01:00:00.000Z"));
    expect(
      await processDripEmails(runtime.db, afterUnlock, {
        config: sendLitConfig,
        sendEmail,
      }),
    ).toBe(1);
    expect(sent).toEqual([
      expect.objectContaining({
        to: "buyer@example.com",
        subject: "Week 2 is open",
        html: "<p>Week 2 is open</p>",
      }),
    ]);

    expect(
      await processDripEmails(runtime.db, afterUnlock, {
        config: sendLitConfig,
        sendEmail,
      }),
    ).toBe(0);
    await runtime.close();
  });
});
