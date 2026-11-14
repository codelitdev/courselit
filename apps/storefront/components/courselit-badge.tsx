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

/** Where "Report this site" goes: a fixed CourseLit page, never the school's (S12). */
export const REPORT_ABUSE_URL = "https://courselit.app/docs/policies/report-abuse";

/** "Report this site", shown on every plan; a school can't turn it off (S12). */
export function ReportSiteLink() {
  return (
    <LearnerLink href={REPORT_ABUSE_URL} target="_blank" rel="nofollow noopener noreferrer">
      <LearnerCaption>Report this site</LearnerCaption>
    </LearnerLink>
  );
}

/** The strip CourseLit owns under every public page. It sits outside the
 * page's layout, so editing the page can't remove it. It always has "Report
 * this site", and the badge unless the school's plan lets it hide it. */
export function CourseLitBadgeStrip() {
  const url = useCourseLitBadgeUrl();
  return (
    // Not a page-builder Section: that adds the theme's full section padding,
    // and this is a thin strip. The theme's own colour tokens style it.
    <div
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-background py-3 text-foreground print:hidden"
      data-courselit-strip=""
    >
      {url ? <CourseLitBadge /> : null}
      <ReportSiteLink />
    </div>
  );
}
