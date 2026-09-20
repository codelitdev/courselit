"use client";

import type { MediaRef } from "@courselit/api-contract";
import { Header1, Subheader1, Text2 } from "@frontlit/page-builder/primitives";
import { useEffect, useState } from "react";
import { PublicCatalogCard } from "@/components/public-catalog-card";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

type PublicProduct = {
  id: string;
  slug?: string;
  kind: "course" | "download";
  title: string;
  description: string;
  featuredImage: MediaRef | null;
  currency: string;
  priceMinor: number | null;
};

export function PublicProductsCatalog() {
  const theme = useSchoolThemeStyle();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/public/products?limit=50", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok || !active) return;
        const body = (await response.json()) as { items?: PublicProduct[] };
        setProducts(body.items ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <Header1 theme={theme}>Products</Header1>
        <Subheader1 theme={theme} component="span">
          Explore the products available from this school.
        </Subheader1>
      </header>

      {loading ? (
        <Text2 theme={theme}>Loading products…</Text2>
      ) : products.length === 0 ? (
        <Text2 theme={theme}>No products are available yet.</Text2>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            return (
              <PublicCatalogCard
                key={product.id}
                href={`/p/${encodeURIComponent(product.slug || product.id)}`}
                title={product.title}
                image={product.featuredImage}
                priceMinor={product.priceMinor}
                currency={product.currency}
                meta={product.kind === "course" ? "Course" : "Digital download"}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
