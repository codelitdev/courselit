"use client";

import { Bell, Check, Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CourseLitLoading } from "@/components/loading";

type Notification = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

const PAGE_SIZE = 10;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let currentSchoolId = schoolId;
      if (!currentSchoolId) {
        const schoolsResponse = await fetch("/api/v1/schools", {
          cache: "no-store",
          credentials: "include",
        });
        if (!schoolsResponse.ok) throw new Error("Unable to load notifications.");
        const schoolsBody = (await schoolsResponse.json()) as {
          items?: Array<{ id: string; selected?: boolean }>;
        };
        currentSchoolId =
          schoolsBody.items?.find((school) => school.selected)?.id ??
          schoolsBody.items?.[0]?.id ??
          null;
        setSchoolId(currentSchoolId);
      }
      if (!currentSchoolId) return;
      const response = await fetch(`/api/v1/notifications?limit=${PAGE_SIZE}`, {
        cache: "no-store",
        credentials: "include",
        headers: { "x-school-id": currentSchoolId },
      });
      const body = (await response.json().catch(() => null)) as {
        items?: Notification[];
        message?: string;
      } | null;
      if (!response.ok)
        throw new Error(body?.message ?? "Unable to load notifications.");
      setItems(body?.items ?? []);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

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
    if (!schoolId) return;
    const stream = new EventSource(
      `/api/v1/notifications/stream?schoolId=${encodeURIComponent(schoolId)}`,
    );
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
  }, [schoolId]);

  async function markRead(item: Notification) {
    if (!schoolId || item.readAt) return;
    const response = await fetch(
      `/api/v1/notifications/${encodeURIComponent(item.id)}/read`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json", "x-school-id": schoolId },
        body: JSON.stringify({}),
      },
    );
    if (response.ok) {
      const updated = (await response.json()) as Notification;
      setItems((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    }
  }

  async function markAllRead() {
    if (!schoolId) return;
    const response = await fetch("/api/v1/notifications/read-all", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json", "x-school-id": schoolId },
      body: JSON.stringify({}),
    });
    if (response.ok) {
      const readAt = new Date().toISOString();
      setItems((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
      );
    }
  }

  async function openNotification(item: Notification) {
    await markRead(item);
    setOpen(false);
    if (item.href) router.push(item.href);
  }

  const hasUnread = items.some((item) => !item.readAt);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="View notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          if (!open) void load();
        }}
        className="relative inline-flex size-9 items-center justify-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="size-4" />
        {hasUnread ? (
          <span
            className="absolute top-1 right-1 size-2 rounded-full bg-red-500"
            aria-hidden="true"
          />
        ) : null}
      </button>
      {open ? (
        <div className="absolute top-11 right-0 z-50 w-80 overflow-hidden rounded-[var(--radius)] border bg-popover text-popover-foreground shadow-[var(--shadow-popover)]">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            {hasUnread ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Check className="size-3" /> Read all
              </button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <CourseLitLoading label="Loading notifications…" className="px-4 py-8" />
            ) : null}
            {error ? (
              <p className="px-4 py-8 text-center text-sm text-destructive">{error}</p>
            ) : null}
            {!loading && !error && items.length === 0 ? (
              <div className="grid justify-items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
                <Inbox className="size-8" />
                <span>No new notifications</span>
              </div>
            ) : null}
            {!loading && !error
              ? items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => void openNotification(item)}
                    className={`block w-full border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted ${item.readAt ? "bg-muted/40" : ""}`}
                  >
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.body}
                    </span>
                    <time
                      className="mt-2 block text-[11px] text-muted-foreground"
                      dateTime={item.createdAt}
                    >
                      {formatDate(item.createdAt)}
                    </time>
                  </button>
                ))
              : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
