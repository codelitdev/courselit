"use client";

import { AlertCircle, Check, Loader2, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/codelit/button";
import {
  type ChecklistStep,
  type ChecklistTarget,
  lessonCounts,
  optionalProgress,
  type ProductPhase,
  plural,
} from "@/lib/product-publishing";
import { cn } from "@/lib/utils";
import type { AnalyticsRange } from "@/lib/analytics";
import { ProductAnalytics } from "./product-analytics";
import type { School } from "./product-types";
import { AccentBadge, CardHead, Note, WorkspaceCard } from "./product-ui";
import { kindWord, type ProductDetail } from "./product-workspace";

/** Where each checklist step sends the creator. Settings cards are highlighted by id. */
export function checklistHref(productRoot: string, target: ChecklistTarget): string {
  switch (target) {
    case "content":
      return `${productRoot}/content`;
    case "plans":
      return `${productRoot}/manage#set-plans`;
    case "lead":
      return `${productRoot}/manage#set-lead`;
    case "visibility":
      return `${productRoot}/manage#set-visibility`;
    case "details":
    case "image":
      return `${productRoot}/manage#set-details`;
    case "discussions":
      return `${productRoot}/manage#set-discussions`;
    case "certificate":
      return `${productRoot}/manage#set-certificate`;
  }
}

function StepList({
  steps,
  productRoot,
  showRequired,
}: {
  steps: ChecklistStep[];
  productRoot: string;
  showRequired: boolean;
}) {
  return (
    <ul className="mt-3 border-t">
      {steps.map((step) => (
        <li
          key={step.key}
          className="grid grid-cols-[22px_minmax(0,1fr)] items-center gap-3 border-b px-5 py-3 last:border-b-0 sm:grid-cols-[22px_minmax(0,1fr)_auto]"
        >
          <span
            aria-hidden="true"
            className={cn(
              "grid size-[22px] place-items-center rounded-full border-[1.5px]",
              step.done
                ? "border-success bg-success text-white"
                : "border-input text-transparent",
            )}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span
              className={cn(
                "flex flex-wrap items-center gap-2 text-[14.5px]",
                step.done ? "font-medium text-muted-foreground" : "font-semibold",
              )}
            >
              <span className="sr-only">{step.done ? "Done: " : "To do: "}</span>
              {step.title}
              {showRequired && step.required ? (
                <AccentBadge>Needed to go live</AccentBadge>
              ) : null}
            </span>
            <span className="text-[13px] text-muted-foreground">{step.detail}</span>
          </span>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="col-start-2 justify-self-start sm:col-start-auto"
          >
            <Link href={checklistHref(productRoot, step.target)}>
              {step.done ? "Change" : step.cta}
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function ProductOverview({
  product,
  school,
  phase,
  steps,
  readyToLaunch,
  canWrite,
  productRoot,
  analyticsRange,
  launching,
  onGoLive,
  launched,
  onDismissLaunched,
  salesPageUrl,
  urlLabel,
  onCopyLink,
}: {
  product: ProductDetail;
  school: School;
  phase: ProductPhase;
  steps: ChecklistStep[];
  readyToLaunch: boolean;
  canWrite: boolean;
  productRoot: string;
  analyticsRange: AnalyticsRange;
  launching: boolean;
  onGoLive: () => void;
  launched: boolean;
  onDismissLaunched: () => void;
  salesPageUrl: string | null;
  urlLabel: string | null;
  onCopyLink: () => void;
}) {
  const word = kindWord(product.kind);
  const isDownload = product.kind === "download";
  const counts = lessonCounts(product.lessons);
  const isDraft = phase === "draft";
  const optional = steps.filter((step) => !step.required);
  const optionalLeft = optional.some((step) => !step.done);
  const extras = optionalProgress(steps);

  const analytics = (
    <ProductAnalytics
      productId={product.id}
      school={school}
      productKind={product.kind}
      contentCount={product.lessons.length}
      range={analyticsRange}
    />
  );

  if (!canWrite) return analytics;

  const stepsTitle = isDraft ? "Before you go live" : "Make it better";
  const stepsSub = isDraft
    ? "Each step opens where you do it. Only the first two are needed to go live."
    : "Optional, but they help people decide to join.";

  const stepsCard = (
    <WorkspaceCard aria-labelledby="next-steps-title">
      <CardHead
        title={<span id="next-steps-title">{stepsTitle}</span>}
        description={stepsSub}
      />
      <StepList
        steps={isDraft ? steps : optional}
        productRoot={productRoot}
        showRequired={isDraft}
      />
    </WorkspaceCard>
  );

  const contentStep = steps.find((step) => step.key === "content");
  const planStep = steps.find((step) => step.key === "plans");
  const readiness = [
    {
      key: "plans",
      text: planStep?.done ? planStep.detail.replace(/\.$/, "") : "Add a payment plan",
      ok: Boolean(planStep?.done),
      href: checklistHref(productRoot, "plans"),
      cta: "Add",
    },
    {
      key: "content",
      text: contentStep?.done
        ? `${counts.live} of ${plural(counts.total, isDownload ? "file" : "lesson")} live`
        : (contentStep?.title ?? ""),
      ok: Boolean(contentStep?.done),
      href: checklistHref(productRoot, "content"),
      cta: "Open",
    },
  ];

  const goLiveCard = (
    <WorkspaceCard id="golive" className="space-y-3 p-5">
      <h2 className="text-[15px] font-bold">Ready to go live?</h2>
      <ul className="space-y-2.5 text-sm">
        {readiness.map((item) => (
          <li key={item.key} className="flex items-center gap-2.5">
            {item.ok ? (
              <Check
                className="size-4 shrink-0 text-success"
                strokeWidth={2.4}
                aria-label="Done"
              />
            ) : (
              <AlertCircle
                className="size-4 shrink-0 text-destructive"
                aria-label="Missing"
              />
            )}
            <span className="flex-1">{item.text}</span>
            {item.ok ? null : (
              <Link
                href={item.href}
                className="text-[13px] font-semibold text-[var(--primary-ink)] underline underline-offset-[3px]"
              >
                {item.cta}
              </Link>
            )}
          </li>
        ))}
        <li className="flex items-center gap-2.5 text-muted-foreground">
          <span className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">
            {extras.done} of {extras.total} extras done (optional)
          </span>
        </li>
      </ul>
      <Button
        type="button"
        size="lg"
        className="mt-1.5 w-full"
        disabled={!readyToLaunch || launching}
        onClick={onGoLive}
      >
        {launching ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Going live…
          </>
        ) : (
          `Make ${word} live`
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        You can take it offline any time.
      </p>
    </WorkspaceCard>
  );

  if (isDraft) {
    return (
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
        <div className="min-w-0 space-y-4">{stepsCard}</div>
        <aside className="space-y-4">{goLiveCard}</aside>
      </div>
    );
  }

  const main = (
    <div className="min-w-0 space-y-4">
      {!isDownload && counts.drafts > 0 ? (
        <Note
          tone="warn"
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={`${productRoot}/content`}>Review drafts</Link>
            </Button>
          }
        >
          <b>{plural(counts.drafts, "lesson is a draft", "lessons are drafts")}.</b>{" "}
          {counts.drafts === 1
            ? "Learners can't see it until you make it live."
            : "Learners can't see them until you make them live."}
        </Note>
      ) : null}
      {launched ? (
        <WorkspaceCard
          role="status"
          className="flex flex-wrap items-center gap-x-[18px] gap-y-3.5 border-success bg-success-soft px-5 py-[18px]"
        >
          <span
            aria-hidden="true"
            className="grid size-10 flex-none place-items-center rounded-full bg-success text-white"
          >
            <Check className="size-5" strokeWidth={2.4} />
          </span>
          <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-1">
            <h2 className="text-[17px] font-bold">{product.title} is live</h2>
            <p className="text-sm text-muted-foreground">
              {product.privacy === "public"
                ? `It's listed on your site and people can join now. Share the link to get your first ${isDownload && product.leadMagnet ? "sign-ups" : "customers"}.`
                : "It's hidden from your site, so share the link with the people you want to join."}
            </p>
            {urlLabel ? (
              <span className="font-mono text-xs text-muted-foreground">
                {urlLabel}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={onCopyLink}>
              Copy link
            </Button>
            {salesPageUrl ? (
              <Button asChild variant="outline">
                <a href={salesPageUrl} target="_blank" rel="noreferrer">
                  View sales page
                </a>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="w-9 px-0"
              aria-label="Dismiss"
              onClick={onDismissLaunched}
            >
              <X className="size-4" />
            </Button>
          </div>
        </WorkspaceCard>
      ) : null}
      {analytics}
    </div>
  );

  if (!optionalLeft) return main;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
      {main}
      <aside className="space-y-4">{stepsCard}</aside>
    </div>
  );
}
