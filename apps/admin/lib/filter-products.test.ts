import { describe, expect, it } from "bun:test";
import { loadFilterProducts } from "./filter-products";

function pagedFetch(pages: object[], calls: string[] = []) {
  let index = 0;
  const fetcher = (async (url: string, init?: RequestInit) => {
    calls.push(`${url}|${(init?.headers as Record<string, string>)["x-school-id"]}`);
    const body = pages[index++] ?? { items: [], nextCursor: null };
    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
  return fetcher;
}

describe("loadFilterProducts", () => {
  it("follows the cursor until the last page", async () => {
    const calls: string[] = [];
    const products = await loadFilterProducts(
      "sch_1",
      pagedFetch(
        [
          { items: [{ id: "p1", title: "One", extra: 1 }], nextCursor: "c1" },
          { items: [{ id: "p2", title: "Two" }], nextCursor: null },
        ],
        calls,
      ),
    );
    expect(products).toEqual([
      { id: "p1", title: "One" },
      { id: "p2", title: "Two" },
    ]);
    expect(calls).toEqual([
      "/api/v1/products?limit=50|sch_1",
      "/api/v1/products?limit=50&cursor=c1|sch_1",
    ]);
  });

  it("returns nothing for a school without products", async () => {
    expect(await loadFilterProducts("sch_1", pagedFetch([{}]))).toEqual([]);
  });

  it("fails when the products cannot be loaded", async () => {
    const failing = (async () => new Response("{}", { status: 500 })) as unknown as typeof fetch;
    await expect(loadFilterProducts("sch_1", failing)).rejects.toThrow(
      "Unable to load products.",
    );
  });
});
