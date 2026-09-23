"use client";

import type { notificationPreferenceSchema } from "@courselit/api-contract";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { LearnerAccountTabs } from "@/components/account/learner-account-tabs";
import { CourseLitLoading } from "@/components/course-lit-loader";
import {
  requestJson,
  useLearnerSession,
} from "@/components/communities/learner-community";
import { LearnerShell } from "@/components/layout/learner-shell";
import {
  LearnerCheckbox,
  LearnerHeader1,
  LearnerHeader2,
  LearnerText2,
  LearnerCard as PageCard,
  LearnerCardContent as PageCardContent,
} from "@/components/themed-page-builder";

type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;
type PreferenceChannel = "appEnabled" | "emailEnabled";

const preferenceChannels: Array<{
  key: PreferenceChannel;
  label: string;
}> = [
  { key: "appEnabled", label: "App" },
  { key: "emailEnabled", label: "Email" },
];

const preferenceTitles: Record<NotificationPreference["type"], string> = {
  community_post_created: "Space post created",
  community_post_liked: "Space post liked",
  community_comment: "Space comment created",
  community_comment_liked: "Space comment liked",
  community_reply: "Space reply created",
  community_reply_liked: "Space reply liked",
  community_membership_granted: "Community membership granted",
};

export function LearnerNotifications() {
  const { learner, checking } = useLearnerSession("/dashboard/account/notifications");
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [updatingPreferenceTypes, setUpdatingPreferenceTypes] = useState<string[]>([]);
  const preferencesRef = useRef<NotificationPreference[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    if (!learner) return;
    let active = true;
    void requestJson<{ items: NotificationPreference[] }>(
      "/api/v1/learner/notification-preferences",
    )
      .then((preferenceBody) => {
        if (!active) return;
        setPreferences(preferenceBody.items);
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load notification settings.",
          );
        }
      })
      .finally(() => {
        if (!active) return;
        setPreferencesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [learner]);

  async function updatePreference(
    type: NotificationPreference["type"],
    channel: PreferenceChannel,
    checked: boolean,
  ) {
    if (updatingPreferenceTypes.includes(type)) return;

    const currentPreference = preferencesRef.current.find(
      (preference) => preference.type === type,
    );
    if (!currentPreference || currentPreference[channel] === checked) return;

    const previousPreference = currentPreference;
    const nextPreference = { ...currentPreference, [channel]: checked };
    setError(null);
    setPreferences((current) =>
      current.map((preference) =>
        preference.type === type ? nextPreference : preference,
      ),
    );
    setUpdatingPreferenceTypes((current) => [...current, type]);

    try {
      const updated = await requestJson<NotificationPreference>(
        `/api/v1/learner/notification-preferences/${encodeURIComponent(type)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            appEnabled: nextPreference.appEnabled,
            emailEnabled: nextPreference.emailEnabled,
          }),
        },
      );
      setPreferences((current) =>
        current.map((preference) =>
          preference.type === updated.type ? updated : preference,
        ),
      );
    } catch (caught) {
      setPreferences((current) =>
        current.map((preference) =>
          preference.type === type ? previousPreference : preference,
        ),
      );
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save notification setting.",
      );
    } finally {
      setUpdatingPreferenceTypes((current) => current.filter((item) => item !== type));
    }
  }

  if (checking) {
    return (
      <LearnerShell user={null} loading headerTitle="Account">
        <main className="flex min-h-[400px] items-center justify-center p-6">
          <CourseLitLoading label="Loading notification settings…" />
        </main>
      </LearnerShell>
    );
  }
  if (!learner) return null;

  return (
    <LearnerShell user={learner} headerTitle="Account">
      <main className="grid gap-7">
        <header>
          <LearnerHeader1>Notifications</LearnerHeader1>
          <LearnerText2 className="mt-2 text-muted-foreground">
            Manage how you receive notifications for each activity.
          </LearnerText2>
        </header>
        <LearnerAccountTabs />
        {error ? (
          <LearnerText2 className="text-destructive" role="alert">
            {error}
          </LearnerText2>
        ) : null}
        <PageCard aria-labelledby="notification-preferences-title">
          <PageCardContent className="grid gap-5">
            <LearnerHeader2 id="notification-preferences-title">General</LearnerHeader2>
            {preferencesLoading ? (
              <CourseLitLoading label="Loading preferences…" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-3 pr-4 text-left">
                        <LearnerText2 className="font-medium">Activity</LearnerText2>
                      </th>
                      {preferenceChannels.map((channel) => (
                        <th className="w-24 pb-3 text-center" key={channel.key}>
                          <LearnerText2 className="font-medium">
                            {channel.label}
                          </LearnerText2>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preferences.map((preference) => {
                      const isUpdating = updatingPreferenceTypes.includes(
                        preference.type,
                      );
                      return (
                        <tr
                          className="border-b border-border last:border-b-0"
                          key={preference.type}
                        >
                          <td className="py-3 pr-4">
                            <LearnerText2>
                              {preferenceTitles[preference.type]}
                            </LearnerText2>
                          </td>
                          {preferenceChannels.map((channel) => (
                            <td
                              className="w-24 py-3"
                              key={`${preference.type}-${channel.key}`}
                            >
                              <div className="flex justify-center">
                                <LearnerCheckbox
                                  aria-label={`${channel.label}: ${preferenceTitles[preference.type]}`}
                                  checked={preference[channel.key]}
                                  disabled={isUpdating}
                                  onCheckedChange={(value) =>
                                    void updatePreference(
                                      preference.type,
                                      channel.key,
                                      value === true,
                                    )
                                  }
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </PageCardContent>
        </PageCard>
      </main>
    </LearnerShell>
  );
}
