"use client";

import { defaultTemplateEmail } from "@sendlit/email-blocks";
import { defaultEmail, type Email } from "@sendlit/email-editor";
import { ArrowLeft, Calendar, Check, Pause, RefreshCw, Send } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { CourseLitLoading, CourseLitLoadingIcon } from "@/components/loading";
import { CourseLitEmailEditor } from "@/components/mails/courselit-email-editor";
import { SendTestEmailButton } from "@/components/mails/send-test-email-dialog";
import {
  EditorBackButton,
  useUnsavedChangesWarning,
} from "@/components/mails/unsaved-changes";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import {
  getFutureBroadcastDeliveryDate,
  isBroadcastScheduled,
} from "@/lib/broadcast-status";
import { emailReadinessMessage } from "@/lib/email-readiness";

type BroadcastEmail = {
  emailId: string;
  subject: string;
  content: unknown;
  delayInMillis: number;
  published: boolean;
};

type SequenceDetail = {
  sequenceId: string;
  title?: string;
  type: "broadcast" | "sequence";
  status?: string;
  report?: { broadcast?: { lockedAt?: number | string | null } };
  emails?: BroadcastEmail[];
  viewInBrowser?: boolean;
};

async function getResponseError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    details?: { reason?: string };
    message?: string;
    error?: string;
  } | null;
  return body?.details?.reason || body?.message || body?.error || fallback;
}

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function cloneEmail(email: Email): Email {
  return JSON.parse(JSON.stringify(email)) as Email;
}

function parseEmailBody(raw: unknown): Email {
  if (!raw) return cloneEmail(defaultTemplateEmail || defaultEmail);
  if (typeof raw === "string") {
    try {
      return parseEmailBody(JSON.parse(raw));
    } catch {
      return cloneEmail(defaultTemplateEmail || defaultEmail);
    }
  }
  if (
    typeof raw === "object" &&
    raw !== null &&
    Array.isArray((raw as { content?: unknown }).content)
  ) {
    return cloneEmail(raw as Email);
  }
  return cloneEmail(defaultTemplateEmail || defaultEmail);
}

export default function EmailBroadcastEditorPage({
  params,
}: {
  params: Promise<{ broadcastId: string }>;
}) {
  const { broadcastId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sequenceEmailId = searchParams.get("emailId");
  const isSequenceEmailEditor = Boolean(sequenceEmailId);

  const [sequence, setSequence] = useState<SequenceDetail | null>(null);
  const [emailId, setEmailId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [scheduleConfirmOpen, setScheduleConfirmOpen] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [scheduleMinimum, setScheduleMinimum] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bodyRef = useRef<Email | null>(null);
  const subjectRef = useRef("");
  const lastSavedPayload = useRef<string>("");
  // Edits are kept until Save (or Send, Schedule or Send test, which save
  // first); nothing is saved in the background.
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesWarning(dirty);

  const futureDeliveryDate = getFutureBroadcastDeliveryDate(sequence);
  const isScheduledBroadcast = !isSequenceEmailEditor && isBroadcastScheduled(sequence);
  // Explains why Send and Schedule are off; the API enforces the same rule.
  const unreadyReason = emailReadinessMessage({ subject, content: emailBody });

  // Load sequence & email
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    subjectRef.current = "";

    async function loadData() {
      try {
        const res = await fetch(`/api/v1/school/mails/sequences/${broadcastId}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("Unable to load broadcast.");
        }
        const data = (await res.json()) as SequenceDetail;
        if (cancelled) return;

        setSequence(data);
        let targetEmail = isSequenceEmailEditor
          ? data.emails?.find((email) => email.emailId === sequenceEmailId)
          : data.emails?.[0];
        let targetEmailId = targetEmail?.emailId ?? (targetEmail as any)?.id ?? null;

        if (isSequenceEmailEditor && !targetEmailId) {
          throw new Error("Email step not found in this sequence.");
        }

        // If no email exists in the sequence yet, create an initial email automatically
        if (!isSequenceEmailEditor && !targetEmailId) {
          try {
            const addRes = await fetch(
              `/api/v1/school/mails/sequences/${broadcastId}/emails`,
              {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subject: data.title || "Untitled broadcast",
                }),
              },
            );
            if (addRes.ok) {
              const newEmail = (await addRes.json()) as any;
              targetEmail = newEmail;
              targetEmailId = newEmail?.emailId || newEmail?.id || null;
            }
          } catch {
            // ignore
          }
        }

        setEmailId(targetEmailId);

        const initialSubject =
          targetEmail?.subject ||
          (isSequenceEmailEditor
            ? "Untitled email"
            : data.title || "Untitled broadcast");
        subjectRef.current = initialSubject;
        setSubject(initialSubject);

        const parsedBody = parseEmailBody(targetEmail?.content);
        bodyRef.current = parsedBody;
        setEmailBody(parsedBody);
        lastSavedPayload.current = JSON.stringify({
          subject: initialSubject,
          content: parsedBody,
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : isSequenceEmailEditor
                ? "Failed to load email step."
                : "Failed to load broadcast.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [broadcastId, isSequenceEmailEditor, sequenceEmailId]);

  // Save function
  const save = useCallback(
    async (manual = false): Promise<boolean> => {
      if (!isSequenceEmailEditor && isScheduledBroadcast) return false;
      if (!bodyRef.current || !emailId) return false;

      const currentSubject =
        subjectRef.current.trim() ||
        (isSequenceEmailEditor
          ? "Untitled email"
          : sequence?.title || "Untitled broadcast");
      const payloadString = JSON.stringify({
        subject: currentSubject,
        content: bodyRef.current,
      });

      if (!manual && payloadString === lastSavedPayload.current) {
        return true;
      }

      setSaving(true);
      setError(null);

      try {
        // 1. Update the email content and subject
        const emailRes = await fetch(
          `/api/v1/school/mails/sequences/${broadcastId}/emails/${emailId}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subject: currentSubject,
              content: bodyRef.current,
              ...(!isSequenceEmailEditor ? { published: true } : {}),
            }),
          },
        );

        if (!emailRes.ok) {
          throw new Error("Failed to save email content.");
        }

        // 2. Also update sequence title if changed
        if (!isSequenceEmailEditor && sequence?.title !== currentSubject) {
          await fetch(`/api/v1/school/mails/sequences/${broadcastId}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: currentSubject }),
          });
        }

        lastSavedPayload.current = payloadString;
        // Still dirty if edited again while this save was in flight.
        setDirty(
          JSON.stringify({
            subject: subjectRef.current.trim() || currentSubject,
            content: bodyRef.current,
          }) !== payloadString,
        );
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to save broadcast draft.",
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [
      broadcastId,
      emailId,
      isScheduledBroadcast,
      isSequenceEmailEditor,
      sequence?.title,
    ],
  );

  const handleBodyChange = useCallback((newEmail: Email) => {
    bodyRef.current = newEmail;
    setEmailBody(newEmail);
    setDirty(true);
  }, []);

  // Send broadcast
  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const savedOk = await save(true);
      if (!savedOk) {
        throw new Error("Could not save changes before sending.");
      }

      if (!emailId) {
        throw new Error("This broadcast does not have an email to send.");
      }

      const emailRes = await fetch(
        `/api/v1/school/mails/sequences/${broadcastId}/emails/${emailId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delayInMillis: Date.now(), published: true }),
        },
      );
      if (!emailRes.ok) {
        throw new Error(
          await getResponseError(emailRes, "Failed to prepare broadcast."),
        );
      }

      const startRes = await fetch(
        `/api/v1/school/mails/sequences/${broadcastId}/start`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!startRes.ok) {
        throw new Error(await getResponseError(startRes, "Failed to send broadcast."));
      }

      setSendConfirmOpen(false);
      router.push(`/marketing/broadcasts/${encodeURIComponent(broadcastId)}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send broadcast.");
    } finally {
      setSending(false);
    }
  }

  async function handleSchedule() {
    const sendAt = new Date(scheduleDateTime).getTime();
    if (!scheduleDateTime || Number.isNaN(sendAt) || sendAt <= Date.now()) {
      setError("Choose a valid date and time in the future.");
      return;
    }
    if (!emailId) {
      setError("This broadcast does not have an email to schedule.");
      return;
    }

    setScheduling(true);
    setError(null);
    try {
      if (!(await save(true))) {
        throw new Error("Could not save changes before scheduling.");
      }

      const emailResponse = await fetch(
        `/api/v1/school/mails/sequences/${broadcastId}/emails/${emailId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delayInMillis: sendAt, published: true }),
        },
      );
      if (!emailResponse.ok) {
        throw new Error(
          await getResponseError(emailResponse, "Unable to save the scheduled time."),
        );
      }

      const startResponse = await fetch(
        `/api/v1/school/mails/sequences/${broadcastId}/start`,
        { method: "POST", credentials: "include" },
      );
      if (!startResponse.ok) {
        throw new Error(
          await getResponseError(startResponse, "Unable to schedule this broadcast."),
        );
      }

      const startedSequence = (await startResponse
        .json()
        .catch(() => null)) as SequenceDetail | null;
      setSequence((current) =>
        current
          ? {
              ...current,
              ...startedSequence,
              status: startedSequence?.status || "active",
              emails: current.emails?.map((email, index) =>
                index === 0
                  ? { ...email, delayInMillis: sendAt, published: true }
                  : email,
              ),
            }
          : current,
      );
      setScheduleConfirmOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to schedule this broadcast.",
      );
    } finally {
      setScheduling(false);
    }
  }

  async function handleCancelSchedule() {
    setScheduling(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/school/mails/sequences/${broadcastId}/pause`,
        { method: "POST", credentials: "include" },
      );
      if (!response.ok) {
        throw new Error(
          await getResponseError(response, "Unable to cancel this schedule."),
        );
      }
      setSequence((current) => (current ? { ...current, status: "paused" } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel this schedule.");
    } finally {
      setScheduling(false);
    }
  }

  function openScheduleDialog() {
    setError(null);
    const now = new Date();
    const firstSelectableMinute = new Date(
      (Math.floor(now.getTime() / 60_000) + 1) * 60_000,
    );
    setScheduleMinimum(toLocalInputValue(firstSelectableMinute));
    setScheduleDateTime(toLocalInputValue(new Date(now.getTime() + 60 * 60_000)));
    setScheduleConfirmOpen(true);
  }

  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background p-6">
        <CourseLitLoading
          label={
            isSequenceEmailEditor
              ? "Loading email editor…"
              : "Loading broadcast editor…"
          }
        />
      </div>
    );
  }

  if (error && !emailBody) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-destructive">
            Unable to open editor
          </h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild variant="outline">
            <Link
              href={
                isSequenceEmailEditor
                  ? `/marketing/sequences/${encodeURIComponent(broadcastId)}/edit`
                  : `/marketing/broadcasts/${encodeURIComponent(broadcastId)}/edit`
              }
            >
              <ArrowLeft className="mr-2 size-4" />
              {isSequenceEmailEditor ? "Back to sequence" : "Back to broadcast"}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      {/* Top Header Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-card px-4">
        <div className="flex min-w-0 items-center gap-3">
          <EditorBackButton
            href={
              isSequenceEmailEditor
                ? `/marketing/sequences/${encodeURIComponent(broadcastId)}/edit`
                : `/marketing/broadcasts/${encodeURIComponent(broadcastId)}/edit`
            }
            label={isSequenceEmailEditor ? "Sequence" : "Broadcast"}
            dirty={dirty}
            onSave={() => save(true)}
            disabled={saving}
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            role="status"
            aria-label={saving ? "Saving" : saved ? "Saved" : undefined}
          >
            {saving ? (
              <>
                <CourseLitLoadingIcon size={14} />
              </>
            ) : saved ? (
              <>
                <Check className="size-3.5 text-emerald-600" />
                <span className="font-medium text-emerald-600">Saved</span>
              </>
            ) : null}
          </div>

          {emailId ? (
            <SendTestEmailButton
              sequenceId={broadcastId}
              emailId={emailId}
              disabled={saving || sending || scheduling}
              beforeSend={() =>
                isScheduledBroadcast ? Promise.resolve(true) : save(true)
              }
            />
          ) : null}
          {!isSequenceEmailEditor ? (
            isScheduledBroadcast ? (
              <div
                className="flex items-center gap-2 text-sm text-muted-foreground"
                role="status"
              >
                <Calendar className="size-4" />
                <span className="whitespace-nowrap">
                  Scheduled for {futureDeliveryDate?.toLocaleString()}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCancelSchedule()}
                  disabled={saving || sending || scheduling}
                  className="gap-1.5"
                >
                  <Pause className="size-3.5" />
                  {scheduling ? "Canceling…" : "Cancel send"}
                </Button>
              </div>
            ) : sequence?.status === "draft" || sequence?.status === "paused" ? (
              <>
                {futureDeliveryDate ? (
                  <span className="text-xs text-amber-700" role="status">
                    Delivery time saved · not active (
                    {futureDeliveryDate.toLocaleString()})
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void save(true)}
                  disabled={saving || sending || scheduling || !dirty}
                >
                  Save draft
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openScheduleDialog}
                  disabled={saving || sending || scheduling || Boolean(unreadyReason)}
                  title={unreadyReason ?? undefined}
                  className="gap-1.5"
                >
                  <Calendar className="size-3.5" />
                  Schedule
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setSendConfirmOpen(true)}
                  disabled={saving || sending || scheduling || Boolean(unreadyReason)}
                  title={unreadyReason ?? undefined}
                  className="gap-1.5"
                >
                  <Send className="size-3.5" />
                  Send now
                </Button>
              </>
            ) : null
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void save(true)}
              disabled={saving || sending || scheduling || !dirty}
            >
              Save
            </Button>
          )}
        </div>
      </header>

      {error ? (
        <div className="border-b bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive">
          {error}
        </div>
      ) : null}

      {!isSequenceEmailEditor && !isScheduledBroadcast && unreadyReason ? (
        <div className="border-b px-4 py-2">
          <p role="status" className="text-xs font-medium text-amber-700">
            {unreadyReason}
          </p>
        </div>
      ) : null}

      {/* Email canvas: subject, merge tags and checks are inside the editor */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Email Editor Canvas */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-muted/10">
          {emailBody ? (
            <div
              className={
                isScheduledBroadcast ? "pointer-events-none opacity-80" : undefined
              }
              aria-disabled={isScheduledBroadcast}
              inert={isScheduledBroadcast}
            >
              <CourseLitEmailEditor
                email={emailBody}
                onChange={handleBodyChange}
                viewInBrowser={sequence?.viewInBrowser}
                subject={subject}
                onSubjectChange={(next) => {
                  subjectRef.current = next;
                  setSubject(next);
                  setDirty(true);
                }}
              />
            </div>
          ) : null}
        </main>
      </div>

      {/* Send Confirmation Dialog */}
      <Dialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send this broadcast?</DialogTitle>
            <DialogDescription>
              Your broadcast &ldquo;{subject || sequence?.title || "Untitled"}&rdquo;
              will be saved and sent immediately to all eligible audience contacts. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSendConfirmOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSend()} disabled={sending}>
              {sending ? "Sending…" : "Send broadcast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={scheduleConfirmOpen}
        onOpenChange={(open) => {
          if (!scheduling) setScheduleConfirmOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule this broadcast?</DialogTitle>
            <DialogDescription>
              “{subject || sequence?.title || "Untitled"}” will be sent to eligible
              audience contacts at the selected time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="broadcast-schedule-time">Delivery date &amp; time</Label>
            <Input
              id="broadcast-schedule-time"
              type="datetime-local"
              value={scheduleDateTime}
              min={scheduleMinimum}
              onChange={(event) => setScheduleDateTime(event.target.value)}
              disabled={scheduling}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setScheduleConfirmOpen(false)}
              disabled={scheduling}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSchedule()}
              disabled={!scheduleDateTime || scheduling || saving}
            >
              {scheduling ? "Scheduling…" : "Schedule broadcast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
