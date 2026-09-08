import { describe, expect, it } from "bun:test";
import {
  type FetchLike,
  SendLitApiError,
  createSendLitContact,
  createSendLitSequence,
  createSendLitTemplate,
  getSendLitGeneralSettings,
  listSendLitContacts,
  listSendLitSequences,
  listSendLitTemplates,
  provisionSendLitTeam,
  sendLitConfig,
  updateSendLitGeneralSettings,
} from "./sendlit-client.js";

describe("sendlit-client", () => {
  it("parses configuration correctly with development defaults", () => {
    const config = sendLitConfig({
      NODE_ENV: "development",
      SENDLIT_SERVER: "http://example.com:4101/",
    });
    expect(config.server).toBe("http://example.com:4101");
    expect(config.provisioningApiKey).toBeTruthy();
  });

  it("throws SendLitApiError when server is not configured", async () => {
    await expect(
      provisionSendLitTeam(
        { externalId: "sch_123", name: "My School" },
        { config: { server: null, provisioningApiKey: "key" } },
      ),
    ).rejects.toThrow(SendLitApiError);
  });

  it("provisions a team via POST /provisioning/teams", async () => {
    const fetcher: FetchLike = async (input, init) => {
      expect(String(input)).toBe("http://127.0.0.1:4101/provisioning/teams");
      expect(init?.method).toBe("POST");
      const headers = init?.headers as Record<string, string>;
      expect(headers.authorization).toBe("Bearer test-org-key");
      expect(headers["content-type"]).toBe("application/json");

      const body = JSON.parse(init?.body as string);
      expect(body.externalId).toBe("sch_abc");
      expect(body.name).toBe("Academy");

      return new Response(
        JSON.stringify({
          teamId: "team_1",
          externalId: "sch_abc",
          name: "Academy",
          created: true,
          apiKey: "sl_team_key_123",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const result = await provisionSendLitTeam(
      { externalId: "sch_abc", name: "Academy" },
      {
        config: {
          server: "http://127.0.0.1:4101",
          provisioningApiKey: "test-org-key",
        },
        fetcher,
      },
    );

    expect(result.teamId).toBe("team_1");
    expect(result.apiKey).toBe("sl_team_key_123");
    expect(result.created).toBe(true);
  });

  it("manages general settings with team apiKey", async () => {
    let putCalled = false;
    const fetcher: FetchLike = async (input, init) => {
      expect(String(input)).toBe("http://127.0.0.1:4101/settings/general");
      const headers = init?.headers as Record<string, string>;
      expect(headers["x-sendlit-apikey"]).toBe("team_key");

      if (init?.method === "GET") {
        return new Response(
          JSON.stringify({ mailingAddress: "123 Main St", updatedAt: "2026-01-01" }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (init?.method === "PUT") {
        putCalled = true;
        const body = JSON.parse(init?.body as string);
        expect(body.mailingAddress).toBe("456 New St");
        return new Response(
          JSON.stringify({ mailingAddress: "456 New St", updatedAt: "2026-01-02" }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      throw new Error(`Unexpected method ${init?.method}`);
    };

    const settings = await getSendLitGeneralSettings("team_key", {
      config: { server: "http://127.0.0.1:4101", provisioningApiKey: null },
      fetcher,
    });
    expect(settings.mailingAddress).toBe("123 Main St");

    const updated = await updateSendLitGeneralSettings(
      "team_key",
      { mailingAddress: "456 New St" },
      {
        config: { server: "http://127.0.0.1:4101", provisioningApiKey: null },
        fetcher,
      },
    );
    expect(putCalled).toBe(true);
    expect(updated.mailingAddress).toBe("456 New St");
  });

  it("handles contact operations", async () => {
    const fetcher: FetchLike = async (input, init) => {
      const url = String(input);
      if (url.includes("/contacts?") && init?.method === "GET") {
        return new Response(
          JSON.stringify({
            items: [
              {
                contactId: "cnt_1",
                email: "learner@test.com",
                name: "Learner 1",
                subscribed: true,
                tags: ["webdev"],
                customFields: {},
                unsubscribeToken: "tok_1",
                createdAt: "2026-01-01",
                updatedAt: "2026-01-01",
              },
            ],
            total: 1,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.endsWith("/contacts") && init?.method === "POST") {
        const body = JSON.parse(init?.body as string);
        return new Response(
          JSON.stringify({
            contactId: "cnt_2",
            email: body.email,
            name: body.name ?? null,
            subscribed: true,
            tags: body.tags ?? [],
            customFields: body.customFields ?? {},
            unsubscribeToken: "tok_2",
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      throw new Error(`Unhandled request: ${url}`);
    };

    const contacts = await listSendLitContacts(
      "team_key",
      { rowsPerPage: 10 },
      { config: { server: "http://127.0.0.1:4101", provisioningApiKey: null }, fetcher },
    );
    expect(contacts.items).toHaveLength(1);
    expect(contacts.items[0].email).toBe("learner@test.com");

    const created = await createSendLitContact(
      "team_key",
      { email: "new@test.com", name: "New User", tags: ["vip"] },
      { config: { server: "http://127.0.0.1:4101", provisioningApiKey: null }, fetcher },
    );
    expect(created.contactId).toBe("cnt_2");
    expect(created.tags).toContain("vip");
  });

  it("handles sequences and templates", async () => {
    const fetcher: FetchLike = async (input, init) => {
      const url = String(input);
      if (url.includes("/sequences") && init?.method === "GET") {
        return new Response(
          JSON.stringify({
            items: [
              {
                sequenceId: "seq_1",
                title: "Welcome Broadcast",
                type: "broadcast",
                status: "draft",
              },
            ],
            total: 1,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/templates") && init?.method === "GET") {
        return new Response(
          JSON.stringify({
            items: [
              {
                templateId: "tpl_1",
                title: "Default Template",
                purpose: "marketing",
                content: { content: [] },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      throw new Error(`Unhandled request: ${url}`);
    };

    const sequences = await listSendLitSequences(
      "team_key",
      { type: "broadcast" },
      { config: { server: "http://127.0.0.1:4101", provisioningApiKey: null }, fetcher },
    );
    expect(sequences.items[0].title).toBe("Welcome Broadcast");

    const templates = await listSendLitTemplates(
      "team_key",
      { purpose: "marketing" },
      { config: { server: "http://127.0.0.1:4101", provisioningApiKey: null }, fetcher },
    );
    expect(templates.items[0].title).toBe("Default Template");
  });
});
