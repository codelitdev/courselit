import { LearnerCommunity } from "@/components/communities/learner-community";

export default async function LearnerCommunityPostPage({
  params,
}: {
  params: Promise<{ communityId: string; postId: string }>;
}) {
  const { communityId, postId } = await params;
  return <LearnerCommunity communityId={communityId} postId={postId} />;
}
