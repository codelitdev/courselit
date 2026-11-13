/**
 * Community details follow the admin's save convention: switches and choices
 * save the moment they change, and each card with text fields has its own
 * Save that appears once something is edited.
 */

export type SavedCommunityDetails = {
  name: string;
  description: string;
  banner: string;
  joiningReasonText: string;
};

export type CommunityDetailsDraft = SavedCommunityDetails & {
  /** Whether the welcome banner's switch is on. */
  bannerOn: boolean;
};

export type CommunityDetailsDirty = {
  details: boolean;
  banner: boolean;
  question: boolean;
  any: boolean;
};

export function communityDetailsDirty(
  saved: SavedCommunityDetails,
  draft: CommunityDetailsDraft,
): CommunityDetailsDirty {
  const details = draft.name !== saved.name || draft.description !== saved.description;
  // With the switch off there is no message to save: turning it off saves.
  const banner = draft.bannerOn && draft.banner !== saved.banner;
  const question = draft.joiningReasonText !== saved.joiningReasonText;
  return { details, banner, question, any: details || banner || question };
}

/**
 * What turning the welcome banner's switch saves. Turning it off clears the
 * saved message; turning it on saves nothing until a message is written.
 */
export function bannerSwitchUpdate(
  on: boolean,
  savedBanner: string,
): { banner: string } | null {
  if (on || savedBanner === "") return null;
  return { banner: "" };
}
