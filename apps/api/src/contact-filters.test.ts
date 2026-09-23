import { describe, expect, it } from "bun:test";
import type { ContactFilterSet } from "@courselit/api-contract";
import {
  fromSendLitFilter,
  toSendLitFilter,
} from "./contact-filters.js";

describe("contact-filters translation", () => {
  it("translates empty filter (Everyone) both ways", () => {
    const courselit: ContactFilterSet = {
      version: 1,
      aggregator: "or",
      filters: [],
    };
    const wire = toSendLitFilter(courselit);
    expect(wire).toEqual({
      aggregator: "or",
      filters: [],
    });
    // Wire does not have version
    expect((wire as any).version).toBeUndefined();

    const back = fromSendLitFilter(wire);
    expect(back).toEqual({
      ok: true,
      value: courselit,
    });
  });

  it("translates email filters forward and back", () => {
    const courselit: ContactFilterSet = {
      version: 1,
      aggregator: "and",
      filters: [
        { name: "email", condition: "Is exactly", value: "test@example.com" },
        { name: "email", condition: "Contains", value: "example" },
        { name: "email", condition: "Does not contain", value: "spam" },
      ],
    };

    const wire = toSendLitFilter(courselit);
    expect(wire.filters).toEqual([
      { name: "email", condition: "is", value: "test@example.com" },
      { name: "email", condition: "contains", value: "example" },
      { name: "email", condition: "not_contains", value: "spam" },
    ]);

    const back = fromSendLitFilter(wire);
    expect(back).toEqual({ ok: true, value: courselit });
  });

  it("translates product filters forward and back", () => {
    const courselit: ContactFilterSet = {
      version: 1,
      aggregator: "or",
      filters: [
        { name: "product", condition: "Has", value: "prd_123", valueLabel: "Intro Course" },
        { name: "product", condition: "Does not have", value: "prd_456" },
      ],
    };

    const wire = toSendLitFilter(courselit);
    expect(wire.filters).toEqual([
      {
        name: "customField",
        key: "courselit.productIds",
        condition: "has",
        value: "prd_123",
        valueLabel: "Intro Course",
      },
      {
        name: "customField",
        key: "courselit.productIds",
        condition: "not_has",
        value: "prd_456",
        valueLabel: undefined,
      },
    ]);

    const back = fromSendLitFilter(wire);
    expect(back).toEqual({ ok: true, value: courselit });
  });

  it("translates community membership filters forward and back", () => {
    const courselit: ContactFilterSet = {
      version: 1,
      aggregator: "and",
      filters: [
        { name: "community", condition: "Is a member" },
        { name: "community", condition: "Is not a member" },
      ],
    };

    const wire = toSendLitFilter(courselit);
    expect(wire.filters).toEqual([
      {
        name: "customField",
        key: "courselit.isCommunityMember",
        condition: "is",
        value: "true",
      },
      {
        name: "customField",
        key: "courselit.isCommunityMember",
        condition: "is_not",
        value: "true",
      },
    ]);

    const back = fromSendLitFilter(wire);
    expect(back).toEqual({ ok: true, value: courselit });
  });

  it("translates lastActive and signedUp date filters forward and back", () => {
    const isoDate = "2026-09-20T00:00:00.000Z";
    const courselit: ContactFilterSet = {
      version: 1,
      aggregator: "and",
      filters: [
        { name: "lastActive", condition: "Before", value: isoDate },
        { name: "lastActive", condition: "After", value: isoDate },
        { name: "lastActive", condition: "On", value: isoDate },
        { name: "signedUp", condition: "Before", value: isoDate },
        { name: "signedUp", condition: "After", value: isoDate },
        { name: "signedUp", condition: "On", value: isoDate },
      ],
    };

    const wire = toSendLitFilter(courselit);
    expect(wire.filters).toEqual([
      { name: "customField", key: "courselit.lastActive", condition: "before", value: isoDate },
      { name: "customField", key: "courselit.lastActive", condition: "after", value: isoDate },
      { name: "customField", key: "courselit.lastActive", condition: "on", value: isoDate },
      { name: "customField", key: "courselit.signedUp", condition: "before", value: isoDate },
      { name: "customField", key: "courselit.signedUp", condition: "after", value: isoDate },
      { name: "customField", key: "courselit.signedUp", condition: "on", value: isoDate },
    ]);

    const back = fromSendLitFilter(wire);
    expect(back).toEqual({ ok: true, value: courselit });
  });

  it("translates subscription and tag filters forward and back", () => {
    const courselit: ContactFilterSet = {
      version: 1,
      aggregator: "or",
      filters: [
        { name: "subscription", condition: "Subscribed" },
        { name: "subscription", condition: "Not subscribed" },
        { name: "tag", condition: "Has", value: "vip" },
        { name: "tag", condition: "Does not have", value: "churned" },
      ],
    };

    const wire = toSendLitFilter(courselit);
    expect(wire.filters).toEqual([
      { name: "subscription", condition: "is", value: "subscribed" },
      { name: "subscription", condition: "is", value: "unsubscribed" },
      { name: "tag", condition: "is", value: "vip" },
      { name: "tag", condition: "is_not", value: "churned" },
    ]);

    const back = fromSendLitFilter(wire);
    expect(back).toEqual({ ok: true, value: courselit });
  });

  it("rejects unsupported filters on reverse translation", () => {
    const unknownFieldWire = {
      aggregator: "and",
      filters: [
        { name: "customField", key: "unknown.field", condition: "is", value: "foo" },
      ],
    };
    expect(fromSendLitFilter(unknownFieldWire)).toEqual({
      ok: false,
      error: "unsupported_segment_filter",
    });

    const invalidAggregatorWire = {
      aggregator: "invalid",
      filters: [],
    };
    expect(fromSendLitFilter(invalidAggregatorWire)).toEqual({
      ok: false,
      error: "unsupported_segment_filter",
    });
  });
});
