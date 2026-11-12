import { describe, expect, it } from "bun:test";
import { communityAccessNote, communityPlansIncludingProduct } from "./community-plans";

const free = { id: "free", includedProducts: [] as string[] };
const monthly = { id: "monthly", includedProducts: ["prd_course"] };

describe("communityPlansIncludingProduct", () => {
  it("offers every plan for a product included with the whole community", () => {
    expect(
      communityPlansIncludingProduct(
        { id: "prd_course", includedWithCommunity: true },
        [free, monthly],
      ),
    ).toEqual([free, monthly]);
  });

  it("offers only the plans that list the product otherwise", () => {
    expect(
      communityPlansIncludingProduct(
        { id: "prd_course", includedWithCommunity: false },
        [free, monthly],
      ),
    ).toEqual([monthly]);
    expect(
      communityPlansIncludingProduct({ id: "prd_other" }, [free, monthly]),
    ).toEqual([]);
  });
});

describe("communityAccessNote", () => {
  it("names the plans that include the product", () => {
    expect(communityAccessNote("Makers", {}, [{ name: "Monthly" }])).toBe(
      "Also included in Makers with the Monthly plan.",
    );
    expect(
      communityAccessNote("Makers", {}, [{ name: "Monthly" }, { name: "Yearly" }]),
    ).toBe("Also included in Makers with the Monthly or Yearly plans.");
  });

  it("speaks of membership when every plan includes it", () => {
    expect(
      communityAccessNote("Makers", { includedWithCommunity: true }, [
        { name: "Free" },
      ]),
    ).toBe("Also included with a Makers membership.");
  });

  it("is null when no plan includes it", () => {
    expect(communityAccessNote("Makers", {}, [])).toBeNull();
  });
});
