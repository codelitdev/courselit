import type { McpToolDefinition } from "@codelitdev/mcp-server-kit";
import type { PlatformRequestContext } from "@codelitdev/platform";
import type { DispatchDeps } from "../deps.js";
import type { CourseLitPermission } from "../permissions.js";

/** The school-scoped context every CourseLit MCP tool runs with. */
export type Ctx = PlatformRequestContext<string, string, CourseLitPermission> & {
  publicSchoolId: string;
  isOwner: boolean;
};

export type CourseLitMcpTool = McpToolDefinition<Ctx>;

/** A domain's MCP tools, built from the same dependencies as the REST dispatcher. */
export type McpToolModule = (deps: DispatchDeps) => CourseLitMcpTool[];
