/**
 * The "Edited" note shown next to a community post's or comment's date.
 * Null when it was never edited or the date can't be read.
 */
export function editedNote(
  editedAt: string | null | undefined,
  locale?: string,
): { label: string; title: string } | null {
  if (!editedAt) return null;
  const date = new Date(editedAt);
  if (Number.isNaN(date.getTime())) return null;
  const when = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
  return { label: "Edited", title: `Edited ${when}` };
}
