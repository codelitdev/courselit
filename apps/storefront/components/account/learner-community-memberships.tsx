"use client";

import type { learnerCommunityMembershipSchema } from "@courselit/api-contract";
import { Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { z } from "zod";
import { LearnerAccountTabs } from "@/components/account/learner-account-tabs";
import { CourseLitLoading, CourseLitLoadingIcon } from "@/components/course-lit-loader";
import {
  requestJson,
  useLearnerSession,
} from "@/components/communities/learner-community";
import { LearnerShell } from "@/components/layout/learner-shell";
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
  LearnerCardImage,
  LearnerHeader1,
  LearnerHeader2,
  LearnerLink,
  LearnerText2,
  LearnerCard as PageCard,
  LearnerCardContent as PageCardContent,
} from "@/components/themed-page-builder";
import { toast } from "@/components/themed-sonner";

type LearnerCommunityMembership = z.infer<typeof learnerCommunityMembershipSchema>;

const PAGE_SIZE = 25;
export const LEARNER_COMMUNITIES_PATH = "/dashboard/account/communities";

function communitiesPath(cursor?: string | null) {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (cursor) params.set("cursor", cursor);
  return `/api/v1/learner/communities?${params.toString()}`;
}

function billingLabel(billing: LearnerCommunityMembership["billing"]) {
  if (!billing) return null;
  return billing.kind === "installment"
    ? `${billing.planName} · installment plan`
    : `${billing.planName} · subscription`;
}

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

export function LearnerCommunityMemberships() {
  const router = useRouter();
  const { learner, checking } = useLearnerSession(LEARNER_COMMUNITIES_PATH);
  const [communities, setCommunities] = useState<LearnerCommunityMembership[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<LearnerCommunityMembership | null>(
    null,
  );
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string | null) => {
    const body = await requestJson<{
      items: LearnerCommunityMembership[];
      nextCursor: string | null;
    }>(communitiesPath(cursor));
    setCommunities((current) => (cursor ? [...current, ...body.items] : body.items));
    setNextCursor(body.nextCursor);
  }, []);

  useEffect(() => {
    if (!learner) return;
    let active = true;
    setLoading(true);
    setError(null);
    void load()
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load your communities.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [learner, load]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      await load(nextCursor);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load more communities.",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function leave(community: LearnerCommunityMembership) {
    if (leavingId) return;
    setLeavingId(community.id);
    try {
      await requestJson<{ left: boolean }>(
        `/api/v1/learner/communities/${encodeURIComponent(community.id)}/leave`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setCommunities((current) => current.filter((item) => item.id !== community.id));
      toast.success(
        community.billing
          ? `You left ${community.name}. Your billing has been cancelled.`
          : `You left ${community.name}.`,
      );
      // Spaces and posts this community unlocked are no longer available.
      router.refresh();
    } catch {
      toast.error(
        `Unable to leave ${community.name}. Your membership and billing are unchanged. Try again, or contact the school if this keeps happening.`,
      );
    } finally {
      setLeavingId(null);
    }
  }

  if (checking) {
    return (
      <LearnerShell user={null} loading headerTitle="Account">
        <main className="flex min-h-[400px] items-center justify-center p-6">
          <CourseLitLoading label="Loading your communities…" />
        </main>
      </LearnerShell>
    );
  }
  if (!learner) return null;

  return (
    <LearnerShell user={learner} headerTitle="Account">
      <main className="grid gap-7">
        <header>
          <LearnerHeader1>Communities</LearnerHeader1>
          <LearnerText2 className="mt-2 text-muted-foreground">
            The communities you belong to. Leaving a community also cancels any
            subscription or installment plan you pay for it.
          </LearnerText2>
        </header>
        <LearnerAccountTabs />
        {error ? (
          <LearnerText2 className="text-destructive" role="alert">
            {error}
          </LearnerText2>
        ) : null}
        {loading ? (
          <CourseLitLoading label="Loading your communities…" />
        ) : communities.length === 0 ? (
          <PageCard>
            <PageCardContent className="grid justify-items-start gap-3">
              <Users className="size-8 text-muted-foreground" aria-hidden="true" />
              <LearnerHeader2>You are not in any communities</LearnerHeader2>
              <LearnerText2 className="text-muted-foreground">
                Communities you join will show up here.
              </LearnerText2>
              <LearnerLink href="/dashboard">Back to your feed</LearnerLink>
            </PageCardContent>
          </PageCard>
        ) : (
          <section className="grid gap-4" aria-label="Your communities">
            {communities.map((community) => {
              const billing = billingLabel(community.billing);
              const leaving = leavingId === community.id;
              return (
                <PageCard key={community.id}>
                  <PageCardContent className="flex flex-wrap items-center gap-4">
                    <LearnerCardImage
                      src={
                        community.featuredImage?.thumbnailUrl ??
                        community.featuredImage?.url ??
                        "/courselit_backdrop_square.webp"
                      }
                      alt={community.featuredImage?.alt || community.name}
                      className="size-16 shrink-0 object-cover"
                    />
                    <div className="grid min-w-0 flex-1 gap-1">
                      <LearnerHeader2 className="truncate">
                        {community.name}
                      </LearnerHeader2>
                      <div className="flex flex-wrap items-center gap-2">
                        {community.membership?.role === "moderator" ? (
                          <LearnerBadge variant="secondary">Moderator</LearnerBadge>
                        ) : null}
                        <LearnerBadge variant="outline">
                          {billing ?? "No recurring billing"}
                        </LearnerBadge>
                      </div>
                    </div>
                    <LearnerButton
                      type="button"
                      variant="outline"
                      disabled={Boolean(leavingId)}
                      onClick={() => setLeaveTarget(community)}
                    >
                      {leaving ? "Leaving…" : "Leave community"}
                    </LearnerButton>
                  </PageCardContent>
                </PageCard>
              );
            })}
            {nextCursor ? (
              <LearnerButton
                type="button"
                variant="outline"
                className="justify-self-center"
                disabled={loadingMore}
                aria-label={
                  loadingMore ? "Loading communities" : "Load more communities"
                }
                onClick={() => void loadMore()}
              >
                {loadingMore ? <CourseLitLoadingIcon size={14} /> : "Load more"}
              </LearnerButton>
            ) : null}
          </section>
        )}
        <LearnerAlertDialog
          open={Boolean(leaveTarget)}
          onOpenChange={(open) => {
            if (!open) setLeaveTarget(null);
          }}
        >
          <LearnerAlertDialogContent>
            <LearnerAlertDialogHeader>
              <LearnerAlertDialogTitle>
                {leaveTarget ? `Leave ${leaveTarget.name}?` : "Leave community?"}
              </LearnerAlertDialogTitle>
              <LearnerAlertDialogDescription>
                {leaveTarget ? leaveCommunityDescription(leaveTarget) : null}
              </LearnerAlertDialogDescription>
            </LearnerAlertDialogHeader>
            <LearnerAlertDialogFooter>
              <LearnerButton asChild variant="outline">
                <LearnerAlertDialogCancel>Stay</LearnerAlertDialogCancel>
              </LearnerButton>
              <LearnerButton asChild variant="destructive">
                <LearnerAlertDialogAction
                  onClick={() => {
                    const target = leaveTarget;
                    setLeaveTarget(null);
                    if (target) void leave(target);
                  }}
                >
                  {leaveTarget?.billing
                    ? "Leave and cancel billing"
                    : "Leave community"}
                </LearnerAlertDialogAction>
              </LearnerButton>
            </LearnerAlertDialogFooter>
          </LearnerAlertDialogContent>
        </LearnerAlertDialog>
      </main>
    </LearnerShell>
  );
}
