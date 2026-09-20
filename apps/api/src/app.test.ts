import { describe, expect, it } from "bun:test";
import { contract } from "@courselit/api-contract";
import { eq } from "drizzle-orm";
import { createAdminAuth } from "./auth/better-auth.js";
import { composeOAuthProviderOptions } from "./auth/oauth.js";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createExpressApp } from "./express-app.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { encryptIntegrationSecret } from "./utils/integration-secrets.js";

describe.serial("reference API adapters", () => {
  it("does not run DDL when oauth-server-kit options and schema modules are imported", async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const client = new PGlite();
    composeOAuthProviderOptions("http://127.0.0.1:4000");
    await import("./db/schema/index.js");
    await import("./db/schema/billing.generated.js");
    const tables = await client.query(
      "select tablename from pg_tables where schemaname = 'public'",
    );
    expect(tables.rows).toEqual([]);
    const { drizzle } = await import("drizzle-orm/pglite");
    const db = drizzle(client);
    const auth = createAdminAuth({
      db: db as never,
      publicApiUrl: "http://127.0.0.1:4000",
      secret: "test-secret-that-is-at-least-thirty-two-characters",
    });
    await auth.auth.$context.catch(() => undefined);
    const after = await client.query(
      "select tablename from pg_tables where schemaname = 'public'",
    );
    expect(after.rows).toEqual([]);
    await client.close();
  });

  it("rejects multiple credential mechanisms as credential_ambiguous", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const response = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products",
      headers: {
        cookie: world.owner.sessionCookie,
        authorization: `Bearer ${world.owner.oauthToken}`,
      },
    });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: "credential_ambiguous" });
    await runtime.close();
  });

  it("returns unauthenticated for invalid API keys and bearer tokens with no fallback", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    await seedWorld(runtime, clock);
    const invalidKey = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products",
      headers: { "x-api-key": "key_missing.not-a-secret" },
    });
    expect(invalidKey.status).toBe(401);
    expect(invalidKey.body).toMatchObject({ code: "unauthenticated" });
    const invalidBearer = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products",
      headers: { authorization: "Bearer totally-invalid" },
    });
    expect(invalidBearer.status).toBe(401);
    expect(invalidBearer.body).toMatchObject({ code: "unauthenticated" });
    const anonymous = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products",
      headers: {},
    });
    expect(anonymous.status).toBe(401);
    expect(anonymous.body).toMatchObject({ code: "unauthenticated" });
    await runtime.close();
  });

  it("binds an API key to its school and ignores X-School-ID", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const response = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products",
      headers: {
        "x-api-key": world.apiKeyA.raw,
        "x-school-id": world.schoolB.publicId,
      },
    });
    expect(response.status).toBe(200);
    const body = response.body as {
      items: Array<{ schoolId: string; id: string }>;
    };
    expect(body.items.every((item) => item.schoolId === world.schoolA.publicId)).toBe(
      true,
    );
    expect(body.items.some((item) => item.id === world.noteA.publicId)).toBe(true);
    await runtime.close();
  });

  it("supports one-time API-key creation, metadata listing, scoped revocation, and expiry", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/api-keys",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: {
        permissions: ["products:read"],
        expiresAt: "2026-04-01T00:00:00.000Z",
      },
    });
    expect(created.status).toBe(201);
    const key = created.body as { publicId: string; raw: string };
    expect(key.raw).toContain(`${key.publicId}.`);
    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/api-keys",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(JSON.stringify(listed.body)).not.toContain(key.raw);
    const wrongTenant = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/api-keys/${key.publicId}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolB.publicId,
      },
    });
    expect(wrongTenant.status).toBe(404);
    const revoked = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/api-keys/${key.publicId}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(revoked.status).toBe(204);
    const unusable = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products",
      headers: { "x-api-key": key.raw },
    });
    expect(unusable.status).toBe(401);
    await runtime.close();
  });

  it("denies a school A member mutating school B's product", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const response = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${world.noteA.publicId}`,
      headers: {
        cookie: world.member.sessionCookie,
        "x-school-id": world.schoolB.publicId,
      },
      body: { title: "hijack" },
    });
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ code: "tenant_forbidden" });
    const still = await runtime.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.publicId, world.noteA.publicId));
    expect(still[0]?.title).toBe("Seed product");
    await runtime.close();
  });

  it("writes an application audit event for an authorized mutation", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const response = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${world.noteA.publicId}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { title: "Updated product" },
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: world.noteA.publicId,
      title: "Updated product",
    });
    const events = await runtime.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.action, "product.updated"));
    expect(events).toHaveLength(1);
    expect(events[0]?.resourceId).toBe(world.noteA.publicId);
    expect(events[0]?.actorId).toBe(world.owner.id);
    await runtime.close();
  });

  it("normalizes product slugs like the production CourseLit editor", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const headers = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };

    const normalized = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${world.noteA.publicId}`,
      headers,
      body: { slug: "My Public Course" },
    });
    expect(normalized.status).toBe(200);
    expect(normalized.body).toMatchObject({ slug: "my-public-course" });

    const invalid = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${world.noteA.publicId}`,
      headers,
      body: { slug: "!!!" },
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({
      code: "validation_failed",
      details: { reason: "invalid_slug" },
    });
    await runtime.close();
  });

  it("returns a billing entitlement from the public billing composition", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const response = await dispatch(runtime, {
      method: "GET",
      path: "/v1/billing/entitlement",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      schoolId: world.schoolA.publicId,
      entitled: true,
      activePaidPlan: "pro",
    });
    const direct = await runtime.billing.billing.commercialState(world.schoolA.id);
    expect(direct.activePaidPlan).toBe(
      (response.body as { activePaidPlan: string }).activePaidPlan,
    );
    await runtime.close();
  });

  it("authenticates OAuth bearer tokens through oauth-server-kit", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const response = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products",
      headers: {
        authorization: `Bearer ${world.owner.oauthToken}`,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      items: [{ id: world.noteA.publicId }],
    });
    await runtime.close();
  });

  it("serves the same products service over MCP with parity, isolation, and confirmation", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const { validateParityManifest } = await import("@codelitdev/mcp-server-kit");
    const { mcpParityManifest } = await import("@courselit/api-contract");
    const { createCourseLitMcp } = await import("./mcp.js");
    const mcp = createCourseLitMcp(runtime);
    const issues = validateParityManifest([...mcpParityManifest], {
      restOperationIds: new Set(Object.keys(contract)),
      mcpToolNames: new Set(mcp.listTools().map((tool) => tool.name)),
      mcpToolRisks: new Map(
        mcp.listTools().map((tool) => [tool.name, tool.risk] as const),
      ),
      now: new Date("2026-09-02T00:00:00.000Z"),
    });
    expect(issues).toEqual([]);

    const restList = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products",
      headers: {
        authorization: `Bearer ${world.owner.oauthToken}`,
        "x-school-id": world.schoolA.publicId,
      },
    });
    const mcpList = await dispatch(runtime, {
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
        params: { name: "products.list", arguments: {} },
      },
    });
    expect(restList.status).toBe(200);
    expect(mcpList.status).toBe(200);
    const restItems = (restList.body as { items: Array<{ id: string }> }).items;
    const mcpJson = (
      mcpList.body as {
        result: { content: Array<{ json: { items: Array<{ id: string }> } }> };
      }
    ).result.content[0]?.json;
    expect(mcpJson?.items.map((item) => item.id)).toEqual(
      restItems.map((item) => item.id),
    );

    const initialized = await dispatch(runtime, {
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${world.owner.oauthToken}`,
        "x-school-id": world.schoolA.publicId,
        accept: "application/json",
      },
      body: {
        jsonrpc: "2.0",
        id: 10,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "reference-test", version: "0" },
        },
      },
    });
    expect(initialized.headers?.["Mcp-Session-Id"]).toEqual(expect.any(String));
    expect(initialized.headers?.["Access-Control-Expose-Headers"]).toBe(
      "Mcp-Session-Id",
    );

    const cross = await dispatch(runtime, {
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${world.owner.oauthToken}`,
        "x-school-id": world.schoolB.publicId,
      },
      body: {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "products.update",
          arguments: { productId: world.noteA.publicId, title: "hijack" },
        },
      },
    });
    expect((cross.body as { error: { code: string } }).error.code).toBe("not_found");

    const denied = await dispatch(runtime, {
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${world.owner.oauthToken}`,
        "x-school-id": world.schoolA.publicId,
      },
      body: {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "products.delete",
          arguments: { productId: world.noteA.publicId },
        },
      },
    });
    expect((denied.body as { error: { code: string } }).error.code).toBe("forbidden");

    const deleted = await dispatch(runtime, {
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${world.owner.oauthToken}`,
        "x-school-id": world.schoolA.publicId,
      },
      body: {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "products.delete",
          arguments: { productId: world.noteA.publicId, confirm: true },
        },
      },
    });
    expect(deleted.status).toBe(200);
    const events = await runtime.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.action, "product.deleted"));
    expect(events).toHaveLength(1);
    expect(events[0]?.resourceId).toBe(world.noteA.publicId);
    await runtime.close();
  });

  it("protects the last owner from removal", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const { removeMember } = await import("./products.js");
    const result = await removeMember(
      runtime.db,
      {
        requestId: "req_last_owner",
        principalId: world.owner.id,
        tenantId: world.schoolA.id,
        credential: { kind: "session", credentialId: "sess_owner" },
        permissions: new Set(["members:manage"]),
      },
      world.owner.id,
      clock,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.error.code).toBe("conflict");
    expect(result.error.safeDetails).toEqual({ reason: "owner_cannot_be_removed" });
    await runtime.close();
  });

  it("passes platform conformance suites against the real adapter", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const { runCourseLitConformance } = await import("./conformance-adapter.js");
    const result = await runCourseLitConformance(runtime, world);
    expect(result.failures).toEqual([]);
    await runtime.close();
  });

  it("serves health and readiness bodies", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const health = await dispatch(runtime, {
      method: "GET",
      path: "/health",
      headers: {},
    });
    expect(health).toEqual({
      status: 200,
      body: {
        status: "ok",
        service: "courselit-api",
        time: "2026-03-01T00:00:00.000Z",
      },
    });
    const ready = await dispatch(runtime, {
      method: "GET",
      path: "/ready",
      headers: {},
    });
    expect(ready).toEqual({
      status: 200,
      body: { status: "ready", checks: { database: true } },
    });
    await runtime.close();
  });

  it("mounts the shared contract through the Express ts-rest adapter", async () => {
    const runtime = await createPgliteRuntime({
      clock: freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z")),
    });
    const app = createExpressApp(runtime);
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const listening = app.listen(0, () => resolve(listening));
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("listen_failed");
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-request-id")).toEqual(expect.any(String));
    const openapi = await fetch(`http://127.0.0.1:${address.port}/openapi.json`);
    expect(openapi.status).toBe(200);
    const document = (await openapi.json()) as { paths: Record<string, unknown> };
    expect(document.paths["/v1/products"]).toBeDefined();
    expect(document.paths["/v1/products/{productId}"]).toBeDefined();
    expect(document.paths["/v1/learner/auth/sign-in"]).toBeDefined();
    expect(document.paths["/v1/learner/products/{productId}/download"]).toBeDefined();
    expect(document.paths["/v1/learner/lessons/{lessonId}/complete"]).toBeDefined();
    expect(document.paths["/v1/learner/community-posts/{postId}"]).toBeDefined();
    expect(document.paths["/v1/public/site/settings"]).toBeDefined();
    expect(document.paths["/v1/public/site/pages"]).toBeDefined();
    expect(document.paths["/v1/public/site/blogs"]).toBeDefined();
    expect(document.paths["/v1/public/site/blogs/{slug}"]).toBeDefined();
    expect(document.paths["/v1/products/{productId}/preview"]).toBeDefined();
    expect(document.paths["/v1/preview/products/{productId}"]).toBeDefined();
    expect(
      document.paths["/v1/preview/products/{productId}/discussions"],
    ).toBeDefined();
    expect(
      document.paths["/v1/preview/products/{productId}/lessons/{lessonId}/discussions"],
    ).toBeDefined();
    expect(
      document.paths[
        "/v1/preview/products/{productId}/lessons/{lessonId}/discussions/comments/{commentId}/replies"
      ],
    ).toBeDefined();
    expect(document.paths["/v1/school/code-injection"]).toBeDefined();
    expect(document.paths["/v1/school/hosts"]).toBeDefined();
    expect(document.paths["/v1/school/hosts/{hostname}"]).toBeDefined();
    expect(document.paths["/v1/school/website/pages/{pageId}"]).toBeDefined();
    expect(document.paths["/v1/school/website/pages/{pageId}/publish"]).toBeDefined();
    expect(
      document.paths["/v1/school/website/pages/{pageId}/discard-draft"],
    ).toBeDefined();
    expect(document.paths["/v1/school/website/branding"]).toBeDefined();
    expect(document.paths["/v1/school/website/branding/themes"]).toBeDefined();
    expect(
      document.paths["/v1/school/website/branding/themes/{themeId}"],
    ).toBeDefined();
    expect(document.paths["/v1/school/website/blogs/{blogId}"]).toBeDefined();
    expect(document.paths["/v1/school/website/blogs/{blogId}/publish"]).toBeDefined();
    expect(
      document.paths["/v1/school/website/blogs/{blogId}/discard-draft"],
    ).toBeDefined();
    expect(document.paths["/v1/products/{productId}/sections"]).toBeDefined();
    expect(document.paths["/v1/products/{productId}/sections/reorder"]).toBeDefined();
    expect(
      document.paths["/v1/products/{productId}/certificate-template"],
    ).toBeDefined();
    const docs = await fetch(`http://127.0.0.1:${address.port}/docs`);
    expect(docs.status).toBe(200);
    expect(docs.headers.get("content-type")).toContain("text/html");
    expect(await docs.text()).toContain("Swagger UI");
    const docsInitializer = await fetch(
      `http://127.0.0.1:${address.port}/docs/swagger-ui-init.js`,
    );
    expect(docsInitializer.status).toBe(200);
    expect(await docsInitializer.text()).toContain('"/v1/products"');
    const world = await seedWorld(
      runtime,
      freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z")),
    );
    const freePlan = await fetch(
      `http://127.0.0.1:${address.port}/v1/products/${world.noteA.publicId}/plans`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: world.owner.sessionCookie,
          "x-school-id": world.schoolA.publicId,
        },
        body: JSON.stringify({ name: "Free access", kind: "free", amountMinor: 0 }),
      },
    );
    expect(freePlan.status).toBe(201);
    const patched = await fetch(
      `http://127.0.0.1:${address.port}/v1/products/${world.noteA.publicId}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: world.owner.sessionCookie,
          "x-school-id": world.schoolA.publicId,
        },
        body: JSON.stringify({ status: "published" }),
      },
    );
    expect(patched.status).toBe(200);
    expect(await patched.json()).toMatchObject({
      id: world.noteA.publicId,
      status: "published",
    });
    const certificateTemplate = await fetch(
      `http://127.0.0.1:${address.port}/v1/products/${world.noteA.publicId}/certificate-template`,
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: world.owner.sessionCookie,
          "x-school-id": world.schoolA.publicId,
        },
        body: JSON.stringify({
          title: "Certificate of completion",
          subtitle: "This certifies that",
          description: "Completed every lesson.",
          signatureName: "Anita Simpson",
          signatureDesignation: "Instructor",
          signatureImageId: null,
          logoId: null,
        }),
      },
    );
    expect(certificateTemplate.status).toBe(200);
    expect(await certificateTemplate.json()).toMatchObject({
      productId: world.noteA.publicId,
      title: "Certificate of completion",
    });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await runtime.close();
  });

  it("serves Unsplash search through the Express adapter", async () => {
    const queries: Array<string | undefined> = [];
    const runtime = await createPgliteRuntime({
      clock: freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z")),
      unsplash: {
        search: async (query) => {
          queries.push(query);
          return {
            configured: true,
            items: [
              {
                id: "photo_1",
                url: "https://images.unsplash.com/photo_1",
                thumbUrl: "https://images.unsplash.com/photo_1?w=200",
                alt: "A course workspace",
                photographer: "CourseLit Test",
              },
            ],
          };
        },
      },
    });
    const world = await seedWorld(runtime, runtime.clock);
    const app = createExpressApp(runtime);
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const listening = app.listen(0, () => resolve(listening));
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("listen_failed");

    const response = await fetch(
      `http://127.0.0.1:${address.port}/v1/media/unsplash?q=workspace`,
      {
        headers: {
          cookie: world.owner.sessionCookie,
          "x-school-id": world.schoolA.publicId,
        },
      },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      configured: true,
      items: [{ id: "photo_1", photographer: "CourseLit Test" }],
    });
    expect(queries).toEqual(["workspace"]);

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await runtime.close();
  });

  it("hides CourseLit sales pages from the ordinary FrontLit page list", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    process.env.AUTH_SECRET ??= "integration-test-auth-secret";
    const now = clock.now();
    await runtime.db.insert(schema.schoolIntegrations).values({
      id: "44444444-4444-4444-8444-444444444444",
      schoolId: world.schoolA.id,
      provider: "frontlit",
      server: "http://frontlit.test",
      externalId: world.schoolA.publicId,
      remoteTeamId: "team_pages",
      encryptedTeamKey: encryptIntegrationSecret("frontlit-team-key"),
      status: "ready",
      lastAttemptAt: null,
      lastSuccessfulSyncAt: now,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    });
    await runtime.db
      .update(schema.products)
      .set({ salesPageId: "page_legacy_sales" })
      .where(eq(schema.products.publicId, world.noteA.publicId));

    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async (input) => {
      expect(String(input)).toBe("http://frontlit.test/pages");
      return new Response(
        JSON.stringify({
          items: [
            {
              pageId: "page_home",
              name: "Homepage",
              slug: "",
              status: "published",
            },
            {
              pageId: "page_legacy_sales",
              name: "Community 1 sales page",
              slug: "community-1-sales-page",
              status: "published",
            },
            {
              pageId: "page_reserved_sales",
              name: "Demo One sales page",
              slug: "courselit-sales-product-prd-reserved",
              status: "draft",
            },
            {
              pageId: "page_regular",
              name: "Refund policy",
              slug: "refund",
              status: "published",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    try {
      const response = await dispatch(runtime, {
        method: "GET",
        path: "/v1/school/website/pages",
        headers: {
          cookie: world.owner.sessionCookie,
          "x-school-id": world.schoolA.publicId,
        },
      });
      expect(response).toMatchObject({
        status: 200,
        body: {
          items: [
            { id: "page_home", slug: "" },
            { id: "page_regular", slug: "refund" },
          ],
        },
      });
    } finally {
      globalThis.fetch = previousFetch;
      await runtime.close();
    }
  });

  it("serves public site data through CourseLit tenant APIs", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const now = clock.now();
    await runtime.db.insert(schema.schoolIntegrations).values({
      id: "33333333-3333-4333-8333-333333333333",
      schoolId: world.schoolA.id,
      provider: "frontlit",
      server: "http://frontlit.test",
      externalId: world.schoolA.publicId,
      remoteTeamId: "team_public",
      encryptedTeamKey: null,
      status: "ready",
      lastAttemptAt: null,
      lastSuccessfulSyncAt: now,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    });

    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.endsWith("/settings")) {
        return new Response(
          JSON.stringify({
            title: "School A",
            subtitle: "Learn together",
            logo: null,
            themeId: "classic",
            theme: null,
          }),
          { status: 200 },
        );
      }
      if (url.includes("/pages?")) {
        return new Response(
          JSON.stringify({
            pageId: "page_home",
            name: "Homepage",
            slug: "",
            layout: [],
            title: "Welcome",
            description: null,
            socialImage: null,
            robotsAllowed: true,
            publishedAt: null,
            updatedAt: null,
          }),
          { status: 200 },
        );
      }
      if (url.includes("/content/articles?")) {
        return new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          documentId: "doc_1",
          slug: "hello",
          title: "Hello",
          content: null,
          excerpt: null,
          featuredImage: null,
          meta: {},
          publishedAt: null,
          updatedAt: null,
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      const headers = { "x-forwarded-host": "school-a.localhost:3001" };
      const settings = await dispatch(runtime, {
        method: "GET",
        path: "/v1/public/site/settings",
        headers,
      });
      const page = await dispatch(runtime, {
        method: "GET",
        path: "/v1/public/site/pages?slug=",
        headers,
      });
      const blogs = await dispatch(runtime, {
        method: "GET",
        path: "/v1/public/site/blogs",
        headers,
      });
      const blog = await dispatch(runtime, {
        method: "GET",
        path: "/v1/public/site/blogs/hello",
        headers,
      });
      expect(settings.body).toMatchObject({
        title: "School A",
        themeId: "classic",
        codeInjectionHead: "",
        codeInjectionBody: "",
      });

      const saved = await dispatch(runtime, {
        method: "PATCH",
        path: "/v1/school/code-injection",
        headers: {
          cookie: world.owner.sessionCookie,
          "x-school-id": world.schoolA.publicId,
        },
        body: {
          codeInjectionHead: "<script>window.__head = true</script>",
          codeInjectionBody: "<script>alert('Hi')</script>",
        },
      });
      expect(saved.status).toBe(200);
      expect(saved.body).toMatchObject({
        codeInjectionHead: "<script>window.__head = true</script>",
        codeInjectionBody: "<script>alert('Hi')</script>",
      });

      const publicAfterSave = await dispatch(runtime, {
        method: "GET",
        path: "/v1/public/site/settings",
        headers,
      });
      expect(publicAfterSave.body).toMatchObject({
        title: "School A",
        codeInjectionHead: "<script>window.__head = true</script>",
        codeInjectionBody: "<script>alert('Hi')</script>",
      });
      expect(page.body).toMatchObject({ pageId: "page_home", slug: "" });
      expect(blogs.body).toEqual({ items: [], total: 0 });
      expect(blog.body).toMatchObject({ documentId: "doc_1", slug: "hello" });
    } finally {
      globalThis.fetch = previousFetch;
      await runtime.close();
    }
  });
});
