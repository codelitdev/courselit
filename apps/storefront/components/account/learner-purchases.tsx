"use client";

import type { learnerPurchaseSchema } from "@courselit/api-contract";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { LearnerAccountTabs } from "@/components/account/learner-account-tabs";
import {
  requestJson,
  useLearnerSession,
} from "@/components/communities/learner-community";
import { CourseLitLoading } from "@/components/course-lit-loader";
import { LearnerShell } from "@/components/layout/learner-shell";
import {
  LearnerBadge,
  LearnerButton,
  LearnerCard,
  LearnerCardContent,
  LearnerHeader1,
  LearnerHeader2,
  LearnerText2,
} from "@/components/themed-page-builder";

type Purchase = z.infer<typeof learnerPurchaseSchema>;

const PLAN_LABELS: Record<Purchase["planKind"], string> = {
  free: "Free",
  one_time: "One-time payment",
  subscription: "Subscription",
  installment: "Installments",
};

const STATUS_LABELS: Record<Purchase["status"], string> = {
  paid: "Paid",
  refunded: "Refunded",
  disputed: "Disputed",
  failed: "Failed",
};

function formatAmount(purchase: Purchase) {
  if (purchase.amountMinor === 0) return "Free";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: purchase.currency,
    }).format(purchase.amountMinor / 100);
  } catch {
    return `${purchase.currency} ${(purchase.amountMinor / 100).toFixed(2)}`;
  }
}

function purchaseHref(purchase: Purchase) {
  if (purchase.resourceType === "community") return "/dashboard";
  return `/dashboard/courses/${encodeURIComponent(purchase.resourceId)}`;
}

function PurchaseCard({ purchase }: { purchase: Purchase }) {
  return (
    <LearnerCard>
      <LearnerCardContent className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid min-w-0 gap-1">
          <LearnerHeader2 className="truncate">{purchase.title}</LearnerHeader2>
          <LearnerText2 className="text-muted-foreground">
            {purchase.planName} · {PLAN_LABELS[purchase.planKind]}
          </LearnerText2>
          <LearnerText2 className="text-muted-foreground">
            {new Date(purchase.purchasedAt).toLocaleDateString(undefined, {
              dateStyle: "long",
            })}{" "}
            · Order {purchase.orderId}
          </LearnerText2>
        </div>
        <div className="flex flex-col items-end gap-2">
          <LearnerText2 className="font-semibold">
            {formatAmount(purchase)}
          </LearnerText2>
          <LearnerBadge variant={purchase.status === "paid" ? "secondary" : "outline"}>
            {STATUS_LABELS[purchase.status]}
          </LearnerBadge>
          {purchase.status === "paid" ? (
            <LearnerButton asChild size="sm" variant="outline">
              <Link href={purchaseHref(purchase)}>
                {purchase.resourceType === "community"
                  ? "Go to the community"
                  : purchase.productKind === "download"
                    ? "Open download"
                    : "Open course"}
              </Link>
            </LearnerButton>
          ) : null}
        </div>
      </LearnerCardContent>
    </LearnerCard>
  );
}

/** The learner's payments and receipts at this school. */
export function LearnerPurchases() {
  const { learner, checking } = useLearnerSession("/dashboard/account/purchases");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!learner) return;
    let active = true;
    void requestJson<{ items: Purchase[] }>("/api/v1/learner/purchases")
      .then((body) => {
        if (active) setPurchases(body.items);
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "Unable to load your purchases.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [learner]);

  if (checking) {
    return (
      <LearnerShell user={null} loading headerTitle="Account">
        <main className="flex min-h-[400px] items-center justify-center p-6">
          <CourseLitLoading label="Loading purchases…" />
        </main>
      </LearnerShell>
    );
  }
  if (!learner) return null;

  return (
    <LearnerShell user={learner} headerTitle="Account">
      <main className="grid gap-7">
        <header>
          <LearnerHeader1>Purchases</LearnerHeader1>
          <LearnerText2 className="mt-2 text-muted-foreground">
            Everything you have bought from this school, with order numbers for your
            records.
          </LearnerText2>
        </header>
        <LearnerAccountTabs />
        {error ? (
          <LearnerText2 className="text-destructive" role="alert">
            {error}
          </LearnerText2>
        ) : null}
        {loading ? (
          <CourseLitLoading label="Loading purchases…" />
        ) : purchases.length === 0 ? (
          <LearnerCard>
            <LearnerCardContent className="grid gap-3">
              <LearnerHeader2>No purchases yet</LearnerHeader2>
              <LearnerText2 className="text-muted-foreground">
                Products and communities you buy will show up here.
              </LearnerText2>
              <LearnerButton asChild variant="outline" className="w-fit">
                <Link href="/products">Browse products</Link>
              </LearnerButton>
            </LearnerCardContent>
          </LearnerCard>
        ) : (
          <section className="grid gap-4" aria-label="Your purchases">
            {purchases.map((purchase) => (
              <PurchaseCard key={purchase.id} purchase={purchase} />
            ))}
          </section>
        )}
      </main>
    </LearnerShell>
  );
}
