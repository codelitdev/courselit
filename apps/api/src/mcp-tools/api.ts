import {
  createPlatformError,
  PLATFORM_ERROR_CODES,
  type PlatformErrorCode,
} from "@codelitdev/platform";
import { contract, MCP_API_TOOLS, mcpParityManifest } from "@courselit/api-contract";
import { z } from "zod";
import {
  credentialAllowedByPolicy,
  type CredentialKind,
  getOperationPolicy,
  resolveOperationId,
} from "../auth/operation-policy.js";
import type { DispatchDeps } from "../deps.js";
import { dispatch } from "../dispatch.js";
import { createOpenApiDocument } from "../openapi.js";
import type { CourseLitMcpTool, Ctx, McpToolModule } from "./context.js";

type ApiRisk = keyof typeof MCP_API_TOOLS;

type ApiOperation = {
  operationId: string;
  method: string;
  path: string;
  risk: ApiRisk;
  tool: string;
};

type OpenApiOperation = {
  tags?: string[];
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    schema?: unknown;
  }>;
  requestBody?: { content?: Record<string, { schema?: unknown }> };
  responses?: Record<string, { content?: Record<string, { schema?: unknown }> }>;
};

const API_TOOL_RISK = new Map(
  (Object.entries(MCP_API_TOOLS) as Array<[ApiRisk, string]>).map(([risk, tool]) => [
    tool,
    risk,
  ]),
);

/**
 * Contract operations the parity manifest routes to a generic `api.*` tool.
 * Operations with a dedicated tool, and exempt operations, are not here.
 */
export const MCP_API_OPERATIONS: ReadonlyMap<string, ApiOperation> = new Map(
  mcpParityManifest.flatMap((entry) => {
    if (entry.parity !== "required") return [];
    const risk = API_TOOL_RISK.get(entry.mcp.tool);
    const route = (
      contract as unknown as Record<string, { method: string; path: string }>
    )[entry.rest.operationId];
    if (!risk || !route) return [];
    return [
      [
        entry.rest.operationId,
        {
          operationId: entry.rest.operationId,
          method: route.method.toUpperCase(),
          path: route.path,
          risk,
          tool: entry.mcp.tool,
        },
      ] as const,
    ];
  }),
);

let openApiCache: { url: string; byOperation: Map<string, OpenApiOperation> } | null =
  null;

/** The REST API's own OpenAPI operations, keyed by contract operation id. */
function openApiOperations(publicApiUrl: string): Map<string, OpenApiOperation> {
  if (openApiCache?.url === publicApiUrl) return openApiCache.byOperation;
  const document = createOpenApiDocument(publicApiUrl) as {
    paths: Record<string, Record<string, OpenApiOperation>>;
  };
  const byOperation = new Map<string, OpenApiOperation>();
  for (const operation of MCP_API_OPERATIONS.values()) {
    const openApiPath = operation.path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
    const found = document.paths[openApiPath]?.[operation.method.toLowerCase()];
    if (found) byOperation.set(operation.operationId, found);
  }
  openApiCache = { url: publicApiUrl, byOperation };
  return byOperation;
}

/** Whether the caller's credential and permissions let it run the operation. */
function availableTo(context: Ctx, operationId: string): boolean {
  const policy = getOperationPolicy(operationId);
  if (policy?.audience !== "school") return false;
  if (!credentialAllowedByPolicy(policy, context.credential.kind as CredentialKind)) {
    return false;
  }
  if (policy.ownerOnly && !context.isOwner) return false;
  return (policy.requiredPermissions ?? []).every((permission) =>
    context.permissions.has(permission),
  );
}

function requiredPermissions(operationId: string): readonly string[] {
  const policy = getOperationPolicy(operationId);
  return policy?.audience === "school" ? (policy.requiredPermissions ?? []) : [];
}

function unknownOperation(operationId: string) {
  return {
    error: createPlatformError("validation_failed", {
      safeDetails: { reason: "unknown_operation", operationId },
    }),
  };
}

const queryValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number(), z.boolean()])),
]);

const callInputShape = {
  operationId: z.string().min(1).describe("An operationId from api.list_operations."),
  pathParams: z
    .record(z.string())
    .optional()
    .describe(
      "Values for the operation's path parameters, e.g. { productId: 'prd_…' }.",
    ),
  query: z
    .record(queryValueSchema)
    .optional()
    .describe("Query-string parameters, as listed by api.describe_operation."),
};

function isPlatformErrorCode(value: unknown): value is PlatformErrorCode {
  return (
    typeof value === "string" &&
    (PLATFORM_ERROR_CODES as readonly string[]).includes(value)
  );
}

async function callOperation(
  deps: DispatchDeps,
  context: Ctx,
  tool: string,
  input: {
    operationId: string;
    pathParams?: Record<string, string>;
    query?: Record<string, z.infer<typeof queryValueSchema>>;
    body?: unknown;
  },
): Promise<unknown> {
  const operation = MCP_API_OPERATIONS.get(input.operationId);
  if (!operation) return unknownOperation(input.operationId);
  if (operation.tool !== tool) {
    return {
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "wrong_tool", useTool: operation.tool },
      }),
    };
  }
  let path = operation.path;
  for (const name of operation.path.match(/:([A-Za-z0-9_]+)/g) ?? []) {
    const value = input.pathParams?.[name.slice(1)];
    if (!value) {
      return {
        error: createPlatformError("validation_failed", {
          safeDetails: { reason: "missing_path_param", param: name.slice(1) },
        }),
      };
    }
    path = path.replace(name, encodeURIComponent(value));
  }
  // A parameter value must not re-route the call to another operation
  // (`media/unsplash` is its own route, not a media id).
  if (resolveOperationId(operation.method, path) !== operation.operationId) {
    return {
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "invalid_path_param" },
      }),
    };
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(input.query ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      search.append(key, String(item));
    }
  }
  const query = search.toString();
  const response = await dispatch(
    deps,
    {
      method: operation.method,
      path: query ? `${path}?${query}` : path,
      headers: {
        "content-type": "application/json",
        "x-school-id": context.publicSchoolId,
        "x-request-id": context.requestId,
      },
      body: operation.method === "GET" ? undefined : (input.body ?? {}),
    },
    {
      authenticated: {
        kind: "authenticated",
        principalId: context.principalId,
        credential: context.credential,
      },
    },
  );
  if (response.status >= 400) {
    const body = (response.body ?? {}) as {
      code?: unknown;
      details?: Record<string, string | number | boolean | null>;
    };
    return {
      error: createPlatformError(
        isPlatformErrorCode(body.code) ? body.code : "internal_error",
        {
          safeDetails: body.details,
        },
      ),
    };
  }
  if (response.status === 204 || response.body === undefined) return { ok: true };
  return Array.isArray(response.body) ? { items: response.body } : response.body;
}

const CALL_GUIDE =
  "Get the operationId from api.list_operations and its parameters and body from api.describe_operation. The call runs exactly as the REST API does, with the same permissions, validation and errors, against the connected school.";

function callTool(
  deps: DispatchDeps,
  risk: ApiRisk,
  description: string,
  inputSchema: z.ZodObject<z.ZodRawShape>,
): CourseLitMcpTool {
  const tool = MCP_API_TOOLS[risk];
  return {
    name: tool,
    description,
    risk,
    inputSchema,
    handler: ({ context, args }) =>
      callOperation(deps, context, tool, args as Parameters<typeof callOperation>[3]),
  };
}

/**
 * Generic access to every school REST operation the parity manifest routes to
 * MCP. Calls go through the REST dispatcher, so credential policy, school
 * pinning, permissions, and validation are the REST API's own.
 */
export const apiTools: McpToolModule = (deps) => [
  {
    name: "api.list_operations",
    description:
      "Lists the CourseLit API operations this connection can run beyond the dedicated tools: course sections and lessons, pricing plans, communities and spaces, website pages, blogs and branding, certificates, contact segments, memberships, analytics and school settings. Each item gives the tool that runs it (api.read for GET, api.write for POST/PATCH/PUT, api.delete for DELETE) and whether the caller has the permission it needs. Filter with search (matches the operation id, path or group) or tag.",
    risk: "read",
    inputSchema: z.object({
      search: z.string().max(100).optional(),
      tag: z.string().max(100).optional(),
    }),
    async handler({ context, args }) {
      const { search, tag } = args as { search?: string; tag?: string };
      const openApi = openApiOperations(deps.auth.publicApiUrl);
      const needle = search?.trim().toLowerCase();
      const items = [...MCP_API_OPERATIONS.values()]
        .map((operation) => ({
          operationId: operation.operationId,
          method: operation.method,
          path: operation.path,
          group: openApi.get(operation.operationId)?.tags?.[0] ?? null,
          tool: operation.tool,
          requiredPermissions: requiredPermissions(operation.operationId),
          available: availableTo(context, operation.operationId),
        }))
        .filter(
          (item) => !tag || item.group?.toLowerCase() === tag.trim().toLowerCase(),
        )
        .filter(
          (item) =>
            !needle ||
            [item.operationId, item.path, item.group ?? ""].some((text) =>
              text.toLowerCase().includes(needle),
            ),
        );
      return { items };
    },
  },
  {
    name: "api.describe_operation",
    description:
      "Describes one operation from api.list_operations: its path and query parameters, the JSON Schema of its request body, and the schema of a successful response.",
    risk: "read",
    inputSchema: z.object({ operationId: z.string().min(1) }),
    async handler({ context, args }) {
      const { operationId } = args as { operationId: string };
      const operation = MCP_API_OPERATIONS.get(operationId);
      if (!operation) return unknownOperation(operationId);
      const spec = openApiOperations(deps.auth.publicApiUrl).get(operationId);
      const success = Object.entries(spec?.responses ?? {}).find(([status]) =>
        status.startsWith("2"),
      );
      return {
        operationId,
        tool: operation.tool,
        method: operation.method,
        path: operation.path,
        group: spec?.tags?.[0] ?? null,
        requiredPermissions: requiredPermissions(operationId),
        available: availableTo(context, operationId),
        pathParams: (spec?.parameters ?? []).filter((param) => param.in === "path"),
        query: (spec?.parameters ?? []).filter((param) => param.in === "query"),
        body: spec?.requestBody?.content?.["application/json"]?.schema ?? null,
        response: success
          ? {
              status: Number(success[0]),
              schema: success[1].content?.["application/json"]?.schema ?? null,
            }
          : null,
      };
    },
  },
  callTool(
    deps,
    "read",
    `Runs a read-only (GET) CourseLit API operation. ${CALL_GUIDE}`,
    z.object(callInputShape),
  ),
  callTool(
    deps,
    "write",
    `Runs a CourseLit API operation that creates or changes data (POST, PATCH or PUT). Pass the JSON request body in body. ${CALL_GUIDE} Repeating a create usually makes a duplicate or fails with conflict, so read before retrying.`,
    z.object({
      ...callInputShape,
      body: z.unknown().optional().describe("The JSON request body."),
    }),
  ),
  callTool(
    deps,
    "destructive",
    `Runs a CourseLit API DELETE operation. Deletion cannot be undone: confirm the target with the user first and pass confirm: true. ${CALL_GUIDE}`,
    z.object({
      ...callInputShape,
      body: z
        .unknown()
        .optional()
        .describe("The JSON request body, if the operation takes one."),
      confirm: z.boolean().optional(),
    }),
  ),
];
