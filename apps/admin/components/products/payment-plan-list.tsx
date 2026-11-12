"use client";

import { Archive, Package, Plus, Star } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import { cn } from "@/lib/utils";
import { PaymentPlanDialog, type PlanRequest } from "./payment-plan-dialog";
import { formatMoney } from "@courselit/api-contract/money";
import type { School, StorefrontPlan } from "./product-types";

/**
 * What a learner pays, from the plan's amount in the minor unit (what checkout
 * charges), so it reads the same as checkout for every currency.
 */
function formatPlan(plan: StorefrontPlan, currency: string) {
  if (plan.type === "free" || plan.kind === "free") return "Free";
  const amount = formatMoney(plan.amountMinor, currency);
  if (plan.type === "emi" || plan.kind === "installment") {
    return `${amount} × ${plan.emiTotalInstallments ?? plan.installmentCount ?? 0}`;
  }
  return amount;
}

function planTypeLabel(plan: StorefrontPlan) {
  switch (plan.type) {
    case "free":
      return "Free";
    case "onetime":
      return "One time";
    case "subscription":
      return plan.subscriptionYearlyAmount != null ? "Yearly" : "Monthly";
    case "emi":
      return "EMI";
    default:
      return plan.kind;
  }
}

export function PaymentPlanList({
  listPath,
  createPath,
  planPath,
  defaultPath,
  archivePath,
  school,
  plans,
  request,
  onChanged,
  title = "Pricing",
  description = "Manage your product's pricing plans",
  entityLabel = "product",
  id,
  highlighted,
  badge,
  children,
}: {
  listPath: string;
  createPath: string;
  planPath: (planId: string) => string;
  defaultPath: (planId: string) => string;
  archivePath: (planId: string) => string;
  school: School;
  plans: StorefrontPlan[];
  request: PlanRequest;
  onChanged: (plans: StorefrontPlan[]) => void;
  title?: string;
  description?: string;
  entityLabel?: "product" | "community";
  id?: string;
  highlighted?: boolean;
  /** Shown after the title, e.g. "Needed to go live". */
  badge?: ReactNode;
  /** Shown under the list, e.g. a payments notice. */
  children?: ReactNode;
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StorefrontPlan | null>(null);
  const [archivePlan, setArchivePlan] = useState<StorefrontPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePlans = plans.filter((plan) => plan.status === "active");
  const currency = school.currency || "USD";

  function openCreate() {
    setEditingPlan(null);
    setError(null);
    setEditorOpen(true);
  }

  function openEdit(plan: StorefrontPlan) {
    setEditingPlan(plan);
    setError(null);
    setEditorOpen(true);
  }

  async function reload() {
    const body = await request<{ items?: StorefrontPlan[] }>(listPath);
    onChanged(body.items ?? []);
  }

  async function onPlanSaved() {
    await reload();
  }

  async function makeDefault(plan: StorefrontPlan) {
    if (busy || plan.isDefault) return;
    setBusy(true);
    setError(null);
    try {
      await request(defaultPath(plan.id), {
        method: "POST",
        body: JSON.stringify({}),
      });
      await reload();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to update the default plan.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function archiveSelected() {
    if (!archivePlan || busy) return;
    setBusy(true);
    setError(null);
    try {
      await request(archivePath(archivePlan.id), {
        method: "POST",
        body: JSON.stringify({}),
      });
      setArchivePlan(null);
      await reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to archive the payment plan.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section
        id={id}
        className={cn(
          "scroll-mt-24 space-y-4 rounded-xl border bg-card p-5 shadow-sm transition-[box-shadow,border-color] duration-300",
          highlighted && "border-primary shadow-[0_0_0_3px_var(--primary-soft)]",
        )}
      >
        <div>
          <h2 className="flex flex-wrap items-center gap-2 font-semibold">
            {title}
            {badge}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          {activePlans.map((plan) => {
            const shownFirst = plan.isDefault && activePlans.length > 1;
            return (
              <div
                key={plan.id}
                className="flex items-center gap-1.5 rounded-[var(--radius)] border bg-card py-1.5 pl-1 pr-2"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 flex-col items-start gap-1 rounded-md px-2.5 py-2 text-left hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label={`Edit ${plan.name}`}
                  onClick={() => openEdit(plan)}
                >
                  <b className="max-w-full truncate text-[15px] font-semibold">
                    {plan.name}
                  </b>
                  <span className="flex flex-wrap items-center gap-1.5 text-[13.5px] tabular-nums text-muted-foreground">
                    {formatPlan(plan, currency)}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {planTypeLabel(plan)}
                    </span>
                    {shownFirst ? (
                      <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--primary-ink)]">
                        Shown first
                      </span>
                    ) : null}
                    {plan.includedProducts.length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        <Package className="size-3" /> +{plan.includedProducts.length}{" "}
                        products
                      </span>
                    ) : null}
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-8 px-0",
                    plan.isDefault ? "text-primary" : "text-muted-foreground",
                  )}
                  title={
                    plan.isDefault
                      ? "Shown first on the sales page"
                      : "Show this plan first"
                  }
                  aria-label={
                    plan.isDefault
                      ? "Shown first on the sales page"
                      : `Show ${plan.name} first`
                  }
                  aria-pressed={plan.isDefault}
                  onClick={() => void makeDefault(plan)}
                  disabled={busy}
                >
                  <Star className={plan.isDefault ? "fill-current" : ""} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-8 px-0 text-muted-foreground"
                  title="Archive plan. People already on it keep access."
                  aria-label={`Archive ${plan.name}`}
                  onClick={() => setArchivePlan(plan)}
                  disabled={busy}
                >
                  <Archive />
                </Button>
              </div>
            );
          })}
          {activePlans.length === 0 ? (
            <p className="rounded-[var(--radius)] border border-dashed border-input px-4 py-3.5 text-sm text-muted-foreground">
              No payment plans yet. Learners need at least one to join.
            </p>
          ) : null}
          <button
            type="button"
            onClick={openCreate}
            className="flex w-full items-center gap-3 rounded-[var(--radius)] border border-dashed border-input px-3.5 py-3 text-left transition-colors hover:border-primary hover:bg-[var(--primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus className="size-4 text-[var(--primary-ink)]" aria-hidden="true" />
            <span>
              <span className="block text-[14.5px] font-semibold">Add a plan</span>
              <span className="block text-[13px] text-muted-foreground">
                Free, one time, subscription or EMI
              </span>
            </span>
          </button>
        </div>
        {children}
      </section>

      <PaymentPlanDialog
        createPath={createPath}
        planPath={planPath}
        school={school}
        plan={editingPlan}
        open={editorOpen}
        request={request}
        onOpenChange={setEditorOpen}
        onSaved={onPlanSaved}
        entityLabel={entityLabel}
      />

      <Dialog
        open={Boolean(archivePlan)}
        onOpenChange={(open) => !open && setArchivePlan(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive this payment plan?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The plan “{archivePlan?.name}” will no
              longer be offered to new learners.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setArchivePlan(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void archiveSelected()}
              disabled={busy}
            >
              {busy ? "Archiving…" : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
