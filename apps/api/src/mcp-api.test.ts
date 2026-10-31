import { describe, expect, it } from "bun:test";
import { validateParityManifest } from "@codelitdev/mcp-server-kit";
import { contract, mcpParityManifest } from "@courselit/api-contract";
import { getOperationPolicy } from "./auth/operation-policy.js";
import { dispatch, mcpFor } from "./dispatch.js";
import { MCP_API_OPERATIONS } from "./mcp-tools/api.js";
import { createPgliteRuntime, freezeRuntimeClock, type Runtime } from "./runtime.js";
import { type SeededWorld, seedWorld } from "./seed.js";

/**
 * Operations that MCP credentials (OAuth, API keys) can call over REST but that
 * stay off MCP. Exempting another one is a decision, so it changes this list.
 */
const REACHABLE_BUT_EXEMPT = new Set([
  // Authenticated by a short-lived preview token, not the caller's credential.
  "readPreviewProduct",
  "getPreviewLessonMedia",
  // Binary upload transport: an MCP client cannot send the file bytes.
  "authorizeMediaUpload",
  "finalizeMediaUpload",
  "processScormPackage",
  // Account-level reads; an MCP connection is bound to one school.
  "listSchools",
  "getEntitlement",
  "getBillingCatalog",
]);

/** Tools that are not a single REST operation: discovery and workflows. */
const NON_OPERATION_TOOLS = new Set([
  "api.list_operations",
  "api.describe_operation",
  "courses.outline.apply",
]);

type ToolResult = {
  result?: {
    isError?: boolean;
    structuredContent?: Record<string, unknown> & { code?: string; details?: unknown };
  };
};

async function setup() {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock });
  const world = await seedWorld(runtime, clock);
  return { runtime, world };
}

function call(
  runtime: Runtime,
  headers: Record<string, string>,
  name: string,
  args: Record<string, unknown> = {},
) {
  return dispatch(runtime, {
    method: "POST",
    path: "/mcp",
    headers,
    body: {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    },
  });
}

function owner(world: SeededWorld) {
  return {
    authorization: `Bearer ${world.owner.oauthToken}`,
    "x-school-id": world.schoolA.publicId,
  };
}

function structured(response: { body: unknown }) {
  return (response.body as ToolResult).result?.structuredContent ?? {};
}

function errorCode(response: { body: unknown }) {
  const result = (response.body as ToolResult).result;
  return result?.isError ? result.structuredContent?.code : undefined;
}

function allowsMcpCredential(operationId: string): boolean {
  const policy = getOperationPolicy(operationId);
  if (!policy || (policy.audience !== "school" && policy.audience !== "account")) {
    return false;
  }
  const credentials = policy.allowedCredentials as readonly string[];
  return credentials.includes("oauth") || credentials.includes("api_key");
}

describe.serial("platform conformance: REST and MCP parity", () => {
  it("documents every REST operation once and serves every required one", async () => {
    const { runtime } = await setup();
    const tools = mcpFor(runtime).listTools();
    const restOperationIds = new Set(Object.keys(contract));
    expect(
      validateParityManifest([...mcpParityManifest], {
        restOperationIds,
        mcpToolNames: new Set(tools.map((tool) => tool.name)),
        mcpToolRisks: new Map(tools.map((tool) => [tool.name, tool.risk] as const)),
      }),
    ).toEqual([]);

    const restEntries = mcpParityManifest.flatMap((entry) =>
      entry.rest ? [entry.rest.operationId] : [],
    );
    expect(restEntries.length).toBe(new Set(restEntries).size);
    expect(new Set(restEntries)).toEqual(restOperationIds);

    const documentedTools = new Set(
      mcpParityManifest.flatMap((entry) => (entry.mcp ? [entry.mcp.tool] : [])),
    );
    expect(
      tools
        .map((tool) => tool.name)
        .filter((name) => !documentedTools.has(name) && !NON_OPERATION_TOOLS.has(name)),
    ).toEqual([]);
    await runtime.close();
  });

  it("puts every operation MCP credentials can call over REST on MCP", () => {
    const required = new Set(
      mcpParityManifest.flatMap((entry) =>
        entry.parity === "required" ? [entry.rest.operationId] : [],
      ),
    );
    const reachable = Object.keys(contract).filter(allowsMcpCredential);
    expect(
      reachable.filter((id) => !required.has(id) && !REACHABLE_BUT_EXEMPT.has(id)),
    ).toEqual([]);
    // A required operation the policy keeps from MCP credentials could never
    // succeed over MCP.
    expect([...required].filter((id) => !allowsMcpCredential(id))).toEqual([]);
    expect([...REACHABLE_BUT_EXEMPT].filter((id) => required.has(id))).toEqual([]);
  });

  it("gives every tool schema node a single type", async () => {
    // ChatGPT refuses the whole tool list when a node has no type or a type array.
    const { runtime, world } = await setup();
    const listed = await dispatch(runtime, {
      method: "POST",
      path: "/mcp",
      headers: owner(world),
      body: { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
    });
    type Schema = Record<string, unknown>;
    const problems: string[] = [];
    const visit = (node: Schema, at: string) => {
      if (Array.isArray(node.anyOf)) {
        for (const [i, member] of (node.anyOf as Schema[]).entries()) {
          visit(member, `${at}.anyOf[${i}]`);
        }
        return;
      }
      if (typeof node.type !== "string") problems.push(at);
      for (const [key, child] of Object.entries(
        (node.properties ?? {}) as Record<string, Schema>,
      )) {
        visit(child, `${at}.${key}`);
      }
      if (node.items && typeof node.items === "object")
        visit(node.items as Schema, `${at}[]`);
      if (node.additionalProperties && typeof node.additionalProperties === "object") {
        visit(node.additionalProperties as Schema, `${at}{}`);
      }
    };
    const tools = (
      listed.body as { result: { tools: Array<{ name: string; inputSchema: Schema }> } }
    ).result.tools;
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) visit(tool.inputSchema, tool.name);
    expect(problems).toEqual([]);
    await runtime.close();
  });
});

describe.serial("generic api.* MCP tools", () => {
  it("lists and describes operations with the caller's access", async () => {
    const { runtime, world } = await setup();
    const listed = await call(runtime, owner(world), "api.list_operations", {
      search: "lesson",
    });
    const items = structured(listed).items as Array<{
      operationId: string;
      tool: string;
      available: boolean;
    }>;
    expect(items.find((item) => item.operationId === "createLesson")).toMatchObject({
      tool: "api.write",
      available: true,
    });
    // Session-only operations are not on MCP at all.
    const all = structured(await call(runtime, owner(world), "api.list_operations"))
      .items as Array<{ operationId: string }>;
    expect(all.some((item) => item.operationId === "createApiKey")).toBe(false);
    expect(all.length).toBe(MCP_API_OPERATIONS.size);

    const described = structured(
      await call(runtime, owner(world), "api.describe_operation", {
        operationId: "createLesson",
      }),
    );
    expect(described).toMatchObject({
      method: "POST",
      path: "/v1/products/:productId/lessons",
      tool: "api.write",
      requiredPermissions: ["products:write"],
    });
    expect(described.body).toMatchObject({ type: "object", required: ["title"] });
    await runtime.close();
  });

  it("runs operations through REST with its permissions and validation", async () => {
    const { runtime, world } = await setup();
    const productId = world.noteA.publicId;
    const section = await call(runtime, owner(world), "api.write", {
      operationId: "createSection",
      pathParams: { productId },
      body: { title: "Getting started" },
    });
    expect(structured(section).title).toBe("Getting started");

    const sections = await call(runtime, owner(world), "api.read", {
      operationId: "listSections",
      pathParams: { productId },
    });
    expect(
      (structured(sections).items as Array<{ title: string }>).map(
        (item) => item.title,
      ),
    ).toContain("Getting started");

    // REST body validation applies.
    const invalid = await call(runtime, owner(world), "api.write", {
      operationId: "createSection",
      pathParams: { productId },
      body: {},
    });
    expect(errorCode(invalid)).toBe("validation_failed");

    // Each operation runs only through the tool for its risk.
    const wrongTool = await call(runtime, owner(world), "api.write", {
      operationId: "listSections",
      pathParams: { productId },
    });
    expect(errorCode(wrongTool)).toBe("validation_failed");
    expect(structured(wrongTool).details).toMatchObject({ useTool: "api.read" });

    const missingParam = await call(runtime, owner(world), "api.read", {
      operationId: "listSections",
    });
    expect(structured(missingParam).details).toMatchObject({
      reason: "missing_path_param",
      param: "productId",
    });

    // Deletes need confirmation and then run.
    const sectionId = structured(section).id as string;
    const unconfirmed = await call(runtime, owner(world), "api.delete", {
      operationId: "deleteSection",
      pathParams: { sectionId },
    });
    expect(errorCode(unconfirmed)).toBe("forbidden");
    const deleted = await call(runtime, owner(world), "api.delete", {
      operationId: "deleteSection",
      pathParams: { sectionId },
      confirm: true,
    });
    expect((deleted.body as ToolResult).result?.isError).toBeFalsy();
    await runtime.close();
  });

  it("applies the API key's school and permissions", async () => {
    const { runtime, world } = await setup();
    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/api-keys",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { name: "read only", permissions: ["products:read"] },
    });
    const key = (created.body as { key: string }).key;
    const listed = structured(
      await call(runtime, { "x-api-key": key }, "api.list_operations", {
        search: "createSection",
      }),
    ).items as Array<{ operationId: string; available: boolean }>;
    expect(listed.find((item) => item.operationId === "createSection")?.available).toBe(
      false,
    );
    const denied = await call(runtime, { "x-api-key": key }, "api.write", {
      operationId: "createSection",
      pathParams: { productId: world.noteA.publicId },
      body: { title: "Not allowed" },
    });
    expect(errorCode(denied)).toBe("forbidden");

    // The key is pinned to school A; another school's id is ignored.
    const read = await call(
      runtime,
      { "x-api-key": key, "x-school-id": world.schoolB.publicId },
      "api.read",
      { operationId: "listSections", pathParams: { productId: world.noteA.publicId } },
    );
    expect((read.body as ToolResult).result?.isError).toBeFalsy();
    await runtime.close();
  });
});

describe.serial("courses.outline.apply", () => {
  const outline = {
    sections: [
      {
        title: "Basics",
        lessons: [
          { title: "Variables", markdown: "# Variables\n\nUse `let`.\n\n- one\n- two" },
          { title: "Functions" },
        ],
      },
      { title: "Projects", lessons: [{ title: "To-do list" }] },
    ],
  };

  it("creates sections and lessons once and is safe to retry", async () => {
    const { runtime, world } = await setup();
    const productId = world.noteA.publicId;
    const first = structured(
      await call(runtime, owner(world), "courses.outline.apply", {
        productId,
        ...outline,
      }),
    );
    expect(first.created).toEqual({ sections: 2, lessons: 3 });

    const retried = structured(
      await call(runtime, owner(world), "courses.outline.apply", {
        productId,
        ...outline,
      }),
    );
    expect(retried.created).toEqual({ sections: 0, lessons: 0 });
    expect(
      (retried.sections as Array<{ lessons: Array<{ id: string }> }>)[0]!.lessons[0]!
        .id,
    ).toBe(
      (first.sections as Array<{ lessons: Array<{ id: string }> }>)[0]!.lessons[0]!.id,
    );

    const product = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}`,
      headers: owner(world),
    });
    const lessons = (
      product.body as {
        lessons: Array<{
          title: string;
          content?: { content?: Array<{ type: string }> };
        }>;
      }
    ).lessons;
    expect(lessons.filter((lesson) => lesson.title === "Variables")).toHaveLength(1);
    await runtime.close();
  });

  it("rejects unsupported Markdown before writing anything", async () => {
    const { runtime, world } = await setup();
    const response = await call(runtime, owner(world), "courses.outline.apply", {
      productId: world.noteA.publicId,
      sections: [
        { title: "New", lessons: [{ title: "Raw", markdown: "<div>html</div>" }] },
      ],
    });
    expect(errorCode(response)).toBe("validation_failed");
    expect(structured(response).details).toMatchObject({
      reason: "unsupported_markdown",
      line: 1,
    });
    const sections = await call(runtime, owner(world), "api.read", {
      operationId: "listSections",
      pathParams: { productId: world.noteA.publicId },
    });
    expect(
      (structured(sections).items as Array<{ title: string }>).some(
        (item) => item.title === "New",
      ),
    ).toBe(false);
    await runtime.close();
  });
});
