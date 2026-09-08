import { LearnerCommunity } from "@/components/communities/learner-community";

export default async function LearnerCommunityPage({
  params,
}: {
  params: Promise<{ communityId: string }>;
}) {
  const { communityId } = await params;
  return <LearnerCommunity communityId={communityId} />;
}
