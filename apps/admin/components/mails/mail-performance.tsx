"use client";

import {
  SequenceAnalytics,
  type SequenceStats,
  sequenceStatsMetrics,
} from "@sendlit/email-blocks";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { parseMailStats } from "@/lib/mail-stats";

/**
 * Loads a broadcast's or sequence's stats through CourseLit's API for the
 * mail service's performance card, which has its own refresh button.
 * Renders nothing until stats are available.
 */
export function MailPerformance({
  schoolId,
  sequenceId,
}: {
  schoolId: string;
  sequenceId: string;
}) {
  const [stats, setStats] = useState<SequenceStats | null>(null);

  const fetchStats = useCallback(async () => {
    const response = await fetch(
      `/api/v1/school/mails/sequences/${encodeURIComponent(sequenceId)}/stats`,
      {
        credentials: "include",
        cache: "no-store",
        headers: { "x-school-id": schoolId },
      },
    );
    if (!response.ok) throw new Error("Unable to load stats.");
    return parseMailStats(await response.json());
  }, [schoolId, sequenceId]);

  useEffect(() => {
    let active = true;
    void fetchStats()
      .then((next) => {
        if (active) setStats(next);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [fetchStats]);

  if (!stats) return null;
  return (
    <SequenceAnalytics
      title="Performance"
      metrics={sequenceStatsMetrics(stats)}
      onRefresh={async () => {
        try {
          const next = await fetchStats();
          if (next) setStats(next);
        } catch {
          // Keep the numbers already shown.
          toast.error("Couldn't refresh the stats. Try again.");
        }
      }}
    />
  );
}
