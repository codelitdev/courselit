import type { Metadata } from "next";
import { PublicProductDetail } from "@/components/public-product-detail";
import { PublicSitePage } from "@/components/public-site-page";

export const metadata: Metadata = {
  title: "Product",
};

export default async function PublicProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  return (
    <PublicSitePage
      pageSlug=""
      allowEmpty
      systemRoute="product"
      salesResource={{ resourceType: "product", resourceId: productId }}
      systemContent={<PublicProductDetail productId={productId} />}
    />
  );
}
