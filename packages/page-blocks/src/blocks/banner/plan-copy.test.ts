import { describe, expect, it } from "bun:test";
import type { CourseLitPlan } from "../shared/types";
import { buyOptionCopy, buyOptions } from "./plan-copy";

const plan = (overrides: Partial<CourseLitPlan>): CourseLitPlan => ({
  id: "pln_1",
  name: "Plan",
  type: "free",
  currency: "USD",
  amountMinor: 0,
  ...overrides,
});

describe("product buy options", () => {
  it("lists product plans before community plans", () => {
    const { options } = buyOptions([plan({ id: "a" })], [plan({ id: "c" })]);
    expect(options.map((o) => `${o.source}:${o.plan.id}`)).toEqual([
      "product:a",
      "community:c",
    ]);
  });

  it("selects the default product plan first, else the first option", () => {
    const products = [plan({ id: "a" }), plan({ id: "b", isDefault: true })];
    expect(buyOptions(products, []).initial?.plan.id).toBe("b");
    expect(buyOptions([plan({ id: "a" })], []).initial?.plan.id).toBe("a");
    expect(buyOptions([], [plan({ id: "c", isDefault: true })]).initial?.plan.id).toBe("c");
    expect(buyOptions([], []).initial).toBeUndefined();
  });
});

describe("product plan wording", () => {
  const copy = (p: CourseLitPlan, source: "product" | "community" = "product", leadMagnet = false) =>
    buyOptionCopy({ plan: p, source }, { leadMagnet });

  it("uses main's button captions", () => {
    expect(copy(plan({})).cta).toBe("Get for free");
    expect(copy(plan({ type: "onetime", amountMinor: 1000 })).cta).toBe("Buy now");
    expect(copy(plan({ type: "onetime", amountMinor: 1000 }), "community").cta).toBe(
      "Join community",
    );
  });

  it("spells out what each paid plan charges", () => {
    expect(copy(plan({ type: "onetime", amountMinor: 1000 }))).toMatchObject({
      price: "$10",
      unit: "",
      finePrint: "One payment of $10 · Secure checkout",
    });
    expect(
      copy(plan({ type: "subscription", amountMinor: 400, billingInterval: "month" })),
    ).toMatchObject({
      price: "$4",
      unit: "/ month",
      finePrint: "$4 a month until you cancel · Secure checkout",
    });
    expect(copy(plan({ type: "emi", amountMinor: 2550, installmentCount: 3 }))).toMatchObject({
      price: "$25.50",
      unit: "× 3",
      finePrint: "3 monthly payments of $25.50 · Secure checkout",
    });
  });

  it("prefers the plan's own description", () => {
    expect(copy(plan({ description: "Everything, forever" })).detail).toBe(
      "Everything, forever",
    );
    expect(copy(plan({})).detail).toBe("Full access, no card needed");
    expect(copy(plan({}), "product", true).detail).toBe("We email it to you");
  });
});
