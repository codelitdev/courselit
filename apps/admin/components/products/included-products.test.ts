import { describe, expect, it } from "bun:test";
import {
  includedProductsBody,
  includedProductsMode,
  includedProductsSummary,
  selectionLabel,
  toggleIncludedProduct,
} from "./included-products";

describe("included products of a community plan", () => {
  it("starts in the plan's mode, selected products for a new plan", () => {
    expect(includedProductsMode(null)).toBe("selected");
    expect(includedProductsMode({ includesAllProducts: true, includedProducts: [] })).toBe("all");
    expect(includedProductsMode({ includedProducts: ["prd_a"] })).toBe("selected");
  });

  it("sends no list for all products, and the de-duplicated selection otherwise", () => {
    expect(includedProductsBody("all", ["prd_a"])).toEqual({
      includesAllProducts: true,
      includedProducts: [],
    });
    expect(includedProductsBody("selected", ["prd_a", "prd_b", "prd_a"])).toEqual({
      includesAllProducts: false,
      includedProducts: ["prd_a", "prd_b"],
    });
    expect(includedProductsBody("selected", [])).toEqual({
      includesAllProducts: false,
      includedProducts: [],
    });
  });

  it("toggles a product in and out of the selection", () => {
    expect(toggleIncludedProduct([], "prd_a")).toEqual(["prd_a"]);
    expect(toggleIncludedProduct(["prd_a", "prd_b"], "prd_a")).toEqual(["prd_b"]);
  });

  it("summarises a plan for the plan list", () => {
    expect(includedProductsSummary({ includesAllProducts: true, includedProducts: [] })).toBe(
      "All products",
    );
    expect(includedProductsSummary({ includedProducts: ["prd_a"] })).toBe("1 product");
    expect(includedProductsSummary({ includedProducts: ["prd_a", "prd_b"] })).toBe(
      "2 products",
    );
    expect(includedProductsSummary({ includedProducts: [] })).toBeNull();
  });

  it("captions the dropdown", () => {
    const products = [
      { id: "prd_a", title: "Watercolor" },
      { id: "prd_b", title: "Ink" },
    ];
    expect(selectionLabel([], products)).toBe("Choose products");
    expect(selectionLabel(["prd_a"], products)).toBe("Watercolor");
    expect(selectionLabel(["prd_gone"], products)).toBe("1 product");
    expect(selectionLabel(["prd_a", "prd_b"], products)).toBe("2 products");
  });
});
