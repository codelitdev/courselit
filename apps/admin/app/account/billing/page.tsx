"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { CourseLitLoading } from "@/components/loading";
import { PlanSettings } from "@/components/settings/plan-settings";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SchoolItem = { id: string; name: string; isOwner?: boolean; selected?: boolean };

/** The CourseLit plan of the school you are working in. Only its owner manages it. */
export default function BillingPage() {
  const [school, setSchool] = useState<SchoolItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: SchoolItem[] }) => {
        const items = body.items ?? [];
        setSchool(items.find((item) => item.selected) ?? items[0] ?? null);
      })
      .catch(() => setSchool(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGate>
      <div className="page-shell">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing and plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {school ? `The CourseLit plan for ${school.name}.` : "Your CourseLit plan."}
          </p>
        </div>
        {loading ? (
          <CourseLitLoading label="Loading your plan…" className="p-12" />
        ) : school?.isOwner ? (
          <PlanSettings schoolId={school.id} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Only the school owner can manage the plan</CardTitle>
              <CardDescription>
                Ask the owner of {school?.name ?? "this school"} to view or change its plan.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </AuthGate>
  );
}
