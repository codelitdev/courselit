import {
  COURSELIT_PERMISSIONS,
  computeEffectiveCourseLitPermissions,
  MEMBER_PERMISSIONS,
  OWNER_PERMISSIONS,
  type CourseLitPermission,
} from "@courselit/api-contract";

export { COURSELIT_PERMISSIONS, MEMBER_PERMISSIONS, OWNER_PERMISSIONS };
export type { CourseLitPermission };

export const TELEMETRY_PROPERTY_ALLOWLIST = new Set([
  "path",
  "method",
  "job_id",
  "school_id",
  "request_id",
]);

export function parsePermissions(
  value: string | readonly string[],
): Set<CourseLitPermission> {
  const list = typeof value === "string" ? value.split(",") : value;
  return new Set(computeEffectiveCourseLitPermissions(list));
}

export function serializePermissions(
  permissions: Iterable<CourseLitPermission>,
): string {
  return [...permissions].join(",");
}
