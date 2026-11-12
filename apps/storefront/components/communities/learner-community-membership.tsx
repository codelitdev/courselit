"use client";

import type { learnerCommunityMembershipSchema } from "@courselit/api-contract";
import { EllipsisVertical, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { requestJson } from "@/lib/request-json";
import { publicApiPath, useSchoolId } from "@/components/school-context";
import {
  type CommunityWithViewerMembership,
  pendingCommunityName,
} from "@/lib/community-membership";
import {
  LearnerAlertDialog,
  LearnerAlertDialogAction,
  LearnerAlertDialogCancel,
  LearnerAlertDialogContent,
  LearnerAlertDialogDescription,
  LearnerAlertDialogFooter,
  LearnerAlertDialogHeader,
  LearnerAlertDialogTitle,
  LearnerBadge,
  LearnerButton,
  LearnerDropdownMenu,
  LearnerDropdownMenuContent,
  LearnerDropdownMenuItem,
  LearnerDropdownMenuTrigger,
  LearnerText2,
} from "@/components/themed-page-builder";
import { toast } from "@/components/themed-sonner";
import { LEARNER_ACCESS_CHANGED } from "@/lib/learner-access-events";

type LearnerCommunityMembership = z.infer<typeof learnerCommunityMembershipSchema>;


/**
 * What happens when the learner leaves. Leaving cancels any running billing
 * at the payment provider and ends access straight away, with no grace period
 * for the rest of the billing cycle.
 */
export function leaveCommunityDescription(community: LearnerCommunityMembership) {
  const access = `You will lose access to ${community.name} right away, including its spaces, discussions, and any products included with your membership.`;
  if (!community.billing) return access;
  const plan =
    community.billing.kind === "installment"
      ? "Your remaining installments will be cancelled"
      : "Your subscription will be cancelled";
  return `${access} ${plan} and you will not be charged again. Access ends now, not at the end of your current billing period.`;
}

/**
 * The school's community, shown at the top of the learner's feed with the
 * way out of it. A school has at most one community, so there is nothing to
 * list: a learner who is not a member sees nothing here.
 */
export function LearnerCommunityMembershipBar() {
  const router = useRouter();
  const schoolId = useSchoolId();
  const [community, setCommunity] = useState<LearnerCommunityMembership | null>(null);
  // A learner who asked to join lands here straight after; say the request
  // is with the school instead of showing an empty feed with no explanation.
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let active = true;
    void requestJson<{ items: LearnerCommunityMembership[] }>(
      "/api/v1/learner/communities?limit=1",
    )
      .then(async (body) => {
        if (!active) return;
        const membership = body.items[0] ?? null;
        setCommunity(membership);
        if (membership) return;
        // The school's one community, looked up the way `/join` does.
        const detail = await requestJson<CommunityWithViewerMembership>(
          publicApiPath(schoolId, "/communities/community"),
        );
        if (active) setPendingName(pendingCommunityName(detail));
      })
      .catch(() => {
        // Without the membership there is nothing to leave; the feed still works.
      });
    return () => {
      active = false;
    };
  }, [schoolId]);

  if (!community) {
    if (!pendingName) return null;
    return (
      <LearnerText2 className="text-muted-foreground" role="status">
        Your request to join {pendingName} is waiting for approval. We&apos;ll let
        you know.
      </LearnerText2>
    );
  }

  async function leave(target: LearnerCommunityMembership) {
    setLeaving(true);
    try {
      await requestJson<{ left: boolean }>(
        `/api/v1/learner/communities/${encodeURIComponent(target.id)}/leave`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setCommunity(null);
      toast.success(
        target.billing
          ? `You left ${target.name}. Your billing has been cancelled.`
          : `You left ${target.name}.`,
      );
      // Spaces and posts this community unlocked are no longer available.
      router.refresh();
      window.dispatchEvent(new Event(LEARNER_ACCESS_CHANGED));
    } catch {
      toast.error(
        `Unable to leave ${target.name}. Your membership and billing are unchanged. Try again, or contact the school if this keeps happening.`,
      );
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <LearnerText2 component="span" className="min-w-0 truncate font-medium">
        {community.name}
      </LearnerText2>
      {community.membership?.role === "moderator" ? (
        <LearnerBadge variant="secondary">Moderator</LearnerBadge>
      ) : null}
      {community.canLeave ? (
        <LearnerDropdownMenu>
          <LearnerDropdownMenuTrigger asChild>
            <LearnerButton
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto"
              disabled={leaving}
              aria-label={`${community.name} options`}
            >
              <EllipsisVertical />
            </LearnerButton>
          </LearnerDropdownMenuTrigger>
          <LearnerDropdownMenuContent align="end">
            <LearnerDropdownMenuItem onSelect={() => setConfirming(true)}>
              <LogOut />
              <LearnerText2 component="span">Leave community</LearnerText2>
            </LearnerDropdownMenuItem>
          </LearnerDropdownMenuContent>
        </LearnerDropdownMenu>
      ) : null}
      <LearnerAlertDialog open={confirming} onOpenChange={setConfirming}>
        <LearnerAlertDialogContent>
          <LearnerAlertDialogHeader>
            <LearnerAlertDialogTitle>Leave {community.name}?</LearnerAlertDialogTitle>
            <LearnerAlertDialogDescription>
              {leaveCommunityDescription(community)}
            </LearnerAlertDialogDescription>
          </LearnerAlertDialogHeader>
          <LearnerAlertDialogFooter>
            <LearnerButton asChild variant="outline">
              <LearnerAlertDialogCancel>Stay</LearnerAlertDialogCancel>
            </LearnerButton>
            <LearnerButton asChild variant="destructive">
              <LearnerAlertDialogAction onClick={() => void leave(community)}>
                {community.billing ? "Leave and cancel billing" : "Leave community"}
              </LearnerAlertDialogAction>
            </LearnerButton>
          </LearnerAlertDialogFooter>
        </LearnerAlertDialogContent>
      </LearnerAlertDialog>
    </div>
  );
}
