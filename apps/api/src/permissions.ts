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

/** Allowlisted properties holding opaque record ids, which telemetry keeps unmasked. */
export const TELEMETRY_IDENTIFIER_KEYS = new Set(["job_id", "school_id", "request_id"]);

export function parsePermissions(
  value: string | readonly string[],
): Set<CourseLitPermission> {
  const list = typeof value === "string" ? value.split(",") : value;
  return new Set(computeEffectiveCourseLitPermissions(list));
}

/**
 * An OAuth request keeps only the member's permissions that its granted data
 * scopes cover (Platform ADR 0008): `*:read` permissions need `data:read`, and
 * everything that creates, changes, deletes, or sends needs `data:write`.
 */
export function narrowToScopes(
  permissions: ReadonlySet<CourseLitPermission>,
  scopes: readonly string[],
): Set<CourseLitPermission> {
  const canRead = scopes.includes("data:read");
  const canWrite = scopes.includes("data:write");
  return new Set(
    [...permissions].filter((permission) =>
      permission.endsWith(":read") ? canRead : canWrite,
    ),
  );
}

export function serializePermissions(
  permissions: Iterable<CourseLitPermission>,
): string {
  return [...permissions].join(",");
}
