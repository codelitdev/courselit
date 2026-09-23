"use client";

import { LearnerCard, LearnerCardContent, LearnerText2 } from "./themed-page-builder";
import { LearnerFeed } from "./dashboard/learner-feed";

/**
 * Product discussions are ordinary posts in the product's canonical space.
 * The space feed owns posting, reactions, and navigation to post discussions.
 */
export function CourseSpaceDiscussion({
  spaceId,
  previewToken,
  embeddedPostId,
  onEmbeddedPostIdChange,
}: {
  spaceId: string | null | undefined;
  previewToken?: string | null;
  embeddedPostId?: string | null;
  onEmbeddedPostIdChange?: (postId: string | null) => void;
}) {
  if (!spaceId) return null;

  if (previewToken) {
    return (
      <LearnerCard>
        <LearnerCardContent>
          <LearnerText2 className="text-muted-foreground">
            Discussion space content is available to enrolled learners.
          </LearnerText2>
        </LearnerCardContent>
      </LearnerCard>
    );
  }

  return (
    <LearnerFeed
      spaceId={spaceId}
      embeddedPostDetails
      embeddedPostId={embeddedPostId}
      onEmbeddedPostIdChange={onEmbeddedPostIdChange}
    />
  );
}
