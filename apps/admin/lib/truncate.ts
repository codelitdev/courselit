/** How many characters a page title shows before it is cut. */
export const MAX_TITLE_DISPLAY_LENGTH = 80;

/**
 * Shortens user-entered text for display, ending it with "…". Counts
 * characters, not UTF-16 units, so emoji and accented letters are never split.
 * Pair it with the `truncate` class: this caps the length, the class clips
 * whatever still doesn't fit the width.
 */
export function truncateText(text: string, max = MAX_TITLE_DISPLAY_LENGTH): string {
  const characters = Array.from(text);
  if (characters.length <= max) return text;
  return `${characters
    .slice(0, Math.max(1, max - 1))
    .join("")
    .trimEnd()}…`;
}
