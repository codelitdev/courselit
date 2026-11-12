"use client";

import { DollarSign, ExternalLink, Mail, UserPlus, Users } from "lucide-react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AuthGate } from "../components/auth-gate";
import { CourseLitInlineLoading, CourseLitLoading } from "../components/loading";
import { useAdminShellContext } from "../components/layout/admin-shell-context";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/codelit/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/codelit/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../components/ui/chart";
import { OnboardingVisibilityMenu } from "../components/onboarding/checklist/onboarding-menu";
import { useOnboarding } from "../components/onboarding/checklist/use-onboarding";
import {
  ANALYTICS_RANGES,
  type AnalyticsRange,
  formatMinorCurrency,
} from "../lib/analytics";
import { storefrontUrl } from "../lib/storefront-url";


const SALES_CHART_CONFIG = {
  amountMinor: {
    label: "Sales",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

type SchoolOverview = {
  range: AnalyticsRange;
  currency: string;
  sales: {
    amountMinor: number;
    growth: number;
    points: Array<{ date: string; amountMinor: number }>;
  };
  customers: { count: number; growth: number };
  communityMembers: { count: number; growth: number };
  subscribers: { count: number; growth: number };
};

export default function HomePage() {
  const shell = useAdminShellContext();
  const account = shell?.account ?? null;
  const schools = shell?.schools ?? [];
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<SchoolOverview | null>(null);
  const onboarding = useOnboarding();
  const [overviewRange, setAnalyticsRange] = useState<AnalyticsRange>("7d");

  const selected = schools.find((school) => school.selected) ?? schools[0] ?? null;
  const selectedSchoolId = selected?.id;
  const visitSiteUrl = selected ? storefrontUrl("/", selected.storefrontOrigin) : null;

  useEffect(() => {
    if (!selectedSchoolId) {
      setLoading(false);
      return;
    }
    let active = true;
    setOverview(null);
    void fetch(`/api/v1/school/overview?range=${overviewRange}`, {
      headers: { "x-school-id": selectedSchoolId },
      credentials: "include",
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: SchoolOverview | null) => setOverview(body))
      .catch(() => setOverview(null))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [overviewRange, selectedSchoolId]);

  const firstName = account?.name?.trim().split(/\s+/)[0];

  return (
    <AuthGate>
      <div className="page-shell">
        {loading || !selected ? (
          <CourseLitLoading className="p-12" />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-4xl font-semibold tracking-tight">
                Welcome{firstName ? `, ${firstName}` : ""}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                {visitSiteUrl ? (
                  <Button asChild variant="outline">
                    <a href={visitSiteUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      Visit site
                    </a>
                  </Button>
                ) : null}
                {onboarding.isOwner && onboarding.state?.checklistHidden ? (
                  <OnboardingVisibilityMenu mode="show" />
                ) : null}
                <Select
                  value={overviewRange}
                  onValueChange={(value) => setAnalyticsRange(value as AnalyticsRange)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    {ANALYTICS_RANGES.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {overview ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                  <OverviewMetric
                    title="Sales"
                    icon={<DollarSign className="size-4 text-muted-foreground" />}
                    value={formatMinorCurrency(
                      overview.sales.amountMinor,
                      overview.currency,
                    )}
                    growth={overviewRange === "lifetime" ? null : overview.sales.growth}
                  />
                  <OverviewMetric
                    title="Customers"
                    icon={<UserPlus className="size-4 text-muted-foreground" />}
                    value={overview.customers.count}
                    growth={overviewRange === "lifetime" ? null : overview.customers.growth}
                  />
                  <OverviewMetric
                    title="New community members"
                    icon={<Users className="size-4 text-muted-foreground" />}
                    value={overview.communityMembers.count}
                    growth={overviewRange === "lifetime" ? null : overview.communityMembers.growth}
                  />
                  <OverviewMetric
                    title="Subscribers"
                    icon={<Mail className="size-4 text-muted-foreground" />}
                    value={overview.subscribers.count}
                    growth={overviewRange === "lifetime" ? null : overview.subscribers.growth}
                  />
                </div>
                <SalesActivityChart
                  points={overview.sales.points}
                  currency={overview.currency}
                />
              </>
            ) : (
              <CourseLitInlineLoading label="Loading activity…" className="rounded-xl border bg-card p-8" />
            )}
          </div>
        )}
      </div>
    </AuthGate>
  );
}


function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function OverviewMetric({
  title,
  icon,
  value,
  growth,
}: {
  title: string;
  icon: ReactNode;
  value: string | number;
  /** Hidden when null: lifetime has no earlier period to compare with. */
  growth: number | null;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium">{title}</h2>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {growth === null ? null : (
        <p className="mt-1 text-xs text-muted-foreground">
          {growth > 0 ? "+" : ""}
          {growth}% from previous period
        </p>
      )}
    </div>
  );
}

function SalesActivityChart({
  points,
  currency,
}: {
  points: SchoolOverview["sales"]["points"];
  currency: string;
}) {
  const xAxisInterval = points.length > 14 ? Math.ceil(points.length / 7) - 1 : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Sales</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={SALES_CHART_CONFIG} className="h-60 w-full aspect-auto">
          <LineChart
            accessibilityLayer
            data={points}
            margin={{ left: 12, right: 12, top: 12, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={xAxisInterval}
              tickFormatter={formatDate}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={56}
              tickFormatter={(value) => formatMinorCurrency(Number(value), currency)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(value) => formatDate(String(value))}
                  formatter={(value) => formatMinorCurrency(Number(value), currency)}
                />
              }
            />
            <Line
              dataKey="amountMinor"
              type="monotone"
              stroke="var(--color-amountMinor)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
