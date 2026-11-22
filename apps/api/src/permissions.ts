import {
  COURSELIT_PERMISSIONS,
  computeEffectiveCourseLitPermissions,
  MEMBER_PERMISSIONS,
  OWNER_PERMISSIONS,
  type CourseLitPermission,
} from "@courselit/api-contract";

export { COURSELIT_PERMISSIONS, MEMBER_PERMISSIONS, OWNER_PERMISSIONS };
export type { CourseLitPermission };

/** Event and group properties PostHog may receive. Anything else is dropped. */
export const PRODUCT_EVENT_PROPERTIES = [
  "step",
  "status",
  "previous_status",
  "plan",
  "previous_plan",
  "interval",
  "offer_key",
  "product_type",
  "entity_type",
  "included_in_plan",
  "billing_mode",
  "method",
  "provider",
  "action",
  "kind",
  "role",
  "currency",
  "amount_minor",
  "product_id",
  "name",
] as const;

/** Product event properties that hold opaque ids, kept unmasked. */
export const PRODUCT_EVENT_IDENTIFIER_KEYS = ["product_id"] as const;

export const TELEMETRY_PROPERTY_ALLOWLIST = new Set<string>([
  "path",
  "method",
  "job_id",
  "school_id",
  "request_id",
  ...PRODUCT_EVENT_PROPERTIES,
]);

/** Allowlisted properties holding opaque record ids, which telemetry keeps unmasked. */
export const TELEMETRY_IDENTIFIER_KEYS = new Set<string>([
  "job_id",
  "school_id",
  "request_id",
  ...PRODUCT_EVENT_IDENTIFIER_KEYS,
]);

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
