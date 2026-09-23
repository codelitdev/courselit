"use client";

import type { notificationSchema } from "@courselit/api-contract";
import { Bell, Check, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import type { z } from "zod";
import { CourseLitLoading } from "@/components/course-lit-loader";
import {
  LearnerBadge,
  LearnerButton,
  LearnerCard,
  LearnerCardContent,
  LearnerCaption,
  LearnerHeader4,
  LearnerText2,
} from "@/components/themed-page-builder";
import { requestJson } from "@/lib/request-json";

type Notification = z.infer<typeof notificationSchema>;
const PAGE_SIZE = 10;

function learnerNotificationHref(href: string) {
  if (href.startsWith("/dashboard/community/") || href.startsWith("/community/")) {
    return "/dashboard";
  }
  if (href.startsWith("/courses/"))
    return `/dashboard${href}`;
  return href;
}

function formatRelativeDate(value: string) {
  const elapsedSeconds = (new Date(value).getTime() - Date.now()) / 1000;
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: "always",
  });
  const [, secondsPerUnit] = units.find(
    ([, seconds]) => Math.abs(elapsedSeconds) >= seconds,
  ) ?? ["second", 1];
  return formatter.format(
    Math.round(elapsedSeconds / secondsPerUnit),
    units.find(([, seconds]) => seconds === secondsPerUnit)?.[0] ?? "second",
  );
}

export function LearnerNotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([null]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = useCallback(async (cursor: string | null = null, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (cursor) params.set("cursor", cursor);
      const body = await requestJson<{
        items: Notification[];
        nextCursor: string | null;
        total: number;
      }>(`/api/v1/learner/notifications?${params.toString()}`);
      setItems(body.items);
      setNextCursor(body.nextCursor);
      setTotal(body.total);
      setPageNumber(page);
      setPageCursors((current) => {
        const updated = current.slice(0, page);
        updated[page - 1] = cursor;
        return updated;
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  useEffect(() => {
    const stream = new EventSource("/api/v1/learner/notifications/stream");
    const onNotification = (event: Event) => {
      try {
        const notification = JSON.parse(
          (event as MessageEvent<string>).data,
        ) as Notification;
        setItems((current) => [
          notification,
          ...current.filter((item) => item.id !== notification.id),
        ]);
      } catch {
        // Polling remains the recovery path if an event is malformed.
      }
    };
    stream.addEventListener("notification", onNotification);
    return () => {
      stream.removeEventListener("notification", onNotification);
      stream.close();
    };
  }, []);

  async function markRead(item: Notification) {
    if (item.readAt) return;
    const updated = await requestJson<Notification>(
      `/api/v1/learner/notifications/${encodeURIComponent(item.id)}/read`,
      { method: "PATCH", body: JSON.stringify({}) },
    );
    setItems((current) =>
      current.map((entry) => (entry.id === updated.id ? updated : entry)),
    );
  }

  async function markAllRead() {
    await requestJson("/api/v1/learner/notifications/read-all", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const readAt = new Date().toISOString();
    setItems((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
    );
  }

  async function openNotification(item: Notification) {
    try {
      await markRead(item);
    } finally {
      setOpen(false);
      if (item.href) router.push(learnerNotificationHref(item.href));
    }
  }

  function nextPage() {
    if (!nextCursor || loading) return;
    void load(nextCursor, pageNumber + 1);
  }

  function previousPage() {
    if (pageNumber === 1 || loading) return;
    void load(pageCursors[pageNumber - 2] ?? null, pageNumber - 1);
  }

  const hasUnread = items.some((item) => !item.readAt);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <LearnerButton
        type="button"
        variant="ghost"
        size="sm"
        aria-label="View notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          if (!open) void load();
        }}
        className="relative size-9 p-0"
      >
        <Bell className="size-4" />
        {hasUnread ? (
          <LearnerBadge
            variant="destructive"
            className="absolute top-1 right-1 size-2 rounded-full p-0 bg-red-500"
            aria-hidden="true"
          />
        ) : null}
      </LearnerButton>
      {open && mounted
        ? createPortal(
            <LearnerCard
              aria-label="Notifications"
              className="fixed top-16 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] overflow-hidden p-0"
            >
              <LearnerCardContent className="flex items-center justify-between gap-2 border-b px-4 py-2">
                <LearnerHeader4>Notifications</LearnerHeader4>
                {hasUnread ? (
                  <LearnerButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void markAllRead()}
                    className="h-7 shrink-0 px-2 text-xs"
                  >
                    <Check className="size-3" /> Read all
                  </LearnerButton>
                ) : null}
              </LearnerCardContent>
              <LearnerCardContent className="max-h-96 overflow-y-auto p-0">
                {loading ? (
                  <CourseLitLoading label="Loading notifications…" className="px-5 py-8" />
                ) : null}
                {error ? (
                  <LearnerText2 className="px-5 py-8 text-center text-sm text-destructive">
                    {error}
                  </LearnerText2>
                ) : null}
                {!loading && !error && items.length === 0 ? (
                  <LearnerCardContent className="grid justify-items-center gap-2 py-8 text-center">
                    <Inbox className="size-8" />
                    <LearnerText2>No new notifications</LearnerText2>
                  </LearnerCardContent>
                ) : null}
                {!loading && !error
                  ? items.map((item) => (
                      <LearnerButton
                        type="button"
                        key={item.id}
                        variant="ghost"
                        onClick={() => void openNotification(item)}
                        className={`flex h-auto w-full flex-col items-start justify-start rounded-none border-b px-4 py-3 text-left whitespace-normal last:border-b-0 ${item.readAt ? "bg-muted/40" : ""}`}
                      >
                        <LearnerText2
                          component="span"
                          className="block w-full text-sm font-medium leading-5"
                        >
                          {item.title}
                        </LearnerText2>
                        <LearnerText2
                          component="span"
                          className="mt-1 block w-full text-sm leading-5 text-muted-foreground"
                        >
                          {item.body}
                        </LearnerText2>
                        <LearnerCaption
                          className="mt-2 block w-full"
                          title={item.createdAt}
                        >
                          {formatRelativeDate(item.createdAt)}
                        </LearnerCaption>
                      </LearnerButton>
                    ))
                  : null}
              </LearnerCardContent>
              {items.length > 0 ? (
                <LearnerCardContent className="flex items-center justify-between gap-1 border-t px-2 py-2">
                  <LearnerButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pageNumber === 1 || loading}
                    onClick={previousPage}
                    className="h-8 px-2 text-xs"
                  >
                    <ChevronLeft className="size-3" /> Previous
                  </LearnerButton>
                  <LearnerText2
                    component="span"
                    className="whitespace-nowrap text-xs text-muted-foreground"
                  >
                    Page {pageNumber} of {totalPages}
                  </LearnerText2>
                  <LearnerButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!nextCursor || loading}
                    onClick={nextPage}
                    className="h-8 px-2 text-xs"
                  >
                    Next <ChevronRight className="size-3" />
                  </LearnerButton>
                </LearnerCardContent>
              ) : null}
            </LearnerCard>,
            document.body,
          )
        : null}
    </>
  );
}
