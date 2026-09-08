"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";

type Report = {
  id: string;
  contentType: "comment" | "reply";
  contentId: string;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  rejectionReason: string | null;
  authorId: string | null;
  authorKind: "learner" | "admin" | null;
  reporterId: string | null;
  reporterKind: "learner" | "admin" | null;
  lessonTitle: string;
  contentPreview: string | null;
  contentDeleted: boolean;
  createdAt: string;
};

type School = { id: string };

export function ProductDiscussionReports({ productId }: { productId: string }) {
  const [school, setSchool] = useState<School | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState<"pending" | "accepted" | "rejected" | "all">(
    "pending",
  );
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportToReject, setReportToReject] = useState<Report | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const rejectionReasonRef = useRef("");

  const load = useCallback(
    async (activeSchool: School, cursor?: string) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (cursor) params.set("cursor", cursor);
      const query = params.toString() ? `?${params.toString()}` : "";
      const response = await fetch(
        `/api/v1/products/${encodeURIComponent(productId)}/discussions/reports${query}`,
        {
          credentials: "include",
          cache: "no-store",
          headers: { "x-school-id": activeSchool.id },
        },
      );
      const body = (await response.json().catch(() => null)) as {
        items?: Report[];
        nextCursor?: string | null;
        hasMore?: boolean;
        message?: string;
      } | null;
      if (!response.ok) {
        setError(body?.message ?? "Unable to load reported content.");
        if (!cursor) setReports([]);
      } else {
        setReports((current) =>
          cursor ? [...current, ...(body?.items ?? [])] : (body?.items ?? []),
        );
        setNextCursor(body?.nextCursor ?? null);
        setHasMore(Boolean(body?.hasMore));
      }
      setLoading(false);
    },
    [productId, status],
  );

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: School[] }) => {
        const selected = body.items?.find((item) => item) ?? null;
        if (!active || !selected) return;
        setSchool(selected);
      })
      .catch(() => {
        if (active) {
          setError("Unable to load reported content.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (school) void load(school);
  }, [load, school]);

  async function update(
    reportId: string,
    nextStatus: Report["status"],
    nextRejectionReason?: string | null,
  ) {
    if (!school) return;
    const response = await fetch(
      `/api/v1/product-discussion-reports/${encodeURIComponent(reportId)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json", "x-school-id": school.id },
        body: JSON.stringify({
          status: nextStatus,
          rejectionReason:
            nextStatus === "rejected" ? (nextRejectionReason ?? "") : undefined,
        }),
      },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      setError(body?.message ?? "Unable to update the report.");
      return;
    }
    await load(school);
  }

  function requestReject(report: Report) {
    rejectionReasonRef.current = report.rejectionReason ?? "";
    setRejectionReason(rejectionReasonRef.current);
    setReportToReject(report);
  }

  async function submitRejection() {
    const report = reportToReject;
    if (!report) return;
    setReportToReject(null);
    await update(report.id, "rejected", rejectionReasonRef.current.trim());
    rejectionReasonRef.current = "";
    setRejectionReason("");
  }

  return (
    <section className="card stack">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Reported content</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review learner reports for this course. Accepting a report hides the comment
            or reply.
          </p>
        </div>
        <div className="field max-w-48 text-sm">
          <span>Status</span>
          <Select
            value={status}
            onValueChange={(val) => setStatus(val as typeof status)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All reports</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading reports…</p>
      ) : null}
      {!loading && reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reports in this view.</p>
      ) : null}
      <div className="divide-y rounded-lg border">
        {reports.map((report) => (
          <article key={report.id} className="stack p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{report.lessonTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {report.contentType === "comment" ? "Comment" : "Reply"} ·{" "}
                  {new Date(report.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="rounded-md border px-2 py-1 text-xs capitalize">
                {report.status}
              </span>
            </div>
            <p className="text-sm">
              {report.contentDeleted ? "Deleted content: " : ""}
              {report.contentPreview ?? "Content is no longer available."}
            </p>
            <p className="text-sm text-muted-foreground">
              Author:{" "}
              {report.authorKind === "admin"
                ? "Course admin"
                : report.authorId
                  ? "Learner"
                  : "Former member"}{" "}
              · Reported by:{" "}
              {report.reporterKind === "admin"
                ? "Course admin"
                : report.reporterId
                  ? "Learner"
                  : "Former member"}
            </p>
            <p className="text-sm text-muted-foreground">
              Report reason: {report.reason}
            </p>
            {report.rejectionReason ? (
              <p className="text-sm text-muted-foreground">
                Review note: {report.rejectionReason}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {report.status !== "accepted" ? (
                <Button
                  type="button"
                  onClick={() => void update(report.id, "accepted")}
                >
                  Hide content
                </Button>
              ) : null}
              {report.status !== "rejected" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => requestReject(report)}
                >
                  Reject report
                </Button>
              ) : null}
              {report.status === "rejected" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void update(report.id, "pending")}
                >
                  Reopen
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {hasMore && nextCursor && school ? (
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => void load(school, nextCursor)}
        >
          Load more reports
        </Button>
      ) : null}
      <Dialog
        open={reportToReject !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReportToReject(null);
            rejectionReasonRef.current = "";
            setRejectionReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject report</DialogTitle>
            <DialogDescription>
              Add an optional note explaining why this report is being rejected.
            </DialogDescription>
          </DialogHeader>
          <label className="stack text-sm font-medium">
            Review note
            <textarea
              className="min-h-24 w-full rounded-md border bg-background p-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={rejectionReason}
              maxLength={2000}
              onChange={(event) => {
                rejectionReasonRef.current = event.target.value;
                setRejectionReason(event.target.value);
              }}
              placeholder="Reviewed and allowed."
              autoFocus
            />
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReportToReject(null)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitRejection()}>
              Reject report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
