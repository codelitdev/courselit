"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import { DialogFooter } from "@/components/ui/codelit/dialog";
import { Input } from "@/components/ui/codelit/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

function formatMinorAmount(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

type BillingOffer = {
  catalogKey: string;
  plan: "pro" | "business";
  interval: "month" | "year";
  currency: string;
  amountMinor: number;
  trialDays: number;
};

type BillingCatalog = {
  catalogRevision: number | null;
  currency: string | null;
  checkoutAvailable: boolean;
  offers: BillingOffer[];
};

export type CreatedSchool = {
  id: string;
  name: string;
  subdomain: string;
  checkoutUrl?: string;
};

export function CreateSchoolForm({
  enabled = true,
  onSuccess,
}: {
  enabled?: boolean;
  onSuccess?: (school: CreatedSchool) => void;
}) {
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [isSubdomainManual, setIsSubdomainManual] = useState(false);
  const [plan, setPlan] = useState<"pro" | "business">("pro");
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [catalog, setCatalog] = useState<BillingCatalog | null>(null);
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOssDeployment =
    catalog?.catalogRevision === null && catalog.checkoutAvailable === false;
  const showPlanSelector = catalogUnavailable || (catalog !== null && !isOssDeployment);
  const paidCheckoutUnavailable =
    catalogUnavailable ||
    Boolean(catalog && !catalog.checkoutAvailable && catalog.catalogRevision !== null);
  const offer = catalog?.offers.find(
    (item) => item.plan === plan && item.interval === interval,
  );

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setError(null);
    setCatalog(null);
    setCatalogUnavailable(false);
    void fetch("/api/v1/billing/catalog", {
      credentials: "include",
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: BillingCatalog | null) => {
        if (cancelled) return;
        if (!body) {
          setCatalogUnavailable(true);
          return;
        }
        setCatalog(body);
      })
      .catch(() => {
        if (!cancelled) setCatalogUnavailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  function handleNameChange(val: string) {
    setName(val);
    if (!isSubdomainManual) setSubdomain(slugify(val));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !subdomain.trim()) return;
    if (showPlanSelector && !isOssDeployment && (!catalog?.catalogRevision || !offer)) {
      setError("Paid plans are temporarily unavailable. Please try again.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        subdomain: subdomain.trim(),
      };
      if (isOssDeployment) {
        body.plan = "oss";
      } else if (catalog?.catalogRevision && offer) {
        body.plan = plan;
        body.interval = interval;
        body.catalogRevision = catalog.catalogRevision;
      }
      const response = await fetch("/api/v1/schools", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          message?: string;
          details?: { reason?: string };
        } | null;
        if (data?.details?.reason === "subdomain_taken") {
          setError("That subdomain is already taken. Please choose another.");
        } else if (data?.details?.reason === "paid_plan_required") {
          setError("Choose a paid plan to create this school.");
        } else if (data?.details?.reason === "billing_catalog_changed") {
          setError("Prices changed. Close this dialog and try again.");
        } else if (data?.details?.reason === "billing_provider_unavailable") {
          setError("Paid checkout is temporarily unavailable. Please try again.");
        } else {
          setError(data?.message ?? "Unable to create school. Please try again.");
        }
        return;
      }
      const created = (await response.json()) as CreatedSchool;
      if (created.checkoutUrl) {
        window.location.assign(created.checkoutUrl);
        return;
      }
      setName("");
      setSubdomain("");
      setIsSubdomainManual(false);
      if (onSuccess) onSuccess(created);
      else window.location.assign("/");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const catalogLoading = enabled && !catalog && !catalogUnavailable;
  const submitLabel = submitting
    ? isOssDeployment
      ? "Creating…"
      : "Opening checkout…"
    : catalogLoading
      ? "Loading…"
      : isOssDeployment
        ? "Create school"
        : "Continue to checkout";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full min-w-0 flex-col flex-nowrap items-stretch gap-4"
    >
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <Field>
        <FieldLabel htmlFor="school-name">Name</FieldLabel>
        <Input
          id="school-name"
          placeholder="e.g. Acme Academy"
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="school-subdomain">Subdomain</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="school-subdomain"
            name="subdomain"
            required
            minLength={3}
            maxLength={63}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="acme"
            value={subdomain}
            onChange={(event) => {
              setIsSubdomainManual(true);
              setSubdomain(slugify(event.target.value));
            }}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>.courselit.app</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </Field>

      {showPlanSelector ? (
        <>
          <Field>
            <FieldLabel htmlFor="school-plan">Plan</FieldLabel>
            <Select
              value={plan}
              onValueChange={(value) => setPlan(value as "pro" | "business")}
            >
              <SelectTrigger id="school-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="pro"
                  disabled={
                    catalogUnavailable || Boolean(catalog && !catalog.checkoutAvailable)
                  }
                >
                  Pro
                </SelectItem>
                <SelectItem
                  value="business"
                  disabled={
                    catalogUnavailable || Boolean(catalog && !catalog.checkoutAvailable)
                  }
                >
                  Business
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="school-interval">Billing interval</FieldLabel>
            <Select
              value={interval}
              onValueChange={(value) => setInterval(value as "month" | "year")}
            >
              <SelectTrigger id="school-interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="year">Yearly (2 months free)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {offer ? (
            <p className="text-sm font-medium">
              {formatMinorAmount(offer.amountMinor, offer.currency)} / {interval}
              {offer.trialDays ? ` · ${offer.trialDays}-day trial` : ""}
            </p>
          ) : paidCheckoutUnavailable ? null : (
            <p className="text-sm text-muted-foreground">
              Loading the current provider-configured price…
            </p>
          )}
        </>
      ) : null}

      {paidCheckoutUnavailable ? (
        <p className="text-sm text-muted-foreground">
          Paid checkout is not enabled for this deployment.
        </p>
      ) : null}

      <DialogFooter>
        <Button
          type="submit"
          disabled={
            submitting ||
            catalogLoading ||
            !name.trim() ||
            subdomain.length < 3 ||
            (showPlanSelector &&
              !isOssDeployment &&
              (!catalog?.catalogRevision || !offer))
          }
        >
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
