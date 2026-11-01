import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock, type Runtime } from "./runtime.js";
import { type SeededWorld, seedWorld } from "./seed.js";

async function setup() {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock });
  const world = await seedWorld(runtime, clock);
  return { runtime, world };
}

function ownerHeaders(world: SeededWorld) {
  return {
    cookie: world.owner.sessionCookie,
    "x-school-id": world.schoolA.publicId,
  };
}

function createContact(
  runtime: Runtime,
  headers: Record<string, string>,
  body: Record<string, unknown>,
) {
  return dispatch(runtime, {
    method: "POST",
    path: "/v1/contacts",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

async function createKey(runtime: Runtime, world: SeededWorld, permissions: string[]) {
  const created = await dispatch(runtime, {
    method: "POST",
    path: "/v1/api-keys",
    headers: ownerHeaders(world),
    body: { name: `Key ${permissions.join(",")}`, permissions },
  });
  expect(created.status).toBe(201);
  return (created.body as { key: string }).key;
}

describe("createContact", () => {
  it("creates a newsletter-only contact and queues the mailing sync", async () => {
    const { runtime, world } = await setup();
    const res = await createContact(runtime, ownerHeaders(world), {
      email: "  New.Person@Example.com ",
      name: "New Person",
    });
    expect(res.status).toBe(201);
    const contact = res.body as Record<string, any>;
    expect(contact).toMatchObject({
      email: "new.person@example.com",
      name: "New Person",
      schoolId: world.schoolA.publicId,
      status: "active",
      registrationStatus: "newsletter_only",
      marketing: { subscribed: true, tags: [] },
    });
    expect(contact.id.startsWith("cnt_")).toBe(true);

    const [account] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.publicId, contact.id));
    expect(account!.schoolId).toBe(world.schoolA.id);
    expect(account!.learnerRegisteredAt).toBeNull();
    expect(account!.contactActivatedAt).not.toBeNull();

    const jobs = await runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(
        and(
          eq(schema.integrationOutboxJobs.schoolId, world.schoolA.id),
          eq(schema.integrationOutboxJobs.type, "sync_sendlit_contact"),
        ),
      );
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.payload).toMatchObject({
      schoolAccountId: account!.id,
      ensureSubscribed: true,
    });

    const audits = await runtime.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.resourceId, contact.id));
    expect(audits.map((a) => a.action)).toContain("contact.created");

    const fetched = await dispatch(runtime, {
      method: "GET",
      path: `/v1/contacts/${contact.id}`,
      headers: ownerHeaders(world),
    });
    expect(fetched.status).toBe(200);
    await runtime.close();
  });

  it("defaults the name and honours subscribedToUpdates: false", async () => {
    const { runtime, world } = await setup();
    const res = await createContact(runtime, ownerHeaders(world), {
      email: "quiet@example.com",
      subscribedToUpdates: false,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: "quiet",
      marketing: { subscribed: false, tags: [] },
    });
    const [job] = await runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(eq(schema.integrationOutboxJobs.schoolId, world.schoolA.id));
    expect((job!.payload as { ensureSubscribed?: boolean }).ensureSubscribed).toBe(
      false,
    );
    await runtime.close();
  });

  it("returns the existing contact unchanged for a known email", async () => {
    const { runtime, world } = await setup();
    const first = await createContact(runtime, ownerHeaders(world), {
      email: "repeat@example.com",
      name: "Original",
    });
    expect(first.status).toBe(201);

    const again = await createContact(runtime, ownerHeaders(world), {
      email: "REPEAT@example.com",
      name: "Changed",
    });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({
      id: (first.body as { id: string }).id,
      name: "Original",
    });

    const rows = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, world.schoolA.id),
          eq(schema.schoolAccounts.email, "repeat@example.com"),
        ),
      );
    expect(rows).toHaveLength(1);
    await runtime.close();
  });

  it("refuses a contact whose deletion is pending", async () => {
    const { runtime, world } = await setup();
    const first = await createContact(runtime, ownerHeaders(world), {
      email: "leaving@example.com",
    });
    await runtime.db
      .update(schema.schoolAccounts)
      .set({ status: "deletion_pending" })
      .where(eq(schema.schoolAccounts.publicId, (first.body as { id: string }).id));

    const again = await createContact(runtime, ownerHeaders(world), {
      email: "leaving@example.com",
    });
    expect(again.status).toBe(409);
    expect(again.body).toMatchObject({ code: "conflict" });
    await runtime.close();
  });

  it("rejects an invalid email", async () => {
    const { runtime, world } = await setup();
    const res = await createContact(runtime, ownerHeaders(world), {
      email: "not-an-email",
    });
    expect(res.status).toBe(400);
    await runtime.close();
  });

  it("needs contacts:write on API keys and works with it", async () => {
    const { runtime, world } = await setup();
    const readKey = await createKey(runtime, world, ["contacts:read"]);
    const denied = await createContact(
      runtime,
      { "x-api-key": readKey },
      {
        email: "denied@example.com",
      },
    );
    expect(denied.status).toBe(403);
    expect(denied.body).toMatchObject({ code: "forbidden" });

    const writeKey = await createKey(runtime, world, ["contacts:write"]);
    const created = await createContact(
      runtime,
      { "x-api-key": writeKey },
      {
        email: "via-key@example.com",
        name: "Via Key",
      },
    );
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      email: "via-key@example.com",
      schoolId: world.schoolA.publicId,
    });
    await runtime.close();
  });

  it("is reachable over MCP through api.write", async () => {
    const { runtime, world } = await setup();
    const res = await dispatch(runtime, {
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${world.owner.oauthToken}`,
        "x-school-id": world.schoolA.publicId,
      },
      body: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "api.write",
          arguments: {
            operationId: "createContact",
            body: { email: "agent@example.com", name: "Agent Made" },
          },
        },
      },
    });
    const result = (
      res.body as {
        result?: { isError?: boolean; structuredContent?: Record<string, unknown> };
      }
    ).result;
    expect(result?.isError).not.toBe(true);
    expect(result?.structuredContent).toMatchObject({
      email: "agent@example.com",
      name: "Agent Made",
    });
    await runtime.close();
  });
});
