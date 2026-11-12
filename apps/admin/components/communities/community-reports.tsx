"use client";

import { Check, Flag, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CourseLitLoading, CourseLitLoadingIcon } from "@/components/loading";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import { Textarea } from "@/components/ui/codelit/textarea";
import { cn } from "@/lib/utils";
import {
  CommunityGifPreview,
  CommunityMediaPreview,
  communityPagePath,
  CommunityPostContent,
  type CommunityRequest,
  errorMessage,
  initials,
  relativeDay,
  type Report,
  SegmentedFilter,
  StatusBadge,
} from "./community-shared";

type ReportFilter = "pending" | "accepted" | "rejected" | "all";

const CONTENT_LABEL: Record<Report["contentType"], string> = {
  post: "Post",
  comment: "Comment",
  reply: "Reply",
};

/** Reports for the community's spaces, or for one course's discussion. */
export function CommunityReports({
  reportsPath,
  request,
  pendingCount = null,
  onPendingChanged,
  setNotice,
  setError,
}: {
  /** Lists the reports: the community's or a course discussion's. */
  reportsPath: string;
  request: CommunityRequest;
  pendingCount?: string | null;
  onPendingChanged?: () => void;
  setNotice: (value: string | null) => void;
  setError: (value: string | null) => void;
}) {
  const [filter, setFilter] = useState<ReportFilter>("pending");
  const [reports, setReports] = useState<Report[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** False until the first page arrives; later reloads keep the list on screen. */
  const [loaded, setLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toKeep, setToKeep] = useState<Report | null>(null);
  const [keepReason, setKeepReason] = useState("");

  // Callers often pass inline callbacks. Reading them through a ref keeps a
  // parent re-render from reloading the list.
  const setErrorRef = useRef(setError);
  useEffect(() => {
    setErrorRef.current = setError;
  });

  const fetchPage = useCallback(
    (cursor?: string | null) =>
      request<{ items?: Report[]; nextCursor?: string | null }>(
        communityPagePath(reportsPath, cursor, {
          status: filter === "all" ? undefined : filter,
        }),
      ),
    [filter, reportsPath, request],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchPage()
      .then((body) => {
        if (!active) return;
        setReports(body.items ?? []);
        setNextCursor(body.nextCursor ?? null);
      })
      .catch((caught) => {
        if (active) setErrorRef.current(errorMessage(caught, "Unable to load reports."));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setLoaded(true);
      });
    // A response for a filter the user already left is dropped.
    return () => {
      active = false;
    };
  }, [fetchPage]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const body = await fetchPage(nextCursor);
      setReports((items) => [...items, ...(body.items ?? [])]);
      setNextCursor(body.nextCursor ?? null);
    } catch (caught) {
      setError(errorMessage(caught, "Unable to load more reports."));
    } finally {
      setLoadingMore(false);
    }
  }

  async function updateReport(
    report: Report,
    status: Report["status"],
    rejectionReason: string | null,
    notice: string,
  ) {
    setBusyId(report.id);
    try {
      const updated = await request<Report>(`/api/v1/community-reports/${report.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, rejectionReason }),
      });
      setReports((items) =>
        items
          .map((item) => (item.id === updated.id ? updated : item))
          .filter((item) => filter === "all" || item.status === filter),
      );
      onPendingChanged?.();
      setNotice(notice);
      return true;
    } catch (caught) {
      setError(errorMessage(caught, "Unable to update the report."));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function confirmKeep() {
    if (!toKeep || !keepReason.trim()) return;
    const label = CONTENT_LABEL[toKeep.contentType].toLowerCase();
    const done = await updateReport(
      toKeep,
      "rejected",
      keepReason.trim(),
      `The ${label} stays up.`,
    );
    if (done) {
      setToKeep(null);
      setKeepReason("");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedFilter<ReportFilter>
          ariaLabel="Filter reports"
          value={filter}
          onChange={setFilter}
          items={[
            { value: "pending", label: "To review", count: pendingCount },
            { value: "accepted", label: "Removed" },
            { value: "rejected", label: "Kept" },
            { value: "all", label: "All" },
          ]}
        />
        <p className="text-sm text-muted-foreground">
          Removed content is hidden from members right away. The author isn&apos;t told
          who reported it.
        </p>
      </div>
      <div
        aria-busy={loading}
        className={cn("transition-opacity", loading && loaded && "opacity-60")}
      >
      {loading && !loaded ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <CourseLitLoading />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          {filter === "pending" ? "Nothing to review. All clear." : "No reports here."}
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const label = CONTENT_LABEL[report.contentType];
            const author = report.content?.author?.name ??
              (report.authorKind === "admin" ? "Admin" : "Learner");
            const busy = busyId === report.id;
            return (
              <article key={report.id} className="overflow-hidden rounded-xl border bg-card">
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {label}
                      </span>
                      <span className="text-muted-foreground">
                        Reported {relativeDay(report.createdAt).toLowerCase()}
                      </span>
                    </div>
                    <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                      <Flag className="size-4 shrink-0" />
                      <span className="shrink-0">Reported for</span>
                      <span className="truncate rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {report.reason}
                      </span>
                    </p>
                  </div>
                  {report.content ? (
                    <div className="rounded-lg border bg-muted/30 px-4 py-3">
                      <p className="flex items-center gap-2 text-sm">
                        <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-medium text-primary">
                          {initials(author)}
                        </span>
                        <span className="font-medium">{author}</span>
                      </p>
                      <div className="mt-2">
                        <CommunityPostContent value={report.content.content} />
                      </div>
                      <CommunityMediaPreview items={report.content.media} />
                      <CommunityGifPreview urls={report.content.gifUrls} />
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                      The reported {label.toLowerCase()} is no longer available.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-5 py-2.5">
                  <div className="text-sm">
                    {report.status === "accepted" ? (
                      <StatusBadge tone="danger">Removed</StatusBadge>
                    ) : report.status === "rejected" ? (
                      <span className="flex flex-wrap items-center gap-2 text-muted-foreground">
                        <StatusBadge tone="success">Kept</StatusBadge>
                        {report.rejectionReason}
                      </span>
                    ) : (
                      <StatusBadge tone="warning">To review</StatusBadge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {report.status === "pending" ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            setKeepReason("");
                            setToKeep(report);
                          }}
                        >
                          <Check /> Keep {label.toLowerCase()}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy || !report.content}
                          onClick={() =>
                            void updateReport(
                              report,
                              "accepted",
                              null,
                              `The ${label.toLowerCase()} was removed.`,
                            )
                          }
                        >
                          <Trash2 /> Remove {label.toLowerCase()}
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void updateReport(report, "pending", null, "Report reopened.")
                        }
                      >
                        <RotateCcw /> Review again
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      </div>
      {nextCursor ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? <CourseLitLoadingIcon size={14} /> : "Load more reports"}
          </Button>
        </div>
      ) : null}
      <Dialog
        open={Boolean(toKeep)}
        onOpenChange={(open) => {
          if (!open) setToKeep(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keep this {toKeep ? CONTENT_LABEL[toKeep.contentType].toLowerCase() : "content"}?</DialogTitle>
            <DialogDescription>
              Note why it stays up. The note is kept with the report for your team.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={keepReason}
            onChange={(event) => setKeepReason(event.target.value)}
            placeholder="Why it stays up"
            aria-label="Why it stays up"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setToKeep(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!keepReason.trim() || busyId !== null}
              onClick={() => void confirmKeep()}
            >
              Keep it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
