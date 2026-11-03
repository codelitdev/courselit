import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicCommunityDetail } from "@/components/public-community-detail";
import { PublicSitePage } from "@/components/public-site-page";
import { getPublicCommunity } from "@/lib/courselit-public";

export const metadata: Metadata = {
  title: "Join",
};

/**
 * `/join` is the address creators share, so it shows the community's own
 * sales page, with the edits made in the page editor, the same page served at
 * `/p/<community slug>`.
 */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const community = await getPublicCommunity(schoolId, "community");
  if (!community) notFound();
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
