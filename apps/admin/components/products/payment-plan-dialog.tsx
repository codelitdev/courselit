"use client";

import { DollarSign, Info, Save } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import { CourseLitLoadingIcon } from "@/components/loading";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import { Textarea } from "@/components/ui/codelit/textarea";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import type { School, StorefrontPlan } from "./product-types";

export type PlanRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

type PaymentPlanDialogProps = {
  createPath: string;
  planPath: (planId: string) => string;
  school: School;
  plan: StorefrontPlan | null;
  open: boolean;
  request: PlanRequest;
  onOpenChange: (open: boolean) => void;
  onSaved: (plan: StorefrontPlan) => Promise<void> | void;
  entityLabel?: "product" | "community";
};

type PlanKind = StorefrontPlan["kind"];
type PaymentProvider = "stripe" | "lemonsqueezy" | "razorpay";

type PaymentSettings = {
  provider?: PaymentProvider | null;
  stripe?: {
    publishableKey?: string;
    secretConfigured?: boolean;
  };
  razorpay?: {
    keyId?: string;
    secretConfigured?: boolean;
  };
  lemonsqueezy?: {
    storeId?: string;
    oneTimeVariantId?: string;
    monthlyVariantId?: string;
    yearlyVariantId?: string;
    apiKeyConfigured?: boolean;
  };
};

function hasConfiguredPaymentProvider(settings: PaymentSettings): boolean {
  if (settings.provider === "stripe") {
    return Boolean(
      settings.stripe?.publishableKey && settings.stripe?.secretConfigured,
    );
  }
  if (settings.provider === "razorpay") {
    return Boolean(settings.razorpay?.keyId && settings.razorpay?.secretConfigured);
  }
  if (settings.provider === "lemonsqueezy") {
    return Boolean(
      settings.lemonsqueezy?.apiKeyConfigured &&
        settings.lemonsqueezy.storeId &&
        settings.lemonsqueezy.oneTimeVariantId &&
        settings.lemonsqueezy.monthlyVariantId &&
        settings.lemonsqueezy.yearlyVariantId,
    );
  }
  return false;
}

function initialAmount(plan: StorefrontPlan | null) {
  if (!plan) return "0";
  const amount =
    plan.kind === "one_time"
      ? plan.oneTimeAmount
      : plan.kind === "installment"
        ? plan.emiAmount
        : plan.kind === "subscription"
          ? plan.billingInterval === "year"
            ? plan.subscriptionYearlyAmount
            : plan.subscriptionMonthlyAmount
          : null;
  return (amount ?? plan.amountMinor / 100).toFixed(2);
}

function getCurrencySymbol(currency: string) {
  try {
    return (
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? currency
    );
  } catch {
    return currency;
  }
}

function MoneyInput({
  id,
  symbol,
  currency,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  symbol: string;
  currency: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        aria-label={`${placeholder} (${currency})`}
        type="number"
        min="0.01"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <InputGroupAddon align="inline-start">
        <InputGroupText>{symbol}</InputGroupText>
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        <InputGroupText>{currency}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}

export function PaymentPlanDialog({
  createPath,
  planPath,
  school,
  plan,
  open,
  request,
  onOpenChange,
  onSaved,
  entityLabel = "product",
}: PaymentPlanDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<PlanKind>("free");
  const [amount, setAmount] = useState("0");
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [installments, setInstallments] = useState("3");
  const [saving, setSaving] = useState(false);
  const [paymentProviderConfigured, setPaymentProviderConfigured] = useState(false);
  const [paymentSettingsLoading, setPaymentSettingsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(plan?.name ?? "");
    setDescription(plan?.description ?? "");
    setKind(plan?.kind ?? "free");
    setAmount(initialAmount(plan));
    setInterval(plan?.billingInterval ?? "month");
    setInstallments(String(plan?.installmentCount ?? 3));
    setError(null);
  }, [open, plan]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setPaymentProviderConfigured(false);
    setPaymentSettingsLoading(true);
    void request<PaymentSettings>("/api/v1/school/payment-settings")
      .then((settings) => {
        if (active)
          setPaymentProviderConfigured(hasConfiguredPaymentProvider(settings));
      })
      .catch(() => {
        if (active) setPaymentProviderConfigured(false);
      })
      .finally(() => {
        if (active) setPaymentSettingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, request]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const trimmedName = name.trim();
    const parsedAmount = kind === "free" ? 0 : Number(amount);
    const parsedInstallments = kind === "installment" ? Number(installments) : null;

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (kind !== "free" && !paymentProviderConfigured) {
      setError("Configure a payment method before creating a paid plan.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || (parsedAmount <= 0 && kind !== "free")) {
      setError("Enter a valid amount greater than zero.");
      return;
    }
    if (
      kind === "installment" &&
      (typeof parsedInstallments !== "number" ||
        !Number.isInteger(parsedInstallments) ||
        parsedInstallments < 2 ||
        parsedInstallments > 60)
    ) {
      setError("Installments must be a whole number between 2 and 60.");
      return;
    }

    setSaving(true);
    setError(null);
    const body = {
      name: trimmedName,
      description,
      type: kind === "one_time" ? "onetime" : kind === "installment" ? "emi" : kind,
      kind,
      oneTimeAmount: kind === "one_time" ? Number(parsedAmount) : null,
      emiAmount: kind === "installment" ? Number(parsedAmount) : null,
      emiTotalInstallments: kind === "installment" ? parsedInstallments : null,
      subscriptionMonthlyAmount:
        kind === "subscription" && interval === "month" ? Number(parsedAmount) : null,
      subscriptionYearlyAmount:
        kind === "subscription" && interval === "year" ? Number(parsedAmount) : null,
      amountMinor: Math.round(parsedAmount * 100),
      billingInterval:
        // CourseLit's source EMI model is monthly payments without a
        // separately persisted frequency. The API keeps its historical
        // adapter default internally, while subscriptions expose frequency.
        kind === "subscription" ? interval : null,
      installmentCount: kind === "installment" ? parsedInstallments : null,
    };

    try {
      const saved = plan
        ? await request<StorefrontPlan>(planPath(plan.id), {
            method: "PATCH",
            body: JSON.stringify(body),
          })
        : await request<StorefrontPlan>(createPath, {
            method: "POST",
            body: JSON.stringify(body),
          });
      await onSaved(saved);
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save the payment plan.",
      );
    } finally {
      setSaving(false);
    }
  }

  const currency = school.currency || "USD";
  const symbol = getCurrencySymbol(currency);
  const paidPlanTypesDisabled = paymentSettingsLoading || !paymentProviderConfigured;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{plan ? "Edit payment plan" : "New payment plan"}</DialogTitle>
          <DialogDescription>
            Configure the basic details and pricing structure for this {entityLabel}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-6">
          <section className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <Info className="size-4 text-primary" /> Basic Information
              </div>
              <p className="text-sm text-muted-foreground">
                The plan name and description are shown to learners at checkout.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-plan-name">Name</Label>
              <Input
                id="payment-plan-name"
                required
                maxLength={200}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Full course access"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-plan-description">Description</Label>
              <Textarea
                id="payment-plan-description"
                maxLength={2_000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Enter plan description"
              />
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <DollarSign className="size-4 text-primary" /> Pricing
              </div>
              <p className="text-sm text-muted-foreground">
                Currency is managed centrally in School settings.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-plan-type">Payment type</Label>
              {paymentSettingsLoading ? (
                <CourseLitLoadingIcon size={14} />
              ) : null}
              <Select
                value={kind}
                onValueChange={(value) => setKind(value as PlanKind)}
              >
                <SelectTrigger id="payment-plan-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="one_time" disabled={paidPlanTypesDisabled}>
                    One time
                  </SelectItem>
                  <SelectItem value="subscription" disabled={paidPlanTypesDisabled}>
                    Subscription
                  </SelectItem>
                  <SelectItem value="installment" disabled={paidPlanTypesDisabled}>
                    EMI / installments
                  </SelectItem>
                </SelectContent>
              </Select>
              {!paymentSettingsLoading && !paymentProviderConfigured ? (
                <p className="text-xs text-muted-foreground">
                  Configure a payment method in School settings to enable paid plans.
                </p>
              ) : null}
            </div>
            {kind === "one_time" ? (
              <div className="space-y-1.5">
                <Label htmlFor="payment-plan-amount">One-time Amount</Label>
                <MoneyInput
                  id="payment-plan-amount"
                  symbol={symbol}
                  currency={currency}
                  value={amount}
                  onChange={setAmount}
                  placeholder="Enter amount"
                />
              </div>
            ) : null}
            {kind === "subscription" ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="payment-plan-interval">Subscription Type</Label>
                  <Select
                    value={interval}
                    onValueChange={(value) => setInterval(value as "month" | "year")}
                  >
                    <SelectTrigger id="payment-plan-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payment-plan-amount">
                    {interval === "month" ? "Monthly Amount" : "Yearly Amount"}
                  </Label>
                  <MoneyInput
                    id="payment-plan-amount"
                    symbol={symbol}
                    currency={currency}
                    value={amount}
                    onChange={setAmount}
                    placeholder={
                      interval === "month"
                        ? "Enter monthly amount"
                        : "Enter yearly amount"
                    }
                  />
                </div>
              </div>
            ) : null}
            {kind === "installment" ? (
              <div className="space-y-3">
                <Label>Monthly Payments (All fields required)</Label>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center rounded-md border">
                      <Input
                        id="payment-plan-installments"
                        type="number"
                        min="2"
                        max="60"
                        step="1"
                        value={installments}
                        onChange={(event) => setInstallments(event.target.value)}
                        placeholder="Enter number"
                        className="border-0 focus-visible:ring-0"
                      />
                      <span className="pr-2 text-sm text-muted-foreground">
                        payments
                      </span>
                    </div>
                  </div>
                  <span className="pt-2 text-muted-foreground">×</span>
                  <div className="min-w-0 flex-1">
                    <MoneyInput
                      id="payment-plan-amount"
                      symbol={symbol}
                      currency={currency}
                      value={amount}
                      onChange={setAmount}
                      placeholder="Enter amount"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Total:{" "}
                  <span className="font-medium text-foreground">
                    {symbol}
                    {((Number(amount) || 0) * (Number(installments) || 0)).toFixed(2)}
                  </span>
                </p>
              </div>
            ) : null}
          </section>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              aria-label={saving ? "Saving" : "Save"}
              disabled={
                saving ||
                !name.trim() ||
                (kind !== "free" &&
                  (paymentSettingsLoading || !paymentProviderConfigured))
              }
            >
              {saving ? <CourseLitLoadingIcon size={16} /> : <Save className="size-4" />}
              {saving ? null : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
