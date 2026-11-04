/**
 * Footer copyright text for a school's site.
 *
 * The page builder's footer block ships a product-branded placeholder, and its
 * editor merges block defaults into any footer that lacks the field, so saving
 * a page would store that placeholder on the school's site. A school without
 * copyright text of its own shows "© <year> <school name>" instead; this is
 * resolved when the site is rendered, so renaming the school updates it.
 */
export const PAGE_BUILDER_DEFAULT_COPYRIGHT = "© FrontLit. All rights reserved.";

type Widget = { name: string; settings?: Record<string, unknown> | null };

/** True when the footer text was written by a person, not filled in by default. */
export function hasOwnCopyright(text: unknown): text is string {
  return (
    typeof text === "string" &&
    text.trim() !== "" &&
    text.trim() !== PAGE_BUILDER_DEFAULT_COPYRIGHT
  );
}

export function schoolCopyright(
  schoolName: string | null | undefined,
  year: number = new Date().getFullYear(),
): string | undefined {
  const name = schoolName?.trim();
  return name ? `© ${year} ${name}` : undefined;
}

function mapFooter<T extends Widget>(
  layout: T[],
  update: (text: unknown) => string | undefined,
): T[] {
  return layout.map((widget) => {
    if (widget.name !== "footer") return widget;
    const { copyrightText, ...rest } = widget.settings ?? {};
    const next = update(copyrightText);
    return {
      ...widget,
      settings: next === undefined ? rest : { ...rest, copyrightText: next },
    };
  });
}

/** For the editor: show the school's own line wherever the footer has none. */
export function withSchoolCopyright<T extends Widget>(
  layout: T[],
  schoolName: string | null | undefined,
): T[] {
  const fallback = schoolCopyright(schoolName);
  return mapFooter(layout, (text) =>
    hasOwnCopyright(text) ? text : fallback,
  );
}

/** Before saving: do not store text that was only filled in as a default. */
export function withoutDefaultCopyright<T extends Widget>(
  layout: T[],
  schoolName: string | null | undefined,
): T[] {
  const derived = schoolCopyright(schoolName);
  return mapFooter(layout, (text) =>
    hasOwnCopyright(text) && text !== derived ? text : undefined,
  );
}
