"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CourseLitLoading } from "@/components/loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/codelit/switch";

type Preference = {
  type: string;
  appEnabled: boolean;
  emailEnabled: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  community_post_created: "New community posts",
  community_comment: "New comments",
  community_reply: "New replies",
  community_membership_requested: "Community membership requests",
  community_joined: "New community members",
};

/** Lets a team member choose which activity notifies them in the app and
 * by email. */
export function NotificationSettings() {
  const [items, setItems] = useState<Preference[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/notification-preferences", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load notification settings.");
        return (await response.json()) as { items?: Preference[] };
      })
      .then((body) => {
        if (active) setItems(body.items ?? []);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load notification settings.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function update(type: string, patch: Partial<Omit<Preference, "type">>) {
    const current = items?.find((item) => item.type === type);
    if (!current) return;
    const next = { ...current, ...patch };
    setItems((list) => list?.map((item) => (item.type === type ? next : item)) ?? null);
    const response = await fetch(
      `/api/v1/notification-preferences/${encodeURIComponent(type)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appEnabled: next.appEnabled,
          emailEnabled: next.emailEnabled,
        }),
      },
    ).catch(() => null);
    if (!response?.ok) {
      setItems(
        (list) => list?.map((item) => (item.type === type ? current : item)) ?? null,
      );
      toast.error("Unable to save the notification setting.");
    }
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!items) {
    return <CourseLitLoading label="Loading notification settings…" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Choose what you hear about in the app and by email. These settings apply only
          to you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2 font-medium">Activity</th>
              <th className="w-24 py-2 text-center font-medium">In app</th>
              <th className="w-24 py-2 text-center font-medium">Email</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const label = TYPE_LABELS[item.type] ?? item.type;
              return (
                <tr key={item.type} className="border-t">
                  <td className="py-3">{label}</td>
                  <td className="py-3 text-center">
                    <Switch
                      aria-label={`${label} in app`}
                      checked={item.appEnabled}
                      onCheckedChange={(checked) =>
                        void update(item.type, { appEnabled: checked })
                      }
                    />
                  </td>
                  <td className="py-3 text-center">
                    <Switch
                      aria-label={`${label} by email`}
                      checked={item.emailEnabled}
                      onCheckedChange={(checked) =>
                        void update(item.type, { emailEnabled: checked })
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
