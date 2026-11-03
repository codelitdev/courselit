import { describe, expect, it } from "bun:test";
import type { CourseLitPlan } from "../shared/types";
import { planCopy } from "./plan-copy";

const plan = (overrides: Partial<CourseLitPlan>): CourseLitPlan => ({
  id: "pln_1",
  name: "Plan",
  type: "free",
  currency: "USD",
  amountMinor: 0,
  ...overrides,
});

describe("community plan wording", () => {
  it("invites people to join a free community that lets everyone in", () => {
    expect(planCopy(plan({}), false).join).toBe("Join for free");
  });

  it("asks people to request to join when staff approve each member", () => {
    expect(planCopy(plan({}), true).join).toBe("Request to join");
  });

  it("keeps the price on paid plans whether or not staff approve", () => {
    const paid = plan({ type: "onetime", amountMinor: 4900 });
    expect(planCopy(paid, false).join).toBe("Join for $49");
    expect(planCopy(paid, true).join).toBe("Join for $49");
    const monthly = plan({ type: "subscription", amountMinor: 1200 });
    expect(planCopy(monthly, true).join).toBe("Join for $12 a month");
  });
});
