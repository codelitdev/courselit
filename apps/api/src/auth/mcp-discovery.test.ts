import { runMcpDiscoveryConformance } from "@codelitdev/platform-conformance";
import { expect, it } from "bun:test";
import { createExpressApp } from "../express-app.js";
import { createPgliteRuntime } from "../runtime.js";

it("publishes CIMD and DCR discovery and challenges unauthenticated MCP clients", async () => {
  const runtime = await createPgliteRuntime({
    serviceName: "courselit-mcp-discovery-test",
  });
  const app = createExpressApp(runtime);
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("listen_failed");
    const origin = `http://127.0.0.1:${address.port}`;

    const metadataResponse = await fetch(
      `${origin}/.well-known/oauth-authorization-server/api/auth`,
    );
    expect(metadataResponse.status).toBe(200);
    const metadata = (await metadataResponse.json()) as Record<string, unknown>;
    expect(metadata).toMatchObject({
      issuer: runtime.auth.issuer,
      client_id_metadata_document_supported: true,
      registration_endpoint: `${runtime.auth.issuer}/oauth2/register`,
    });
    expect(metadata.scopes_supported).toContain("data:read");

    const resourceMetadataResponse = await fetch(
      `${origin}/.well-known/oauth-protected-resource/mcp`,
    );
    expect(resourceMetadataResponse.status).toBe(200);
    expect(await resourceMetadataResponse.json()).toMatchObject({
      resource: runtime.auth.mcpResource,
      authorization_servers: [runtime.auth.issuer],
      scopes_supported: ["data:read"],
    });

    const unauthenticated = await fetch(`${origin}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.headers.get("www-authenticate")).toBe(
      `Bearer resource_metadata="${runtime.auth.publicApiUrl}/.well-known/oauth-protected-resource/mcp"`,
    );

    const registration = await fetch(`${origin}/api/auth/oauth2/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(registration.status).toBe(400);

    const validRegistration = await fetch(`${origin}/api/auth/oauth2/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "CourseLit MCP test client",
        redirect_uris: ["https://client.example/callback"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      }),
    });
    const validRegistrationBody = await validRegistration.json();
    expect(validRegistration.status).toBe(201);
    expect(validRegistrationBody).toMatchObject({
      client_name: "CourseLit MCP test client",
      redirect_uris: ["https://client.example/callback"],
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await runtime.close();
  }
}, 60_000);

it("platform conformance: MCP OAuth discovery", async () => {
  const runtime = await createPgliteRuntime({
    serviceName: "courselit-mcp-discovery-conformance",
  });
  const app = createExpressApp(runtime);
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("listen_failed");
    const origin = `http://127.0.0.1:${address.port}`;
    const result = await runMcpDiscoveryConformance(
      {
        async request(input) {
          const response = await fetch(`${origin}${input.path}`, {
            method: input.method,
            headers: input.headers,
            ...(input.body === undefined ? {} : { body: JSON.stringify(input.body) }),
          });
          const text = await response.text();
          return {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: text ? JSON.parse(text) : null,
          };
        },
      },
      { resourceUrl: runtime.auth.mcpResource },
    );
    expect(result.failures).toEqual([]);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await runtime.close();
  }
}, 60_000);
