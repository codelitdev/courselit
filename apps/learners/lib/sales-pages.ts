export type SalesPageResourceType = "product" | "community";

export const COURSELIT_SALES_PAGE_PREFIX = "courselit-sales-";

function normalizeSalesPageId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function salesPageSlug(
  resourceType: SalesPageResourceType,
  resourcePublicId: string,
): string {
  return `${COURSELIT_SALES_PAGE_PREFIX}${resourceType}-${normalizeSalesPageId(resourcePublicId)}`;
}
