import type { Metadata } from "next";
import { PublicSitePage } from "@/components/public-site-page";

export const metadata: Metadata = {
  title: "Community",
};

export default async function PublicCommunityDetailPage({
  params,
}: {
  params: Promise<{ communityId: string }>;
}) {
  const { communityId } = await params;
  return (
    <PublicSitePage
      pageSlug=""
      allowEmpty
      systemRoute="community"
      salesResource={{ resourceType: "community", resourceId: communityId }}
    />
  );
}
