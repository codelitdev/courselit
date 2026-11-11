import type { ContactFilter, ContactFilterSet } from "@courselit/api-contract";
import type {
  ContactFilterCondition,
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
const DATE_TO_COURSELIT = { before: "Before", after: "After", on: "On" } as const;

function invert<T extends Record<string, string>>(map: T): Record<string, string> {
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [value, key]));
}
const EMAIL_FROM_COURSELIT = invert(EMAIL_TO_COURSELIT);
const TAG_FROM_COURSELIT = invert(TAG_TO_COURSELIT);
const DATE_FROM_COURSELIT = invert(DATE_TO_COURSELIT);

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
        default:
          // Product and community filters have no control in the builder yet.
          return [];
      }
    }),
  };
}
