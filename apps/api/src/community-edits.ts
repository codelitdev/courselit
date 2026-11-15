/**
 * Whether saving a post or comment changes what readers see, so it earns the
 * "Edited" label. Saving without changes, pinning, moving between spaces and
 * moderation don't count.
 */

/** Same ids, ignoring order and duplicates. */
function sameIds(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((id) => right.has(id));
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

type Media = { before: readonly string[]; after: readonly string[] | undefined };

export function postWasEdited(
  before: { title: string; content: string; gifUrls: readonly string[] },
  after: { title: string; content: string; gifUrls: readonly string[] },
  media: Media,
): boolean {
  return (
    before.title !== after.title ||
    before.content !== after.content ||
    !sameList(before.gifUrls, after.gifUrls) ||
    (media.after !== undefined && !sameIds(media.before, media.after))
  );
}

export function commentWasEdited(
  before: { content: string },
  after: { content: string },
  media: Media,
): boolean {
  return (
    before.content !== after.content ||
    (media.after !== undefined && !sameIds(media.before, media.after))
  );
}
