import type { ContactFilter, ContactFilterSet } from "@courselit/api-contract";
import type { SendLitFilterCondition, SendLitSegmentFilter } from "./sendlit-client.js";

export const COURSELIT_PRODUCT_IDS_FIELD = "courselit.productIds";
export const COURSELIT_IS_COMMUNITY_MEMBER_FIELD = "courselit.isCommunityMember";
export const COURSELIT_LAST_ACTIVE_FIELD = "courselit.lastActive";
export const COURSELIT_SIGNED_UP_FIELD = "courselit.signedUp";

function normalizeDateToIsoUtc(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date filter value: ${input}`);
  }
  return d.toISOString();
}

/**
 * Translates a CourseLit ContactFilterSet into SendLit's public wire filter format.
 * Strips the CourseLit-internal `version` property as SendLit rejects top-level `version`.
 */
export function toSendLitFilter(filterSet: ContactFilterSet): SendLitSegmentFilter {
  const filters: SendLitFilterCondition[] = [];

  for (const filter of filterSet.filters) {
    switch (filter.name) {
      case "email": {
        let condition: "is" | "contains" | "not_contains";
        if (filter.condition === "Is exactly") condition = "is";
        else if (filter.condition === "Contains") condition = "contains";
        else if (filter.condition === "Does not contain") condition = "not_contains";
        else throw new Error(`Unsupported email condition: ${(filter as any).condition}`);

        filters.push({
          name: "email",
          condition,
          value: filter.value,
        });
        break;
      }
      case "product": {
        let condition: "has" | "not_has";
        if (filter.condition === "Has") condition = "has";
        else if (filter.condition === "Does not have") condition = "not_has";
        else throw new Error(`Unsupported product condition: ${(filter as any).condition}`);

        filters.push({
          name: "customField",
          key: COURSELIT_PRODUCT_IDS_FIELD,
          condition,
          value: filter.value,
          valueLabel: filter.valueLabel,
        });
        break;
      }
      case "community": {
        if (filter.condition === "Is a member") {
          filters.push({
            name: "customField",
            key: COURSELIT_IS_COMMUNITY_MEMBER_FIELD,
            condition: "is",
            value: "true",
          });
        } else if (filter.condition === "Is not a member") {
          filters.push({
            name: "customField",
            key: COURSELIT_IS_COMMUNITY_MEMBER_FIELD,
            condition: "is_not",
            value: "true",
          });
        } else {
          throw new Error(`Unsupported community condition: ${(filter as any).condition}`);
        }
        break;
      }
      case "lastActive": {
        let condition: "before" | "after" | "on";
        if (filter.condition === "Before") condition = "before";
        else if (filter.condition === "After") condition = "after";
        else if (filter.condition === "On") condition = "on";
        else throw new Error(`Unsupported lastActive condition: ${(filter as any).condition}`);

        filters.push({
          name: "customField",
          key: COURSELIT_LAST_ACTIVE_FIELD,
          condition,
          value: normalizeDateToIsoUtc(filter.value),
        });
        break;
      }
      case "signedUp": {
        let condition: "before" | "after" | "on";
        if (filter.condition === "Before") condition = "before";
        else if (filter.condition === "After") condition = "after";
        else if (filter.condition === "On") condition = "on";
        else throw new Error(`Unsupported signedUp condition: ${(filter as any).condition}`);

        filters.push({
          name: "customField",
          key: COURSELIT_SIGNED_UP_FIELD,
          condition,
          value: normalizeDateToIsoUtc(filter.value),
        });
        break;
      }
      case "subscription": {
        if (filter.condition === "Subscribed") {
          filters.push({
            name: "subscription",
            condition: "is",
            value: "subscribed",
          });
        } else if (filter.condition === "Not subscribed") {
          filters.push({
            name: "subscription",
            condition: "is",
            value: "unsubscribed",
          });
        } else {
          throw new Error(`Unsupported subscription condition: ${(filter as any).condition}`);
        }
        break;
      }
      case "tag": {
        let condition: "is" | "is_not";
        if (filter.condition === "Has") condition = "is";
        else if (filter.condition === "Does not have") condition = "is_not";
        else throw new Error(`Unsupported tag condition: ${(filter as any).condition}`);

        filters.push({
          name: "tag",
          condition,
          value: filter.value,
        });
        break;
      }
      default:
        throw new Error(`Unknown filter name: ${(filter as any).name}`);
    }
  }

  return {
    aggregator: filterSet.aggregator,
    filters,
  };
}

/**
 * Reverses a SendLit wire filter format back into CourseLit's ContactFilterSet.
 * Injects `version: 1`. If any filter cannot be translated, returns an error.
 */
export function fromSendLitFilter(
  wire: unknown,
): { ok: true; value: ContactFilterSet } | { ok: false; error: "unsupported_segment_filter" } {
  if (!wire || typeof wire !== "object") {
    return { ok: false, error: "unsupported_segment_filter" };
  }

  const record = wire as Record<string, unknown>;
  const aggregator = record.aggregator;
  if (aggregator !== "and" && aggregator !== "or") {
    return { ok: false, error: "unsupported_segment_filter" };
  }

  const rawFilters = record.filters;
  if (!Array.isArray(rawFilters)) {
    return { ok: false, error: "unsupported_segment_filter" };
  }

  const filters: ContactFilter[] = [];

  for (const raw of rawFilters) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "unsupported_segment_filter" };
    }

    const item = raw as Record<string, unknown>;
    const name = item.name;
    const condition = item.condition;
    const value = item.value;
    const key = item.key;
    const valueLabel = typeof item.valueLabel === "string" ? item.valueLabel : undefined;

    if (name === "email" && typeof value === "string") {
      if (condition === "is") {
        filters.push({ name: "email", condition: "Is exactly", value });
      } else if (condition === "contains") {
        filters.push({ name: "email", condition: "Contains", value });
      } else if (condition === "not_contains") {
        filters.push({ name: "email", condition: "Does not contain", value });
      } else {
        return { ok: false, error: "unsupported_segment_filter" };
      }
    } else if (name === "tag" && typeof value === "string") {
      if (condition === "is") {
        filters.push({ name: "tag", condition: "Has", value });
      } else if (condition === "is_not") {
        filters.push({ name: "tag", condition: "Does not have", value });
      } else {
        return { ok: false, error: "unsupported_segment_filter" };
      }
    } else if (name === "subscription" && condition === "is") {
      if (value === "subscribed") {
        filters.push({ name: "subscription", condition: "Subscribed" });
      } else if (value === "unsubscribed") {
        filters.push({ name: "subscription", condition: "Not subscribed" });
      } else {
        return { ok: false, error: "unsupported_segment_filter" };
      }
    } else if (name === "customField") {
      if (key === COURSELIT_PRODUCT_IDS_FIELD && typeof value === "string") {
        if (condition === "has") {
          filters.push({
            name: "product",
            condition: "Has",
            value,
            ...(valueLabel ? { valueLabel } : {}),
          });
        } else if (condition === "not_has") {
          filters.push({
            name: "product",
            condition: "Does not have",
            value,
            ...(valueLabel ? { valueLabel } : {}),
          });
        } else {
          return { ok: false, error: "unsupported_segment_filter" };
        }
      } else if (key === COURSELIT_IS_COMMUNITY_MEMBER_FIELD && value === "true") {
        if (condition === "is") {
          filters.push({ name: "community", condition: "Is a member" });
        } else if (condition === "is_not") {
          filters.push({ name: "community", condition: "Is not a member" });
        } else {
          return { ok: false, error: "unsupported_segment_filter" };
        }
      } else if (key === COURSELIT_LAST_ACTIVE_FIELD && typeof value === "string") {
        if (condition === "before") {
          filters.push({ name: "lastActive", condition: "Before", value });
        } else if (condition === "after") {
          filters.push({ name: "lastActive", condition: "After", value });
        } else if (condition === "on") {
          filters.push({ name: "lastActive", condition: "On", value });
        } else {
          return { ok: false, error: "unsupported_segment_filter" };
        }
      } else if (key === COURSELIT_SIGNED_UP_FIELD && typeof value === "string") {
        if (condition === "before") {
          filters.push({ name: "signedUp", condition: "Before", value });
        } else if (condition === "after") {
          filters.push({ name: "signedUp", condition: "After", value });
        } else if (condition === "on") {
          filters.push({ name: "signedUp", condition: "On", value });
        } else {
          return { ok: false, error: "unsupported_segment_filter" };
        }
      } else {
        return { ok: false, error: "unsupported_segment_filter" };
      }
    } else {
      return { ok: false, error: "unsupported_segment_filter" };
    }
  }

  return {
    ok: true,
    value: {
      version: 1,
      aggregator,
      filters,
    },
  };
}
