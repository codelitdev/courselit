import type { Metadata } from "next";
import { PublicProductDetail } from "@/components/public-product-detail";
import { loadPublicPage, PublicSitePage } from "@/components/public-site-page";
import { metadataForPublicPage } from "@/lib/public-page-metadata";
import { salesPageSlug } from "@/lib/sales-pages";

interface Props {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productId } = await params;
  const { page } = await loadPublicPage(salesPageSlug("product", productId));
  return {
    ...metadataForPublicPage(page, "Product"),
    alternates: { canonical: `/product/${encodeURIComponent(productId)}` },
  };
}

export default async function PublicProductPage({ params }: Props) {
  const { productId } = await params;
  return (
    <PublicSitePage
      pageSlug={`product/${productId}`}
      salesPageSlug={salesPageSlug("product", productId)}
      allowEmpty
      fallbackToHomepage
      systemRoute="product"
      systemContent={<PublicProductDetail productId={productId} />}
    />
  );
}
