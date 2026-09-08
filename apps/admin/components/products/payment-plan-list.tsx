"use client";

import { Archive, Package, Plus, Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import { PaymentPlanDialog, type PlanRequest } from "./payment-plan-dialog";
import type { School, StorefrontPlan } from "./product-types";

function formatAmount(amountMajor: number | null, currency: string, showFree = true) {
  if (!amountMajor && showFree) return "Free";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amountMajor ?? 0);
}

function formatPlan(plan: StorefrontPlan, currency: string) {
  if (plan.type === "free" || plan.kind === "free") return "Free";
  const oneTimeAmount = plan.oneTimeAmount ?? plan.amountMinor / 100;
  const emiAmount = plan.emiAmount ?? plan.amountMinor / 100;
  const subscriptionAmount =
    plan.subscriptionMonthlyAmount ??
    plan.subscriptionYearlyAmount ??
    plan.amountMinor / 100;

  if (plan.type === "onetime" || plan.kind === "one_time") {
    return formatAmount(oneTimeAmount, currency);
  }
  if (plan.type === "emi" || plan.kind === "installment") {
    return `${formatAmount(emiAmount, currency)} × ${
      plan.emiTotalInstallments ?? plan.installmentCount ?? 0
    }`;
  }

  const amount = formatAmount(subscriptionAmount, currency);
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
      <section className="card stack">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="w-full space-y-2">
          {activePlans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-md border bg-card p-3 transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="min-w-0 text-left text-sm font-medium hover:underline"
                  onClick={() => openEdit(plan)}
                >
                  {plan.name}
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    title={plan.isDefault ? "Recommended plan" : "Make recommended"}
                    onClick={() => void makeDefault(plan)}
                    disabled={busy || plan.isDefault}
                  >
                    <Star
                      className={plan.isDefault ? "fill-current text-primary" : ""}
                    />
                    <span className="sr-only">Make recommended</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    title="Archive plan"
                    onClick={() => setArchivePlan(plan)}
                    disabled={busy}
                  >
                    <Archive />
                    <span className="sr-only">Archive plan</span>
                  </Button>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatPlan(plan, currency)}</span>
                <span className="rounded-full border px-1.5 py-0.5">
                  {planTypeLabel(plan)}
                </span>
                {plan.includedProducts.length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5">
                    <Package className="size-3" /> +{plan.includedProducts.length}{" "}
                    products
                  </span>
                ) : null}
              </div>
            </div>
          ))}
          {activePlans.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No payment plans yet.
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-auto w-full justify-between border-dashed p-3"
            onClick={openCreate}
          >
            <span>
              <span className="block text-left text-sm font-medium">New Plan</span>
              <span className="block text-left text-xs text-muted-foreground">
                {formatAmount(0, school.currency || "USD", false)}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Payment frequency
              </span>
              <Plus />
            </span>
          </Button>
        </div>
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
