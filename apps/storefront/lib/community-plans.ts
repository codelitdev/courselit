type IncludesProducts = {
  includesAllProducts?: boolean | null;
  includedProducts?: string[] | null;
};

/** Whether a community plan gives the product: it includes every product, or lists it. */
export function planIncludesProduct(plan: IncludesProducts, productId: string): boolean {
  return Boolean(plan.includesAllProducts || plan.includedProducts?.includes(productId));
}

/**
 * The community plans that give access to a product: the plans that include
 * every product, and the plans that list it among their included products.
 */
export function communityPlansIncludingProduct<T extends IncludesProducts>(
  productId: string,
  plans: T[],
): T[] {
  return plans.filter((plan) => planIncludesProduct(plan, productId));
}

/**
 * One line telling a visitor the product also comes with the community, or
 * null when no community plan unlocks it. `including` are the plans that give
 * the product, out of the community's `plans`; when every plan gives it, any
 * membership does.
 */
export function communityAccessNote(
  communityName: string,
  including: Array<{ name: string }>,
  plans: Array<unknown>,
): string | null {
  if (!including.length) return null;
  if (including.length === plans.length) {
    return `Also included with a ${communityName} membership.`;
  }
  const names = including.map((plan) => plan.name);
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
  return `Also included in ${communityName} with the ${list} ${
    names.length === 1 ? "plan" : "plans"
  }.`;
}
