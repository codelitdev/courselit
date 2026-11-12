import type { ContactFilter, ContactFilterSet } from "@courselit/api-contract";
// Runtime values come from the subpath: the package root re-exports server
// modules the browser bundle can't resolve.
import {
  COURSELIT_PERMISSION_GROUPS,
  COURSELIT_PERMISSIONS,
  type CourseLitPermission,
} from "@courselit/api-contract/team-permissions";
import type {
  ContactFilterCondition,
  ContactFilterDefinition,
  ContactFilterWithAggregator,
} from "@sendlit/email-blocks";

/**
 * The contact filter builder speaks SendLit's vocabulary (`contains`,
 * `is_not`, dates as epoch milliseconds), while CourseLit's contact list and
 * segment endpoints take a `ContactFilterSet` with readable conditions. These
 * translate between the two.
 */

const EMAIL_TO_COURSELIT = {
  is: "Is exactly",
  contains: "Contains",
  not_contains: "Does not contain",
} as const;
const TAG_TO_COURSELIT = { is: "Has", is_not: "Does not have" } as const;
const HAS_TO_COURSELIT = { has: "Has", not_has: "Does not have" } as const;
const COMMUNITY_TO_COURSELIT = {
  is: "Is a member",
  is_not: "Is not a member",
} as const;
const DATE_TO_COURSELIT = { before: "Before", after: "After", on: "On" } as const;

function invert<T extends Record<string, string>>(map: T): Record<string, string> {
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [value, key]));
}
const EMAIL_FROM_COURSELIT = invert(EMAIL_TO_COURSELIT);
const TAG_FROM_COURSELIT = invert(TAG_TO_COURSELIT);
const DATE_FROM_COURSELIT = invert(DATE_TO_COURSELIT);
const HAS_FROM_COURSELIT = invert(HAS_TO_COURSELIT);
const COMMUNITY_FROM_COURSELIT = invert(COMMUNITY_TO_COURSELIT);

function isPermission(value: string): value is CourseLitPermission {
  return (COURSELIT_PERMISSIONS as readonly string[]).includes(value);
}

function toIsoDate(value: string): string | null {
  const date = /^\d+$/.test(value) ? new Date(Number(value)) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toCourseLitCondition(filter: ContactFilterCondition): ContactFilter | null {
  const value = (filter.value ?? "").trim();
  switch (filter.name) {
    case "email": {
      const condition =
        EMAIL_TO_COURSELIT[filter.condition as keyof typeof EMAIL_TO_COURSELIT];
      return condition && value ? { name: "email", condition, value } : null;
    }
    case "tag": {
      const condition =
        TAG_TO_COURSELIT[filter.condition as keyof typeof TAG_TO_COURSELIT];
      return condition && value ? { name: "tag", condition, value } : null;
    }
    case "subscription":
      if (value === "subscribed")
        return { name: "subscription", condition: "Subscribed" };
      if (value === "unsubscribed") {
        return { name: "subscription", condition: "Not subscribed" };
      }
      return null;
    case "signedUp":
    case "lastActive": {
      const condition =
        DATE_TO_COURSELIT[filter.condition as keyof typeof DATE_TO_COURSELIT];
      const date = toIsoDate(value);
      return condition && date
        ? { name: filter.name as "signedUp" | "lastActive", condition, value: date }
        : null;
    }
    case "product": {
      const condition =
        HAS_TO_COURSELIT[filter.condition as keyof typeof HAS_TO_COURSELIT];
      if (!condition || !value) return null;
      return {
        name: "product",
        condition,
        value,
        ...(filter.valueLabel ? { valueLabel: filter.valueLabel } : {}),
      };
    }
    case "permission": {
      const condition =
        HAS_TO_COURSELIT[filter.condition as keyof typeof HAS_TO_COURSELIT];
      return condition && isPermission(value)
        ? { name: "permission", condition, value }
        : null;
    }
    case "community": {
      const condition =
        COMMUNITY_TO_COURSELIT[
          filter.condition as keyof typeof COMMUNITY_TO_COURSELIT
        ];
      return condition ? { name: "community", condition } : null;
    }
    default:
      return null;
  }
}

/** The builder's filters as a `ContactFilterSet`, leaving out incomplete ones. */
export function toContactFilterSet(
  filter: ContactFilterWithAggregator,
): ContactFilterSet {
  return {
    version: 1,
    aggregator: filter.aggregator,
    filters: filter.filters.flatMap((item) => toCourseLitCondition(item) ?? []),
  };
}

/** A saved `ContactFilterSet` (e.g. a segment's) in the builder's vocabulary. */
export function fromContactFilterSet(
  filter: ContactFilterSet,
): ContactFilterWithAggregator {
  return {
    aggregator: filter.aggregator,
    filters: filter.filters.flatMap((item): ContactFilterCondition[] => {
      switch (item.name) {
        case "email":
          return [
            {
              name: "email",
              condition: EMAIL_FROM_COURSELIT[item.condition]!,
              value: item.value,
            },
          ];
        case "tag":
          return [
            {
              name: "tag",
              condition: TAG_FROM_COURSELIT[item.condition]!,
              value: item.value,
            },
          ];
        case "subscription":
          return [
            {
              name: "subscription",
              condition: "is",
              value: item.condition === "Subscribed" ? "subscribed" : "unsubscribed",
            },
          ];
        case "signedUp":
        case "lastActive": {
          const time = new Date(item.value).getTime();
          if (Number.isNaN(time)) return [];
          return [
            {
              name: item.name,
              condition: DATE_FROM_COURSELIT[item.condition]!,
              value: String(time),
            },
          ];
        }
        case "product":
          return [
            {
              name: "product",
              condition: HAS_FROM_COURSELIT[item.condition]!,
              value: item.value,
              ...(item.valueLabel ? { valueLabel: item.valueLabel } : {}),
            },
          ];
        case "permission":
          return [
            {
              name: "permission",
              condition: HAS_FROM_COURSELIT[item.condition]!,
              value: item.value,
            },
          ];
        case "community":
          return [
            {
              name: "community",
              condition: COMMUNITY_FROM_COURSELIT[item.condition]!,
              value: "true",
            },
          ];
        default:
          return [];
      }
    }),
  };
}

/**
 * The filters broadcasts and sequences store go to SendLit as they are, so
 * CourseLit's own contact attributes travel as the custom fields the contact
 * sync writes (keep these in step with `apps/api/src/contact-filters.ts`).
 */
const PRODUCT_IDS_FIELD = "courselit.productIds";
const PERMISSIONS_FIELD = "courselit.permissions";
const COMMUNITY_MEMBER_FIELD = "courselit.isCommunityMember";
const LAST_ACTIVE_FIELD = "courselit.lastActive";
const SIGNED_UP_FIELD = "courselit.signedUp";

const CUSTOM_FIELD_NAMES: Record<string, string> = {
  [PRODUCT_IDS_FIELD]: "product",
  [PERMISSIONS_FIELD]: "permission",
  [COMMUNITY_MEMBER_FIELD]: "community",
  [LAST_ACTIVE_FIELD]: "lastActive",
  [SIGNED_UP_FIELD]: "signedUp",
};

function toWireCondition(filter: ContactFilterCondition): ContactFilterCondition {
  const customField = (key: string, value: string | undefined) => ({
    name: "customField",
    key,
    condition: filter.condition,
    value,
    ...(filter.valueLabel ? { valueLabel: filter.valueLabel } : {}),
  });
  switch (filter.name) {
    case "product":
      return customField(PRODUCT_IDS_FIELD, filter.value);
    case "permission":
      return customField(PERMISSIONS_FIELD, filter.value);
    case "community":
      return customField(COMMUNITY_MEMBER_FIELD, "true");
    case "lastActive":
    case "signedUp": {
      const date = toIsoDate((filter.value ?? "").trim());
      return customField(
        filter.name === "lastActive" ? LAST_ACTIVE_FIELD : SIGNED_UP_FIELD,
        date ?? filter.value,
      );
    }
    default:
      return filter;
  }
}

function fromWireCondition(filter: ContactFilterCondition): ContactFilterCondition {
  const name = filter.key ? CUSTOM_FIELD_NAMES[filter.key] : undefined;
  if (filter.name !== "customField" || !name) return filter;
  if (name === "lastActive" || name === "signedUp") {
    const time = new Date(filter.value ?? "").getTime();
    return {
      name,
      condition: filter.condition,
      value: Number.isNaN(time) ? "" : String(time),
    };
  }
  return {
    name,
    condition: filter.condition,
    value: filter.value,
    ...(filter.valueLabel ? { valueLabel: filter.valueLabel } : {}),
  };
}

/** The builder's filters in the form a broadcast or sequence stores. */
export function toStoredAudienceFilter(
  filter: ContactFilterWithAggregator,
): ContactFilterWithAggregator {
  return { ...filter, filters: filter.filters.map(toWireCondition) };
}

/** A stored broadcast or sequence filter in the builder's vocabulary. */
export function fromStoredAudienceFilter(
  filter: ContactFilterWithAggregator,
): ContactFilterWithAggregator {
  return { ...filter, filters: filter.filters.map(fromWireCondition) };
}

export type FilterProductOption = { id: string; title: string };

const HAS_CONDITIONS = [
  { value: "has", label: "has access to" },
  { value: "not_has", label: "does not have access to" },
];

const DATE_CONDITIONS = [
  { value: "before", label: "before" },
  { value: "after", label: "after" },
  { value: "on", label: "on" },
];

/** Every permission, grouped as the team settings list them. */
export function permissionFilterOptions(): { value: string; label: string }[] {
  return COURSELIT_PERMISSION_GROUPS.flatMap((group) =>
    group.permissions.map((permission) => ({ value: permission, label: permission })),
  );
}

/**
 * The filters the contact filter builder offers: the contact's email, tags,
 * subscription and dates, plus the products they can access, their community
 * membership and their team permissions.
 */
export function buildContactFilterDefinitions(
  products: readonly FilterProductOption[],
): ContactFilterDefinition[] {
  return [
    {
      name: "email",
      label: "Email",
      conditions: [
        { value: "is", label: "is exactly" },
        { value: "contains", label: "contains" },
        { value: "not_contains", label: "does not contain" },
      ],
      valueInput: {
        type: "text",
        label: "Email value",
        placeholder: "e.g. @gmail.com",
      },
    },
    {
      name: "tag",
      label: "Tag",
      conditions: [
        { value: "is", label: "has" },
        { value: "is_not", label: "does not have" },
      ],
      valueInput: { type: "text", label: "Tag value", placeholder: "e.g. customers" },
    },
    {
      name: "subscription",
      label: "Subscription",
      conditions: [{ value: "is", label: "is" }],
      valueInput: {
        type: "select",
        label: "Subscription status",
        options: [
          { value: "subscribed", label: "Subscribed" },
          { value: "unsubscribed", label: "Unsubscribed" },
        ],
      },
    },
    {
      name: "product",
      label: "Product",
      conditions: HAS_CONDITIONS,
      valueInput: {
        type: "select",
        label: "Product",
        placeholder: products.length > 0 ? "Select a product" : "No products yet",
        options: products.map((product) => ({
          value: product.id,
          label: product.title,
        })),
      },
    },
    {
      name: "community",
      label: "Community",
      conditions: [
        { value: "is", label: "is a member" },
        { value: "is_not", label: "is not a member" },
      ],
      valueInput: { type: "none" },
    },
    {
      name: "lastActive",
      label: "Last active",
      conditions: DATE_CONDITIONS,
      valueInput: {
        type: "date",
        label: "Last active date",
        dateValueFormat: "timestamp",
      },
    },
    {
      name: "signedUp",
      label: "Signed up",
      conditions: DATE_CONDITIONS,
      valueInput: {
        type: "date",
        label: "Signup date",
        dateValueFormat: "timestamp",
      },
    },
    {
      name: "permission",
      label: "Permission",
      conditions: [
        { value: "has", label: "has" },
        { value: "not_has", label: "does not have" },
      ],
      valueInput: {
        type: "select",
        label: "Permission",
        placeholder: "Select a permission",
        options: permissionFilterOptions(),
      },
    },
  ];
}
