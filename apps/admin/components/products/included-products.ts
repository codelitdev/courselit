/** How a community plan picks the products that come with it. */
export type IncludedProductsMode = "all" | "selected";

type PlanIncludes = { includesAllProducts?: boolean; includedProducts: string[] };

export function includedProductsMode(plan: PlanIncludes | null): IncludedProductsMode {
  return plan?.includesAllProducts ? "all" : "selected";
}

/** What the dialog sends for the plan's included products. */
export function includedProductsBody(mode: IncludedProductsMode, selected: string[]) {
  return mode === "all"
    ? { includesAllProducts: true, includedProducts: [] }
    : { includesAllProducts: false, includedProducts: [...new Set(selected)] };
}

/** Adds the product to the selection, or takes it out when already there. */
export function toggleIncludedProduct(selected: string[], productId: string): string[] {
  return selected.includes(productId)
    ? selected.filter((id) => id !== productId)
    : [...selected, productId];
}

/** The plan list's note on what a plan includes, or null when nothing. */
export function includedProductsSummary(plan: PlanIncludes): string | null {
  if (plan.includesAllProducts) return "All products";
  const count = plan.includedProducts.length;
  if (count === 0) return null;
  return `${count} ${count === 1 ? "product" : "products"}`;
}

/** The dropdown's caption for the current selection. */
export function selectionLabel(
  selected: string[],
  products: Array<{ id: string; title: string }>,
): string {
  if (selected.length === 0) return "Choose products";
  if (selected.length === 1) {
    return products.find((product) => product.id === selected[0])?.title ?? "1 product";
  }
  return `${selected.length} products`;
}
