"use client";

import { DollarSign, Download, GraduationCap, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Resources } from "@/components/resources";
import { Button } from "@/components/ui/codelit/button";
import type { Product, School } from "./product-types";

export type AnalyticsRange = "7d" | "30d" | "90d" | "1y";

type Metric = { count: number; growth: number };
type Analytics = {
  productId: string;
  range: AnalyticsRange;
  currency: string;
  sales: {
    amountMinor: number;
    growth: number;
    points: Array<{ date: string; amountMinor: number }>;
  };
  customers: Metric;
  completions: Metric;
  downloads: Metric;
};

export const ANALYTICS_RANGES: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "7d", label: "1 week" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
];

function formatCurrency(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function formatGrowth(value: number) {
  return `${value > 0 ? "+" : ""}${value}% from previous period`;
}

function MetricCard({
  title,
  icon: Icon,
  value,
  growth,
  loading,
}: {
  title: string;
  icon: typeof DollarSign;
  value: string;
  growth: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium">{title}</h2>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      {loading ? (
        <div className="mt-4 space-y-2" role="status" aria-label={`Loading ${title}`}>
          <div className="h-7 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        </div>
      ) : (
        <>
          <p className="mt-3 text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatGrowth(growth)}</p>
        </>
      )}
    </div>
  );
}

function SalesChart({
  points,
  currency,
  loading,
}: {
  points: Analytics["sales"]["points"];
  currency: string;
  loading: boolean;
}) {
  const max = Math.max(1, ...points.map((point) => point.amountMinor));
  const gridY = [8, 30, 52, 74, 96];
  const axisValues = gridY.map((_, index) =>
    Math.round(max * (1 - index / (gridY.length - 1))),
  );
  const line = points
    .map((point, index) => {
      const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
      const y = 96 - (point.amountMinor / max) * 88;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const labels = points.filter(
    (_, index) =>
      index === 0 ||
      index === Math.floor((points.length - 1) / 2) ||
      index === points.length - 1,
  );

  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-xl font-semibold">Sales</h2>
      {loading ? (
        <div
          className="mt-5 h-60 animate-pulse rounded bg-muted"
          role="status"
          aria-label="Loading sales"
        />
      ) : (
        <div className="mt-5" role="img" aria-label={`Sales trend in ${currency}`}>
          <div className="grid grid-cols-[max-content_minmax(0,1fr)] gap-2">
            <div
              className="flex h-56 flex-col justify-between text-right text-xs text-muted-foreground"
              aria-hidden="true"
            >
              {gridY.map((y, index) => (
                <span key={y}>{formatCurrency(axisValues[index] ?? 0, currency)}</span>
              ))}
            </div>
            <svg
              viewBox="0 0 100 100"
              className="h-56 w-full overflow-visible"
              preserveAspectRatio="none"
            >
              <title>Sales trend in {currency}</title>
              {gridY.map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2="100"
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="1 1"
                  className="text-border"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <polyline
                points={line}
                fill="none"
                stroke="currentColor"
                strokeWidth="0.8"
                className="text-primary"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          <div className="flex justify-between gap-2 text-xs text-muted-foreground">
            {labels.map((point) => (
              <span key={point.date}>
                {new Date(`${point.date}T00:00:00Z`).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            ))}
          </div>
          <p className="sr-only">
            {points
              .map(
                (point) =>
                  `${point.date}: ${formatCurrency(point.amountMinor, currency)}`,
              )
              .join(", ")}
          </p>
        </div>
      )}
    </section>
  );
}

export function ProductAnalytics({
  productId,
  school,
  productKind,
  contentCount,
  range,
}: {
  productId: string;
  school: School;
  productKind: Product["kind"];
  contentCount: number;
  range: AnalyticsRange;
}) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void fetch(
      `/api/v1/products/${encodeURIComponent(productId)}/analytics?range=${range}`,
      {
        credentials: "include",
        cache: "no-store",
        headers: { "x-school-id": school.id },
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load product analytics.");
        return (await response.json()) as Analytics;
      })
      .then((body) => setData(body))
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load product analytics.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [productId, range, school.id]);

  const currency = data?.currency ?? school.currency ?? "USD";
  const salesValue = data ? formatCurrency(data.sales.amountMinor, currency) : "—";
  const completionMetric =
    productKind === "course" ? data?.completions : data?.downloads;
  const completionTitle =
    productKind === "course" ? "People who completed the course" : "Downloads";
  const CompletionIcon = productKind === "course" ? GraduationCap : Download;

  const points = data?.sales.points ?? [];

  return (
    <div className="space-y-5">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {contentCount === 0 ? (
        <div className="rounded-md border-2 border-dashed px-2 py-16 text-center text-sm text-muted-foreground">
          <p className="mb-4">
            Your product is empty. Add some content to make it look interesting.
          </p>
          <Button asChild size="sm">
            <Link href={`/products/${encodeURIComponent(productId)}/content`}>
              Edit content
            </Link>
          </Button>
        </div>
      ) : null}
      <div className="grid gap-5 md:grid-cols-2">
        <MetricCard
          title="Sales"
          icon={DollarSign}
          value={salesValue}
          growth={data?.sales.growth ?? 0}
          loading={loading}
        />
        <MetricCard
          title="Customers"
          icon={Users}
          value={data?.customers.count.toLocaleString() ?? "—"}
          growth={data?.customers.growth ?? 0}
          loading={loading}
        />
        <MetricCard
          title={completionTitle}
          icon={CompletionIcon}
          value={completionMetric?.count.toLocaleString() ?? "—"}
          growth={completionMetric?.growth ?? 0}
          loading={loading}
        />
      </div>
      <SalesChart points={points} currency={currency} loading={loading} />
      <Resources
        links={[
          {
            href:
              productKind === "course"
                ? "https://docs.courselit.app/courses/add-content/"
                : "https://docs.courselit.app/downloads/add-content/",
            text: "Add content to a product",
          },
          {
            href:
              productKind === "course"
                ? "https://docs.courselit.app/courses/introduction/"
                : "https://docs.courselit.app/downloads/introduction/",
            text: "Understand the product dashboard",
          },
        ]}
      />
    </div>
  );
}
