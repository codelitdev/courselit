export const COURSELIT_PERMISSIONS = [
  "products:read",
  "products:write",
  "products:delete",
  "learners:read",
  "learners:write",
  "school:admin",
  "billing:read",
  "media:read",
  "media:write",
  "media:delete",
  "certificates:read",
  "certificates:write",
  "storefront:read",
  "storefront:write",
  "communities:read",
  "communities:write",
  "communities:moderate",
] as const;

export type CourseLitPermission = (typeof COURSELIT_PERMISSIONS)[number];

export const OWNER_PERMISSIONS: readonly CourseLitPermission[] = [
  ...COURSELIT_PERMISSIONS,
];

export const MEMBER_PERMISSIONS: readonly CourseLitPermission[] = [
  "products:read",
  "products:write",
  "learners:read",
  "billing:read",
  "media:read",
  "media:write",
  "certificates:read",
  "certificates:write",
  "storefront:read",
  "storefront:write",
  "communities:read",
  "communities:write",
];

export const TELEMETRY_PROPERTY_ALLOWLIST = new Set([
  "path",
  "method",
  "job_id",
  "school_id",
  "request_id",
]);

export function parsePermissions(value: string): Set<CourseLitPermission> {
  const allowed = new Set<string>(COURSELIT_PERMISSIONS);
  const parsed = new Set<CourseLitPermission>();
  for (const item of value.split(",")) {
    const trimmed = item.trim();
    if (allowed.has(trimmed)) parsed.add(trimmed as CourseLitPermission);
  }
  return parsed;
}

export function serializePermissions(
  permissions: Iterable<CourseLitPermission>,
): string {
  return [...permissions].join(",");
}
