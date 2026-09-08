import { CommunityAdmin } from "@/components/communities/community-admin";

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ communityId: string }>;
}) {
  const { communityId } = await params;
  return <CommunityAdmin view="detail" communityId={communityId} />;
}
