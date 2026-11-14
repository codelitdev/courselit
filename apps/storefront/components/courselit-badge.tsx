"use client";

import { createContext, type ReactNode, useContext } from "react";
import { LearnerCaption, LearnerLink } from "./themed-page-builder";

const BadgeUrlContext = createContext<string | null>(null);

/** Where the "Powered by CourseLit" badge links, or null when the school's
 * plan lets it hide the badge and it did (docs/wip/plan-limits.md, section 4). */
export function CourseLitBadgeProvider({
  url,
  children,
}: {
  url: string | null;
  children: ReactNode;
}) {
  return <BadgeUrlContext.Provider value={url}>{children}</BadgeUrlContext.Provider>;
}

export function useCourseLitBadgeUrl(): string | null {
  return useContext(BadgeUrlContext);
}

/** The badge itself: a small themed link, `nofollow`, opening in a new tab. */
export function CourseLitBadge({ className }: { className?: string }) {
  const url = useCourseLitBadgeUrl();
  if (!url) return null;
  return (
    <div className={`flex justify-center ${className ?? ""}`} data-courselit-badge="">
      <LearnerLink href={url} target="_blank" rel="nofollow noopener noreferrer">
        <LearnerCaption>
          Powered by <strong>CourseLit</strong>
        </LearnerCaption>
      </LearnerLink>
    </div>
  );
}

/** The strip CourseLit owns under every public page. It sits outside the
 * page's layout, so editing the page can't remove it. */
export function CourseLitBadgeStrip() {
  const url = useCourseLitBadgeUrl();
  if (!url) return null;
  return (
    // Not a page-builder Section: that adds the theme's full section padding,
    // and this is a thin strip. The theme's own colour tokens style it.
    <div className="bg-background text-foreground">
      <CourseLitBadge className="py-3" />
    </div>
  );
}
