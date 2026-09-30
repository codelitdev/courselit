import { LearnerSpacePost } from "@/components/communities/learner-community";

export default async function LearnerSpacePostPage({
  params,
}: {
  params: Promise<{ spaceId: string; postId: string }>;
}) {
  const { spaceId, postId } = await params;
  return <LearnerSpacePost spaceId={spaceId} postId={postId} />;
}
