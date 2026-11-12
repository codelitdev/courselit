import { describe, expect, it } from "bun:test";
import type { ContactFilterSet } from "@courselit/api-contract";
import type { ContactFilterWithAggregator } from "@sendlit/email-blocks";
import {
  buildContactFilterDefinitions,
  fromContactFilterSet,
  fromStoredAudienceFilter,
  permissionFilterOptions,
  toContactFilterSet,
  toStoredAudienceFilter,
} from "./contact-filters";

const DAY = "2026-03-01T00:00:00.000Z";
const DAY_MS = String(new Date(DAY).getTime());

function builder(
  ...filters: ContactFilterWithAggregator["filters"]
): ContactFilterWithAggregator {
  return { aggregator: "and", filters };
}

describe("toContactFilterSet", () => {
  it("translates every filter the builder offers", () => {
    const set = toContactFilterSet(
      builder(
        { name: "email", condition: "contains", value: "@gmail.com" },
        { name: "tag", condition: "is_not", value: "churned" },
        { name: "subscription", condition: "is", value: "subscribed" },
        { name: "subscription", condition: "is", value: "unsubscribed" },
        { name: "signedUp", condition: "before", value: DAY_MS },
        { name: "lastActive", condition: "after", value: DAY_MS },
        { name: "lastActive", condition: "on", value: DAY },
        { name: "product", condition: "has", value: "prd_1", valueLabel: "Intro" },
        { name: "product", condition: "not_has", value: "prd_2" },
        { name: "community", condition: "is", value: "true" },
        { name: "community", condition: "is_not", value: "true" },
        { name: "permission", condition: "has", value: "contacts:write" },
        { name: "permission", condition: "not_has", value: "billing:read" },
      ),
    );
    expect(set).toEqual({
      version: 1,
      aggregator: "and",
      filters: [
        { name: "email", condition: "Contains", value: "@gmail.com" },
        { name: "tag", condition: "Does not have", value: "churned" },
        { name: "subscription", condition: "Subscribed" },
        { name: "subscription", condition: "Not subscribed" },
        { name: "signedUp", condition: "Before", value: DAY },
        { name: "lastActive", condition: "After", value: DAY },
        { name: "lastActive", condition: "On", value: DAY },
        { name: "product", condition: "Has", value: "prd_1", valueLabel: "Intro" },
        { name: "product", condition: "Does not have", value: "prd_2" },
        { name: "community", condition: "Is a member" },
        { name: "community", condition: "Is not a member" },
        { name: "permission", condition: "Has", value: "contacts:write" },
        { name: "permission", condition: "Does not have", value: "billing:read" },
      ],
    });
  });

  it("leaves out incomplete or unknown filters", () => {
    const set = toContactFilterSet(
      builder(
        { name: "product", condition: "has", value: "" },
        { name: "product", condition: "maybe", value: "prd_1" },
        { name: "permission", condition: "has", value: "not:a-permission" },
        { name: "permission", condition: "maybe", value: "contacts:read" },
        { name: "community", condition: "maybe", value: "true" },
        { name: "lastActive", condition: "after", value: "not a date" },
        { name: "lastActive", condition: "within", value: DAY_MS },
        { name: "customField", condition: "is", value: "x" },
      ),
    );
    expect(set.filters).toEqual([]);
  });
});

describe("fromContactFilterSet", () => {
  it("round-trips the product, community, last active and permission filters", () => {
    const set: ContactFilterSet = {
      version: 1,
      aggregator: "or",
      filters: [
        { name: "product", condition: "Has", value: "prd_1", valueLabel: "Intro" },
        { name: "product", condition: "Does not have", value: "prd_2" },
        { name: "community", condition: "Is a member" },
        { name: "community", condition: "Is not a member" },
        { name: "lastActive", condition: "Before", value: DAY },
        { name: "permission", condition: "Has", value: "contacts:write" },
        { name: "permission", condition: "Does not have", value: "billing:read" },
      ],
    };
    const shown = fromContactFilterSet(set);
    expect(shown.filters).toEqual([
      { name: "product", condition: "has", value: "prd_1", valueLabel: "Intro" },
      { name: "product", condition: "not_has", value: "prd_2" },
      { name: "community", condition: "is", value: "true" },
      { name: "community", condition: "is_not", value: "true" },
      { name: "lastActive", condition: "before", value: DAY_MS },
      { name: "permission", condition: "has", value: "contacts:write" },
      { name: "permission", condition: "not_has", value: "billing:read" },
    ]);
    expect(toContactFilterSet(shown)).toEqual(set);
  });

  it("round-trips email, tag, subscription and signed up filters and skips bad dates", () => {
    const set: ContactFilterSet = {
      version: 1,
      aggregator: "and",
      filters: [
        { name: "email", condition: "Is exactly", value: "a@b.co" },
        { name: "tag", condition: "Has", value: "vip" },
        { name: "subscription", condition: "Subscribed" },
        { name: "subscription", condition: "Not subscribed" },
        { name: "signedUp", condition: "On", value: DAY },
      ],
    };
    expect(toContactFilterSet(fromContactFilterSet(set))).toEqual(set);
    expect(
      fromContactFilterSet({
        version: 1,
        aggregator: "or",
        filters: [{ name: "lastActive", condition: "On", value: "nope" }],
      }).filters,
    ).toEqual([]);
  });
});

describe("stored audience filters (broadcasts and sequences)", () => {
  const shown = builder(
    { name: "email", condition: "contains", value: "@x.co" },
    { name: "product", condition: "has", value: "prd_1", valueLabel: "Intro" },
    { name: "product", condition: "not_has", value: "prd_2" },
    { name: "permission", condition: "has", value: "contacts:read" },
    { name: "community", condition: "is_not", value: "true" },
    { name: "lastActive", condition: "after", value: DAY_MS },
    { name: "signedUp", condition: "before", value: DAY_MS },
  );
  const stored = builder(
    { name: "email", condition: "contains", value: "@x.co" },
    {
      name: "customField",
      key: "courselit.productIds",
      condition: "has",
      value: "prd_1",
      valueLabel: "Intro",
    },
    {
      name: "customField",
      key: "courselit.productIds",
      condition: "not_has",
      value: "prd_2",
    },
    {
      name: "customField",
      key: "courselit.permissions",
      condition: "has",
      value: "contacts:read",
    },
    {
      name: "customField",
      key: "courselit.isCommunityMember",
      condition: "is_not",
      value: "true",
    },
    {
      name: "customField",
      key: "courselit.lastActive",
      condition: "after",
      value: DAY,
    },
    {
      name: "customField",
      key: "courselit.signedUp",
      condition: "before",
      value: DAY,
    },
  );

  it("stores CourseLit contact attributes as the custom fields the sync writes", () => {
    expect(toStoredAudienceFilter(shown)).toEqual(stored);
  });

  it("shows a stored filter in the builder's vocabulary", () => {
    expect(fromStoredAudienceFilter(stored)).toEqual(shown);
  });

  it("keeps an unparseable date as it is when storing and empty when showing", () => {
    const bad = builder({ name: "lastActive", condition: "on", value: "soon" });
    expect(toStoredAudienceFilter(bad).filters[0]).toMatchObject({
      key: "courselit.lastActive",
      value: "soon",
    });
    expect(
      fromStoredAudienceFilter(
        builder({
          name: "customField",
          key: "courselit.lastActive",
          condition: "on",
          value: "soon",
        }),
      ).filters[0],
    ).toEqual({ name: "lastActive", condition: "on", value: "" });
  });

  it("passes through custom fields it does not know", () => {
    const other = builder({
      name: "customField",
      key: "plan.tier",
      condition: "is",
      value: "pro",
    });
    expect(fromStoredAudienceFilter(other)).toEqual(other);
    expect(
      fromStoredAudienceFilter(
        builder({ name: "customField", condition: "is", value: "x" }),
      ).filters,
    ).toHaveLength(1);
  });
});

describe("buildContactFilterDefinitions", () => {
  it("offers email, tag, subscription, product, community, last active, signed up and permission", () => {
    const definitions = buildContactFilterDefinitions([
      { id: "prd_1", title: "Intro" },
    ]);
    expect(definitions.map((definition) => definition.name)).toEqual([
      "email",
      "tag",
      "subscription",
      "product",
      "community",
      "lastActive",
      "signedUp",
      "permission",
    ]);
    const product = definitions.find((definition) => definition.name === "product");
    expect(product?.valueInput?.options).toEqual([{ value: "prd_1", label: "Intro" }]);
    expect(product?.valueInput?.placeholder).toBe("Select a product");
    expect(product?.conditions.map((condition) => condition.value)).toEqual([
      "has",
      "not_has",
    ]);
    const community = definitions.find((definition) => definition.name === "community");
    expect(community?.valueInput?.type).toBe("none");
  });

  it("says so when the school has no products", () => {
    const product = buildContactFilterDefinitions([]).find(
      (definition) => definition.name === "product",
    );
    expect(product?.valueInput?.options).toEqual([]);
    expect(product?.valueInput?.placeholder).toBe("No products yet");
  });

  it("lists every permission once as a choice for the permission filter", () => {
    const options = permissionFilterOptions();
    const values = options.map((option) => option.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toContain("contacts:write");
    const permission = buildContactFilterDefinitions([]).find(
      (definition) => definition.name === "permission",
    );
    expect(permission?.valueInput?.options).toEqual(options);
  });
});
