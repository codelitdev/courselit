import type { Metadata } from "next";
import { PublicCommunityDetail } from "@/components/public-community-detail";
import { loadPublicPage, PublicSitePage } from "@/components/public-site-page";
import { metadataForPublicPage } from "@/lib/public-page-metadata";
import { salesPageSlug } from "@/lib/sales-pages";

interface Props {
  params: Promise<{ communityId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communityId } = await params;
  const { page } = await loadPublicPage(salesPageSlug("community", communityId));
  return {
    ...metadataForPublicPage(page, "Community"),
    alternates: { canonical: `/communities/${encodeURIComponent(communityId)}` },
  };
}

export default async function PublicCommunityDetailPage({ params }: Props) {
  const { communityId } = await params;
  return (
    <PublicSitePage
      pageSlug={`communities/${communityId}`}
      salesPageSlug={salesPageSlug("community", communityId)}
      allowEmpty
      fallbackToHomepage
      systemRoute="community"
      systemContent={<PublicCommunityDetail communityId={communityId} />}
    />
  );
}
