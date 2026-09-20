import { LearnerFeed } from "@/components/dashboard/learner-feed";

export default async function LearnerSpaceFeedPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  return <LearnerFeed spaceId={spaceId} />;
}
