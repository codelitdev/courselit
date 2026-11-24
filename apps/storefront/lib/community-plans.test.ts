import { describe, expect, it } from "bun:test";
import {
  communityAccessNote,
  communityPlansIncludingProduct,
  planIncludesProduct,
} from "./community-plans";

const free = { id: "free", name: "Free", includesAllProducts: false, includedProducts: [] as string[] };
const monthly = {
  id: "monthly",
  name: "Monthly",
  includesAllProducts: false,
  includedProducts: ["prd_course"],
};
const everything = {
  id: "everything",
  name: "Everything",
  includesAllProducts: true,
  includedProducts: [] as string[],
};

describe("planIncludesProduct", () => {
  it("is true for an all-products plan and for a plan listing the product", () => {
    expect(planIncludesProduct(everything, "prd_other")).toBe(true);
    expect(planIncludesProduct(monthly, "prd_course")).toBe(true);
    expect(planIncludesProduct(monthly, "prd_other")).toBe(false);
    expect(planIncludesProduct({}, "prd_course")).toBe(false);
  });
});

describe("communityPlansIncludingProduct", () => {
  it("offers all-products plans and the plans that list the product", () => {
    expect(
      communityPlansIncludingProduct("prd_course", [free, monthly, everything]),
    ).toEqual([monthly, everything]);
    expect(
      communityPlansIncludingProduct("prd_other", [free, monthly, everything]),
    ).toEqual([everything]);
  });

  it("offers nothing when no plan includes the product", () => {
    expect(communityPlansIncludingProduct("prd_other", [free, monthly])).toEqual([]);
  });
});

describe("communityAccessNote", () => {
  it("names the plans that include the product", () => {
    expect(communityAccessNote("Makers", [monthly], [free, monthly])).toBe(
      "Also included in Makers with the Monthly plan.",
    );
    expect(
      communityAccessNote("Makers", [monthly, everything], [free, monthly, everything]),
    ).toBe("Also included in Makers with the Monthly or Everything plans.");
  });

  it("speaks of membership when every plan includes it", () => {
    expect(communityAccessNote("Makers", [everything], [everything])).toBe(
      "Also included with a Makers membership.",
    );
    expect(
      communityAccessNote("Makers", [monthly, everything], [monthly, everything]),
    ).toBe("Also included with a Makers membership.");
  });

  it("is null when no plan includes it", () => {
    expect(communityAccessNote("Makers", [], [free])).toBeNull();
  });
});
