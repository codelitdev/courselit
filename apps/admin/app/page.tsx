"use client";

import { DollarSign, ExternalLink, Mail, UserPlus, Users } from "lucide-react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AuthGate } from "../components/auth-gate";
import { CourseLitLoading } from "../components/loading";
import { type CurrentAccount } from "../components/layout/nav-user";
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
import { storefrontUrl } from "../lib/storefront-url";

type OverviewRange = "7d" | "30d" | "90d" | "1y";

const OVERVIEW_RANGES: Array<{ value: OverviewRange; label: string }> = [
  { value: "7d", label: "1 week" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
];

const SALES_CHART_CONFIG = {
  amountMinor: {
    label: "Sales",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

type School = {
  id: string;
  name: string;
  subdomain?: string;
  selected?: boolean;
};

type SchoolOverview = {
  range: OverviewRange;
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
  const [account, setAccount] = useState<CurrentAccount | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<SchoolOverview | null>(null);
  const [overviewRange, setOverviewRange] = useState<OverviewRange>("7d");

  const selected = schools.find((school) => school.selected) ?? schools[0] ?? null;
  const selectedSchoolId = selected?.id;
  const visitSiteUrl = selected ? storefrontUrl("/", selected.subdomain) : null;

  useEffect(() => {
    void fetch("/api/auth/get-session", {
      cache: "no-store",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = (await response.json()) as { user?: CurrentAccount };
        return body.user ?? null;
      })
      .then((user) => setAccount(user))
      .catch(() => setAccount(null));
  }, []);

  useEffect(() => {
    void fetch("/api/v1/schools", {
      credentials: "include",
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: School[] }) => setSchools(body.items ?? []))
      .catch(() => setSchools([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSchoolId) return;
    setOverview(null);
    void fetch(`/api/v1/school/overview?range=${overviewRange}`, {
      headers: { "x-school-id": selectedSchoolId },
      credentials: "include",
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: SchoolOverview | null) => setOverview(body))
      .catch(() => setOverview(null));
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
                <Select
                  value={overviewRange}
                  onValueChange={(value) => setOverviewRange(value as OverviewRange)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    {OVERVIEW_RANGES.map((range) => (
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
                    value={formatCurrency(
                      overview.sales.amountMinor,
                      overview.currency,
                    )}
                    growth={overview.sales.growth}
                  />
                  <OverviewMetric
                    title="Customers"
                    icon={<UserPlus className="size-4 text-muted-foreground" />}
                    value={overview.customers.count}
                    growth={overview.customers.growth}
                  />
                  <OverviewMetric
                    title="New community members"
                    icon={<Users className="size-4 text-muted-foreground" />}
                    value={overview.communityMembers.count}
                    growth={overview.communityMembers.growth}
                  />
                  <OverviewMetric
                    title="Subscribers"
                    icon={<Mail className="size-4 text-muted-foreground" />}
                    value={overview.subscribers.count}
                    growth={overview.subscribers.growth}
                  />
                </div>
                <SalesActivityChart
                  points={overview.sales.points}
                  currency={overview.currency}
                />
              </>
            ) : (
              <CourseLitLoading label="Loading activity…" className="rounded-xl border bg-card p-8" />
            )}
          </div>
        )}
      </div>
    </AuthGate>
  );
}

function formatCurrency(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
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
  growth: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium">{title}</h2>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {growth > 0 ? "+" : ""}
        {growth}% from previous period
      </p>
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
              tickFormatter={(value) => formatCurrency(Number(value), currency)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(value) => formatDate(String(value))}
                  formatter={(value) => formatCurrency(Number(value), currency)}
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
