/**
 * Stable CourseLit team scopes. These are also used by invitations and
 * memberships, so the dashboard and API must agree on the identifiers.
 */
export const COURSELIT_PERMISSIONS = [
  "members:read",
  "members:invite",
  "members:manage",
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

/** The legacy member grant set remains the default for migrated memberships. */
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

export const COURSELIT_PERMISSION_IMPLICATIONS: Readonly<
  Partial<Record<CourseLitPermission, readonly CourseLitPermission[]>>
> = {
  "members:invite": ["members:read"],
  "members:manage": ["members:read"],
  "products:write": ["products:read"],
  "products:delete": ["products:write", "products:read"],
  "learners:write": ["learners:read"],
  "media:write": ["media:read"],
  "media:delete": ["media:write", "media:read"],
  "certificates:write": ["certificates:read"],
  "storefront:write": ["storefront:read"],
  "communities:write": ["communities:read"],
  "communities:moderate": ["communities:write", "communities:read"],
};

export const COURSELIT_PERMISSION_PRESET_IDS = [
  "full_access",
  "content_manager",
  "support",
  "marketing",
  "read_only",
  "custom",
] as const;

export type CourseLitPermissionPresetId =
  (typeof COURSELIT_PERMISSION_PRESET_IDS)[number];

const COURSE_READ_PERMISSIONS = COURSELIT_PERMISSIONS.filter(
  (permission) => permission.endsWith(":read") && !permission.startsWith("members:"),
);

export const COURSELIT_PERMISSION_PRESETS: Record<
  Exclude<CourseLitPermissionPresetId, "custom">,
  readonly CourseLitPermission[]
> = {
  full_access: OWNER_PERMISSIONS,
  content_manager: [
    "products:read",
    "products:write",
    "learners:read",
    "media:read",
    "media:write",
    "certificates:read",
    "certificates:write",
    "communities:read",
    "communities:write",
  ],
  support: ["products:read", "learners:read", "communities:read"],
  marketing: ["storefront:read", "storefront:write", "communities:read"],
  read_only: COURSE_READ_PERMISSIONS,
};

export const COURSELIT_HIGH_IMPACT_PERMISSIONS = [
  "school:admin",
  "members:manage",
  "products:delete",
  "media:delete",
  "communities:moderate",
] as const satisfies readonly CourseLitPermission[];

export function normalizeCourseLitPermissions(
  grants: readonly string[],
): CourseLitPermission[] {
  const selected = new Set(grants);
  return COURSELIT_PERMISSIONS.filter((permission) => selected.has(permission));
}

export function computeEffectiveCourseLitPermissions(
  grants: readonly string[],
): CourseLitPermission[] {
  const effective = new Set(normalizeCourseLitPermissions(grants));
  const queue = [...effective];
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const implied of COURSELIT_PERMISSION_IMPLICATIONS[current] ?? []) {
      if (!effective.has(implied)) {
        effective.add(implied);
        queue.push(implied);
      }
    }
  }
  return COURSELIT_PERMISSIONS.filter((permission) => effective.has(permission));
}

export function expandCourseLitPermissionPreset(
  presetId: CourseLitPermissionPresetId,
  custom: readonly string[] = [],
): CourseLitPermission[] {
  return normalizeCourseLitPermissions(
    presetId === "custom" ? custom : COURSELIT_PERMISSION_PRESETS[presetId],
  );
}

export function filterDelegableCourseLitPermissions(
  actorEffective: readonly CourseLitPermission[],
): CourseLitPermission[] {
  const allowed = new Set(actorEffective);
  if (allowed.has("school:admin")) return [...COURSELIT_PERMISSIONS];
  return COURSELIT_PERMISSIONS.filter((permission) => allowed.has(permission));
}

export const COURSELIT_PERMISSION_GROUPS: ReadonlyArray<{
  id: string;
  label: string;
  permissions: readonly CourseLitPermission[];
}> = [
  {
    id: "members",
    label: "Members",
    permissions: ["members:read", "members:invite", "members:manage"],
  },
  {
    id: "products",
    label: "Products",
    permissions: ["products:read", "products:write", "products:delete"],
  },
  {
    id: "learners",
    label: "Learners",
    permissions: ["learners:read", "learners:write"],
  },
  { id: "billing", label: "Billing", permissions: ["billing:read"] },
  {
    id: "media",
    label: "Media",
    permissions: ["media:read", "media:write", "media:delete"],
  },
  {
    id: "certificates",
    label: "Certificates",
    permissions: ["certificates:read", "certificates:write"],
  },
  {
    id: "storefront",
    label: "Storefront",
    permissions: ["storefront:read", "storefront:write"],
  },
  {
    id: "communities",
    label: "Communities",
    permissions: ["communities:read", "communities:write", "communities:moderate"],
  },
  { id: "school", label: "School", permissions: ["school:admin"] },
];
