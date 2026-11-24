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
  updateTemplate,
} from "./sendlit-service.js";
import { encryptIntegrationSecret } from "./utils/integration-secrets.js";
import { dispatch } from "./dispatch.js";
import {
  jsonResponse,
  sendLitContact,
  sendLitEmail,
  sendLitSegment,
  sendLitSequence,
  sendLitTemplate,
} from "./sendlit-test-support.js";

/** A valid email body, standing in for SendLit's `system:blank` starter. */
const BLANK_SYSTEM_CONTENT = {
  style: {
    colors: {
      background: "#ffffff",
      foreground: "#000000",
      border: "#e5e5e5",
      accent: "#2563eb",
      accentForeground: "#ffffff",
    },
  },
  meta: { previewText: "" },
  content: [{ blockType: "text", settings: { content: "Hello" } }],
};

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
          return jsonResponse({
            postalAddress: { line1: "123 School Lane", country: "US" },
          });
        }
        if (method === "PUT") {
          return jsonResponse({ postalAddress: body.postalAddress });
        }
      }

      if (url.includes("/contacts")) {
        if (url.includes("/tags/") && method === "POST") {
          return jsonResponse(sendLitContact({ tags: ["vip"] }));
        }
        if (url.includes("/tags/") && method === "DELETE") {
          return jsonResponse(sendLitContact());
        }
        if (method === "GET") {
          return jsonResponse({
              items: [
                sendLitContact({ email: "learner1@test.com", tags: ["vip", "spring"] }),
                sendLitContact({
                  contactId: "c_2",
                  email: "learner2@test.com",
                  tags: ["vip"],
                }),
              ],
              total: 2,
            });
        }
        if (method === "POST") {
          return jsonResponse(
            sendLitContact({ contactId: "c_new", email: body.email, tags: body.tags ?? [] }),
            201,
          );
        }
        if (method === "PUT" || method === "PATCH") {
          return jsonResponse(sendLitContact({ tags: body.tags ?? [] }));
        }
        if (method === "DELETE") {
          return new Response(null, { status: 204 });
        }
      }

      if (url.includes("/segments")) {
        if (method === "GET") {
          return jsonResponse([sendLitSegment()]);
        }
        if (method === "POST") {
          return jsonResponse(sendLitSegment({ segmentId: "seg_2", name: body.name }), 201);
        }
        if (method === "PUT" || method === "PATCH") {
          return jsonResponse(sendLitSegment({ name: body.name }));
        }
        if (method === "DELETE") {
          return new Response(null, { status: 204 });
        }
      }

      if (url.includes("/sequences")) {
        if (url.includes("/stats")) {
          return jsonResponse({
          sent: 10,
          openRate: 0.5,
          clickThroughRate: 0.2,
          subscribersCount: 9,
        });
        }
        if (url.includes("/start")) {
          return jsonResponse(sendLitSequence({ status: "active" }));
        }
        if (url.includes("/pause")) {
          return jsonResponse(sendLitSequence({ status: "paused" }));
        }
        if (url.includes("/emails") && method === "POST") {
          const sequenceId = url.match(/\/sequences\/([^/]+)\/emails/)?.[1] ?? "seq_1";
          return jsonResponse(
            sendLitSequence({
              sequenceId,
              emailsOrder: ["em_1"],
              emails: [sendLitEmail()],
            }),
            201,
          );
        }
        if (url.includes("/emails/") && (method === "PATCH" || method === "PUT")) {
          return jsonResponse(
            sendLitSequence({
              emailsOrder: ["em_1"],
              emails: [sendLitEmail({ subject: body.subject })],
            }),
          );
        }
        if (url.includes("/emails/") && method === "DELETE") {
          return new Response(null, { status: 204 });
        }
        if (method === "GET") {
          return jsonResponse({ items: [sendLitSequence()], total: 1 });
        }
        if (method === "POST") {
          return jsonResponse(
            // SendLit ignores a title on create; the client sets it with an update.
            sendLitSequence({ sequenceId: "seq_2", title: "Untitled", type: body.type }),
            201,
          );
        }
        if (method === "PUT" || method === "PATCH") {
          return jsonResponse(
            sendLitSequence({
              sequenceId: url.match(/\/sequences\/([^/]+)$/)?.[1] ?? "seq_1",
              title: body.title,
            }),
          );
        }
        if (method === "DELETE") {
          return new Response(null, { status: 204 });
        }
      }

      if (url.includes("/system-templates")) {
        return jsonResponse({
          items: [
            {
              templateId: "system:blank",
              title: "Blank",
              description: "A blank marketing starter with a managed footer.",
              purpose: "marketing",
              content: BLANK_SYSTEM_CONTENT,
              requiredVariables: [],
              variableDefinitions: [],
            },
          ],
        });
      }

      if (url.includes("/templates")) {
        if (url.includes("/duplicate")) {
          return jsonResponse(sendLitTemplate({ templateId: "tmpl_2", title: "Welcome Copy" }), 201);
        }
        if (method === "GET") {
          return jsonResponse([sendLitTemplate()]);
        }
        if (method === "POST") {
          return jsonResponse(sendLitTemplate({ templateId: "tmpl_3", title: body.title }), 201);
        }
        if (method === "PUT" || method === "PATCH") {
          return jsonResponse(sendLitTemplate({ title: body.title }));
        }
        if (method === "DELETE") {
          return new Response(null, { status: 204 });
        }
      }

      return jsonResponse({ ok: true });
    }) as any;

    try {
      // 1. Settings
      const settings = await getMailingSettings(runtime.db, schoolId, clock);
      expect(settings.ok).toBe(true);
      if (settings.ok) {
        expect(settings.value.postalAddress?.line1).toBe("123 School Lane");
      }

      const updatedSettings = await updateMailingSettings(runtime.db, schoolId, clock, {
        postalAddress: { line1: "456 Academy Blvd", country: "US" },
      });
      expect(updatedSettings.ok).toBe(true);
      if (updatedSettings.ok) {
        expect(updatedSettings.value.postalAddress?.line1).toBe("456 Academy Blvd");
      }

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

      const deletedSub = await deleteSubscriber(runtime.db, schoolId, clock, "c_1");
      expect(deletedSub.ok).toBe(true);

      // 4. Segments
      const segments = await listSegments(runtime.db, schoolId, clock);
      expect(segments.ok).toBe(true);
      // SendLit lists segments as a bare array.
      if (segments.ok) expect(segments.value.items.map((item) => item.name)).toEqual(["VIP Segment"]);

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
      const sequences = await listSequences(runtime.db, schoolId, clock, {
        type: "sequence",
      });
      expect(sequences.ok).toBe(true);

      const createdSeq = await createSequence(runtime.db, schoolId, clock, {
        type: "sequence",
        title: "Onboarding Flow",
      });
      expect(createdSeq.ok).toBe(true);

      const sequenceFilter = {
        aggregator: "and",
        filters: [{ name: "tag", condition: "is", value: "new-student" }],
      };
      const updatedSeq = await updateSequence(runtime.db, schoolId, clock, "seq_1", {
        title: "Onboarding Flow",
        triggerType: "tag:added",
        triggerData: "new-student",
        filter: sequenceFilter,
        excludeFilter: null,
        emailsOrder: ["em_1"],
      });
      expect(updatedSeq.ok).toBe(true);
      expect(
        fetchCalls.find(
          (call) =>
            call.url.endsWith("/sequences/seq_1") &&
            call.method === "PATCH" &&
            call.body?.triggerType === "tag:added",
        )?.body,
      ).toMatchObject({
        triggerType: "tag:added",
        triggerData: "new-student",
        filter: sequenceFilter,
        excludeFilter: null,
        emailsOrder: ["em_1"],
      });

      const viewInBrowserOff = await updateSequence(runtime.db, schoolId, clock, "seq_1", {
        viewInBrowser: false,
      });
      expect(viewInBrowserOff.ok).toBe(true);
      expect(
        fetchCalls.filter(
          (call) => call.url.endsWith("/sequences/seq_1") && call.method === "PATCH",
        ).at(-1)?.body,
      ).toEqual({ viewInBrowser: false });

      const seqEmail = await addSequenceEmail(runtime.db, schoolId, clock, "seq_1", {
        subject: "Day 1 Welcome",
        templateId: "system:blank",
        delayHours: 0,
      });
      expect(seqEmail.ok).toBe(true);
      if (seqEmail.ok) expect(seqEmail.value.emailId).toBe("em_1");
      expect(
        fetchCalls.find(
          (call) =>
            call.url.endsWith("/sequences/seq_1/emails") &&
            call.method === "POST",
        )?.body,
      ).toEqual({ templateId: "system:blank" });
      expect(
        fetchCalls.find(
          (call) =>
            call.url.endsWith("/sequences/seq_1/emails/em_1") &&
            call.method === "PATCH",
        )?.body,
      ).toMatchObject({ subject: "Day 1 Welcome", delayInMillis: 0 });

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
      // Without content, the template starts from SendLit's blank starter.
      const templateCreate = fetchCalls.find(
        (call) => call.method === "POST" && call.url.endsWith("/templates"),
      );
      expect(templateCreate?.body).toMatchObject({
        title: "Welcome Newsletter",
        content: BLANK_SYSTEM_CONTENT,
      });

      const dupTmpl = await duplicateTemplate(runtime.db, schoolId, clock, "tmpl_1");
      expect(dupTmpl.ok).toBe(true);

      const updatedTmpl = await updateTemplate(runtime.db, schoolId, clock, "tmpl_1", {
        name: "Updated Newsletter",
      });
      expect(updatedTmpl.ok).toBe(true);

      const deletedTmpl = await deleteTemplate(runtime.db, schoolId, clock, "tmpl_1");
      expect(deletedTmpl.ok).toBe(true);
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
    process.env.SENDLIT_ORGANIZATION_API_KEY = "sl_mock_admin_key";
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
    const generalSettingsBodies: unknown[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(init.body as string) : undefined;

      if (url.includes("/settings/general")) {
        if (method !== "GET") generalSettingsBodies.push(body);
        return jsonResponse({
          postalAddress: body?.postalAddress ?? {
            line1: "100 Education Way",
            country: "US",
          },
        });
      }
      if (url.includes("/contacts")) {
        return jsonResponse({ items: [sendLitContact({ tags: ["vip"] })], total: 1 });
      }
      if (url.includes("/segments")) {
        return jsonResponse([sendLitSegment({ name: "High Achievers" })]);
      }
      if (url.includes("/sequences")) {
        return jsonResponse({
          items: [sendLitSequence({ title: "Welcome Flow" })],
          total: 1,
        });
      }
      if (url.includes("/templates")) {
        return jsonResponse([sendLitTemplate({ title: "Clean Newsletter" })]);
      }
      return jsonResponse({ ok: true });
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
      expect(getSettings.body).toMatchObject({
        postalAddress: { line1: "100 Education Way", country: "US" },
      });

      // 2. PATCH /v1/school/mails/settings: the address goes to SendLit as is.
      const postalAddress = {
        line1: "F-102 Shanti Dham Society",
        city: "Indore",
        postalCode: "452020",
        country: "IN",
      };
      const patchParts = await dispatch(runtime, {
        method: "PATCH",
        path: "/v1/school/mails/settings",
        headers: adminHeaders,
        body: { postalAddress },
      });
      expect(patchParts.status).toBe(200);
      expect(patchParts.body).toMatchObject({ postalAddress });
      expect(generalSettingsBodies.at(-1)).toEqual({ postalAddress });

      // Only an address in parts, with a country-code shape, is accepted.
      const sentBefore = generalSettingsBodies.length;
      for (const body of [
        {},
        { mailingAddress: "200 University Ave" },
        { mailingAddress: "200 University Ave", postalAddress },
        { postalAddress: { ...postalAddress, country: "India" } },
        { postalAddress: { ...postalAddress, line1: " " } },
      ]) {
        const refused = await dispatch(runtime, {
          method: "PATCH",
          path: "/v1/school/mails/settings",
          headers: adminHeaders,
          body,
        });
        expect(refused.status).toBe(400);
      }
      expect(generalSettingsBodies).toHaveLength(sentBefore);


      // 6. GET /v1/school/mails/sequences needs a type: SendLit lists
      // broadcasts and sequences separately.
      const untypedSequencesRes = await dispatch(runtime, {
        method: "GET",
        path: "/v1/school/mails/sequences",
        headers: adminHeaders,
      });
      expect(untypedSequencesRes.status).toBe(400);
      const getSequencesRes = await dispatch(runtime, {
        method: "GET",
        path: "/v1/school/mails/sequences?type=sequence",
        headers: adminHeaders,
      });
      expect(getSequencesRes.status).toBe(200);
      expect(getSequencesRes.body).toMatchObject({ items: [{ sequenceId: "seq_1" }] });

      // 7. GET /v1/school/mails/templates
      const getTemplatesRes = await dispatch(runtime, {
        method: "GET",
        path: "/v1/school/mails/templates",
        headers: adminHeaders,
      });
      expect(getTemplatesRes.status).toBe(200);
      expect(getTemplatesRes.body).toMatchObject({ items: [{ templateId: "tmpl_1" }] });
    } finally {
      globalThis.fetch = originalFetch;
      await runtime.close();
    }
  });

});
