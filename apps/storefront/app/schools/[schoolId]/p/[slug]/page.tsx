import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicCommunityDetail } from "@/components/public-community-detail";
import { PublicProductDetail } from "@/components/public-product-detail";
import { loadPublicPage, PublicSitePage } from "@/components/public-site-page";
import { JsonLd } from "@/components/json-ld";
import {
  getPublicCommunity,
  getPublicProduct,
  getPublicProductDetail,
  getPublicProductPlans,
  getSettings,
} from "@/lib/courselit-public";
import { metadataForPublicPage } from "@/lib/public-page-metadata";
import { productJsonLd } from "@/lib/structured-data";

interface Props {
  params: Promise<{ schoolId: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { schoolId, slug } = await params;
  const settings = await getSettings(schoolId);
  const product = await getPublicProduct(schoolId, slug);
  const community = product ? null : await getPublicCommunity(schoolId, slug);
  const resource = product ?? community;
  if (!resource) return { title: "Page not found" };

  const { page } = await loadPublicPage(resource.slug, schoolId);
  return {
    ...metadataForPublicPage(page, product ? product.title : community!.name, settings),
    alternates: { canonical: `/p/${encodeURIComponent(resource.slug)}` },
  };
}

export default async function PublicSalesPage({ params }: Props) {
  const { schoolId, slug } = await params;
  const product = await getPublicProductDetail(schoolId, slug);
  if (product) {
    const [settings, plans] = await Promise.all([
      getSettings(schoolId),
      getPublicProductPlans(schoolId, product.id),
    ]);
    return (
      <>
        <JsonLd data={productJsonLd(settings, product, plans)} />
        <PublicSitePage
          pageSlug={`p/${product.slug}`}
          salesPageSlug={product.slug}
          allowEmpty
          fallbackToHomepage
          systemRoute="product"
          systemContent={<PublicProductDetail productId={product.id} />}
          salesResource={{ resourceType: "product", resourceId: product.id }}
          schoolId={schoolId}
        />
      </>
    );
  }

  const community = await getPublicCommunity(schoolId, slug);
  if (community) {
    return (
      <PublicSitePage
        pageSlug={`p/${community.slug}`}
        salesPageSlug={community.slug}
        allowEmpty
        fallbackToHomepage
        systemRoute="community"
        systemContent={<PublicCommunityDetail communityId={community.id} />}
        salesResource={{ resourceType: "community", resourceId: community.id }}
        schoolId={schoolId}
      />
    );
  }

  notFound();
}
