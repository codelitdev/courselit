"use client";

import type {
  notificationPreferenceSchema,
  notificationSchema,
} from "@courselit/api-contract";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { z } from "zod";
import {
  requestJson,
  useLearnerSession,
} from "@/components/communities/learner-community";
import { LearnerShell } from "@/components/layout/learner-shell";
import {
  LearnerButton as Button,
  LearnerCard as PageCard,
  LearnerCardContent as PageCardContent,
  LearnerHeader1,
  LearnerHeader2,
  LearnerText2,
  LearnerSwitch as Switch,
} from "@/components/themed-page-builder";

type Notification = z.infer<typeof notificationSchema>;
type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;

const NOTIFICATION_PAGE_SIZE = 10;

function learnerNotificationHref(href: string) {
  if (href.startsWith("/community/") || href.startsWith("/courses/")) {
    return `/dashboard${href}`;
  }
  return href;
}

const preferenceCopy: Record<
  NotificationPreference["type"],
  { title: string; description: string }
> = {
  community_post_created: {
    title: "Community posts",
    description: "When someone creates a post in a community you belong to.",
  },
  community_post_liked: {
    title: "Community post reactions",
    description: "When someone reacts to your community post.",
  },
  community_comment: {
    title: "Community comments",
    description: "When someone comments on a community post you follow.",
  },
  community_comment_liked: {
    title: "Community comment reactions",
    description: "When someone reacts to your community comment.",
  },
  community_reply: {
    title: "Community replies",
    description: "When someone replies to your community discussion.",
  },
  community_reply_liked: {
    title: "Community reply reactions",
    description: "When someone reacts to your community reply.",
  },
  community_membership_granted: {
    title: "Community membership approvals",
    description: "When your request to join a community is approved.",
  },
  course_discussion_comment_created: {
    title: "Course discussion comments",
    description: "When someone comments in a course discussion you follow.",
  },
  course_discussion_reacted: {
    title: "Course discussion reactions",
    description: "When someone reacts to your course discussion.",
  },
};

export function LearnerNotifications() {
  const { learner, checking } = useLearnerSession("/dashboard/notifications");
  const [items, setItems] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [savingPreference, setSavingPreference] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!learner) return;
    let active = true;
    void Promise.all([
      requestJson<{ items: Notification[]; nextCursor: string | null }>(
        `/api/v1/learner/notifications?limit=${NOTIFICATION_PAGE_SIZE}`,
      ),
      requestJson<{ items: NotificationPreference[] }>(
        "/api/v1/learner/notification-preferences",
      ),
    ])
      .then(([notificationBody, preferenceBody]) => {
        if (!active) return;
        setItems(notificationBody.items);
        setNextCursor(notificationBody.nextCursor);
        setPreferences(preferenceBody.items);
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "Unable to load notifications.",
          );
        }
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setPreferencesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [learner]);

  async function loadMoreNotifications() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const body = await requestJson<{
        items: Notification[];
        nextCursor: string | null;
      }>(
        `/api/v1/learner/notifications?limit=${NOTIFICATION_PAGE_SIZE}&cursor=${encodeURIComponent(nextCursor)}`,
      );
      setItems((current) => [...current, ...body.items]);
      setNextCursor(body.nextCursor);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load notifications.",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function updatePreference(
    type: NotificationPreference["type"],
    appEnabled: boolean,
  ) {
    setSavingPreference(type);
    setError(null);
    try {
      const updated = await requestJson<NotificationPreference>(
        `/api/v1/learner/notification-preferences/${encodeURIComponent(type)}`,
        { method: "PATCH", body: JSON.stringify({ appEnabled }) },
      );
      setPreferences((current) =>
        current.map((preference) =>
          preference.type === updated.type ? updated : preference,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save notification preference.",
      );
    } finally {
      setSavingPreference(null);
    }
  }

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
    setItems((current) =>
      current.map((item) => ({
        ...item,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
    );
  }

  if (checking) {
    return (
      <main className="flex min-h-[400px] items-center justify-center p-6">
        Loading notifications…
      </main>
    );
  }
  if (!learner) return null;

  return (
    <LearnerShell user={learner}>
      <main className="grid gap-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <LearnerText2 className="text-muted-foreground">Learner activity</LearnerText2>
            <LearnerHeader1>Notifications</LearnerHeader1>
            <LearnerText2 className="mt-2 text-muted-foreground">Stay up to date with conversations you follow.</LearnerText2>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void markAllRead()}
            disabled={items.every((item) => item.readAt)}
          >
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        </header>
        {error ? (
          <LearnerText2 className="text-destructive" role="alert">
            {error}
          </LearnerText2>
        ) : null}
        {loading ? <LearnerText2 className="text-muted-foreground">Loading notifications…</LearnerText2> : null}
        <PageCard
          aria-labelledby="notification-preferences-title"
        >
          <PageCardContent className="grid gap-5">
          <div>
            <LearnerText2 className="text-muted-foreground">Preferences</LearnerText2>
            <LearnerHeader2 id="notification-preferences-title">Notification preferences</LearnerHeader2>
            <LearnerText2 className="mt-2 text-muted-foreground">
              Choose which activity appears in your in-app notifications.
            </LearnerText2>
          </div>
          {preferencesLoading ? <LearnerText2 className="text-muted-foreground">Loading preferences…</LearnerText2> : null}
          {!preferencesLoading ? (
            <div className="grid gap-4">
              {preferences.map((preference) => {
                const copy = preferenceCopy[preference.type];
                return (
                  <div
                    key={preference.type}
                    className="flex items-center justify-between gap-4 border-t pt-4 first:border-t-0 first:pt-0"
                  >
                    <div>
                      <LearnerText2 className="font-medium">{copy.title}</LearnerText2>
                      <LearnerText2 className="text-muted-foreground">{copy.description}</LearnerText2>
                    </div>
                    <Switch
                      aria-label={`Enable ${copy.title.toLowerCase()}`}
                      checked={preference.appEnabled}
                      disabled={savingPreference === preference.type}
                      onCheckedChange={(checked) =>
                        void updatePreference(preference.type, checked)
                      }
                    />
                  </div>
                );
              })}
            </div>
          ) : null}
          </PageCardContent>
        </PageCard>
        {!loading && items.length === 0 ? (
          <PageCard>
            <PageCardContent className="grid justify-items-start gap-3">
            <Bell className="size-8 text-muted-foreground" />
            <LearnerHeader2>You&apos;re all caught up</LearnerHeader2>
            <LearnerText2 className="text-muted-foreground">
              New community replies and activity will appear here.
            </LearnerText2>
            <Button asChild variant="outline">
              <Link href="/communities">Browse communities</Link>
            </Button>
            </PageCardContent>
          </PageCard>
        ) : null}
        <section className="grid gap-4" aria-label="Notifications">
          {items.map((item) => {
            const content = (
              <div
                className="block"
              >
              <PageCard className={item.readAt ? "opacity-70" : "border-primary/50"}>
                <PageCardContent>
                <div className="flex items-start gap-3">
                  <Bell className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <LearnerHeader2>{item.title}</LearnerHeader2>
                      <time
                        className="text-xs text-muted-foreground"
                        dateTime={item.createdAt}
                      >
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                        }).format(new Date(item.createdAt))}
                      </time>
                    </div>
                    <LearnerText2 className="mt-1 text-muted-foreground">{item.body}</LearnerText2>
                  </div>
                </div>
                </PageCardContent>
              </PageCard>
              </div>
            );
            return item.href ? (
              <Link
                key={item.id}
                href={learnerNotificationHref(item.href)}
                onClick={() => void markRead(item)}
                className="block"
              >
                {content}
              </Link>
            ) : (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start p-0 text-left"
                onClick={() => void markRead(item)}
              >
                {content}
              </Button>
            );
          })}
        </section>
        {nextCursor ? (
          <Button
            type="button"
            variant="outline"
            disabled={loadingMore}
            onClick={() => void loadMoreNotifications()}
          >
            {loadingMore ? "Loading notifications…" : "Load more notifications"}
          </Button>
        ) : null}
      </main>
    </LearnerShell>
  );
}
