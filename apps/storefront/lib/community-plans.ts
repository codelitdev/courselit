/**
 * The community plans that give access to a product. A product marked
 * "included with the community" comes with every plan; otherwise only the
 * plans that list it among their included products unlock it.
 */
export function communityPlansIncludingProduct<
  T extends { includedProducts?: string[] | null },
>(product: { id: string; includedWithCommunity?: boolean }, plans: T[]): T[] {
  if (product.includedWithCommunity) return plans;
  return plans.filter((plan) => plan.includedProducts?.includes(product.id));
}

/**
 * One line telling a visitor the product also comes with the community, or
 * null when no community plan unlocks it.
 */
export function communityAccessNote(
  communityName: string,
  product: { includedWithCommunity?: boolean },
  plans: Array<{ name: string }>,
): string | null {
  if (!plans.length) return null;
  if (product.includedWithCommunity) {
    return `Also included with a ${communityName} membership.`;
  }
  const names = plans.map((plan) => plan.name);
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
  return `Also included in ${communityName} with the ${list} ${
    names.length === 1 ? "plan" : "plans"
  }.`;
}
