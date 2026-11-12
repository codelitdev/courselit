import type { FilterProductOption } from "./contact-filters";

type ProductPage = {
  items?: { id: string; title: string }[];
  nextCursor?: string | null;
};

const PAGE_SIZE = 50;
const MAX_PAGES = 40;

/**
 * Every product of a school (drafts included, as learners can hold access to
 * those), following the list endpoint's cursor.
 */
export async function loadFilterProducts(
  schoolId: string,
  fetcher: typeof fetch = fetch,
): Promise<FilterProductOption[]> {
  const products: FilterProductOption[] = [];
  let cursor: string | null | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) query.set("cursor", cursor);
    const response = await fetcher(`/api/v1/products?${query.toString()}`, {
      credentials: "include",
      cache: "no-store",
      headers: { "x-school-id": schoolId },
    });
    if (!response.ok) throw new Error("Unable to load products.");
    const body = (await response.json()) as ProductPage;
    for (const item of body.items ?? []) {
      products.push({ id: item.id, title: item.title });
    }
    cursor = body.nextCursor;
    if (!cursor) break;
  }
  return products;
}
