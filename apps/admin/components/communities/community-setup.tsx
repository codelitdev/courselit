"use client";

import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  hasConfiguredPaymentProvider,
  type PaymentSettings,
} from "@/components/products/payment-plan-dialog";
import { PaymentPlanList } from "@/components/products/payment-plan-list";
import { Button } from "@/components/ui/codelit/button";
import { Input } from "@/components/ui/codelit/input";
import { cn } from "@/lib/utils";
import { CommunityHomePreview, SalesPagePreview } from "./community-previews";
import {
  type Community,
  CommunityCard,
  type CommunityRequest,
  errorMessage,
  type School,
  type StorefrontPlan,
} from "./community-shared";

const SETUP_STEPS = [
  {
    title: "Choose how people join",
    description: "Offer one plan or several: free, one-time, subscription or installments.",
    required: true,
  },
  {
    title: "Make it yours",
    description:
      "A featured image, a description and a welcome banner, with a live preview as you type.",
  },
  {
    title: "Invite your learners",
    description: "Share the link to your sales page, or let people find it from your school.",
  },
];

export function CommunityNotSetUp({
  school,
  community,
  address,
  canSetUp,
}: {
  school: School;
  community: Community;
  address: string;
  canSetUp: boolean;
}) {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A place for your learners to ask questions, share their work and meet each other.
        </p>
      </div>
      <section className="grid overflow-hidden rounded-xl border bg-card shadow-sm lg:grid-cols-2">
        <div className="space-y-8 p-8 lg:p-12">
          <div className="space-y-4">
            <p className="font-mono text-xs text-primary">Not set up yet</p>
            <h2 className="text-3xl font-semibold tracking-tight">Start your community</h2>
            <p className="max-w-md text-muted-foreground">
              Give learners somewhere to ask questions, share wins and meet each other
              between lessons. Choose how people join and it&apos;s live. You can polish
              the rest later.
            </p>
          </div>
          <ol className="divide-y">
            {SETUP_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4 py-4 first:pt-0">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    index === 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>
                <span>
                  <span className="flex items-center gap-2 font-medium">
                    {step.title}
                    {step.required ? (
                      <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-xs text-primary">
                        Required
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {step.description}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          {canSetUp ? (
            <div className="flex items-center gap-4">
              <Button asChild>
                <Link href="/community/setup">
                  Set up community <ArrowRight />
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">Takes about two minutes</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ask a school admin to set up the community.
            </p>
          )}
        </div>
        <div className="flex items-center bg-muted/40 p-8 lg:p-12">
          <CommunityHomePreview
            schoolName={school.name}
            address={address}
            community={community}
            banner="Welcome! Introduce yourself in General and tell us what you're learning."
            posts={[]}
            device="desktop"
          />
        </div>
      </section>
    </>
  );
}

function ChecklistItem({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="size-4 text-emerald-600" aria-label="Done" />
      ) : (
        <Circle className="size-4 text-muted-foreground" aria-label="Not done" />
      )}
      <span className={done ? "" : "text-muted-foreground"}>{children}</span>
    </li>
  );
}

export function WhoGetsIn({
  autoAcceptMembers,
  onAutoAcceptChange,
  joiningReasonText,
  onJoiningReasonTextChange,
}: {
  autoAcceptMembers: boolean;
  onAutoAcceptChange: (value: boolean) => void;
  joiningReasonText: string;
  onJoiningReasonTextChange: (value: string) => void;
}) {
  const options = [
    {
      value: true,
      title: "Everyone who joins",
      description: "People are in as soon as they sign up or pay.",
    },
    {
      value: false,
      title: "Only people I approve",
      description:
        "They ask to join and tell you why. You approve or reject from Members.",
    },
  ];
  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Who gets in" className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const active = autoAcceptMembers === option.value;
          return (
            <button
              key={option.title}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onAutoAcceptChange(option.value)}
              className={cn(
                "flex gap-3 rounded-lg border p-4 text-left transition-colors",
                active
                  ? "border-primary bg-[var(--primary-soft)]"
                  : "hover:border-primary/50",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                  active && "border-primary",
                )}
                aria-hidden="true"
              >
                {active ? <span className="size-2 rounded-full bg-primary" /> : null}
              </span>
              <span>
                <span className="block font-medium">{option.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {!autoAcceptMembers ? (
        <div className="field">
          <label htmlFor="community-joining-question">Question to ask</label>
          <Input
            id="community-joining-question"
            maxLength={500}
            value={joiningReasonText}
            onChange={(event) => onJoiningReasonTextChange(event.target.value)}
            placeholder="Why do you want to join this community?"
          />
        </div>
      ) : null}
    </div>
  );
}

export function CommunitySetup({
  school,
  community,
  plans,
  setPlans,
  request,
  address,
  onLive,
}: {
  school: School;
  community: Community;
  plans: StorefrontPlan[];
  setPlans: (plans: StorefrontPlan[]) => void;
  request: CommunityRequest;
  address: string;
  onLive: (community: Community) => void;
}) {
  const [name, setName] = useState(community.name);
  const [autoAcceptMembers, setAutoAcceptMembers] = useState(community.autoAcceptMembers);
  const [joiningReasonText, setJoiningReasonText] = useState(community.joiningReasonText);
  const [paymentsConnected, setPaymentsConnected] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void request<PaymentSettings>("/api/v1/school/payment-settings")
      .then((settings) => {
        if (active) setPaymentsConnected(hasConfiguredPaymentProvider(settings));
      })
      .catch(() => {
        if (active) setPaymentsConnected(false);
      });
    return () => {
      active = false;
    };
  }, [request]);

  const activePlans = plans.filter((plan) => plan.status === "active");
  const hasDefaultPlan = activePlans.some((plan) => plan.isDefault);
  const needsPayments = activePlans.some((plan) => plan.kind !== "free");
  const named = Boolean(name.trim());
  const plansReady = activePlans.length > 0 && hasDefaultPlan;
  const paymentsReady = !needsPayments || paymentsConnected === true;
  const ready = named && plansReady && paymentsReady;

  async function goLive() {
    if (!ready || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await request<Community>(`/api/v1/communities/${community.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          autoAcceptMembers,
          joiningReasonText,
          enabled: true,
        }),
      });
      onLive(updated);
    } catch (caught) {
      setError(errorMessage(caught, "Unable to make the community live."));
      setSaving(false);
    }
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Set up your community</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick how people join. That&apos;s all it takes to go live; everything else can
          wait.
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)]">
        <div className="space-y-5">
          <CommunityCard
            title="Name"
            description="Shown on your sales page and at the top of the community."
          >
            <div className="field">
              <label htmlFor="community-setup-name">Community name</label>
              <Input
                id="community-setup-name"
                required
                maxLength={200}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Design Circle"
              />
              <p className="text-xs text-muted-foreground">
                Sales page: <span className="font-mono">{address}</span>
              </p>
            </div>
          </CommunityCard>
          <PaymentPlanList
            listPath={`/api/v1/communities/${encodeURIComponent(community.id)}/plans`}
            createPath={`/api/v1/communities/${encodeURIComponent(community.id)}/plans`}
            planPath={(planId) => `/api/v1/community-plans/${encodeURIComponent(planId)}`}
            defaultPath={(planId) =>
              `/api/v1/community-plans/${encodeURIComponent(planId)}/default`
            }
            archivePath={(planId) =>
              `/api/v1/community-plans/${encodeURIComponent(planId)}/archive`
            }
            school={school}
            plans={plans}
            request={request}
            onChanged={setPlans}
            title="Plans"
            description="Offer one or several. Learners pick one on your sales page. The starred plan is shown first."
            entityLabel="community"
          />
          <CommunityCard
            title="Who gets in"
            description="You can change this later."
          >
            <WhoGetsIn
              autoAcceptMembers={autoAcceptMembers}
              onAutoAcceptChange={setAutoAcceptMembers}
              joiningReasonText={joiningReasonText}
              onJoiningReasonTextChange={setJoiningReasonText}
            />
          </CommunityCard>
        </div>
        <div className="space-y-5 lg:sticky lg:top-6">
          <CommunityCard title="Your sales page">
            <SalesPagePreview
              schoolName={school.name}
              address={address}
              communityName={name}
              plans={plans}
              currency={school.currency || "USD"}
              autoAcceptMembers={autoAcceptMembers}
            />
            <p className="text-xs text-muted-foreground">
              The page header and footer come from your site. You&apos;ll add an image
              and description next.
            </p>
          </CommunityCard>
          <CommunityCard title="Ready to go live?">
            <ul className="space-y-2">
              <ChecklistItem done={named}>
                {named ? <>Named &ldquo;{name.trim()}&rdquo;</> : "Give it a name"}
              </ChecklistItem>
              <ChecklistItem done={plansReady}>
                {activePlans.length === 0
                  ? "Add at least one plan"
                  : !hasDefaultPlan
                    ? "Star the plan to show first"
                    : `${activePlans.length} ${activePlans.length === 1 ? "plan" : "plans"} ready`}
              </ChecklistItem>
              <ChecklistItem done={paymentsReady}>
                {!needsPayments ? (
                  "No payments needed"
                ) : paymentsConnected ? (
                  "Payments connected"
                ) : (
                  <>
                    <Link
                      href="/settings/payment"
                      className="underline underline-offset-4"
                    >
                      Connect payments
                    </Link>{" "}
                    for paid plans
                  </>
                )}
              </ChecklistItem>
            </ul>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button
              type="button"
              className="w-full"
              disabled={!ready || saving}
              onClick={() => void goLive()}
            >
              {saving ? "Going live…" : "Make community live"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              You can take it offline any time.
            </p>
          </CommunityCard>
        </div>
      </div>
    </>
  );
}
