"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import { PLAN_FEATURE_COPY, usePlanFeatures } from "@/lib/plan-features";

export type AuditLogEvent = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actor: { kind: "user" | "system"; name: string | null; email: string | null };
  createdAt: string;
};

type AuditLogPage = { items: AuditLogEvent[]; nextCursor: string | null };

/** Who did it, as the list shows it. */
export function auditActorLabel(actor: AuditLogEvent["actor"]): string {
  if (actor.kind === "system") return "CourseLit";
  return actor.name || actor.email || "A former team member";
}

/** `school.updated` reads as "School updated". */
export function auditActionLabel(action: string): string {
  const words = action.replace(/[._]+/g, " ").trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : action;
}

/**
 * The school's audit log: who changed what and when, newest first
 * (docs/wip/plan-limits.md, section 4). A Business feature; on other plans
 * the API refuses it and this explains why.
 */
export function AuditLogSettings({ schoolId }: { schoolId: string | null }) {
  const features = usePlanFeatures(schoolId);
  const included = features.has("audit_log");
  const [items, setItems] = useState<AuditLogEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor: string | null) => {
      if (!schoolId) return;
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({ limit: "50" });
        if (cursor) query.set("cursor", cursor);
        const response = await fetch(
          `/api/v1/school/audit-events?${query.toString()}`,
          {
            credentials: "include",
            cache: "no-store",
            headers: { "x-school-id": schoolId },
          },
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            details?: { reason?: string };
          } | null;
          throw new Error(
            body?.details?.reason === "plan_required"
              ? PLAN_FEATURE_COPY.audit_log
              : "Unable to load the audit log.",
          );
        }
        const page = (await response.json()) as AuditLogPage;
        setItems((current) => (cursor ? [...current, ...page.items] : page.items));
        setNextCursor(page.nextCursor);
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Unable to load the audit log.",
        );
      } finally {
        setLoading(false);
      }
    },
    [schoolId],
  );

  useEffect(() => {
    if (features.loading || !included) return;
    void load(null);
  }, [features.loading, included, load]);

  if (!features.loading && !included) {
    return (
      <div className="space-y-1">
        <p className="text-sm">{PLAN_FEATURE_COPY.audit_log}</p>
        <p className="text-sm text-muted-foreground">
          It records who changed what in your school, and when.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Who changed what in your school, newest first.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {items.length === 0 && !loading && !error ? (
        <p className="text-sm text-muted-foreground">Nothing has been recorded yet.</p>
      ) : null}
      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">When</th>
                <th className="py-2 pr-4 font-medium">Who</th>
                <th className="py-2 pr-4 font-medium">What</th>
                <th className="py-2 font-medium">Resource</th>
              </tr>
            </thead>
            <tbody>
              {items.map((event) => (
                <tr key={event.id} className="border-t align-top">
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {new Date(event.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 pr-4" title={event.actor.email ?? undefined}>
                    {auditActorLabel(event.actor)}
                  </td>
                  <td className="py-3 pr-4">{auditActionLabel(event.action)}</td>
                  <td className="py-3">
                    <span className="text-muted-foreground">{event.resourceType}</span>{" "}
                    <code className="font-mono text-xs break-all">
                      {event.resourceId}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {nextCursor ? (
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => void load(nextCursor)}
        >
          {loading ? "Loading…" : "Show older"}
        </Button>
      ) : null}
    </div>
  );
}
