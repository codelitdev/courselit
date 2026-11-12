"use client";

import { formatMoney } from "@courselit/api-contract/money";
import { Badge } from "@codelitdev/design-system";
import { CalendarClock, CreditCard } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CourseLitLoading } from "@/components/loading";
import { showPermissionDeniedToast } from "@/components/permission-denied-feedback";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";

type SchoolPlan = {
  billingAvailable: boolean;
  plan: "pro" | "business" | null;
  interval: "month" | "year" | null;
  status: string | null;
  amountMinor: number | null;
  currency: string | null;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  paidThroughAt: string | null;
  cancelAtPeriodEnd: boolean;
  pendingCheckout: boolean;
  pendingPlanChange: boolean;
  canCancel: boolean;
  canResume: boolean;
};

const PLAN_NAMES = { pro: "Pro", business: "Business" } as const;

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? null
    : new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(date);
}

function formatPrice(plan: SchoolPlan): string | null {
  if (plan.amountMinor === null || !plan.currency || !plan.interval) return null;
  const amount = formatMoney(plan.amountMinor, plan.currency);
  return `${amount} / ${plan.interval === "month" ? "month" : "year"}`;
}

function statusBadge(plan: SchoolPlan) {
  if (plan.cancelAtPeriodEnd) return <Badge variant="warning">Ends soon</Badge>;
  switch (plan.status) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "trialing":
      return <Badge variant="neutral">Free trial</Badge>;
    case "past_due":
    case "unpaid":
      return <Badge variant="destructive">Payment due</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return plan.status ? <Badge variant="outline">{plan.status}</Badge> : null;
  }
}

function failureMessage(status: number, action: "cancel" | "resume") {
  if (status === 409) {
    return "Your plan is being updated. Please try again in a minute.";
  }
  return action === "cancel"
    ? "We couldn't cancel your plan. Please try again."
    : "We couldn't resume your plan. Please try again.";
}

/**
 * The school's CourseLit plan, with cancel and resume. The owner's browser
 * session is required: billing actions are not available to API keys.
 */
export function PlanSettings({ schoolId }: { schoolId: string | null }) {
  const [plan, setPlan] = useState<SchoolPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setError(null);
    try {
      const response = await fetch("/api/v1/school/billing", {
        credentials: "include",
        cache: "no-store",
        headers: { "x-school-id": schoolId },
      });
      if (response.status === 403) {
        showPermissionDeniedToast();
        return;
      }
      if (!response.ok) throw new Error("Unable to load your plan.");
      setPlan((await response.json()) as SchoolPlan);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your plan.");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function change(action: "cancel" | "resume") {
    if (!schoolId || working) return;
    setWorking(true);
    try {
      const response = await fetch(`/api/v1/school/billing/${action}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", "x-school-id": schoolId },
        body: "{}",
      });
      const body = (await response.json().catch(() => null)) as { plan?: SchoolPlan } | null;
      if (!response.ok || !body?.plan) {
        if (response.status === 403) {
          showPermissionDeniedToast();
          return;
        }
        throw new Error(failureMessage(response.status, action));
      }
      setPlan(body.plan);
      setConfirmCancel(false);
      toast.success(
        action === "cancel"
          ? "Your plan will end at the close of the paid period."
          : "Your plan will keep renewing.",
      );
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return <CourseLitLoading label="Loading your plan…" className="justify-start" />;
  }
  if (error || !plan) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <p className="text-sm text-destructive">{error ?? "Unable to load your plan."}</p>
          <Button variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (!plan.billingAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-4" />
            Plan
          </CardTitle>
          <CardDescription>
            This school is self-hosted, so there is no CourseLit plan to manage.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  if (!plan.plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-4" />
            Plan
          </CardTitle>
          <CardDescription>
            {plan.pendingCheckout
              ? "A checkout is in progress. Your plan will show here once the payment completes."
              : "This school has no paid plan yet. Pick one to put it online for learners."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/onboarding/setup?resume=1">Choose a plan</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const price = formatPrice(plan);
  const endsOn = formatDate(plan.paidThroughAt ?? plan.currentPeriodEndsAt);
  const renewsOn = formatDate(plan.currentPeriodEndsAt ?? plan.paidThroughAt);
  const trialEnds = plan.status === "trialing" ? formatDate(plan.trialEndsAt) : null;

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-4" />
              {PLAN_NAMES[plan.plan]} plan
              {statusBadge(plan)}
            </CardTitle>
            <CardDescription>
              {price ? `${price}. ` : ""}Billed through your CourseLit account.
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            {plan.canResume ? (
              <Button disabled={working} onClick={() => void change("resume")}>
                Resume plan
              </Button>
            ) : null}
            {plan.canCancel ? (
              <Button variant="outline" disabled={working} onClick={() => setConfirmCancel(true)}>
                Cancel plan
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {plan.cancelAtPeriodEnd ? (
            <p className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                Your plan is set to end{endsOn ? ` on ${endsOn}` : " at the end of the paid period"}.
                It stays active until then, and you can resume it any time before.
              </span>
            </p>
          ) : (
            <p className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                {trialEnds
                  ? `Your free trial ends on ${trialEnds}.`
                  : renewsOn
                    ? `Renews on ${renewsOn}.`
                    : "Renews automatically."}
              </span>
            </p>
          )}
          {plan.status === "past_due" || plan.status === "unpaid" ? (
            <p className="text-destructive">
              We couldn&apos;t collect your last payment. Update your payment method with your
              CourseLit billing contact to keep this plan.
            </p>
          ) : null}
          {plan.pendingPlanChange ? (
            <p className="text-muted-foreground">A plan change is being processed.</p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={confirmCancel} onOpenChange={(open) => !working && setConfirmCancel(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel your {PLAN_NAMES[plan.plan]} plan?</DialogTitle>
            <DialogDescription>
              {endsOn
                ? `Your plan stays active until ${endsOn}, and you won't be charged again.`
                : "Your plan stays active until the end of the paid period, and you won't be charged again."}{" "}
              You can resume it any time before then.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={working} onClick={() => setConfirmCancel(false)}>
              Keep my plan
            </Button>
            <Button variant="destructive" disabled={working} onClick={() => void change("cancel")}>
              {working ? "Cancelling…" : "Cancel plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
