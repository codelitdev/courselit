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

export function parsePermissions(value: string): Set<CourseLitPermission> {
  return new Set(computeEffectiveCourseLitPermissions(value.split(",")));
}

export function serializePermissions(
  permissions: Iterable<CourseLitPermission>,
): string {
  return [...permissions].join(",");
}
