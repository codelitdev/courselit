/**
 * Stable CourseLit team scopes. These are also used by invitations and
 * memberships, so the dashboard and API must agree on the identifiers.
 */
export const COURSELIT_PERMISSIONS = [
  // Team
  "members:read",
  "members:invite",
  "members:manage",
  // School
  "school:read",
  "school:write",
  // Products
  "products:read",
  "products:write",
  "products:publish",
  "products:delete",
  // Learners
  "learners:read",
  "learners:write",
  // Community
  "communities:read",
  "communities:write",
  "communities:moderate",
  // Website
  "storefront:read",
  "storefront:write",
  "storefront:publish",
  // Commerce
  "commerce:read",
  "commerce:manage",
  "commerce:refund",
  // Contacts
  "contacts:read",
  "contacts:write",
  // Mail
  "mails:read",
  "mails:write",
  "mails:send",
  // Media
  "media:read",
  "media:write",
  "media:delete",
  // Certificates
  "certificates:read",
  "certificates:write",
  // Analytics
  "analytics:read",
  // Billing
  "billing:read",
  // API access
  "api_keys:read",
  "api_keys:manage",
  // Integrations
  "integrations:read",
  "integrations:manage",
] as const;

export type CourseLitPermission = (typeof COURSELIT_PERMISSIONS)[number];

export const OWNER_PERMISSIONS: readonly CourseLitPermission[] = [
  ...COURSELIT_PERMISSIONS,
];

/** The default direct grants for a non-owner member when no preset is specified. */
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
  "school:write": ["school:read"],
  "products:write": ["products:read"],
  "products:publish": ["products:write", "products:read"],
  "products:delete": ["products:write", "products:read"],
  "learners:write": ["learners:read"],
  "communities:write": ["communities:read"],
  "communities:moderate": ["communities:write", "communities:read"],
  "storefront:write": ["storefront:read"],
  "storefront:publish": ["storefront:write", "storefront:read"],
  "commerce:manage": ["commerce:read"],
  "commerce:refund": ["commerce:manage", "commerce:read"],
  "contacts:write": ["contacts:read"],
  "mails:write": ["mails:read"],
  "mails:send": ["mails:write", "mails:read"],
  "media:write": ["media:read"],
  "media:delete": ["media:write", "media:read"],
  "certificates:write": ["certificates:read"],
  "api_keys:manage": ["api_keys:read"],
  "integrations:manage": ["integrations:read"],
};

export const COURSELIT_PERMISSION_PRESET_IDS = [
  "full_access",
  "content_manager",
  "community_manager",
  "support",
  "marketing",
  "read_only",
  "custom",
] as const;

export type CourseLitPermissionPresetId =
  (typeof COURSELIT_PERMISSION_PRESET_IDS)[number];

const ALL_READ_PERMISSIONS = COURSELIT_PERMISSIONS.filter((permission) =>
  permission.endsWith(":read"),
);

export const COURSELIT_PERMISSION_PRESETS: Record<
  Exclude<CourseLitPermissionPresetId, "custom">,
  readonly CourseLitPermission[]
> = {
  full_access: COURSELIT_PERMISSIONS,
  content_manager: [
    "products:read",
    "products:write",
    "products:publish",
    "products:delete",
    "storefront:read",
    "storefront:write",
    "storefront:publish",
    "media:read",
    "media:write",
    "media:delete",
    "certificates:read",
    "certificates:write",
    "analytics:read",
  ],
  community_manager: [
    "communities:read",
    "communities:write",
    "communities:moderate",
    "learners:read",
    "media:read",
    "media:write",
    "analytics:read",
  ],
  support: [
    "products:read",
    "learners:read",
    "learners:write",
    "communities:read",
    "communities:moderate",
    "commerce:read",
    "contacts:read",
  ],
  marketing: [
    "storefront:read",
    "storefront:write",
    "storefront:publish",
    "contacts:read",
    "contacts:write",
    "mails:read",
    "mails:write",
    "mails:send",
    "media:read",
    "media:write",
    "analytics:read",
  ],
  read_only: ALL_READ_PERMISSIONS,
};

export const COURSELIT_HIGH_IMPACT_PERMISSIONS = [
  "members:manage",
  "products:delete",
  "media:delete",
  "communities:moderate",
  "commerce:refund",
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
  isOwner = false,
): CourseLitPermission[] {
  if (isOwner) return [...COURSELIT_PERMISSIONS];
  const allowed = new Set(actorEffective);
  return COURSELIT_PERMISSIONS.filter((permission) => allowed.has(permission));
}

export const COURSELIT_PERMISSION_GROUPS: ReadonlyArray<{
  id: string;
  label: string;
  permissions: readonly CourseLitPermission[];
}> = [
  {
    id: "members",
    label: "Team",
    permissions: ["members:read", "members:invite", "members:manage"],
  },
  {
    id: "school",
    label: "School",
    permissions: ["school:read", "school:write"],
  },
  {
    id: "products",
    label: "Products",
    permissions: [
      "products:read",
      "products:write",
      "products:publish",
      "products:delete",
    ],
  },
  {
    id: "learners",
    label: "Learners",
    permissions: ["learners:read", "learners:write"],
  },
  {
    id: "communities",
    label: "Community",
    permissions: [
      "communities:read",
      "communities:write",
      "communities:moderate",
    ],
  },
  {
    id: "storefront",
    label: "Website",
    permissions: [
      "storefront:read",
      "storefront:write",
      "storefront:publish",
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    permissions: ["commerce:read", "commerce:manage", "commerce:refund"],
  },
  {
    id: "contacts",
    label: "Contacts",
    permissions: ["contacts:read", "contacts:write"],
  },
  {
    id: "mails",
    label: "Mail",
    permissions: ["mails:read", "mails:write", "mails:send"],
  },
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
    id: "analytics",
    label: "Analytics",
    permissions: ["analytics:read"],
  },
  {
    id: "billing",
    label: "Billing",
    permissions: ["billing:read"],
  },
  {
    id: "api_keys",
    label: "API Access",
    permissions: ["api_keys:read", "api_keys:manage"],
  },
  {
    id: "integrations",
    label: "Integrations",
    permissions: ["integrations:read", "integrations:manage"],
  },
];
