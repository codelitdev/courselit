"use client";

import {
  Badge,
  Caption,
  Header1,
  Header4,
  PageCard,
  PageCardContent,
  Subheader1,
  Text2,
} from "@frontlit/page-builder/primitives";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LearnerCardImage } from "@/components/themed-page-builder";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

type PublicProduct = {
  id: string;
  slug?: string;
  kind: "course" | "download";
  title: string;
  description: string;
  featuredMedia: {
    canonicalUrl: string;
    thumbnailUrl: string | null;
    altText: string;
  } | null;
  currency: string;
  priceMinor: number | null;
};

function priceLabel(product: PublicProduct): string {
  if (product.priceMinor === null) return "Free access";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: product.currency,
  }).format(product.priceMinor / 100);
}

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
            const image = product.featuredMedia;
            return (
              <Link
                key={product.id}
                href={`/p/${encodeURIComponent(product.slug || product.id)}`}
              >
                <PageCard
                  theme={theme}
                  isLink
                  className="h-full overflow-hidden transition-transform hover:-translate-y-1"
                >
                  {image ? (
                    <LearnerCardImage
                      theme={theme}
                      src={image.thumbnailUrl ?? image.canonicalUrl}
                      alt={image.altText || product.title}
                      className="aspect-[16/9] w-full object-cover"
                    />
                  ) : null}
                  <PageCardContent theme={theme} className="flex h-full flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <Header4 theme={theme}>{product.title}</Header4>
                      <Badge theme={theme} variant="secondary">
                        {priceLabel(product)}
                      </Badge>
                    </div>
                    <Caption theme={theme}>
                      {product.kind === "course" ? "Course" : "Digital download"}
                    </Caption>
                    {product.description ? (
                      <Text2 theme={theme} className="line-clamp-3">
                        {product.description}
                      </Text2>
                    ) : null}
                  </PageCardContent>
                </PageCard>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
