export type CommunityWithViewerMembership = {
  id: string;
  name: string;
  membership?: { status?: string } | null;
};

/** The community's name when the learner has asked to join and is waiting
 * for the school to approve them; otherwise null. */
export function pendingCommunityName(
  community: CommunityWithViewerMembership | null | undefined,
): string | null {
  return community?.membership?.status === "pending" ? community.name : null;
}
