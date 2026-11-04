import {
  createMcpServerKit,
  type McpServerKit,
} from "@codelitdev/mcp-server-kit";
import { createPlatformError, readOrCreateRequestId } from "@codelitdev/platform";
import { mcpParityManifest } from "@courselit/api-contract";
import { authenticateMcpRequest } from "./auth/authenticate.js";
import {
  authorizeOperationCredential,
  type CredentialKind,
  operationPermissionsAllow,
} from "./auth/operation-policy.js";
import type { DispatchDeps } from "./deps.js";
import { contactTools } from "./mcp-tools/contacts.js";
import type { CourseLitMcpTool, Ctx } from "./mcp-tools/context.js";
import { courseTools } from "./mcp-tools/courses.js";
import { mediaTools } from "./mcp-tools/media.js";
import { operationTools } from "./mcp-tools/operations.js";
import { productTools } from "./mcp-tools/products.js";
import { headerSchoolId, resolveSchoolContext } from "./school-context.js";

export type { Ctx } from "./mcp-tools/context.js";

/**
 * MCP tool -> the REST contract operations it performs. Single operations come
 * from the parity manifest; a workflow tool lists every operation it composes.
 */
export const MCP_TOOL_OPERATIONS: ReadonlyMap<string, readonly string[]> = new Map<
  string,
  readonly string[]
>([
  ...mcpParityManifest.flatMap((entry) =>
    entry.parity === "required"
      ? [[entry.mcp.tool, [entry.rest.operationId]] as const]
      : [],
  ),
  ["apply_course_outline", ["listSections", "createSection", "createLesson"]],
]);

/**
 * Applies the same fail-closed operation policy as the REST dispatcher to an
 * MCP tool: a tool with no mapped operation, or any of whose operations does
 * not allow the caller's credential kind or permissions, is refused before its
 * handler runs.
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
        // Hand-written tools call domain functions directly, so the operation's
        // required permissions are enforced here rather than by the dispatcher.
        if (!operationPermissionsAllow(operationId, input.context)) {
          return { error: createPlatformError("forbidden") };
        }
      }
      return tool.handler(input);
    },
  };
}

/** Every tool the server lists: hand-written ones first, then one per remaining operation. */
function courseLitTools(deps: DispatchDeps): CourseLitMcpTool[] {
  const handWritten = [
    ...productTools(deps),
    ...courseTools(deps),
    ...mediaTools(deps),
    ...contactTools(deps),
  ];
  const names = new Set(handWritten.map((tool) => tool.name));
  return [...handWritten, ...operationTools(deps, names)].map(guardMcpTool);
}

export function createCourseLitMcp(deps: DispatchDeps): McpServerKit<Ctx> {
  return createMcpServerKit<Ctx>({
    name: "courselit",
    version: "0.0.0",
    description:
      "CourseLit MCP server: build and run an online school. Create courses and digital downloads with their sections and lessons, and manage pricing plans, communities, the school website, media, contacts, certificates and school settings.",
    instructions:
      "Every call acts on the connected school. Each tool does one thing and is named for it (list_*, get_*, create_*, update_*, delete_*). Read before you write. Deleting, publishing, archiving, emailing contacts and changing payment or access settings need confirm: true, so ask the user first. apply_course_outline adds sections and text lessons to a course in one call.",
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
    tools: courseLitTools(deps),
  });
}
