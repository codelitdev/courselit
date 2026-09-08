import { CommunityAdmin } from "@/components/communities/community-admin";

export default async function ManageCommunityPage({
  params,
}: {
  params: Promise<{ communityId: string }>;
}) {
  const { communityId } = await params;
  return (
    <CommunityAdmin view="manage" communityId={communityId} manageSection="settings" />
  );
}
