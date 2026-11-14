"use client";

import type { School } from "@/components/layout/team-switcher";
import {
  type LimitUsage,
  limitNearlyUsed,
  usageShare,
  useSchoolUsage,
} from "@/components/settings/usage-meters";
import { StatusBanner } from "@/components/status-banner";

const PLAN_HREF = "/account/billing";

/**
 * What the admin says about a school that isn't fully running, and where it
 * sends the reader. Only the owner can pick a plan, so the rest of the team is
 * told to ask them. Null for a school that needs no notice.
 */
export function schoolStateNotice(
  school: Pick<School, "name" | "status" | "isOwner">,
): { text: string; actionLabel: string; actionHref: string } | null {
  const owner = school.isOwner === true;
  switch (school.status) {
    case "read_only":
      return {
        text: owner
          ? `${school.name} is read-only. Learners keep their access, but nothing can change until you pick a plan.`
          : `${school.name} is read-only until its owner picks a plan.`,
        actionLabel: owner ? "Choose a plan" : "See the plan",
        actionHref: PLAN_HREF,
      };
    case "pending_checkout":
    case "imported":
      return {
        text: owner
          ? `${school.name} isn't live yet. Pick a plan to open it to learners.`
          : `${school.name} isn't live until its owner picks a plan.`,
        actionLabel: owner ? "Choose a plan" : "See the plan",
        actionHref: owner ? "/onboarding/setup?plan=1" : PLAN_HREF,
      };
    case "suspended":
      return {
        text: `${school.name} is suspended. Write to support@courselit.app to find out why.`,
        actionLabel: "See the plan",
        actionHref: PLAN_HREF,
      };
    default:
      return null;
  }
}

/** "M4 Academy has used 85% of its storage." for the owner's banner. */
export function usageWarning(schoolName: string, usage: LimitUsage): string {
  const percent = Math.round((usageShare(usage) ?? 0) * 100);
  return usage.key === "storage_bytes"
    ? `${schoolName} has used ${percent}% of its storage.`
    : `${schoolName} has sent ${percent}% of this month's marketing email.`;
}

export function SchoolStateBanner({ school }: { school: School | undefined }) {
  const notice = school ? schoolStateNotice(school) : null;
  // Usage is billing information, so only the owner sees this warning (S9).
  const usage = useSchoolUsage(
    school?.id ?? null,
    Boolean(school?.isOwner) && !notice && school?.status === "active",
  );
  const nearlyUsed = usage ? limitNearlyUsed(usage) : null;
  if (!notice && nearlyUsed && school) {
    return (
      <StatusBanner actionLabel="See your plan" actionHref={PLAN_HREF}>
        {usageWarning(school.name, nearlyUsed)}
      </StatusBanner>
    );
  }
  if (!notice) return null;
  return (
    <StatusBanner actionLabel={notice.actionLabel} actionHref={notice.actionHref}>
      {notice.text}
    </StatusBanner>
  );
}
