import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { uuidv7 } from "@codelitdev/platform";
import * as schema from "./db/schema/index.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { createSchool } from "./schools.js";
import { seedWorld } from "./seed.js";
import {
  addSequenceEmail,
  addTagToContact,
  createSegment,
  createSequence,
  createSubscriber,
  createTemplate,
  deleteSegment,
  deleteSequence,
  deleteSequenceEmail,
  deleteSubscriber,
  deleteTemplate,
  duplicateTemplate,
  getMailingSettings,
  getOverview,
  getSegment,
  getSequence,
  getSequenceStats,
  getSubscriber,
  getTemplate,
  listSegments,
  listSequences,
  listSubscribers,
  listTemplates,
  pauseSequence,
  removeTagFromContact,
  startSequence,
  updateMailingSettings,
  updateSegment,
  updateSequence,
  updateSequenceEmail,
  updateSubscriber,
  updateTemplate,
} from "./sendlit-service.js";
import { encryptIntegrationSecret } from "./utils/integration-secrets.js";
import { dispatch } from "./dispatch.js";

describe("SendLit Service", () => {
  it("manages all SendLit mailing and contact resources cleanly through CourseLit domain abstractions", async () => {
    process.env.AUTH_SECRET = "test-secret-that-is-at-least-thirty-two-characters";
    process.env.INTEGRATIONS_ENCRYPTION_KEY = "test-secret-that-is-at-least-thirty-two-characters";
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);

    const created = await createSchool(
      runtime.db,
      {
        name: "Acme School",
        subdomain: "acme-school",
        locale: "en",
        currency: "USD",
        principalId: world.owner.id,
        requestId: "req-1",
      },
      clock,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error("School creation failed");

    const [schoolRow] = await runtime.db
      .select()
      .from(schema.schools)
      .where(eq(schema.schools.publicId, created.value.id));
    const schoolId = schoolRow!.id;

    // Simulate ready SendLit integration
    await runtime.db
      .update(schema.schoolIntegrations)
      .set({
        status: "ready",
        remoteTeamId: "team_acme_1",
        encryptedTeamKey: encryptIntegrationSecret("sl_mock_team_key"),
        server: "http://127.0.0.1:4101",
      })
      .where(
        and(
          eq(schema.schoolIntegrations.schoolId, schoolId),
          eq(schema.schoolIntegrations.provider, "sendlit"),
        ),
      );

    // Mock global fetch to handle SendLit API endpoints
    const originalFetch = globalThis.fetch;
    const fetchCalls: Array<{ url: string; method: string; body?: any }> = [];

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      fetchCalls.push({ url, method, body });

      if (url.includes("/settings/general")) {
        if (method === "GET") {
          return new Response(JSON.stringify({ mailingAddress: "123 School Lane" }));
        }
        if (method === "PUT") {
          return new Response(JSON.stringify({ mailingAddress: body.mailingAddress }));
        }
      }

      if (url.includes("/contacts")) {
        if (url.includes("/tags/") && method === "POST") {
          return new Response(JSON.stringify({ contactId: "c_1", email: "learner@test.com", tags: ["vip"] }));
        }
        if (url.includes("/tags/") && method === "DELETE") {
          return new Response(JSON.stringify({ contactId: "c_1", email: "learner@test.com", tags: [] }));
        }
        if (method === "GET") {
          return new Response(
            JSON.stringify({
              items: [
                { contactId: "c_1", email: "learner1@test.com", tags: ["vip", "spring"] },
                { contactId: "c_2", email: "learner2@test.com", tags: ["vip"] },
              ],
              total: 2,
            }),
          );
        }
        if (method === "POST") {
          return new Response(JSON.stringify({ contactId: "c_new", email: body.email, tags: body.tags ?? [] }));
        }
        if (method === "PUT" || method === "PATCH") {
          return new Response(JSON.stringify({ contactId: "c_1", email: body.email, tags: body.tags ?? [] }));
        }
        if (method === "DELETE") {
          return new Response(null, { status: 204 });
        }
      }

      if (url.includes("/segments")) {
        if (method === "GET") {
          return new Response(JSON.stringify({ items: [{ id: "seg_1", name: "VIP Segment" }] }));
        }
        if (method === "POST") {
          return new Response(JSON.stringify({ id: "seg_2", name: body.name }));
        }
        if (method === "PUT" || method === "PATCH") {
          return new Response(JSON.stringify({ id: "seg_1", name: body.name }));
        }
        if (method === "DELETE") {
          return new Response(null, { status: 204 });
        }
      }

      if (url.includes("/sequences")) {
        if (url.includes("/stats")) {
          return new Response(JSON.stringify({ sent: 10, delivered: 9, opened: 5, clicked: 2 }));
        }
        if (url.includes("/start")) {
          return new Response(JSON.stringify({ status: "active" }));
        }
        if (url.includes("/pause")) {
          return new Response(JSON.stringify({ status: "paused" }));
        }
        if (url.includes("/emails") && method === "POST") {
          return new Response(JSON.stringify({ id: "em_1", subject: body.subject }));
        }
        if (url.includes("/emails/") && (method === "PATCH" || method === "PUT")) {
          return new Response(JSON.stringify({ id: "em_1", subject: body.subject }));
        }
        if (url.includes("/emails/") && method === "DELETE") {
          return new Response(null, { status: 204 });
        }
        if (method === "GET") {
          return new Response(JSON.stringify({ items: [{ id: "seq_1", title: "Welcome Sequence" }], total: 1 }));
        }
        if (method === "POST") {
          return new Response(JSON.stringify({ id: "seq_2", title: body.title, type: body.type }));
        }
        if (method === "PUT" || method === "PATCH") {
          return new Response(JSON.stringify({ id: "seq_1", title: body.title }));
        }
        if (method === "DELETE") {
          return new Response(null, { status: 204 });
        }
      }

      if (url.includes("/templates")) {
        if (url.includes("/duplicate")) {
          return new Response(JSON.stringify({ id: "tmpl_2", name: "Welcome Copy" }));
        }
        if (method === "GET") {
          return new Response(JSON.stringify({ items: [{ id: "tmpl_1", name: "Welcome Template" }] }));
        }
        if (method === "POST") {
          return new Response(JSON.stringify({ id: "tmpl_3", name: body.name }));
        }
        if (method === "PUT" || method === "PATCH") {
          return new Response(JSON.stringify({ id: "tmpl_1", name: body.name }));
        }
        if (method === "DELETE") {
          return new Response(null, { status: 204 });
        }
      }

      if (url.includes("/overview")) {
        return new Response(JSON.stringify({ totalSubscribers: 100, activeSubscribers: 95 }));
      }

      return new Response(JSON.stringify({ ok: true }));
    }) as any;

    try {
      // 1. Settings
      const settings = await getMailingSettings(runtime.db, schoolId, clock);
      expect(settings.ok).toBe(true);
      if (settings.ok) expect(settings.value.mailingAddress).toBe("123 School Lane");

      const updatedSettings = await updateMailingSettings(runtime.db, schoolId, clock, {
        mailingAddress: "456 Academy Blvd",
      });
      expect(updatedSettings.ok).toBe(true);
      if (updatedSettings.ok) expect(updatedSettings.value.mailingAddress).toBe("456 Academy Blvd");

      // 2. Contact tags
      const addTag = await addTagToContact(runtime.db, schoolId, clock, "c_1", "vip");
      expect(addTag.ok).toBe(true);

      const removeTag = await removeTagFromContact(runtime.db, schoolId, clock, "c_1", "vip");
      expect(removeTag.ok).toBe(true);

      // 3. Subscribers
      const subscribers = await listSubscribers(runtime.db, schoolId, clock);
      expect(subscribers.ok).toBe(true);
      if (subscribers.ok) expect(subscribers.value.items.length).toBe(2);

      const createdSub = await createSubscriber(runtime.db, schoolId, clock, {
        email: "newlearner@test.com",
        tags: ["vip"],
      });
      expect(createdSub.ok).toBe(true);

      const updatedSub = await updateSubscriber(runtime.db, schoolId, clock, "c_1", {
        email: "updated@test.com",
      });
      expect(updatedSub.ok).toBe(true);

      const deletedSub = await deleteSubscriber(runtime.db, schoolId, clock, "c_1");
      expect(deletedSub.ok).toBe(true);

      // 4. Segments
      const segments = await listSegments(runtime.db, schoolId, clock);
      expect(segments.ok).toBe(true);

      const createdSeg = await createSegment(runtime.db, schoolId, clock, {
        name: "Active Learners",
        filter: { aggregator: "and", filters: [] },
      });
      expect(createdSeg.ok).toBe(true);

      const updatedSeg = await updateSegment(runtime.db, schoolId, clock, "seg_1", {
        name: "VIP Learners",
      });
      expect(updatedSeg.ok).toBe(true);

      const deletedSeg = await deleteSegment(runtime.db, schoolId, clock, "seg_1");
      expect(deletedSeg.ok).toBe(true);

      // 5. Sequences
      const sequences = await listSequences(runtime.db, schoolId, clock);
      expect(sequences.ok).toBe(true);

      const createdSeq = await createSequence(runtime.db, schoolId, clock, {
        type: "sequence",
        title: "Onboarding Flow",
      });
      expect(createdSeq.ok).toBe(true);

      const seqEmail = await addSequenceEmail(runtime.db, schoolId, clock, "seq_1", {
        subject: "Day 1 Welcome",
      });
      expect(seqEmail.ok).toBe(true);

      const updatedSeqEmail = await updateSequenceEmail(runtime.db, schoolId, clock, "seq_1", "em_1", {
        subject: "Day 1 Hello",
      });
      expect(updatedSeqEmail.ok).toBe(true);

      const started = await startSequence(runtime.db, schoolId, clock, "seq_1");
      expect(started.ok).toBe(true);

      const paused = await pauseSequence(runtime.db, schoolId, clock, "seq_1");
      expect(paused.ok).toBe(true);

      const stats = await getSequenceStats(runtime.db, schoolId, clock, "seq_1");
      expect(stats.ok).toBe(true);
      if (stats.ok) expect(stats.value.sent).toBe(10);

      const deletedSeqEmail = await deleteSequenceEmail(runtime.db, schoolId, clock, "seq_1", "em_1");
      expect(deletedSeqEmail.ok).toBe(true);

      const deletedSeq = await deleteSequence(runtime.db, schoolId, clock, "seq_1");
      expect(deletedSeq.ok).toBe(true);

      // 6. Templates
      const templates = await listTemplates(runtime.db, schoolId, clock);
      expect(templates.ok).toBe(true);

      const createdTmpl = await createTemplate(runtime.db, schoolId, clock, {
        name: "Welcome Newsletter",
      });
      expect(createdTmpl.ok).toBe(true);

      const dupTmpl = await duplicateTemplate(runtime.db, schoolId, clock, "tmpl_1");
      expect(dupTmpl.ok).toBe(true);

      const updatedTmpl = await updateTemplate(runtime.db, schoolId, clock, "tmpl_1", {
        name: "Updated Newsletter",
      });
      expect(updatedTmpl.ok).toBe(true);

      const deletedTmpl = await deleteTemplate(runtime.db, schoolId, clock, "tmpl_1");
      expect(deletedTmpl.ok).toBe(true);

      // 7. Overview
      const overview = await getOverview(runtime.db, schoolId, clock);
      expect(overview.ok).toBe(true);
      if (overview.ok) expect(overview.value.totalSubscribers).toBe(100);
    } finally {
      globalThis.fetch = originalFetch;
      await runtime.close();
    }
  });

  it("routes native mailing endpoints via HTTP dispatch", async () => {
    process.env.AUTH_SECRET = "test-secret-that-is-at-least-thirty-two-characters";
    process.env.INTEGRATIONS_ENCRYPTION_KEY = "test-secret-that-is-at-least-thirty-two-characters";
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);

    process.env.SENDLIT_SERVER = "http://127.0.0.1:4101";
    process.env.SENDLIT_APIKEY = "sl_mock_admin_key";
    // Insert schoolA SendLit integration
    await runtime.db
      .insert(schema.schoolIntegrations)
      .values({
        id: uuidv7(clock),
        schoolId: world.schoolA.id,
        provider: "sendlit",
        server: "http://127.0.0.1:4101",
        externalId: world.schoolA.publicId,
        remoteTeamId: "team_school_a",
        encryptedTeamKey: encryptIntegrationSecret("sl_mock_team_key"),
        status: "ready",
        createdAt: clock.now(),
        updatedAt: clock.now(),
      });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(init.body as string) : undefined;

      if (url.includes("/settings/general")) {
        return new Response(JSON.stringify({ mailingAddress: body?.mailingAddress ?? "100 Education Way" }));
      }
      if (url.includes("/contacts")) {
        return new Response(JSON.stringify({ items: [{ contactId: "c_1", email: "learner@test.com", tags: ["vip"] }], total: 1 }));
      }
      if (url.includes("/segments")) {
        return new Response(JSON.stringify({ items: [{ id: "seg_1", name: "High Achievers" }] }));
      }
      if (url.includes("/sequences")) {
        return new Response(JSON.stringify({ items: [{ id: "seq_1", title: "Welcome Flow" }], total: 1 }));
      }
      if (url.includes("/templates")) {
        return new Response(JSON.stringify({ items: [{ id: "tmpl_1", name: "Clean Newsletter" }] }));
      }
      if (url.includes("/overview")) {
        return new Response(JSON.stringify({ totalSubscribers: 50, activeSubscribers: 48 }));
      }
      return new Response(JSON.stringify({ ok: true }));
    }) as any;

    try {
      const adminHeaders = {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      };

      // 1. GET /v1/school/mails/settings
      const getSettings = await dispatch(runtime, {
        method: "GET",
        path: "/v1/school/mails/settings",
        headers: adminHeaders,
      });
      expect(getSettings.status).toBe(200);
      expect(getSettings.body).toMatchObject({ mailingAddress: "100 Education Way" });

      // 2. PATCH /v1/school/mails/settings
      const patchSettings = await dispatch(runtime, {
        method: "PATCH",
        path: "/v1/school/mails/settings",
        headers: adminHeaders,
        body: { mailingAddress: "200 University Ave" },
      });
      expect(patchSettings.status).toBe(200);
      expect(patchSettings.body).toMatchObject({ mailingAddress: "200 University Ave" });


      // 4. GET /v1/school/mails/overview
      const getOverviewRes = await dispatch(runtime, {
        method: "GET",
        path: "/v1/school/mails/overview",
        headers: adminHeaders,
      });
      expect(getOverviewRes.status).toBe(200);
      expect(getOverviewRes.body).toMatchObject({ totalSubscribers: 50 });

      // 5. GET /v1/school/segments
      const getSegmentsRes = await dispatch(runtime, {
        method: "GET",
        path: "/v1/school/segments",
        headers: adminHeaders,
      });
      expect(getSegmentsRes.status).toBe(200);
      expect(getSegmentsRes.body).toMatchObject({ items: [{ id: "seg_1", name: "High Achievers" }] });

      // 6. GET /v1/school/mails/sequences
      const getSequencesRes = await dispatch(runtime, {
        method: "GET",
        path: "/v1/school/mails/sequences",
        headers: adminHeaders,
      });
      expect(getSequencesRes.status).toBe(200);
      expect(getSequencesRes.body).toMatchObject({ items: [{ id: "seq_1" }] });

      // 7. GET /v1/school/mails/templates
      const getTemplatesRes = await dispatch(runtime, {
        method: "GET",
        path: "/v1/school/mails/templates",
        headers: adminHeaders,
      });
      expect(getTemplatesRes.status).toBe(200);
      expect(getTemplatesRes.body).toMatchObject({ items: [{ id: "tmpl_1" }] });

      // 8. GET /v1/school/mails/subscribers
      const getSubscribersRes = await dispatch(runtime, {
        method: "GET",
        path: "/v1/school/mails/subscribers",
        headers: adminHeaders,
      });
      expect(getSubscribersRes.status).toBe(200);
      expect(getSubscribersRes.body).toMatchObject({ items: [{ contactId: "c_1" }] });

      // 9. GET /v1/school/contacts (aliased to contacts list)
      const getContactsRes = await dispatch(runtime, {
        method: "GET",
        path: "/v1/school/contacts",
        headers: adminHeaders,
      });
      expect(getContactsRes.status).toBe(200);
      expect(getContactsRes.body).toMatchObject({ items: [{ contactId: "c_1" }] });

      // 10. POST /v1/school/contacts/:contactId/tags/:tag
      const postContactTagRes = await dispatch(runtime, {
        method: "POST",
        path: "/v1/school/contacts/c_1/tags/vip",
        headers: adminHeaders,
      });
      expect(postContactTagRes.status).toBe(200);
    } finally {
      globalThis.fetch = originalFetch;
      await runtime.close();
    }
  });

});
