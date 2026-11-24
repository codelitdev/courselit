import { defineProfile, validateContent } from "@frontlit/text-editor/blocks";

/**
 * What community posts, comments and replies may hold: basic rich text only.
 * Headings start at level 2 (the post title is the top heading), and there are
 * no code blocks, dividers, tables or library blocks. Images, videos and files
 * go in as post attachments instead. The editor and the renderer share it.
 */
export const communityTextProfile = defineProfile({
  base: {
    exclude: ["codeBlock", "horizontalRule", "table"],
    headings: { levels: [2, 3] },
  },
  blocks: [],
});

/**
 * The profile to edit existing content with. Content written before this
 * profile, or sent through the API, may hold nodes it doesn't allow; editing
 * that under the community profile would drop them, so it keeps the default.
 */
export function communityEditorProfile(
  initialContent: unknown,
): typeof communityTextProfile | undefined {
  if (
    !initialContent ||
    typeof initialContent !== "object" ||
    (initialContent as { type?: unknown }).type !== "doc"
  ) {
    return communityTextProfile;
  }
  const result = validateContent(communityTextProfile, initialContent);
  return result.diagnostics.length === 0 ? communityTextProfile : undefined;
}
