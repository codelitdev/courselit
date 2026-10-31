import {
  createMcpServerKit,
  type McpServerKit,
} from "@codelitdev/mcp-server-kit";
import { createPlatformError, readOrCreateRequestId } from "@codelitdev/platform";
import { MCP_API_TOOLS, mcpParityManifest } from "@courselit/api-contract";
import { authenticateMcpRequest } from "./auth/authenticate.js";
import {
  authorizeOperationCredential,
  type CredentialKind,
  operationPermissionsAllow,
} from "./auth/operation-policy.js";
import type { DispatchDeps } from "./deps.js";
import { apiTools } from "./mcp-tools/api.js";
import { contactTools } from "./mcp-tools/contacts.js";
import type { CourseLitMcpTool, Ctx } from "./mcp-tools/context.js";
import { courseTools } from "./mcp-tools/courses.js";
import { mediaTools } from "./mcp-tools/media.js";
import { productTools } from "./mcp-tools/products.js";
import { headerSchoolId, resolveSchoolContext } from "./school-context.js";

export type { Ctx } from "./mcp-tools/context.js";

const API_TOOL_NAMES: ReadonlySet<string> = new Set(Object.values(MCP_API_TOOLS));

/**
 * Dedicated MCP tool -> the REST contract operations it performs. Single
 * operations come from the parity manifest; a workflow tool lists every
 * operation it composes. The generic `api.*` tools are not here: they run
 * operations through the REST dispatcher, which applies the policy itself.
 */
export const MCP_TOOL_OPERATIONS: ReadonlyMap<string, readonly string[]> = new Map<
  string,
  readonly string[]
>([
  ...mcpParityManifest.flatMap((entry) =>
    entry.parity === "required" && !API_TOOL_NAMES.has(entry.mcp.tool)
      ? [[entry.mcp.tool, [entry.rest.operationId]] as const]
      : [],
  ),
  ["courses.outline.apply", ["listSections", "createSection", "createLesson"]],
]);

/**
 * Applies the same fail-closed operation policy as the REST dispatcher to a
 * dedicated MCP tool: a tool with no mapped operation, or any of whose
 * operations does not allow the caller's credential kind or permissions, is
 * refused before its handler runs.
 */
export function guardMcpTool(tool: CourseLitMcpTool): CourseLitMcpTool {
  const operationIds = MCP_TOOL_OPERATIONS.get(tool.name) ?? [];
  return {
    ...tool,
    async handler(input) {
      if (operationIds.length === 0) {
        return {
          error: createPlatformError("forbidden", {
            safeDetails: { reason: "credential_not_allowed" },
          }),
        };
      }
      for (const operationId of operationIds) {
        const denied = authorizeOperationCredential(
          operationId,
          input.context.credential.kind as CredentialKind,
        );
        if (denied) return { error: denied };
        // Dedicated tools call domain functions directly, so the operation's
        // required permissions are enforced here rather than by the dispatcher.
        if (!operationPermissionsAllow(operationId, input.context)) {
          return { error: createPlatformError("forbidden") };
        }
      }
      return tool.handler(input);
    },
  };
}

export function createCourseLitMcp(deps: DispatchDeps): McpServerKit<Ctx> {
  return createMcpServerKit<Ctx>({
    name: "courselit",
    version: "0.0.0",
    description:
      "CourseLit MCP server: build and run an online school. Create courses and digital downloads with their sections and lessons, and manage pricing plans, communities, the school website, media, contacts, certificates and school settings.",
    instructions:
      "Every call acts on the connected school. Use the dedicated tools for products, media and contacts, and courses.outline.apply to add sections and text lessons to a course. Everything else the CourseLit REST API offers is reachable through api.list_operations (find an operation), api.describe_operation (its parameters and body) and then api.read, api.write or api.delete. Read before you write, and confirm deletions with the user before passing confirm: true.",
    onError: ({ error, source }) =>
      deps.observability?.captureException({ error, source }),
    authenticate: (headers) => authenticateMcpRequest(headers, deps),
    async resolveContext({ principalId, credential, headers }) {
      const school = await resolveSchoolContext({
        db: deps.db,
        clock: deps.clock,
        principalId,
        credential: credential.credential,
        requestedPublicSchoolId: headerSchoolId(
          headers as Record<string, string | string[] | undefined>,
        ),
      });
      if (!school.ok) return school;
      return {
        ok: true,
        context: {
          requestId: readOrCreateRequestId(
            typeof headers["x-request-id"] === "string"
              ? headers["x-request-id"]
              : undefined,
            deps.clock,
          ),
          principalId,
          tenantId: school.value.schoolId,
          credential: credential.credential,
          permissions: school.value.permissions,
          publicSchoolId: school.value.publicId,
          isOwner: school.value.isOwner,
        },
      };
    },
    tools: [
      ...[
        ...productTools(deps),
        ...courseTools(deps),
        ...mediaTools(deps),
        ...contactTools(deps),
      ].map(guardMcpTool),
      ...apiTools(deps),
    ],
  });
}
