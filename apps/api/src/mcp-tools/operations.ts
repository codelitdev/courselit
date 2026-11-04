import {
  createPlatformError,
  PLATFORM_ERROR_CODES,
  type PlatformErrorCode,
} from "@codelitdev/platform";
import { contract, mcpParityManifest, mcpToolName } from "@courselit/api-contract";
import { z } from "zod";
import { resolveOperationId } from "../auth/operation-policy.js";
import type { DispatchDeps } from "../deps.js";
import { dispatch } from "../dispatch.js";
import type { CourseLitMcpTool, Ctx } from "./context.js";
import { OPERATION_DESCRIPTIONS } from "./operation-descriptions.js";
import { forMcp } from "./schema.js";

type Route = {
  method: string;
  path: string;
  pathParams?: unknown;
  query?: unknown;
  body?: unknown;
};

const routes = contract as unknown as Record<string, Route>;

/**
 * The object behind a contract schema: refinements, defaults and optionality
 * wrap it, and ts-rest marks "no body" with a symbol.
 */
function objectShape(schema: unknown): z.ZodRawShape {
  let node = schema as z.ZodTypeAny | undefined;
  for (let depth = 0; node && typeof node === "object" && depth < 8; depth += 1) {
    if (node instanceof z.ZodObject) return node.shape as z.ZodRawShape;
    if (node instanceof z.ZodEffects) node = node._def.schema;
    else if (node instanceof z.ZodDefault || node instanceof z.ZodOptional) {
      node = node._def.innerType;
    } else break;
  }
  return {};
}

function isPlatformErrorCode(value: unknown): value is PlatformErrorCode {
  return (
    typeof value === "string" &&
    (PLATFORM_ERROR_CODES as readonly string[]).includes(value)
  );
}

type OperationInput = {
  pathParams: Record<string, unknown>;
  query: Record<string, unknown>;
  body: Record<string, unknown> | undefined;
};

/**
 * Runs one contract operation through the REST dispatcher, so the credential
 * policy, school pinning, permissions, validation and errors are the REST
 * API's own.
 */
async function runOperation(
  deps: DispatchDeps,
  context: Ctx,
  operationId: string,
  input: OperationInput,
): Promise<unknown> {
  const route = routes[operationId];
  if (!route) {
    return {
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "unknown_operation" },
      }),
    };
  }
  const method = route.method.toUpperCase();
  let path = route.path;
  for (const name of route.path.match(/:([A-Za-z0-9_]+)/g) ?? []) {
    const value = input.pathParams[name.slice(1)];
    if (value === undefined || value === null || value === "") {
      return {
        error: createPlatformError("validation_failed", {
          safeDetails: { reason: "missing_path_param", param: name.slice(1) },
        }),
      };
    }
    path = path.replace(name, encodeURIComponent(String(value)));
  }
  // A parameter value must not re-route the call to another operation
  // (`media/unsplash` is its own route, not a media id).
  if (resolveOperationId(method, path) !== operationId) {
    return {
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "invalid_path_param" },
      }),
    };
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(input.query)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      search.append(key, String(item));
    }
  }
  const query = search.toString();
  const response = await dispatch(
    deps,
    {
      method,
      path: query ? `${path}?${query}` : path,
      headers: {
        "content-type": "application/json",
        "x-school-id": context.publicSchoolId,
        "x-request-id": context.requestId,
      },
      body: method === "GET" ? undefined : (input.body ?? {}),
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
        { safeDetails: body.details },
      ),
    };
  }
  if (response.status === 204 || response.body === undefined) return { ok: true };
  return Array.isArray(response.body) ? { items: response.body } : response.body;
}

const CONFIRM_DESCRIPTION =
  "Ask the user to confirm this action first, then pass true. The call is refused without it.";

/**
 * One tool for a contract operation. Path parameters, query parameters and
 * body fields become a single flat input, as the REST contract names them.
 */
function operationTool(
  deps: DispatchDeps,
  operationId: string,
  tool: string,
  risk: CourseLitMcpTool["risk"],
): CourseLitMcpTool {
  const route = routes[operationId]!;
  const description = OPERATION_DESCRIPTIONS[operationId];
  if (!description) {
    throw new Error(`MCP tool ${tool} (${operationId}) has no entry in OPERATION_DESCRIPTIONS`);
  }
  const pathShape = objectShape(route.pathParams);
  const queryShape = objectShape(route.query);
  const bodyShape = objectShape(route.body);
  const pathKeys = Object.keys(pathShape);
  const queryKeys = Object.keys(queryShape);
  const bodyKeys = Object.keys(bodyShape);
  const keys = [...pathKeys, ...queryKeys, ...bodyKeys];
  if (new Set(keys).size !== keys.length || keys.includes("confirm")) {
    throw new Error(`MCP tool ${tool}: input names collide`);
  }
  return {
    name: tool,
    description,
    risk,
    inputSchema: forMcp(
      z.object({
        ...pathShape,
        ...queryShape,
        ...bodyShape,
        ...(risk === "destructive"
          ? { confirm: z.boolean().optional().describe(CONFIRM_DESCRIPTION) }
          : {}),
      }),
    ),
    handler: ({ context, args }) => {
      const input = args as Record<string, unknown>;
      const pick = (names: string[]) =>
        Object.fromEntries(
          names.flatMap((name) => (input[name] === undefined ? [] : [[name, input[name]]])),
        );
      return runOperation(deps, context, operationId, {
        pathParams: pick(pathKeys),
        query: pick(queryKeys),
        body: route.method.toUpperCase() === "GET" ? undefined : pick(bodyKeys),
      });
    },
  };
}

/**
 * A tool for every contract operation the parity manifest requires over MCP,
 * except those a hand-written tool already serves.
 */
export function operationTools(
  deps: DispatchDeps,
  handWritten: ReadonlySet<string>,
): CourseLitMcpTool[] {
  return mcpParityManifest.flatMap((entry) => {
    if (entry.parity !== "required") return [];
    const tool = entry.mcp.tool;
    if (handWritten.has(tool)) return [];
    if (tool !== mcpToolName(entry.rest.operationId)) {
      throw new Error(`MCP tool ${tool} is not named for ${entry.rest.operationId}`);
    }
    return [operationTool(deps, entry.rest.operationId, tool, entry.risk)];
  });
}

