/**
 * Rules behind the New product screen: what a title's link will look like and
 * what happens after the draft is created. Kept free of React for unit tests.
 */

export type NewProductKind = "course" | "download";
/** How people get a download: bought (or joined on a plan), or free for an email. */
export type DownloadAccess = "sell" | "lead";

/** The slug the API gives a new product with this title (see products.ts). */
export function productSlugPreview(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200)
    .replace(/-$/g, "");
}

/** "school.example/p/", or a placeholder when the school has no address yet. */
export function storefrontLinkPrefix(origin: string | null | undefined): string {
  if (origin) {
    try {
      return `${new URL(origin).host}/p/`;
    } catch {
      // Fall through to the placeholder.
    }
  }
  return "[your-school]/p/";
}

/** The line next to Create draft saying what comes after it. */
export function newProductNextHint(
  kind: NewProductKind,
  access: DownloadAccess,
): string {
  if (kind === "course") {
    return "Next: add sections and lessons, then a payment plan, then make it live.";
  }
  return access === "lead"
    ? "Next: upload the file, then make it live. It's free for an email address."
    : "Next: upload the files and set a price, then make it live.";
}

/** The create request body for the choices on the screen. */
export function newProductBody(
  kind: NewProductKind,
  access: DownloadAccess,
  title: string,
): { kind: NewProductKind; title: string; description: string; leadMagnet?: true } {
  const body = { kind, title: title.trim(), description: "" };
  return kind === "download" && access === "lead"
    ? { ...body, leadMagnet: true }
    : body;
}
