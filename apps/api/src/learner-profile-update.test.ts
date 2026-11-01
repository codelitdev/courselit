import { describe, expect, it } from "bun:test";
import { and, eq, sql } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { processNextIntegrationJob } from "./integration-provisioning.js";
import {
  authenticateLearner,
  signUpLearner,
  updateLearnerProfile,
} from "./learners.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import type { SendLitContact } from "./sendlit-client.js";
import { encryptIntegrationSecret } from "./utils/integration-secrets.js";

const SENDLIT = { server: "http://sendlit.test", provisioningApiKey: "prov_key" };

function contact(
  contactId: string,
  email: string,
  input: Partial<SendLitContact> = {},
): SendLitContact {
  return {
    contactId,
    email,
    name: null,
    subscribed: true,
    tags: [],
    customFields: {},
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...input,
  };
}

async function contactSyncJobs(
  runtime: Awaited<ReturnType<typeof createPgliteRuntime>>,
  schoolAccountId: string,
) {
  return runtime.db
    .select()
    .from(schema.integrationOutboxJobs)
    .where(
      and(
        eq(schema.integrationOutboxJobs.type, "sync_sendlit_contact"),
        eq(schema.integrationOutboxJobs.status, "pending"),
        sql`(${schema.integrationOutboxJobs.payload}->>'schoolAccountId') = ${schoolAccountId}`,
      ),
    );
}

async function readySendLit(
  runtime: Awaited<ReturnType<typeof createPgliteRuntime>>,
  schoolId: string,
  now: Date,
) {
  process.env.INTEGRATIONS_ENCRYPTION_KEY ??= "learner-profile-test-integration-key";
  await runtime.db.insert(schema.schoolIntegrations).values({
    id: crypto.randomUUID(),
    schoolId,
    provider: "sendlit",
    server: SENDLIT.server,
    externalId: `ext_${schoolId}`,
    remoteTeamId: "sl_team_test",
    encryptedTeamKey: encryptIntegrationSecret("sl_team_key_123"),
    status: "ready",
    createdAt: now,
    updatedAt: now,
  });
}

describe.serial("learner profile", () => {
  it("lets the signed-in learner update their bio and marketing subscription", async () => {
    const clock = freezeRuntimeClock(new Date("2026-04-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const signedUp = await signUpLearner(
      runtime.db,
      {
        email: "bio.learner@example.com",
        password: "securepassword123",
        name: "Bio Learner",
        schoolPublicId: world.schoolA.publicId,
      },
      clock,
      "req-signup",
    );
    expect(signedUp.ok).toBe(true);
    if (!signedUp.ok) throw new Error("sign up failed");
    const cookie = `courselit.learner.session=${signedUp.token}`;

    const [account] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.email, "bio.learner@example.com"));
    // Sign-up queues a sync that subscribes the new contact.
    expect((await contactSyncJobs(runtime, account!.id))[0]?.payload).toMatchObject({
      ensureSubscribed: true,
    });

    const updated = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/learner/me",
      headers: { cookie },
      body: {
        name: "Bio Learner",
        bio: "  I like learning.  ",
        emailUpdatesEnabled: false,
      },
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      email: "bio.learner@example.com",
      bio: "I like learning.",
      emailUpdatesEnabled: false,
    });

    const [stored] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.id, account!.id));
    expect(stored!.bio).toBe("I like learning.");

    // The unsubscribe overrides the pending sign-up subscription.
    const jobs = await contactSyncJobs(runtime, account!.id);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.payload).toMatchObject({
      subscribed: false,
      ensureSubscribed: false,
    });

    // A later profile save that does not touch the preference keeps it.
    const renamed = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/learner/me",
      headers: { cookie },
      body: { name: "Renamed Learner" },
    });
    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({
      name: "Renamed Learner",
      bio: "I like learning.",
    });
    expect((await contactSyncJobs(runtime, account!.id))[0]!.payload).toMatchObject({
      subscribed: false,
    });

    const me = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/me",
      headers: { cookie },
    });
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ bio: "I like learning." });

    const tooLong = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/learner/me",
      headers: { cookie },
      body: { name: "Renamed Learner", bio: "x".repeat(2_001) },
    });
    expect(tooLong.status).toBe(400);

    const anonymous = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/learner/me",
      headers: { "x-school-id": world.schoolA.publicId },
      body: { name: "Nobody", emailUpdatesEnabled: false },
    });
    expect(anonymous.status).toBe(401);

    await runtime.close();
  });

  it("unsubscribes a queued contact in the mailing service when the sync runs", async () => {
    const clock = freezeRuntimeClock(new Date("2026-04-02T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    await readySendLit(runtime, world.schoolA.id, clock.now());

    const signedUp = await signUpLearner(
      runtime.db,
      {
        email: "queued.learner@example.com",
        password: "securepassword123",
        name: "Queued Learner",
        schoolPublicId: world.schoolA.publicId,
      },
      clock,
      "req-signup",
    );
    if (!signedUp.ok) throw new Error("sign up failed");
    const updated = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/learner/me",
      headers: { cookie: `courselit.learner.session=${signedUp.token}` },
      body: { name: "Queued Learner", emailUpdatesEnabled: false },
    });
    expect(updated.status).toBe(200);

    const updates: Array<{ contactId: string; subscribed?: boolean }> = [];
    const processed = await processNextIntegrationJob(
      runtime.db,
      clock,
      runtime.logger,
      {
        provisionTeam: async () => {
          throw new Error("unexpected");
        },
        rotateKey: async () => {
          throw new Error("unexpected");
        },
        listContacts: async () => ({ items: [], total: 0 }),
        createContact: async (_key, input) =>
          contact("cnt_queued", input.email, { name: input.name ?? null }),
        updateContact: async (_key, contactId, input) => {
          updates.push({ contactId, subscribed: input.subscribed });
          return contact(contactId, "queued.learner@example.com", {
            subscribed: input.subscribed ?? true,
          });
        },
      },
      SENDLIT,
    );
    expect(processed).toBe(true);
    expect(updates).toEqual([{ contactId: "cnt_queued", subscribed: false }]);

    await runtime.close();
  });

  it("updates a linked contact's subscription directly", async () => {
    const clock = freezeRuntimeClock(new Date("2026-04-03T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    await readySendLit(runtime, world.schoolA.id, clock.now());

    const signedUp = await signUpLearner(
      runtime.db,
      {
        email: "linked.learner@example.com",
        password: "securepassword123",
        name: "Linked Learner",
        schoolPublicId: world.schoolA.publicId,
      },
      clock,
      "req-signup",
    );
    if (!signedUp.ok) throw new Error("sign up failed");
    await runtime.db
      .update(schema.schoolAccounts)
      .set({ sendlitContactId: "cnt_linked", contactActivatedAt: clock.now() })
      .where(eq(schema.schoolAccounts.email, "linked.learner@example.com"));
    await runtime.db.delete(schema.integrationOutboxJobs);

    const auth = await authenticateLearner(
      runtime.db,
      { cookie: `courselit.learner.session=${signedUp.token}` },
      clock,
    );
    if (auth.kind !== "authenticated") throw new Error("not authenticated");

    const requests: Array<{ method: string; url: string; body: unknown }> = [];
    const originalFetch = globalThis.fetch;
    let subscribed = true;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      requests.push({ method, url, body });
      if (method === "PATCH" && typeof body?.subscribed === "boolean") {
        subscribed = body.subscribed;
      }
      if (method === "GET") {
        return Response.json({
          items: [contact("cnt_linked", "linked.learner@example.com", { subscribed })],
          total: 1,
        });
      }
      return Response.json(
        contact("cnt_linked", "linked.learner@example.com", { subscribed }),
      );
    }) as typeof globalThis.fetch;

    try {
      const result = await updateLearnerProfile(
        runtime.db,
        auth.value,
        { name: "Linked Learner", emailUpdatesEnabled: false },
        clock,
        "req-update",
        SENDLIT,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("update failed");
      expect(result.value.emailUpdatesEnabled).toBe(false);
      expect(requests[0]).toMatchObject({
        method: "PATCH",
        url: `${SENDLIT.server}/contacts/cnt_linked`,
        body: { subscribed: false },
      });

      // Saving other details reports the live subscription.
      const resaved = await updateLearnerProfile(
        runtime.db,
        auth.value,
        { name: "Linked Learner", bio: "Hello" },
        clock,
        "req-update-2",
        SENDLIT,
      );
      if (!resaved.ok) throw new Error("update failed");
      expect(resaved.value).toMatchObject({ bio: "Hello", emailUpdatesEnabled: false });
    } finally {
      globalThis.fetch = originalFetch;
    }

    // The profile sync that follows carries no subscription override.
    const [job] = await runtime.db.select().from(schema.integrationOutboxJobs);
    expect(job?.payload).not.toHaveProperty("subscribed");

    await runtime.close();
  });
});
