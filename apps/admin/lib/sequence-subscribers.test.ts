import { describe, expect, it } from "bun:test";
import {
  pageRange,
  subscriberInitial,
  subscriberLabel,
  subscriberStatus,
  totalPages,
} from "./sequence-subscribers";

const base = { contactId: "c", email: "a@test.com", name: "Ada", subscribed: true };

describe("sequence subscribers helpers", () => {
  it("labels by name, then email, then a placeholder", () => {
    expect(subscriberLabel(base)).toBe("Ada");
    expect(subscriberLabel({ ...base, name: "  " })).toBe("a@test.com");
    expect(subscriberLabel({ ...base, name: null })).toBe("a@test.com");
    expect(subscriberLabel({ ...base, name: null, email: null })).toBe("Deleted contact");
  });

  it("uses an uppercase initial, or a question mark with nothing to go on", () => {
    expect(subscriberInitial({ ...base, name: "ada" })).toBe("A");
    expect(subscriberInitial({ ...base, name: null, email: "zed@test.com" })).toBe("Z");
    expect(subscriberInitial({ ...base, name: null, email: null })).toBe("?");
  });

  it("reports subscription status, or none when unknown", () => {
    expect(subscriberStatus(base)).toBe("Subscribed");
    expect(subscriberStatus({ ...base, subscribed: false })).toBe("Unsubscribed");
    expect(subscriberStatus({ ...base, subscribed: null })).toBeNull();
  });

  it("counts pages, never fewer than one", () => {
    expect(totalPages(0)).toBe(1);
    expect(totalPages(-3)).toBe(1);
    expect(totalPages(10)).toBe(1);
    expect(totalPages(11)).toBe(2);
    expect(totalPages(25, 5)).toBe(5);
  });

  it("describes the visible range", () => {
    expect(pageRange(1, 0)).toBe("0 of 0");
    expect(pageRange(1, 25)).toBe("1–10 of 25");
    expect(pageRange(3, 25)).toBe("21–25 of 25");
    expect(pageRange(2, 25, 5)).toBe("6–10 of 25");
  });
});
