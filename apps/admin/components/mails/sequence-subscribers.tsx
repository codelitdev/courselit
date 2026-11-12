"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CourseLitInlineLoading } from "@/components/loading";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/codelit/button";
import {
  pageRange,
  SUBSCRIBERS_PAGE_SIZE,
  type SequenceSubscriber,
  subscriberInitial,
  subscriberLabel,
  subscriberStatus,
  totalPages,
} from "@/lib/sequence-subscribers";

type SubscribersPage = { items: SequenceSubscriber[]; total: number };

/** The contacts who have received a sequence, a page at a time. */
export function SequenceSubscribers({
  schoolId,
  sequenceId,
}: {
  schoolId: string;
  sequenceId: string;
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SubscribersPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const query = new URLSearchParams({
      page: String(page),
      limit: String(SUBSCRIBERS_PAGE_SIZE),
    });
    fetch(
      `/api/v1/school/mails/sequences/${encodeURIComponent(sequenceId)}/subscribers?${query}`,
      { headers: { "x-school-id": schoolId }, credentials: "include" },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Request failed");
        return (await response.json()) as SubscribersPage;
      })
      .then((next) => {
        if (active) setData({ items: next.items ?? [], total: next.total ?? 0 });
      })
      .catch(() => {
        if (active) setError("We couldn't load the subscribers. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [schoolId, sequenceId, page]);

  const total = data?.total ?? 0;
  const pages = totalPages(total);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Subscribers{data ? ` (${total.toLocaleString()})` : ""}
      </h2>
      {error ? (
        <p className="rounded-lg border bg-card p-4 text-sm text-destructive">{error}</p>
      ) : loading && !data ? (
        <div className="flex justify-center rounded-lg border bg-card p-6">
          <CourseLitInlineLoading />
        </div>
      ) : data && data.items.length === 0 ? (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          No one has received this sequence yet.
        </p>
      ) : (
        <div
          className={`divide-y rounded-lg border bg-card ${loading ? "opacity-60" : ""}`}
        >
          {data?.items.map((subscriber) => {
            const status = subscriberStatus(subscriber);
            const row = (
              <>
                <Avatar>
                  <AvatarFallback>{subscriberInitial(subscriber)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{subscriberLabel(subscriber)}</p>
                  {subscriber.name && subscriber.email ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {subscriber.email}
                    </p>
                  ) : null}
                </div>
                {status ? (
                  <span className="rounded-full border px-2.5 py-1 text-xs">{status}</span>
                ) : null}
              </>
            );
            return subscriber.email ? (
              <Link
                key={subscriber.contactId}
                href={`/contacts/${encodeURIComponent(subscriber.contactId)}`}
                className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50"
              >
                {row}
              </Link>
            ) : (
              <div
                key={subscriber.contactId}
                className="flex items-center gap-3 px-4 py-3 text-sm"
              >
                {row}
              </div>
            );
          })}
        </div>
      )}
      {total > SUBSCRIBERS_PAGE_SIZE ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{pageRange(page, total)}</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span>
              Page {page} of {pages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= pages || loading}
              onClick={() => setPage((current) => current + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
