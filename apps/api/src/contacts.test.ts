import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { createSchool } from "./schools.js";
import { seedWorld } from "./seed.js";
import { dispatch } from "./dispatch.js";
import { queueSendLitContactSync } from "./contacts.js";

describe("Unified Contacts & Segments", () => {
  it("executes the full contact lifecycle, outbox coalescing, and segments management", async () => {
    process.env.AUTH_SECRET = "test-secret-that-is-at-least-thirty-two-characters";
    process.env.INTEGRATIONS_ENCRYPTION_KEY =
      "test-secret-that-is-at-least-thirty-two-characters";
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    runtime.sendLit = { server: "http://sendlit.test", provisioningApiKey: "dummy" };
    const world = await seedWorld(runtime, clock);

    const schoolResult = await createSchool(
      runtime.db,
      {
        name: "Contacts School",
        subdomain: "contacts-school",
        locale: "en",
        currency: "USD",
        principalId: world.owner.id,
        requestId: "req_contacts_test",
      },
      clock,
    );
    expect(schoolResult.ok).toBe(true);
    if (!schoolResult.ok) throw new Error("School creation failed");
    const school = schoolResult.value;

    const [schoolRow] = await runtime.db
      .select()
      .from(schema.schools)
      .where(eq(schema.schools.publicId, school.id));
    const internalSchoolId = schoolRow.id;

    // 1. Public newsletter subscribe
    const subscribeRes = await dispatch(runtime, {
      method: "POST",
      path: "/v1/newsletter/subscribe",
      headers: { "x-school-id": school.id, "content-type": "application/json" },
      body: { email: "newsletter.fan@example.com", name: "Fan Fan" },
    });

    expect(subscribeRes.status).toBe(200);
    expect(subscribeRes.body).toMatchObject({
      status: "subscribed",
      email: "newsletter.fan@example.com",
    });

    // Verify school_accounts row
    const [contactAccount] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, internalSchoolId),
          eq(schema.schoolAccounts.email, "newsletter.fan@example.com"),
        ),
      );

    expect(contactAccount).toBeDefined();
    expect(contactAccount.publicId.startsWith("cnt_")).toBe(true);
    expect(contactAccount.learnerRegisteredAt).toBeNull();
    expect(contactAccount.status).toBe("active");
    expect(contactAccount.displayName).toBe("Fan Fan");

    // Verify outbox job was enqueued with revision 1
    const [initialJob] = await runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(
        and(
          eq(schema.integrationOutboxJobs.schoolId, internalSchoolId),
          eq(schema.integrationOutboxJobs.type, "sync_sendlit_contact"),
        ),
      );
    expect(initialJob).toBeDefined();
    expect(initialJob.revision).toBe(1);
    expect(initialJob.status).toBe("pending");
    expect(initialJob.payload).toMatchObject({
      schoolAccountId: contactAccount.id,
      ensureSubscribed: true,
    });

    // 2. Test Outbox Coalescing: trigger repeated sync enqueueing
    await queueSendLitContactSync(runtime.db, {
      schoolId: internalSchoolId,
      schoolAccountId: contactAccount.id,
      ensureSubscribed: true,
      reason: "update_1",
      clock,
    });

    await queueSendLitContactSync(runtime.db, {
      schoolId: internalSchoolId,
      schoolAccountId: contactAccount.id,
      ensureSubscribed: true,
      reason: "update_2",
      clock,
    });

    const pendingJobs = await runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(
        and(
          eq(schema.integrationOutboxJobs.schoolId, internalSchoolId),
          eq(schema.integrationOutboxJobs.type, "sync_sendlit_contact"),
        ),
      );

    // Must coalesce into a single row with revision incremented to 3
    expect(pendingJobs).toHaveLength(1);
    expect(pendingJobs[0].revision).toBe(3);

    // 3. Admin: list contacts (authenticated as owner)
    const listRes = await dispatch(runtime, {
      method: "GET",
      path: "/v1/contacts",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": school.id,
      },
    });

    expect(listRes.status).toBe(200);
    const listBody = listRes.body as { items: any[]; total: number };
    expect(listBody.items.length).toBeGreaterThanOrEqual(1);
    const listed = listBody.items.find(
      (c: any) => c.email === "newsletter.fan@example.com",
    );
    expect(listed).toBeDefined();
    expect(listed.id).toBe(contactAccount.publicId);
    expect(listed.registrationStatus).toBe("newsletter_only");

    // 4. Admin: get single contact
    const getRes = await dispatch(runtime, {
      method: "GET",
      path: `/v1/contacts/${contactAccount.publicId}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": school.id,
      },
    });
    expect(getRes.status).toBe(200);
    expect((getRes.body as any).id).toBe(contactAccount.publicId);

    // 5. Admin: patch contact profile
    const patchRes = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/contacts/${contactAccount.publicId}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": school.id,
        "content-type": "application/json",
      },
      body: {
        name: "Fan Updated",
        bio: "Avid reader and newsletter follower",
        status: "active",
      },
    });
    expect(patchRes.status).toBe(200);
    expect((patchRes.body as any).name).toBe("Fan Updated");
    expect((patchRes.body as any).bio).toBe("Avid reader and newsletter follower");

    // 6. Admin: patch marketing
    const patchMarketingRes = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/contacts/${contactAccount.publicId}/marketing`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": school.id,
        "content-type": "application/json",
      },
      body: {
        subscribed: true,
        tags: ["vip", "newsletter"],
      },
    });
    expect(patchMarketingRes.status).toBe(200);
    expect(patchMarketingRes.body).toMatchObject({
      subscribed: true,
      tags: ["vip", "newsletter"],
    });

    // 7. Admin: delete contact (Coordinated 2-stage deletion)
    // 7a. Reject deletion of school owner
    const [ownerAccount] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, internalSchoolId),
          eq(schema.schoolAccounts.userId, world.owner.id),
        ),
      );
    expect(ownerAccount).toBeDefined();

    const deleteOwnerRes = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/contacts/${ownerAccount.publicId}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": school.id,
      },
    });
    expect(deleteOwnerRes.status).toBe(403);

    // 7b. Proceed with deletion of regular contact
    const deleteRes = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/contacts/${contactAccount.publicId}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": school.id,
      },
    });
    expect(deleteRes.status).toBe(200);

    // Verify row status is now 'deletion_pending'
    const [pendingAccount] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.id, contactAccount.id));
    expect(pendingAccount.status).toBe("deletion_pending");

    // Verify erase job was enqueued
    const [eraseJob] = await runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(
        and(
          eq(schema.integrationOutboxJobs.schoolId, internalSchoolId),
          eq(schema.integrationOutboxJobs.type, "erase_sendlit_contact"),
        ),
      );
    expect(eraseJob).toBeDefined();
    expect(eraseJob.status).toBe("pending");
    expect(eraseJob.payload).toMatchObject({
      schoolAccountId: contactAccount.id,
    });

    // 8. Contact Segments routes
    const listSegmentsRes = await dispatch(runtime, {
      method: "GET",
      path: "/v1/contact-segments",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": school.id,
      },
    });
    expect(listSegmentsRes.status).toBe(200);
    expect((listSegmentsRes.body as any).items).toBeArray();

    await runtime.close();
  }, 30000);
});
